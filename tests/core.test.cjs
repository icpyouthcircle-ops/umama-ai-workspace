const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../frontend/core.js');require('../frontend/sample.js');
const now='2026-09-28T12:00:00.000Z';
const data={name:'Test Client',raw:'Role: Designer\nAudience: Founders\nOffer: Brand design',url:'',service:'Full profile',consent:true};
const base=()=>C.create(data,'client-123',now,'admin@example.com');
const change=(c,type,payload)=>C.mutate(c,{type,payload},now,'admin@example.com');
test('intake validates consent, bounded input and profile URLs',()=>{
  for(const edit of [{consent:false},{name:''},{raw:'x'.repeat(12001)},{service:'other'},{url:'https://linkedin.com.evil.test/in/a'},{url:'javascript:alert(1)'}])assert.throws(()=>C.create({...data,...edit},'id',now,'a'));
  assert.equal(C.input({...data,url:'https://www.linkedin.com/in/alex-morgan/'}).name,'Test Client');
});
test('extraction requires exact sources and never auto-verifies',()=>{
  const c=change(base(),'extract',C.demoExtract(data.raw));assert.equal(c.facts.length,3);assert(c.facts.every(f=>f.status==='unverified'));assert(C.missing(c).includes('role'));
  assert.throws(()=>C.validateExtraction({facts:[{key:'role',value:'CEO',source:'Unprovided source'}]},data.raw),{code:'AI_SOURCE'});
  assert.throws(()=>C.validateExtraction({facts:[{key:'admin',value:'CEO',source:'Designer'}]},data.raw));
});
test('facts require evidence; rejected claims cannot power generation',()=>{
  let c=change(base(),'extract',C.demoExtract(data.raw));const f=c.facts[0];
  assert.throws(()=>change(c,'fact',{id:f.id,status:'verified',value:f.value,evidence:''}));
  c=change(c,'fact',{id:f.id,status:'rejected',value:f.value,evidence:'Not supported'});
  assert.throws(()=>C.demoGenerate(c,'headline'),{code:'QUALITY'});
});
test('approval requires review, source prerequisites and quality checks',()=>{
  let c=WorkspaceSamples.samples()[0];c=change(c,'module',{module:'about',content:'[INSERT PROOF]'});
  assert.throws(()=>change(c,'approve',{module:'about',attested:true}),{code:'QUALITY'});
  c=change(c,'module',{module:'about',content:'A considered professional introduction.'});
  assert.throws(()=>change(c,'approve',{module:'about',attested:false}));
  c=change(c,'approve',{module:'about',attested:true});assert.equal(c.modules.about.status,'approved');assert.equal(c.modules.about.approvedBy,'admin@example.com');
});
test('edits and fact changes revoke approvals without mutating prior snapshots',()=>{
  const old=WorkspaceSamples.samples()[0];const oldString=JSON.stringify(old);
  let c=change(old,'module',{module:'audit',content:'Revised audit'});assert.equal(c.modules.audit.status,'draft');
  c=change(c,'fact',{id:c.facts[0].id,value:'Updated role',status:'verified',evidence:'Confirmed'});
  assert(Object.values(c.modules).every(m=>m.status==='draft'&&m.stale));assert.throws(()=>change(c,'approve',{module:'audit',attested:true}));
  assert.equal(JSON.stringify(old),oldString);
});
test('changing intake clears verification and increments revision',()=>{
  const old=WorkspaceSamples.samples()[0],c=change(old,'intake',data);assert.equal(c.facts.length,0);assert.equal(c.extracted,false);assert.equal(c.revision,old.revision+1);
});
test('workspace provisioning stores only a validated folder link',()=>{
  const c=change(base(),'workspace',{url:'https://drive.google.com/drive/folders/mock-folder',provisionedAt:now});
  assert.equal(c.workspace.status,'ready');assert.equal(c.workspace.url,'https://drive.google.com/drive/folders/mock-folder');
  assert.throws(()=>change(base(),'workspace',{url:'javascript:alert(1)',provisionedAt:now}));
});
test('conflicting verified values and content limits block approval',()=>{
  const c=WorkspaceSamples.samples()[0];c.facts.push({...c.facts[0],id:'other',value:'A different role'});
  assert(C.quality(c,'about','Valid text').some(x=>x.includes('conflicting')));
  assert(C.quality(c,'headline','x'.repeat(221)).some(x=>x.includes('220')));
  assert(C.quality(c,'about','x'.repeat(2601)).some(x=>x.includes('2,600')));
});
test('prototype keys cannot be used as module identifiers',()=>{
  assert.throws(()=>change(base(),'module',{module:'__proto__',content:'bad'}));
  assert.throws(()=>change(base(),'approve',{module:'constructor',attested:true}));
});
test('full six-module flow produces escaped final report',()=>{
  let c=WorkspaceSamples.samples()[0];c.name='<img src=x onerror=alert(1)>';
  assert.throws(()=>C.report(c,true));
  for(const module of Object.keys(C.MODULES)){c=change(c,'module',{module,content:C.demoGenerate(c,module)});c=change(c,'approve',{module,attested:true});}
  const html=C.report(c,true);assert(html.includes('FINAL — REVIEWED'));assert(!html.includes('<img'));assert(html.includes('&lt;img'));
  assert(C.report(base(),false).includes('DRAFT — NOT FOR CLIENT DELIVERY'));
});
