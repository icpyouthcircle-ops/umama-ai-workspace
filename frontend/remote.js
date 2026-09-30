const config=window.WORKSPACE_CONFIG||{};
const appRoot=document.getElementById('app');
const brand='<div class="brand"><div class="brand-mark">u.</div><div><div class="brand-name">umama<span style="color:#719b7c">.</span></div><div class="brand-caption">AI WORKSPACE</div></div></div>';

function login(message=''){
  appRoot.innerHTML=`<div class="login"><section class="login-story">${brand}<div class="eyebrow">LinkedIn Client Operations</div><h1>Thoughtful strategy.<br>Exceptional client work.</h1><p>Secure client operations, hosted on GitHub and protected by Google sign-in.</p><div class="login-steps"><span>01 &nbsp; Understand</span><span>02 &nbsp; Create</span><span>03 &nbsp; Deliver</span></div></section><section class="login-form"><div class="login-card"><div class="eyebrow muted" style="margin-bottom:16px">PRIVATE WORKSPACE</div><h2>Continue with Google</h2><p>Only an approved administrator account can open client records.</p><button id="remote-sign-in" class="btn primary" type="button">Continue with Google</button>${message?`<div class="notice error" style="margin-top:18px">${WorkspaceCore.esc(message)}</div>`:''}<div class="notice" style="margin-top:18px">The interface is hosted on GitHub Pages. Client records, Drive files and Gemini credentials remain in the private Google backend.</div><p class="small muted">Umama AI Workspace</p></div></section></div>`;
}

function validateConfig(){
  const f=config.firebase||{};
  if(!/^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(config.apiUrl||''))throw new Error('The private API URL is not configured.');
  for(const key of ['apiKey','authDomain','projectId','appId'])if(!String(f[key]||'').trim())throw new Error('Google sign-in is not configured.');
}

validateConfig();
const [{initializeApp},{getAuth,GoogleAuthProvider,signInWithPopup,signOut,setPersistence,browserSessionPersistence,onAuthStateChanged}]=await Promise.all([
  import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
  import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js')
]);
const firebaseApp=initializeApp(config.firebase,'umama-workspace');
const auth=getAuth(firebaseApp);
await setPersistence(auth,browserSessionPersistence);
window.UMAMA_REMOTE_AUTH=Object.freeze({signOut:()=>signOut(auth)});

function installBridge(user){
  const runner={
    _success:null,_failure:null,
    withSuccessHandler(fn){const next=Object.create(this);next._success=fn;return next;},
    withFailureHandler(fn){const next=Object.create(this);next._failure=fn;return next;},
    async api(request){
      try{
        const idToken=await user.getIdToken();
        const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),120000);
        let response;
        try{response=await fetch(config.apiUrl,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({...request,idToken}),redirect:'follow',signal:controller.signal});}
        finally{clearTimeout(timer);}
        if(!response.ok)throw new Error('The private server could not complete this request.');
        const result=await response.json();
        if(auth.currentUser!==user)throw new Error('The signed-in account changed. Reload and sign in again.');
        if(this._success)this._success(result);
      }catch(error){if(this._failure)this._failure(error);}
    }
  };
  window.google={script:{run:runner}};
  const script=document.createElement('script');script.src='app.js';script.onerror=()=>login('The workspace interface could not be loaded. Refresh and try again.');document.body.appendChild(script);
}

let started=false;
onAuthStateChanged(auth,user=>{
  if(user&&!started){started=true;installBridge(user);return;}
  if(!user){started=false;login();const button=document.getElementById('remote-sign-in');button.onclick=async()=>{button.disabled=true;try{await signInWithPopup(auth,new GoogleAuthProvider());}catch(error){login(error.code==='auth/popup-closed-by-user'?'Google sign-in was closed. Please try again.':'Google sign-in could not be completed. Check the account and try again.');}};}
});
