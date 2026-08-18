// floox-auth.js — shared authentication, API, session and routing helper
// Floox — Vercel + Supabase
(() => {
  'use strict';
  const API='/api';
  const getToken=()=>localStorage.getItem('floox_token');
  const getUser=()=>{try{return JSON.parse(localStorage.getItem('floox_user')||'null')}catch{localStorage.removeItem('floox_user');return null}};
  const isLoggedIn=()=>!!getToken()&&!!getUser();
  const saveSession=(token,user)=>{if(token)localStorage.setItem('floox_token',token);if(user)localStorage.setItem('floox_user',JSON.stringify(user));};
  const clearSession=()=>{localStorage.removeItem('floox_token');localStorage.removeItem('floox_user');};
  const normaliseRole=r=>String(r||'').trim().toLowerCase();
  function dashboardForRole(role){switch(normaliseRole(role)){case'artist':return'floox-dashboard-artist.html';case'organiser':case'organizer':return'floox-dashboard-organiser.html';case'fan':case'user':return'floox-dashboard-fan.html';default:return'floox-public.html'}}
  const dashboardUrl=u=>dashboardForRole(u?.role);
  function goToDashboard(user=getUser()){if(!user?.role){location.href='floox-login.html';return false}location.href=dashboardForRole(user.role);return true}
  const goToHome=()=>{location.href='floox-public.html'};
  async function parseResponse(r){const text=await r.text();if(!text)return{};try{return JSON.parse(text)}catch{throw new Error(`Server returned an invalid response (${r.status}).`)}}
  async function request(endpoint,{method='GET',body,auth=false,headers={}}={}){const h={Accept:'application/json',...headers};if(body!==undefined)h['Content-Type']='application/json';if(auth){const t=getToken();if(!t)throw new Error('Authentication required. Please sign in again.');h.Authorization='Bearer '+t}let r;try{r=await fetch(API+'/'+endpoint,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)})}catch{throw new Error('Unable to connect to Floox. Please check your internet connection and try again.')}if(r.status===401&&auth)clearSession();const d=await parseResponse(r);if(!r.ok)throw new Error(d.error||d.message||`Request failed (${r.status}).`);return d}
  const apiGet=(endpoint,auth=true)=>request(endpoint,{auth});
  const apiPost=(endpoint,body={},auth=false)=>request(endpoint,{method:'POST',body,auth});
  const apiDelete=(endpoint,auth=true)=>request(endpoint,{method:'DELETE',auth});
  async function login(email,password){const d=await apiPost('login',{email:String(email||'').trim().toLowerCase(),password});if(!d.token||!d.user)throw new Error('Login response is incomplete.');saveSession(d.token,d.user);return d.user}
  const register=payload=>apiPost('register',payload);
  async function verifyOtp(email,otp,purpose='registration'){const d=await apiPost('verify-otp',{email:String(email||'').trim().toLowerCase(),otp:String(otp||'').trim(),purpose});if(d.token&&d.user)saveSession(d.token,d.user);return d}
  const resendOtp=(email,purpose='registration')=>apiPost('resend-otp',{email:String(email||'').trim().toLowerCase(),purpose});
  const forgotPassword=email=>apiPost('forgot-password',{email:String(email||'').trim().toLowerCase()});
  const resetPassword=(email,otp,newPassword)=>apiPost('reset-password',{email:String(email||'').trim().toLowerCase(),otp:String(otp||'').trim(),newPassword});
  const changePassword=(currentPassword,newPassword)=>apiPost('change-password',{currentPassword,newPassword},true);
  const logout=(redirect='floox-public.html')=>{clearSession();location.href=redirect||'floox-public.html'};
  async function getMe(){const d=await apiGet('me',true);if(!d.user)throw new Error('Invalid user response.');saveSession(getToken(),d.user);return d.user}
  async function updateMe(fields){const d=await apiPost('me',fields,true);if(d.user)saveSession(getToken(),d.user);return d}
  async function saveArtistProfile(fields){const d=await apiPost('artist-profile',fields,true);if(d.user)saveSession(getToken(),d.user);return d}
  async function saveOrganiserProfile(fields){const d=await apiPost('organiser-profile',fields,true);if(d.user)saveSession(getToken(),d.user);return d}
  const getProfile=async id=>{const d=await apiGet('get-profile?id='+encodeURIComponent(id),true);if(d&&d.profileViewsRemaining!==undefined){window.dispatchEvent(new CustomEvent('floox:profile-quota',{detail:{remaining:Number(d.profileViewsRemaining),limit:Number(d.profileViewLimit||5)}}));window.FlooxProfileQuota?.render?.(Number(d.profileViewsRemaining),Number(d.profileViewLimit||5));}return d};
  const getArtists=params=>apiGet('artists'+(params&&Object.keys(params).length?'?'+new URLSearchParams(params):''),false);
  const getOrganisers=params=>apiGet('organisers'+(params&&Object.keys(params).length?'?'+new URLSearchParams(params):''),false);
  const getUsers=params=>apiGet('users'+(params&&Object.keys(params).length?'?'+new URLSearchParams(params):''),false);
  const getEvents=params=>apiGet('events'+(params&&Object.keys(params).length?'?'+new URLSearchParams(params):''),false);
  const toggleLike=likedId=>apiPost('toggle-like',{likedId},true);
  const getLikes=()=>apiGet('get-likes',true);
  const revealContact=profileId=>apiPost('reveal-contact',{profileId},true);
  const getRevealsRemaining=()=>apiGet('get-reveals-remaining',true);
  const sendMessage=payload=>apiPost('send-message',payload,true);
  const getMessages=params=>apiGet('messages'+(params&&Object.keys(params).length?'?'+new URLSearchParams(params):''),true);
  const markMessagesRead=senderId=>apiPost('mark-messages-read',{senderId},true);
  function fileToBase64(file){return new Promise((resolve,reject)=>{if(!file)return reject(new Error('No file selected.'));const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Could not read the selected file.'));r.readAsDataURL(file)})}
  async function uploadFile(file,mediaType='image',onProgress){if(!file)throw new Error('Please select a file.');if(!getToken())throw new Error('Not logged in. Please sign in again.');onProgress?.(10);const base64=await fileToBase64(file);onProgress?.(35);const d=await apiPost('upload-media',{fileData:base64,fileName:file.name,fileType:file.type,mediaType},true);onProgress?.(100);return d}
  function requireAuth(role){const u=getUser();if(!getToken()||!u){clearSession();location.href='floox-login.html';return null}if(role){const a=normaliseRole(u.role),w=normaliseRole(role);const same=(w==='organiser'||w==='organizer')&&(a==='organiser'||a==='organizer');if(a!==w&&!same){location.href=dashboardForRole(a);return null}}return u}
  function redirectIfLoggedIn(){const u=getUser();if(!getToken()||!u)return false;return goToDashboard(u)}
  function toast(msg,type='info'){let el=document.getElementById('flooxToast');if(!el){el=document.createElement('div');el.id='flooxToast';el.style.cssText='position:fixed;bottom:2rem;left:50%;transform:translateX(-50%) translateY(80px);z-index:99999;background:#1C1000;color:#fff;border-radius:100px;padding:.85rem 1.5rem;font-size:.85rem;opacity:0;transition:.3s;pointer-events:none;box-shadow:0 8px 28px rgba(0,0,0,.4);max-width:90vw;text-align:center';document.body.appendChild(el)}el.textContent=String(msg||'');el.style.transform='translateX(-50%) translateY(0)';el.style.opacity='1';clearTimeout(el._flooxTimer);el._flooxTimer=setTimeout(()=>{el.style.transform='translateX(-50%) translateY(80px)';el.style.opacity='0'},4000)}
  const fmtBytes=b=>{b=Number(b)||0;return b<1024?b+' B':b<1048576?(b/1024).toFixed(1)+' KB':(b/1048576).toFixed(1)+' MB'};
  function updateNav(){const u=getUser();document.querySelectorAll('[data-auth="login"]').forEach(e=>e.style.display=u?'none':'inline-flex');document.querySelectorAll('[data-auth="logout"]').forEach(e=>e.style.display=u?'inline-flex':'none');document.querySelectorAll('[data-auth="username"]').forEach(e=>e.textContent=String(u?.name||u?.email||'User').split(' ')[0]);document.querySelectorAll('[data-auth="dashboard"]').forEach(e=>{if(u){e.style.display='inline-flex';e.href=dashboardForRole(u.role);if(!e.dataset.flooxBound){e.dataset.flooxBound='1';e.addEventListener('click',ev=>{ev.preventDefault();goToDashboard(getUser())})}}else e.style.display='none'})}
  window.FLOOX={getToken,getUser,isLoggedIn,saveSession,clearSession,normaliseRole,dashboardForRole,dashboardUrl,goToDashboard,goToHome,requireAuth,redirectIfLoggedIn,apiGet,apiPost,apiDelete,login,register,verifyOtp,resendOtp,forgotPassword,resetPassword,changePassword,logout,getMe,updateMe,saveArtistProfile,saveOrganiserProfile,getProfile,getArtists,getOrganisers,getUsers,getEvents,toggleLike,getLikes,revealContact,getRevealsRemaining,sendMessage,getMessages,markMessagesRead,fileToBase64,uploadFile,updateNav,toast,fmtBytes};
  document.addEventListener('DOMContentLoaded',()=>{try{updateNav();loadScript('floox-visual-upgrade.js','flooxVisualUpgrade');document.querySelectorAll('.sb-nav').forEach(nav=>{if(!nav.querySelector('[data-floox-messages]')){const a=document.createElement('a');a.className='sb-link';a.href='floox-messages.html';a.dataset.flooxMessages='1';a.innerHTML='<span class="sb-icon">✉</span>Messages';nav.appendChild(a)}})}catch(e){console.error('Floox navigation error:',e)}});
  function loadScript(file,marker){if(document.querySelector(`script[data-${marker}]`))return;const s=document.createElement('script');s.src=file+'?v=20260818-8';s.async=false;s.dataset[marker]='1';document.head.appendChild(s)}
  if(/floox-dashboard-organiser\.html$/i.test(location.pathname)){const load=()=>{loadScript('organiser-dashboard-live.js','flooxOrganiserLive');loadScript('floox-marketplace.js','flooxMarketplace')};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load()}
  if(/floox-dashboard-artist\.html$/i.test(location.pathname)){const load=()=>{loadScript('artist-dashboard-live.js','flooxArtistLive');loadScript('artist-dashboard-polish.js','flooxArtistPolish');loadScript('floox-marketplace.js','flooxMarketplace')};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load()}
  if(/floox-dashboard-fan\.html$/i.test(location.pathname)){const load=()=>{loadScript('floox-follows.js','flooxFollows');loadScript('floox-marketplace.js','flooxMarketplace')};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load()}
  if(/floox-search-results\.html$/i.test(location.pathname)){const load=()=>{loadScript('floox-follows.js','flooxFollows');loadScript('floox-marketplace.js','flooxMarketplace');loadScript('floox-profile-view-quota.js','flooxProfileQuota');loadScript('floox-booking-profile.js','flooxBookingProfile')};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load()}
  if(/floox-(organiser-profile|profile)\.html$/i.test(location.pathname)){const load=()=>loadScript('floox-profile-view-quota.js','flooxProfileQuota');if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load()}
  if(/(^|\/)index\.html$/i.test(location.pathname)||location.pathname==='/' ){
    const style=document.createElement('style');style.textContent='.rv.visible{opacity:1!important;transform:translateY(0)!important;}';document.head.appendChild(style);
    const load=()=>{loadScript('organiser-cards-live.js','flooxOrganiserCards');loadScript('organiser-search-demo.js','flooxOrganiserDemoSearch')};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load()
  }
})();
