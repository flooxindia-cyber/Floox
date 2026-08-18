// Floox follow/favourite experience — artists + organisers
(() => {
  'use strict';

  const DEMO_KEY = 'floox_demo_follows';
  const DEMO_ORGS = {
    'demo-org-wavelength': { id:'demo-org-wavelength', role:'organiser', name:'Wavelength Events', org_name:'Wavelength Events', org_type:'Event Agency', city:'Mumbai', bio:"Mumbai's premium event agency. We book artists for corporate galas, music festivals, weddings and private celebrations.", preferred_genres:['Live Music','Bollywood','DJ'] },
    'demo-org-rhythm-house': { id:'demo-org-rhythm-house', role:'organiser', name:'Rhythm House Productions', org_name:'Rhythm House Productions', org_type:'Event Production', city:'Delhi NCR', bio:"Delhi's go-to team for live music experiences, concert production, venue management and artist management.", preferred_genres:['Live Music','Rock','Indie'] },
    'demo-org-starlight': { id:'demo-org-starlight', role:'organiser', name:'Starlight Occasions', org_name:'Starlight Occasions', org_type:'Wedding & Events', city:'Bangalore', bio:'Creating unforgettable celebrations in Bangalore, from intimate gatherings to grand weddings and corporate events.', preferred_genres:['Bollywood','Acoustic','DJ'] },
    'demo-org-goa-beats': { id:'demo-org-goa-beats', role:'organiser', name:'Goa Beats Co.', org_name:'Goa Beats Co.', org_type:'Event Collective', city:'Goa', bio:"Goa's freshest event collective. We run beach parties, sunset DJ sessions and multi-day music festivals on the coast.", preferred_genres:['EDM','House','Techno'] }
  };

  const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const readDemo = () => { try { return new Set(JSON.parse(localStorage.getItem(DEMO_KEY) || '[]')); } catch { return new Set(); } };
  const writeDemo = set => localStorage.setItem(DEMO_KEY, JSON.stringify([...set]));
  const isDemo = id => String(id || '').startsWith('demo-org-');
  const logged = () => !!window.FLOOX?.isLoggedIn?.();

  async function isFollowed(id) {
    if (isDemo(id)) return readDemo().has(id);
    if (!logged()) return false;
    try { const d = await FLOOX.getLikes(); return new Set(d.likes || []).has(id); } catch { return false; }
  }

  async function toggleFollow(id, name, button) {
    if (!logged()) { FLOOX.toast('Sign in to follow artists and organisers.'); return; }
    button.disabled = true;
    try {
      let followed;
      if (isDemo(id)) {
        const s = readDemo(); if (s.has(id)) { s.delete(id); followed=false; } else { s.add(id); followed=true; } writeDemo(s);
      } else { const d = await FLOOX.toggleLike(id); followed = !!d.liked; }
      button.textContent = followed ? '♥' : '♡'; button.classList.toggle('followed',followed); button.title=followed?'Following':'Follow';
      FLOOX.toast(followed ? `♥ Following ${name}` : `Removed ${name} from your follows`);
      window.dispatchEvent(new CustomEvent('floox:follows-changed'));
    } catch(e) { FLOOX.toast(e.message || 'Could not update follow.'); }
    finally { button.disabled=false; }
  }

  function addFollowStyle() {
    if (document.getElementById('flooxFollowStyle')) return;
    const s=document.createElement('style'); s.id='flooxFollowStyle';
    s.textContent=`
      .floox-follow-btn{position:absolute;right:9px;top:9px;width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,255,255,.13);background:rgba(0,0,0,.42);color:#fff;font-size:18px;line-height:1;display:grid;place-items:center;z-index:5;cursor:pointer;transition:.18s}
      .floox-follow-btn:hover{transform:scale(1.06);border-color:rgba(255,214,0,.55)}
      .floox-follow-btn.followed{color:#ff4b82;background:rgba(255,45,120,.16);border-color:rgba(255,45,120,.35)}
      .floox-follow-section{margin:0 0 22px;background:#fff;border:1.5px solid var(--border);border-radius:20px;overflow:hidden}
      .floox-follow-head{padding:17px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:12px}
      .floox-follow-title{font:800 .95rem var(--head)} .floox-follow-sub{font-size:.7rem;color:var(--muted);margin-top:2px}
      .floox-follow-count{font:800 .72rem var(--head);color:var(--orange);background:rgba(255,92,0,.08);padding:5px 9px;border-radius:100px;white-space:nowrap}
      .floox-follow-body{padding:20px}.floox-follow-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .floox-follow-item{display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--border);border-radius:14px;background:var(--bg);min-width:0}
      .floox-follow-avatar{width:46px;height:46px;border-radius:13px;display:grid;place-items:center;flex:0 0 46px;background:linear-gradient(135deg,#ff5c00,#ff2d78);color:#fff;font-size:1.1rem;overflow:hidden}
      .floox-follow-avatar img{width:100%;height:100%;object-fit:cover}.floox-follow-copy{min-width:0;flex:1}.floox-follow-copy strong{display:block;font:800 .78rem var(--head);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.floox-follow-copy span{display:block;font-size:.65rem;color:var(--muted);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.floox-unfollow{border:0;background:transparent;color:var(--orange);font:800 .7rem var(--head);cursor:pointer}
      .floox-follow-empty{text-align:center;padding:18px;color:var(--muted);font-size:.75rem}.floox-follow-empty a{color:var(--orange);font-weight:800;text-decoration:none}
      @media(max-width:650px){.floox-follow-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  async function decorateOrganisers() {
    if (!document.querySelector('.org-card')) return;
    addFollowStyle();
    for (const card of [...document.querySelectorAll('.org-card')]) {
      if (card.querySelector('.floox-follow-btn')) continue;
      const onclick=card.getAttribute('onclick')||''; const m=onclick.match(/openProfile\('([^']+)'\s*,\s*'organiser'\)/); if(!m)continue;
      const id=m[1], name=card.querySelector('.org-name')?.textContent?.trim()||'organiser';
      const b=document.createElement('button'); b.className='floox-follow-btn'; b.type='button'; b.textContent='♡'; b.title='Follow'; b.setAttribute('aria-label',`Follow ${name}`);
      b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();toggleFollow(id,name,b)});
      const top=card.querySelector('.org-top'); if(top){top.style.position='relative';top.appendChild(b)}
      const followed=await isFollowed(id); b.textContent=followed?'♥':'♡'; b.classList.toggle('followed',followed); b.title=followed?'Following':'Follow';
    }
  }

  async function loadFollowedDashboard() {
    if(!/floox-dashboard-fan\.html$/i.test(location.pathname)||!logged())return;
    addFollowStyle();
    let section=document.getElementById('flooxFollowedSection');
    if(!section){const content=document.querySelector('.content');if(!content)return;section=document.createElement('section');section.id='flooxFollowedSection';section.className='floox-follow-section';content.insertBefore(section,content.children[1]||content.firstChild)}
    section.innerHTML='<div class="floox-follow-head"><div><div class="floox-follow-title">Followed artists & organisers</div><div class="floox-follow-sub">Your favourites, all in one place.</div></div><span class="floox-follow-count">Loading…</span></div><div class="floox-follow-body"><div class="floox-follow-empty">Loading your follows…</div></div>';
    try{
      const server=(await FLOOX.getLikes()).likes||[], demo=[...readDemo()], ids=[...new Set([...server,...demo])], profiles=[];
      for(const id of ids.slice(0,40)){
        try{if(DEMO_ORGS[id])profiles.push(DEMO_ORGS[id]);else{const d=await FLOOX.getProfile(id);if(d.user)profiles.push(d.user)}}catch{}
      }
      section.querySelector('.floox-follow-count').textContent=`${profiles.length} followed`;
      const body=section.querySelector('.floox-follow-body');
      if(!profiles.length){body.innerHTML='<div class="floox-follow-empty">You are not following anyone yet. <a href="floox-search-results.html">Explore artists & organisers →</a></div>';return}
      body.innerHTML='<div class="floox-follow-grid">'+profiles.map(p=>{const id=p.id,name=p.stageName||p.orgName||p.org_name||p.name||'Floox profile',role=p.role==='organiser'?'Organiser':'Artist',city=p.city||'India',img=p.avatar?`<img src="${esc(p.avatar)}" alt="">`:role==='Artist'?'🎤':'🎪';return `<div class="floox-follow-item"><div class="floox-follow-avatar">${img}</div><div class="floox-follow-copy"><strong>${esc(name)}</strong><span>${esc(role)} · ${esc(city)}</span></div><button class="floox-unfollow" data-follow-id="${esc(id)}" data-follow-name="${esc(name)}">Unfollow</button></div>`}).join('')+'</div>';
      body.querySelectorAll('[data-follow-id]').forEach(b=>b.addEventListener('click',async()=>{const id=b.dataset.followId,name=b.dataset.followName;b.disabled=true;try{if(isDemo(id)){const s=readDemo();s.delete(id);writeDemo(s)}else await FLOOX.toggleLike(id);FLOOX.toast(`Removed ${name} from your follows`);window.dispatchEvent(new CustomEvent('floox:follows-changed'));loadFollowedDashboard()}catch(e){FLOOX.toast(e.message||'Could not update follow.');b.disabled=false}}));
    }catch(e){section.querySelector('.floox-follow-count').textContent='—';section.querySelector('.floox-follow-body').innerHTML='<div class="floox-follow-empty">Your followed profiles are temporarily unavailable.</div>'}
  }

  function init(){addFollowStyle();decorateOrganisers();loadFollowedDashboard();const obs=new MutationObserver(()=>decorateOrganisers());if(document.body)obs.observe(document.body,{childList:true,subtree:true});window.addEventListener('floox:follows-changed',()=>{decorateOrganisers();loadFollowedDashboard()})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
