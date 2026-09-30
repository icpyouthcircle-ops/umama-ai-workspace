const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto');
function backend(){
  const rows=[],properties={ADMIN_EMAILS:'admin@example.com',SPREADSHEET_ID:'private-sheet',GEMINI_API_KEY:'SERVER_ONLY_SECRET',GEMINI_MODEL:'gemini-test',REPORT_FOLDER_ID:'private-folder',FIREBASE_CONFIG:JSON.stringify({apiKey:'public-firebase-key',projectId:'umama-test'})};
  let active='admin@example.com',effective=active,locked=false,fetchCount=0,pdfCount=0,mode='valid',fetchHook;
  const headers=['request_id','client_id','revision','event_type','created_at','actor_email','request_hash','snapshot_json','schema_version'];rows.push(headers);
  const sheet={getLastRow:()=>rows.length,getRange:(row,col,n,w)=>({getValues:()=>rows.slice(row-1,row-1+n).map(r=>r.slice(col-1,col-1+w))}),appendRow:r=>rows.push(r)};
  function makeFolder(name,id='mock-folder'){
    const children=new Map(),files=new Map();
    return {name,getUrl:()=>`https://drive.google.com/drive/folders/${id}`,getFoldersByName:n=>({hasNext:()=>children.has(n),next:()=>children.get(n)}),createFolder:n=>{const child=makeFolder(n,`folder-${children.size+1}`);children.set(n,child);return child;},getFilesByName:n=>({hasNext:()=>files.has(n),next:()=>files.get(n)}),createFile:blob=>{pdfCount++;const f={getUrl:()=>`https://drive.google.com/file/d/mock-${pdfCount}/view`};files.set(blob.name,f);return f;},children};
  }
  const rootFolder=makeFolder('root','private-folder');
  const ctx={console,Date,JSON,Math,Number,String,Set,Object,Array,Error,RegExp,
    Session:{getActiveUser:()=>({getEmail:()=>active}),getEffectiveUser:()=>({getEmail:()=>effective})},
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>properties[k]||null,setProperty:(k,v)=>properties[k]=v})},
    SpreadsheetApp:{openById:()=>({getSheetByName:()=>sheet}),flush:()=>{}},
    LockService:{getScriptLock:()=>({tryLock:()=>{if(locked)return false;locked=true;return true;},releaseLock:()=>locked=false})},
    Utilities:{getUuid:()=>crypto.randomUUID(),base64EncodeWebSafe:x=>Buffer.from(x).toString('base64url'),base64DecodeWebSafe:x=>Buffer.from(x,'base64url'),computeDigest:(alg,s)=>crypto.createHash('sha256').update(s).digest(),DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},newBlob:data=>({getDataAsString:()=>Buffer.from(data||'').toString(),getAs:()=>({setName:name=>({name})})})},
    MimeType:{PDF:'application/pdf'},DriveApp:{getFolderById:()=>rootFolder},
    ContentService:{MimeType:{JSON:'application/json'},createTextOutput:text=>({text,setMimeType(){return this;}})},
    UrlFetchApp:{fetch:(url,opts)=>{if(url.includes('identitytoolkit.googleapis.com'))return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({users:[{email:'admin@example.com',emailVerified:true}]})};fetchCount++;assert.equal(locked,false,'Model call must not hold save lock');assert.equal(opts.headers['x-goog-api-key'],'SERVER_ONLY_SECRET');if(fetchHook)fetchHook();const payload=JSON.parse(opts.payload);assert(payload.systemInstruction);let content;if(mode==='malformed')content='not json';else if(mode==='bad-source')content=JSON.stringify({facts:[{key:'role',value:'CEO',source:'invented'}]});else content=JSON.stringify({facts:[{key:'role',value:'Designer',source:'Role: Designer'}]});return {getResponseCode:()=>mode==='provider-error'?429:200,getContentText:()=>JSON.stringify({candidates:[{finishReason:mode==='truncated'?'MAX_TOKENS':'STOP',content:{parts:[{text:content}]}}]})};}}
  };
  vm.createContext(ctx);vm.runInContext(fs.readFileSync(require.resolve('../frontend/core.js'),'utf8'),ctx);vm.runInContext(fs.readFileSync(require.resolve('../apps-script/Code.gs'),'utf8'),ctx);
  const api=r=>JSON.parse(JSON.stringify(ctx.api(r)));
  const create=(requestId=crypto.randomUUID())=>api({action:'create',requestId,data:{name:'Test',raw:'Role: Designer',service:'Full profile',consent:true,url:''}});
  const token=()=>['header',Buffer.from(JSON.stringify({aud:'umama-test',iss:'https://securetoken.google.com/umama-test',exp:Math.floor(Date.now()/1000)+3600,pad:'x'.repeat(80)})).toString('base64url'),'signature'].join('.');
  const post=request=>JSON.parse(ctx.doPost({postData:{contents:JSON.stringify({...request,idToken:token()})}}).text);
  return {api,post,create,rows,properties,rootFolder,setUser:(a,e=a)=>{active=a;effective=e;},setMode:m=>mode=m,setHook:f=>fetchHook=f,fetchCount:()=>fetchCount,pdfCount:()=>pdfCount,ctx};
}
test('GitHub portal authenticates a Firebase token before private API access',()=>{
  const b=backend(),result=b.post({action:'bootstrap'});assert(result.ok);assert.equal(result.data.actor,'admin@example.com');
  const denied=JSON.parse(b.ctx.doPost({postData:{contents:JSON.stringify({action:'bootstrap',idToken:'invalid'})}}).text);assert.equal(denied.error.code,'UNAUTHORIZED');
});
test('every API action fails closed for unauthorized or blank identities',()=>{
  const b=backend();for(const user of ['','outsider@example.com']){b.setUser(user);for(const action of ['bootstrap','create','change','extract','generate','history','report'])assert.equal(b.api({action}).error.code,'UNAUTHORIZED');}
  b.setUser('admin@example.com','owner@example.com');assert.equal(b.api({action:'bootstrap'}).error.code,'UNAUTHORIZED');assert.equal(b.rows.length,1);
});
test('canonical append is idempotent; reused request content cannot collide',()=>{
  const b=backend(),id=crypto.randomUUID(),first=b.create(id),second=b.create(id);assert(first.ok);assert.deepEqual(first,second);assert.equal(b.rows.length,2);
  const wrong=b.api({action:'create',requestId:id,data:{name:'Changed'}});assert.equal(wrong.error.code,'CONFLICT');
});
test('client workspace provisioning is revision-safe and creates the standard folders once',()=>{
  const b=backend(),c=b.create().data,requestId=crypto.randomUUID();
  const req={action:'provision',id:c.id,expectedRevision:1,requestId};const first=b.api(req),second=b.api(req);
  assert(first.ok);assert.deepEqual(first,second);assert.equal(first.data.revision,2);assert.match(first.data.workspace.url,/drive\.google\.com\/drive\/folders/);
  const clientFolder=[...b.rootFolder.children.values()][0];assert.deepEqual([...clientFolder.children.keys()],['01 Intake & Documents','02 Profile Drafts','03 Content Strategy','04 Feedback','05 Final Delivery']);
  assert.equal(b.rows.length,3);
});
test('stale saves rejected; revisions and old snapshots retained',()=>{
  const b=backend(),c=b.create().data;
  const req={action:'change',id:c.id,expectedRevision:1,requestId:crypto.randomUUID(),command:{type:'module',payload:{module:'audit',content:'First audit'}}};assert.equal(b.api(req).data.revision,2);
  assert.equal(b.api({...req,requestId:crypto.randomUUID()}).error.code,'CONFLICT');assert.equal(b.rows.length,3);assert.equal(JSON.parse(b.rows[1][7]).revision,1);
});
test('external clients cannot inject extraction, approvals or model metadata',()=>{
  const b=backend(),c=b.create().data;
  assert.equal(b.api({action:'change',id:c.id,expectedRevision:1,requestId:crypto.randomUUID(),command:{type:'extract',payload:{facts:[]}}}).error.code,'VALIDATION');
  assert.equal(b.api({action:'generate',id:c.id,expectedRevision:1,requestId:crypto.randomUUID(),module:'__proto__'}).error.code,'VALIDATION');
});
test('AI extraction validates source and handles rate errors without committing',()=>{
  const b=backend(),c=b.create().data;
  for(const [mode,code] of [['malformed','AI_FORMAT'],['bad-source','AI_SOURCE'],['truncated','AI_FORMAT'],['provider-error','AI_UNAVAILABLE']]){b.setMode(mode);const r=b.api({action:'extract',id:c.id,expectedRevision:1,requestId:crypto.randomUUID()});assert.equal(r.error.code,code);assert(!JSON.stringify(r).includes('SERVER_ONLY_SECRET'));assert.equal(b.rows.length,2);}
  b.setMode('valid');const req={action:'extract',id:c.id,expectedRevision:1,requestId:crypto.randomUUID()};assert.equal(b.api(req).data.facts[0].status,'unverified');const count=b.fetchCount();assert(b.api(req).ok);assert.equal(b.fetchCount(),count);
});
test('concurrent save during model generation wins; old AI result cannot overwrite',()=>{
  const b=backend(),c=b.create().data;b.setHook(()=>{const r=b.api({action:'change',id:c.id,expectedRevision:1,requestId:crypto.randomUUID(),command:{type:'module',payload:{module:'audit',content:'New manual audit'}}});assert(r.ok);});
  const r=b.api({action:'extract',id:c.id,expectedRevision:1,requestId:crypto.randomUUID()});assert.equal(r.error.code,'CONFLICT');assert.equal(b.rows.length,3);
});
test('daily AI budget enforced',()=>{
  const b=backend(),c=b.create().data;b.properties.AI_DAILY_LIMIT='1';b.setMode('provider-error');b.api({action:'extract',id:c.id,expectedRevision:1,requestId:crypto.randomUUID()});assert.equal(b.api({action:'extract',id:c.id,expectedRevision:1,requestId:crypto.randomUUID()}).error.code,'RATE_LIMIT');assert.equal(b.fetchCount(),1);
});
test('final report gating enforced on server, even if browser bypassed',()=>{
  const b=backend(),c=b.create().data;assert.equal(b.api({action:'report',id:c.id,expectedRevision:1,final:true}).error.code,'QUALITY');assert(b.api({action:'report',id:c.id,expectedRevision:1,final:false}).data.html.includes('DRAFT'));assert.equal(b.pdfCount(),0);
});
test('sheet header drift is detected before writing',()=>{const b=backend();b.rows[0][0]='changed';assert.equal(b.create().error.code,'CONFIG');assert.equal(b.rows.length,1);});
test('approved PDF is generated once per revision and reused on repeated export',()=>{
  const b=backend();vm.runInContext(fs.readFileSync(require.resolve('../frontend/sample.js'),'utf8'),b.ctx);
  let c=b.ctx.WorkspaceSamples.samples()[0];const C=b.ctx.WorkspaceCore,now=new Date().toISOString();
  for(const module of Object.keys(C.MODULES)){c=C.mutate(c,{type:'module',payload:{module,content:C.demoGenerate(c,module)}},now,'admin@example.com');c=C.mutate(c,{type:'approve',payload:{module,attested:true}},now,'admin@example.com');}
  b.rows.push(['fixture-123',c.id,c.revision,'fixture',now,'admin@example.com','fixture-hash',JSON.stringify(c),1]);
  const req={action:'report',id:c.id,expectedRevision:c.revision,final:true};const first=b.api(req),second=b.api(req);assert(first.ok);assert.deepEqual(first,second);assert.equal(b.pdfCount(),1);
});
test('manual module saves cannot impersonate AI provenance',()=>{
  const b=backend(),c=b.create().data;
  const r=b.api({action:'change',id:c.id,expectedRevision:1,requestId:crypto.randomUUID(),command:{type:'module',payload:{module:'audit',content:'Manual content',origin:'ai'}}});assert.equal(r.data.modules.audit.origin,'manual');
});
