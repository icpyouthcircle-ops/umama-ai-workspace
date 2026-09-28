/* Entirely fictional presentation data. No real clients or results. */
(function(root){
  const C=root.WorkspaceCore;
  const raw=`Role: Brand identity designer\nAudience: Early-stage B2B founders\nOffer: Brand identity and visual systems\nGoal: Start conversations with aligned founders\nTone: Clear, thoughtful and approachable\nCTA: Message me to discuss your brand\nExperience: Independent identity design, from discovery to visual guidelines\nProof: A sample portfolio project with a documented design process`;
  function samples(){
    const now=new Date().toISOString();
    const first=C.create({name:'Ayesha Khan',service:'Full profile',url:'',raw,consent:true},'demo-ayesha',now,'Demo admin');
    let a=C.mutate(first,{type:'extract',payload:C.demoExtract(raw)},now,'Demo admin');
    for(const f of a.facts) a=C.mutate(a,{type:'fact',payload:{id:f.id,value:f.value,status:'verified',evidence:'Fictional presentation fixture; not real-world verification.'}},now,'Demo admin');
    for(const key of ['audit','positioning','headline']) {
      a=C.mutate(a,{type:'module',payload:{module:key,content:C.demoGenerate(a,key)}},now,'Demo admin');
      if(key==='audit'||key==='positioning') a=C.mutate(a,{type:'approve',payload:{module:key,attested:true}},now,'Demo admin');
    }
    let b=C.create({name:'Omar Siddiqui',service:'Brand strategy',url:'',raw:'Role: Product consultant\nAudience: SaaS product teams\nOffer: Product discovery workshops\nGoal: Build a consistent professional presence',consent:true},'demo-omar',now,'Demo admin');
    b=C.mutate(b,{type:'extract',payload:C.demoExtract(b.raw)},now,'Demo admin');
    const d=C.create({name:'Sara Malik',service:'Profile audit',url:'',raw:'Role: Operations specialist\nGoal: Explain my experience clearly to potential employers',consent:true},'demo-sara',now,'Demo admin');
    return [a,b,d];
  }
  root.WorkspaceSamples={samples,raw};
})(globalThis);
