/* Floox Frontend Demo Connector
 * Frontend-first mode: makes the entire UI usable without backend services.
 * Set window.FLOOX_BACKEND_ENABLED = true before this script to bypass the mock.
 * Demo OTP: 123456
 */
(function(){
  if (window.FLOOX_BACKEND_ENABLED === true) return;

  const KEY = 'floox_demo_db_v1';
  const TOKEN_KEY = 'floox_token';
  const USER_KEY = 'floox_user';
  const DEMO_OTP = '123456';

  const seedArtists = [
    {id:'demo-a1',role:'artist',email:'arjun@demo.floox.in',name:'Arjun Mehta',phone:'9876500011',city:'Delhi',state:'Delhi',verified:true,profile_complete:true,stage_name:'Arjun Live',genres:['Bollywood','Sufi / Ghazal'],performer_type:'Singer',bio:'Versatile live vocalist for weddings, corporate evenings and intimate gigs.',avatar:'',min_fee:'₹45K',experience:'8 years',social_links:{instagram:'@arjunlive',youtube:'Arjun Live'}},
    {id:'demo-a2',role:'artist',email:'riya@demo.floox.in',name:'Riya Kapoor',phone:'9876500012',city:'Mumbai',state:'Maharashtra',verified:true,profile_complete:true,stage_name:'Riya Kapoor',genres:['Indie / Folk','Rock / Pop'],performer_type:'Singer-songwriter',bio:'Soulful indie-pop artist with an acoustic-first live set.',avatar:'',min_fee:'₹55K',experience:'6 years',social_links:{instagram:'@riyakapoor'}},
    {id:'demo-a3',role:'artist',email:'djveer@demo.floox.in',name:'Veer Singh',phone:'9876500013',city:'Bangalore',state:'Karnataka',verified:true,profile_complete:true,stage_name:'DJ Veer',genres:['Electronic / DJ','Bollywood'],performer_type:'DJ',bio:'High-energy DJ for clubs, college festivals, weddings and brand events.',avatar:'',min_fee:'₹35K',experience:'7 years',social_links:{instagram:'@djveer'}},
    {id:'demo-a4',role:'artist',email:'meera@demo.floox.in',name:'Meera Nair',phone:'9876500014',city:'Jaipur',state:'Rajasthan',verified:true,profile_complete:true,stage_name:'Meera Nair',genres:['Classical','Devotional'],performer_type:'Vocalist',bio:'Classical vocalist blending tradition with contemporary event programming.',avatar:'',min_fee:'₹60K',experience:'10 years',social_links:{instagram:'@meeranairofficial'}},
    {id:'demo-a5',role:'artist',email:'kabir@demo.floox.in',name:'Kabir Khanna',phone:'9876500015',city:'Delhi',state:'Delhi',verified:true,profile_complete:true,stage_name:'Kabir Khanna',genres:['Rock / Pop','Indie / Folk'],performer_type:'Band',bio:'Live band bringing modern pop-rock energy to festivals and private events.',avatar:'',min_fee:'₹75K',experience:'9 years',social_links:{instagram:'@kabirkhanna'}},
    {id:'demo-a6',role:'artist',email:'sara@demo.floox.in',name:'Sara Ali',phone:'9876500016',city:'Hyderabad',state:'Telangana',verified:true,profile_complete:true,stage_name:'Sara Ali',genres:['Sufi / Ghazal','Bollywood'],performer_type:'Singer',bio:'Warm, expressive vocals for premium weddings and curated evenings.',avatar:'',min_fee:'₹50K',experience:'5 years',social_links:{instagram:'@saraali.music'}},
    {id:'demo-a7',role:'artist',email:'rohan@demo.floox.in',name:'Rohan Batra',phone:'9876500017',city:'Chandigarh',state:'Punjab',verified:true,profile_complete:true,stage_name:'Rohan Batra',genres:['Electronic / DJ','Rock / Pop'],performer_type:'DJ',bio:'Festival-ready DJ and producer with a broad commercial set.',avatar:'',min_fee:'₹40K',experience:'5 years',social_links:{instagram:'@rohanbatra'}},
    {id:'demo-a8',role:'artist',email:'ananya@demo.floox.in',name:'Ananya Rao',phone:'9876500018',city:'Chennai',state:'Tamil Nadu',verified:true,profile_complete:true,stage_name:'Ananya Rao',genres:['Classical','Indie / Folk'],performer_type:'Vocalist',bio:'Contemporary classical artist for cultural, corporate and intimate formats.',avatar:'',min_fee:'₹65K',experience:'11 years',social_links:{instagram:'@ananyarao.music'}}
  ];

  const seedOrganisers = [
    {id:'demo-o1',role:'organiser',email:'events@demo.floox.in',name:'Aarav Events',phone:'9000000001',city:'Delhi',verified:true,profile_complete:true,org_name:'Aarav Events',org_type:'Event Agency',bio:'Premium event production and artist booking.',avatar:''},
    {id:'demo-o2',role:'organiser',email:'studio@demo.floox.in',name:'Studio Nine',phone:'9000000002',city:'Mumbai',verified:true,profile_complete:true,org_name:'Studio Nine',org_type:'Venue',bio:'Live entertainment and curated experiences.',avatar:''}
  ];

  function initial(){
    const existing = localStorage.getItem(KEY);
    if(existing) return JSON.parse(existing);
    const db={users:[...seedArtists,...seedOrganisers],passwords:{},likes:{},messages:[],reveals:{},events:[]};
    seedArtists.forEach(u=>db.passwords[u.email]='demo12345');
    seedOrganisers.forEach(u=>db.passwords[u.email]='demo12345');
    localStorage.setItem(KEY,JSON.stringify(db)); return db;
  }
  function db(){return JSON.parse(localStorage.getItem(KEY)||JSON.stringify(initial()));}
  function save(d){localStorage.setItem(KEY,JSON.stringify(d));}
  function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}})}
  function authUser(){
    try{return JSON.parse(localStorage.getItem(USER_KEY)||'null')}catch{return null}
  }
  function tokenUser(token){return authUser() && token ? authUser() : null}
  function publicUser(u){
    if(!u)return null;
    const {password_hash,...safe}=u; return safe;
  }
  function filterArtists(list,url){
    const p=url.searchParams; const genre=(p.get('genre')||'').toLowerCase(), city=(p.get('city')||'').toLowerCase(), q=(p.get('q')||'').toLowerCase();
    let out=list.filter(a=>{
      const hay=[a.name,a.stage_name,a.city,a.bio,...(a.genres||[])].join(' ').toLowerCase();
      return (!genre || (a.genres||[]).some(g=>g.toLowerCase().includes(genre))) && (!city || a.city.toLowerCase().includes(city)) && (!q || hay.includes(q));
    });
    const offset=Number(p.get('offset')||0), limit=Math.min(Number(p.get('limit')||20),50);
    return {artists:out.slice(offset,offset+limit).map(publicUser),total:out.length,offset,limit};
  }
  function wrapFetch(original){
    return async function(input,opts){
      const raw=typeof input==='string'?input:(input&&input.url)||'';
      if(!raw.includes('/api/') && !raw.includes('/api/')) return original(input,opts);
      const url=new URL(raw,location.origin); let path=url.pathname;
      const method=((opts&&opts.method)||'GET').toUpperCase(); let body={};
      try{body=opts&&opts.body?JSON.parse(opts.body):{}}catch{}
      const d=db(); const current=authUser();
      if(path==='/api/login'&&method==='POST'){
        const email=String(body.email||'').trim().toLowerCase(); const u=d.users.find(x=>x.email.toLowerCase()===email);
        if(!u)return json({error:'No account found with this email. Please sign up first.'},401);
        if(d.passwords[email]!==body.password)return json({error:'Incorrect password. Please try again.'},401);
        localStorage.setItem(USER_KEY,JSON.stringify(u)); localStorage.setItem(TOKEN_KEY,'demo-token-'+u.id);
        return json({token:'demo-token-'+u.id,user:publicUser(u)});
      }
      if(path==='/api/register'&&method==='POST'){
        const email=String(body.email||'').trim().toLowerCase();
        if(d.users.some(x=>x.email.toLowerCase()===email))return json({error:'An account with this email already exists.'},409);
        if(!body.password||body.password.length<8)return json({error:'Password must be at least 8 characters.'},400);
        const u={id:'demo-'+Math.random().toString(36).slice(2,10),role:body.role||'fan',email,name:body.name||'',phone:body.phone||'',city:body.city||'',state:body.state||'',verified:false,profile_complete:false,created_at:new Date().toISOString(),...(body.data||{})};
        if(body.role==='artist'){u.stage_name=u.stageName||body.data?.stageName||u.name;u.genres=body.data?.genres||[];u.performer_type=body.data?.performerType||'';u.bio=body.data?.bio||'';u.min_fee=body.data?.minFee||'';}
        if(body.role==='organiser'){u.org_name=body.data?.orgName||u.name;u.org_type=body.data?.orgType||'Event Organiser';u.bio=body.data?.bio||'';}
        d.users.push(u);d.passwords[email]=body.password;save(d);
        localStorage.setItem('floox_pending_otp',JSON.stringify({email,code:DEMO_OTP,userId:u.id,expires:Date.now()+10*60*1000}));
        return json({message:'Account created. Please verify your email with the OTP.',userId:u.id,requiresOtp:true,devOtp:DEMO_OTP});
      }
      if(path==='/api/verify-otp'&&method==='POST'){
        const p=JSON.parse(localStorage.getItem('floox_pending_otp')||'null'); if(!p||p.email!==String(body.email||'').trim().toLowerCase())return json({error:'No pending verification found.'},400);
        if(Date.now()>p.expires)return json({error:'OTP expired. Please request a new one.'},400);
        if(String(body.otp||'')!==p.code)return json({error:'Invalid OTP.'},400);
        const u=d.users.find(x=>x.id===p.userId); if(u){u.verified=true;u.profile_complete=u.profile_complete||false;save(d);localStorage.removeItem('floox_pending_otp');localStorage.setItem(USER_KEY,JSON.stringify(u));localStorage.setItem(TOKEN_KEY,'demo-token-'+u.id);}
        return json({message:'Email verified successfully.',user:publicUser(u),token:'demo-token-'+u.id});
      }
      if(path==='/api/resend-otp'&&method==='POST'){
        const p=JSON.parse(localStorage.getItem('floox_pending_otp')||'null'); if(!p||p.email!==String(body.email||'').trim().toLowerCase())return json({error:'No pending verification found.'},400);
        p.code=DEMO_OTP;p.expires=Date.now()+10*60*1000;localStorage.setItem('floox_pending_otp',JSON.stringify(p));return json({message:'OTP resent.',devOtp:DEMO_OTP});
      }
      if(path==='/api/me'){
        if(!current)return json({error:'Authentication required.'},401);
        if(method==='GET')return json({user:publicUser(d.users.find(x=>x.id===current.id)||current)});
        const u=d.users.find(x=>x.id===current.id); Object.assign(u,body);save(d);localStorage.setItem(USER_KEY,JSON.stringify(u));return json({user:publicUser(u),message:'Profile updated successfully.'});
      }
      if(path==='/api/artists')return json(filterArtists(d.users.filter(x=>x.role==='artist'&&x.verified!==false),url));
      if(path==='/api/organisers')return json({organisers:d.users.filter(x=>x.role==='organiser').map(publicUser),total:d.users.filter(x=>x.role==='organiser').length,offset:0,limit:20});
      if(path==='/api/get-profile'){
        const u=d.users.find(x=>x.id===url.searchParams.get('id')); if(!u)return json({error:'Profile not found.'},404);return json({user:publicUser(u)});
      }
      if(path==='/api/artist-profile'&&method==='POST'){
        if(!current)return json({error:'Authentication required.'},401);const u=d.users.find(x=>x.id===current.id);Object.assign(u,body,{profile_complete:true});save(d);localStorage.setItem(USER_KEY,JSON.stringify(u));return json({user:publicUser(u),message:'Artist profile saved.'});
      }
      if(path==='/api/organiser-profile'&&method==='POST'){
        if(!current)return json({error:'Authentication required.'},401);const u=d.users.find(x=>x.id===current.id);Object.assign(u,body,{profile_complete:true});save(d);localStorage.setItem(USER_KEY,JSON.stringify(u));return json({user:publicUser(u),message:'Organiser profile saved.'});
      }
      if(path==='/api/change-password'&&method==='POST'){
        if(!current)return json({error:'Authentication required.'},401);const u=d.users.find(x=>x.id===current.id);if(d.passwords[u.email]!==body.currentPassword)return json({error:'Current password is incorrect.'},400);d.passwords[u.email]=body.newPassword;save(d);return json({message:'Password changed successfully.'});
      }
      if(path==='/api/forgot-password'&&method==='POST'){
        const email=String(body.email||'').trim().toLowerCase(); if(!d.users.some(x=>x.email.toLowerCase()===email))return json({message:'If this email is registered, an OTP has been sent.'});localStorage.setItem('floox_reset_otp',JSON.stringify({email,code:DEMO_OTP,expires:Date.now()+10*60*1000}));return json({message:'OTP sent.',devOtp:DEMO_OTP});
      }
      if(path==='/api/reset-password'&&method==='POST'){
        const p=JSON.parse(localStorage.getItem('floox_reset_otp')||'null');if(!p||p.email!==String(body.email||'').trim().toLowerCase()||p.code!==String(body.otp||''))return json({error:'Invalid or expired OTP.'},400);if(Date.now()>p.expires)return json({error:'OTP expired.'},400);d.passwords[p.email]=body.newPassword;save(d);localStorage.removeItem('floox_reset_otp');return json({message:'Password reset successfully.'});
      }
      if(path==='/api/toggle-like'&&method==='POST'){
        if(!current)return json({error:'Authentication required.'},401);const id=String(body.likedId||body.id);d.likes[current.id]=d.likes[current.id]||[];const i=d.likes[current.id].indexOf(id);if(i>=0)d.likes[current.id].splice(i,1);else d.likes[current.id].push(id);save(d);return json({liked:i<0});
      }
      if(path==='/api/get-likes')return json({likes:(current&&d.likes[current.id])||[]});
      if(path==='/api/send-message'&&method==='POST'){
        if(!current)return json({error:'Authentication required.'},401);d.messages.push({id:'m-'+Date.now(),sender_id:current.id,receiver_id:body.receiverId||body.to,message:body.message||'',created_at:new Date().toISOString(),status:'sent'});save(d);return json({message:'Message sent successfully.'});
      }
      if(path==='/api/get-reveals-remaining')return json({remaining:5});
      if(path==='/api/reveal-contact'&&method==='POST'){
        const u=d.users.find(x=>x.id===body.profileId||x.id===body.revealedId);if(!u)return json({error:'Profile not found.'},404);return json({contact:{phone:u.phone,email:u.email},remaining:4});
      }
      if(path==='/api/upload-media'&&method==='POST')return json({url:'',secure_url:'',message:'Demo upload complete.'});
      if(path==='/api/delete-account'&&method==='POST'){
        if(!current)return json({error:'Authentication required.'},401);d.users=d.users.filter(x=>x.id!==current.id);delete d.passwords[current.email];save(d);localStorage.removeItem(USER_KEY);localStorage.removeItem(TOKEN_KEY);return json({message:'Account deleted.'});
      }
      return json({error:'Demo connector: endpoint not implemented yet.'},501);
    };
  }

  const originalFetch=window.fetch.bind(window); window.fetch=wrapFetch(originalFetch);
  window.FLOOX_DEMO={enabled:true,otp:DEMO_OTP,reset(){localStorage.removeItem(KEY);localStorage.removeItem(USER_KEY);localStorage.removeItem(TOKEN_KEY);location.reload();}};

  // Inject OTP verification modal used by registration pages and forgot-password UI.
  function ensureModal(){
    if(document.getElementById('flooxOtpModal'))return;
    const style=document.createElement('style');style.textContent=`#flooxOtpModal{position:fixed;inset:0;background:rgba(10,8,20,.72);backdrop-filter:blur(10px);z-index:99999;display:none;align-items:center;justify-content:center;padding:20px}#flooxOtpModal.on{display:flex}.floox-otp-card{width:min(430px,100%);background:#fff;border-radius:24px;padding:28px;box-shadow:0 25px 80px rgba(0,0,0,.3)}.floox-otp-card h3{margin:0 0 8px;font:800 1.35rem/1.2 Bricolage Grotesque,system-ui}.floox-otp-card p{color:#6b7280;line-height:1.6;margin:0 0 18px}.floox-otp-input{width:100%;box-sizing:border-box;font-size:2rem;letter-spacing:.55em;text-align:center;padding:13px;border:1px solid #ddd;border-radius:14px}.floox-otp-actions{display:flex;gap:10px;margin-top:14px}.floox-otp-actions button{flex:1;border:0;border-radius:12px;padding:12px;font-weight:700;cursor:pointer}.floox-otp-primary{background:#111827;color:white}.floox-otp-secondary{background:#f3f4f6;color:#374151}.floox-otp-hint{font-size:.8rem;color:#8b5cf6;margin-top:12px;padding:10px;background:#f5f3ff;border-radius:10px}`;document.head.appendChild(style);
    const m=document.createElement('div');m.id='flooxOtpModal';m.innerHTML=`<div class="floox-otp-card"><h3>Verify your email</h3><p id="flooxOtpText">Enter the 6-digit OTP sent to your email.</p><input id="flooxOtpInput" class="floox-otp-input" maxlength="6" inputmode="numeric" autocomplete="one-time-code" placeholder="••••••"><div class="floox-otp-actions"><button class="floox-otp-secondary" id="flooxOtpCancel">Cancel</button><button class="floox-otp-primary" id="flooxOtpVerify">Verify & Continue</button></div><div class="floox-otp-hint">Frontend preview mode · Demo OTP: <b>123456</b></div></div>`;document.body.appendChild(m);
  }
  window.addEventListener('DOMContentLoaded',ensureModal);

  window.FLOOX_DEMO_OTP_VERIFY=async function(email){
    ensureModal(); const m=document.getElementById('flooxOtpModal'); const inp=document.getElementById('flooxOtpInput');m.classList.add('on');inp.value='';setTimeout(()=>inp.focus(),50);
    return new Promise((resolve,reject)=>{const clean=()=>{m.classList.remove('on');document.getElementById('flooxOtpCancel').onclick=null;document.getElementById('flooxOtpVerify').onclick=null};document.getElementById('flooxOtpCancel').onclick=()=>{clean();reject(new Error('Email verification cancelled.'))};document.getElementById('flooxOtpVerify').onclick=async()=>{try{const r=await fetch('/api/verify-otp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,otp:inp.value})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Verification failed');clean();resolve(d)}catch(e){alert(e.message)}}});
  };
})();
