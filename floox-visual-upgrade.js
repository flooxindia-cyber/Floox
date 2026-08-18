// Floox visual upgrade — adds purposeful imagery where the UI would otherwise feel empty.
// Images are scene/category imagery, not fake artist identities.
(() => {
  'use strict';
  const IMG = {
    concert: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1800&q=82',
    singer: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=82',
    dj: 'https://images.unsplash.com/photo-1571266028243-d220c8f9e16a?auto=format&fit=crop&w=1200&q=82',
    band: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=82',
    crowd: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1400&q=82',
    wedding: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=82',
    event: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=82',
    stage: 'https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1400&q=82'
  };

  const css = `
    .floox-visual-strip{position:relative;overflow:hidden;border-radius:24px;min-height:220px;margin:28px 0;background-size:cover;background-position:center;display:flex;align-items:flex-end;border:1px solid rgba(255,255,255,.12);box-shadow:0 18px 50px rgba(0,0,0,.18)}
    .floox-visual-strip:after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(16,10,2,.9),rgba(16,10,2,.3) 65%,rgba(16,10,2,.05))}
    .floox-visual-copy{position:relative;z-index:1;max-width:620px;padding:28px;color:#fff}.floox-visual-copy b{display:block;font:800 1.45rem 'Clash Display',sans-serif;margin-bottom:6px}.floox-visual-copy span{display:block;color:rgba(255,255,255,.72);font-size:.82rem;line-height:1.7}
    .floox-img-fallback{background-size:cover!important;background-position:center!important}
    .floox-login-art{position:relative;overflow:hidden;background-image:linear-gradient(90deg,rgba(16,10,2,.18),rgba(16,10,2,.58)),url('${IMG.concert}');background-size:cover;background-position:center}
    .floox-dashboard-banner{position:relative;overflow:hidden;border-radius:20px;min-height:170px;margin-bottom:20px;background-size:cover;background-position:center;display:flex;align-items:flex-end}.floox-dashboard-banner:after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(16,10,2,.82),rgba(16,10,2,.18))}.floox-dashboard-banner>div{position:relative;z-index:1;padding:24px;color:#fff}.floox-dashboard-banner b{display:block;font:800 1.25rem 'Clash Display',sans-serif}.floox-dashboard-banner span{font-size:.75rem;color:rgba(255,255,255,.72)}
    @media(max-width:700px){.floox-visual-strip{min-height:190px}.floox-visual-copy{padding:20px}.floox-visual-copy b{font-size:1.15rem}}
  `;
  const style=document.createElement('style');style.id='flooxVisualUpgradeStyle';style.textContent=css;document.head.appendChild(style);

  function addStrip(host, image, title, text){
    if(!host || host.querySelector('.floox-visual-strip')) return;
    const strip=document.createElement('div');strip.className='floox-visual-strip';strip.style.backgroundImage=`url('${image}')`;strip.innerHTML=`<div class="floox-visual-copy"><b>${title}</b><span>${text}</span></div>`;host.appendChild(strip);
  }

  function homepage(){
    const photo=document.querySelector('.hero-bg-photo');
    if(photo && !photo.getAttribute('src')) photo.src=IMG.concert;
    if(photo && !photo.complete) photo.onerror=()=>{photo.src=IMG.concert};
    const section=[...document.querySelectorAll('section,main > div')].find(x=>/How Floox Works/i.test(x.textContent||''));
    if(section) addStrip(section.parentElement||section, IMG.crowd, 'The stage is the product.', 'Show people what Floox feels like — live energy, real audiences and memorable performances.');
  }

  function search(){
    document.querySelectorAll('.artist-photo,.org-avatar,.initial').forEach(el=>{
      if(el.querySelector('img') || el.dataset.flooxVisual) return;
      const text=(el.parentElement?.textContent||'').toLowerCase();
      const image=text.includes('dj')?IMG.dj:text.includes('band')?IMG.band:text.includes('singer')?IMG.singer:text.includes('wedding')?IMG.wedding:IMG.stage;
      el.classList.add('floox-img-fallback');el.style.backgroundImage=`linear-gradient(180deg,rgba(16,10,2,.05),rgba(16,10,2,.5)),url('${image}')`;el.dataset.flooxVisual='1';
      if(el.classList.contains('initial')) el.textContent='';
    });
  }

  function profile(){
    const cover=document.getElementById('cover');
    if(cover && !cover.querySelector('img')){cover.style.backgroundImage=`url('${IMG.crowd}')`;cover.style.backgroundSize='cover';cover.style.backgroundPosition='center';}
  }

  function dashboard(){
    const content=document.querySelector('.content');
    if(!content || content.querySelector('.floox-dashboard-banner')) return;
    const isArtist=/floox-dashboard-artist\.html/i.test(location.pathname),isOrg=/floox-dashboard-organiser\.html/i.test(location.pathname),isFan=/floox-dashboard-fan\.html/i.test(location.pathname);
    if(!isArtist&&!isOrg&&!isFan)return;
    const image=isArtist?IMG.stage:isOrg?IMG.event:IMG.concert;
    const title=isArtist?'Put your talent on the stage.':isOrg?'Build the event people remember.':'Discover what is happening live.';
    const text=isArtist?'Your portfolio should feel like a booking-ready professional profile.':isOrg?'Find talent, compare options and move from idea to inquiry quickly.':'Save artists, discover events and keep your live-music world in one place.';
    const banner=document.createElement('div');banner.className='floox-dashboard-banner';banner.style.backgroundImage=`url('${image}')`;banner.innerHTML=`<div><b>${title}</b><span>${text}</span></div>`;content.insertBefore(banner,content.firstChild);
  }

  function authScreens(){
    if(!/floox-(login|artist-register|organiser-register|forgot)\.html$/i.test(location.pathname))return;
    const candidates=document.querySelectorAll('main,.auth-shell,.login-card,.register-card,.page');
    candidates.forEach(el=>{const cls=(el.className||'').toString().toLowerCase();if(el && cls.includes('shell')&&!el.classList.contains('floox-login-art'))el.classList.add('floox-login-art')});
  }

  function run(){
    try{
      if(/(^|\/)index\.html$/i.test(location.pathname)||location.pathname==='/')homepage();
      if(/floox-search-results\.html$/i.test(location.pathname))search();
      if(/floox-organiser-profile\.html$/i.test(location.pathname))profile();
      dashboard();authScreens();
    }catch(e){console.warn('Floox visual upgrade:',e)}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  window.addEventListener('load',run,{once:true});
  const observer=new MutationObserver(()=>{if(/floox-search-results\.html$/i.test(location.pathname))search()});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('floox:visual-refresh',run);
})();
