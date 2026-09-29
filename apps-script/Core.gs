(function (root) {
  'use strict';
  const MODULES = {audit:'Profile audit', headline:'Headline', about:'About section', experience:'Experience', positioning:'Positioning', pillars:'Content pillars'};
  const FIELDS = ['role','audience','offer','goal','tone','cta','experience','proof'];
  function fail(code, message) { const e = new Error(message); e.code = code; throw e; }
  function text(value, max, label, required = true) {
    if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail('VALIDATION', `${label} ${required?'is required and ':''}must be at most ${max} characters.`);
    return value.trim();
  }
  const clone = v => JSON.parse(JSON.stringify(v));
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function input(data) {
    const name = text(data.name,100,'Client name');
    const raw = text(data.raw,12000,'Client information');
    const url = text(data.url || '',250,'LinkedIn URL',false);
    if (url && !/^https:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_%\-]+\/?$/.test(url)) fail('VALIDATION','Use an https://www.linkedin.com/in/ profile URL.');
    if (!['Full profile','Profile audit','Brand strategy'].includes(data.service)) fail('VALIDATION','Choose a valid service.');
    if (data.consent !== true) fail('CONSENT','Confirm you have permission to process this client information.');
    return {name,raw,url,service:data.service,consent:true};
  }
  function create(data, id, now, actor) {
    return {...input(data),id,revision:1,schemaVersion:1,createdAt:now,updatedAt:now,updatedBy:actor,facts:[],modules:{},extracted:false,consentAt:now};
  }
  function missing(client) {
    const has = k => client.facts.some(f=>f.key===k && f.status==='verified');
    return FIELDS.filter(k=>!has(k));
  }
  function quality(client, module, content) {
    const errors=[];
    FIELDS.forEach(k=>{if(new Set(client.facts.filter(f=>f.key===k&&f.status==='verified').map(f=>f.value.trim().toLowerCase())).size>1)errors.push(`Resolve conflicting verified ${k} facts before approval.`);});
    if (!content || !content.trim()) errors.push('Add content before approval.');
    if (content && /\[(?:insert|todo|placeholder|name|client|proof)[^\]]*\]|\bTODO\b/i.test(content)) errors.push('Replace unfinished placeholders.');
    if (content && /guaranteed (?:leads|results|income)|100% guaranteed/i.test(content)) errors.push('Remove unsupported guarantees.');
    if (module==='headline' && content && content.split('\n').some(l=>l.length>220)) errors.push('Keep each headline option within the workspace limit of 220 characters.');
    if (module==='about' && content && content.length>2600) errors.push('Keep About within the workspace limit of 2,600 characters.');
    if (!client.extracted) errors.push('Extract and review the client information first.');
    const required = module==='audit' ? [] : ['role','audience','offer'];
    required.filter(k=>missing(client).includes(k)).forEach(k=>errors.push(`Verify ${k} before approval.`));
    if (module==='experience' && missing(client).includes('experience')) errors.push('Verify experience before approval.');
    return errors;
  }
  function invalidate(c) { Object.values(c.modules).forEach(m=>{m.status='draft';m.approvedAt=null;m.approvedBy=null;m.stale=true;}); }
  function validateExtraction(data, raw) {
    if (!data || !Array.isArray(data.facts) || data.facts.length>24) fail('AI_FORMAT','Extraction returned an invalid facts list. Try again.');
    return data.facts.map((f,i)=>{
      if (!FIELDS.includes(f.key)) fail('AI_FORMAT','Extraction returned an unknown field.');
      const value=text(f.value,600,'Extracted value');
      const source=text(f.source,800,'Source quotation');
      if (!raw.includes(source)) fail('AI_SOURCE','An extracted quotation was not found in the intake. Review the source and retry.');
      return {id:`fact-${i+1}`,key:f.key,value,source,status:'unverified',evidence:'',verifiedBy:null,verifiedAt:null};
    });
  }
  function mutate(current, command, now, actor) {
    const c=clone(current), p=command.payload || {};
    switch(command.type) {
      case 'intake': Object.assign(c,input(p));c.facts=[];c.extracted=false;invalidate(c);break;
      case 'extract': c.facts=validateExtraction(p,c.raw);c.extracted=true;invalidate(c);break;
      case 'fact': {
        const f=c.facts.find(x=>x.id===p.id);if(!f) fail('NOT_FOUND','Fact not found.');
        if (!['verified','unverified','rejected'].includes(p.status)) fail('VALIDATION','Invalid fact status.');
        f.value=text(p.value,600,'Fact');f.evidence=text(p.evidence||'',500,'Evidence note',p.status==='verified');
        f.status=p.status;f.verifiedAt=p.status==='verified'?now:null;f.verifiedBy=p.status==='verified'?actor:null;invalidate(c);break;
      }
      case 'module': {
        if (!Object.prototype.hasOwnProperty.call(MODULES,p.module)) fail('VALIDATION','Unknown module.');
        const content=text(p.content,6000,'Module content');
        c.modules[p.module]={content,status:'draft',version:(c.modules[p.module]?.version||0)+1,updatedAt:now,updatedBy:actor,approvedAt:null,approvedBy:null,stale:false,origin:p.origin==='ai'?'ai':'manual'};break;
      }
      case 'approve': {
        if (!Object.prototype.hasOwnProperty.call(MODULES,p.module) || !c.modules[p.module]) fail('VALIDATION','Generate or save this module first.');
        const m=c.modules[p.module];const errors=quality(c,p.module,m.content);
        if (m.stale) errors.push('Source information changed. Regenerate or review and save this draft first.');
        if (p.attested!==true) errors.push('Confirm factual accuracy and client suitability.');
        if(errors.length) fail('QUALITY',errors.join(' '));
        m.status='approved';m.approvedAt=now;m.approvedBy=actor;break;
      }
      default: fail('VALIDATION','Unknown change.');
    }
    c.revision++;c.updatedAt=now;c.updatedBy=actor;
    if (JSON.stringify(c).length>44000) fail('CAPACITY','This client exceeds the MVP record limit. Shorten the intake or drafts.');
    return c;
  }
  function demoExtract(raw) {
    const facts=[];
    raw.split('\n').forEach(line=>{const match=line.match(/^\s*(role|audience|offer|goal|tone|cta|experience|proof)\s*:\s*(.+)$/i);if(match) facts.push({key:match[1].toLowerCase(),value:match[2].trim().slice(0,600),source:line.slice(0,800)});});
    return {facts:facts.slice(0,24)};
  }
  function demoGenerate(c,key) {
    const v=k=>c.facts.find(f=>f.key===k&&f.status==='verified')?.value || '';
    const role=v('role'),audience=v('audience'),offer=v('offer');
    if(key!=='audit'&&(!role||!audience||!offer)) fail('QUALITY','Verify role, audience and offer in Intelligence first.');
    const templates={
      audit:`PROFILE REVIEW\n\nIntake strengths\n${c.facts.filter(f=>f.status==='verified').map(f=>`• ${f.key}: ${f.value}`).join('\n')||'No facts verified yet.'}\n\nInformation to confirm\n${missing(c).map(k=>`• Confirm ${k} with the client.`).join('\n')||'All intake categories reviewed.'}\n\nRecommended priorities\n1. Make the target audience and offer clear in the headline.\n2. Support claims with client-approved evidence.\n3. End the About section with a clear next step.\n\nScope: supplied text only; the LinkedIn profile has not been visited.`,
      headline:`${role} | ${offer}\n${role} | Working with ${audience}\n${offer} | For ${audience}`,
      about:`I work as ${role}.\n\nMy focus is ${offer}, with ${audience} in mind.\n\n${v('experience')?`My experience includes ${v('experience')}.\n\n`:''}${v('proof')?`${v('proof')}\n\n`:''}${v('cta')||'Connect with me to discuss whether we are a good fit.'}`,
      experience:v('experience')?`${role}\n\n${v('experience')}\n\nFocus: ${offer}.\nAudience: ${audience}.\n\n${v('proof')||'Keep results and metrics out until supporting evidence is confirmed.'}`:'Confirm role responsibilities, employer and dates before preparing an experience rewrite.',
      positioning:`POSITIONING DIRECTION\n\nAudience\n${audience}\n\nCore offer\n${offer}\n\nProfessional identity\n${role}\n\nRecommended message\nLead with a specific audience and the work you do. Use evidence for results; avoid vague promises.\n\nGoal\n${v('goal')||'Confirm the intended business outcome.'}`,
      pillars:`1. PRACTICAL EDUCATION\nExplain one common problem faced by ${audience}. Share a useful next step.\n\n2. YOUR PROCESS\nShow how you approach ${offer}. Use an anonymized example only with permission.\n\n3. INFORMED PERSPECTIVE\nShare a lesson connected to your work as ${role}. Distinguish experience from opinion.\n\n4. TRUST & CONVERSATION\nAnswer common questions from ${audience}. Invite a thoughtful response without promising outcomes.`
    };
    if(!Object.prototype.hasOwnProperty.call(templates,key)) fail('VALIDATION','Unknown module.');return templates[key];
  }
  function progress(c) { return Object.values(c.modules).filter(m=>m.status==='approved').length; }
  function report(c, final=false) {
    if(final && progress(c)!==6) fail('QUALITY','Approve all six modules before generating a final report.');
    if(final && Object.keys(MODULES).some(k=>!c.modules[k]||c.modules[k].stale||quality(c,k,c.modules[k].content).length))fail('QUALITY','Resolve outstanding quality checks before final delivery.');
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(c.name)} — LinkedIn strategy</title><style>body{font:16px/1.65 Arial,sans-serif;color:#172b2a;max-width:800px;margin:50px auto;padding:25px}h1{font-size:36px}h2{border-bottom:2px solid #087a69;padding-bottom:8px;margin-top:40px}pre{white-space:pre-wrap;font:inherit}small{color:#526865}.label{color:#087a69;letter-spacing:2px}section{break-inside:avoid}@media print{body{margin:0;max-width:none}h2{break-after:avoid}}</style></head><body><p class="label">UMAMA AI WORKSPACE</p><h1>LinkedIn profile & brand strategy</h1><p>${esc(c.name)} · ${esc(c.service)}</p><p><b>${final?'FINAL — REVIEWED & APPROVED':'DRAFT — NOT FOR CLIENT DELIVERY'}</b></p><small>Client revision ${c.revision} · ${esc(c.updatedAt.slice(0,10))}<br>Prepared from client-supplied information. No independent profile or results verification.</small>${Object.entries(MODULES).map(([key,label])=>`<section><h2>${esc(label)}</h2><small>${esc(c.modules[key]?.status||'Not prepared')}</small><pre>${esc(c.modules[key]?.content||'Not prepared yet.')}</pre></section>`).join('')}<p><small>Prepared by Umama · Client Operations</small></p></body></html>`;
  }
  const api={MODULES,FIELDS,fail,text,clone,esc,input,create,missing,quality,validateExtraction,mutate,demoExtract,demoGenerate,progress,report};
  root.WorkspaceCore=api;
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
})(globalThis);
