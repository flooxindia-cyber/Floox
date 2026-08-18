// Floox product upgrade: discovery planner, portfolio-style profiles and live marketplace activity.
(() => {
  'use strict';
  const F = window.FLOOX;
  if (!F) return;
  const esc = s => String(s ?? '').replace(/[&<>\'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
  const img = {
    concert:'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80',
    singer:'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80',
    dj:'https://images.unsplash.com/photo-1571266028243-d220c8f9e16a?auto=format&fit=crop&w=900&q=80',
    band:'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=900&q=80',
    event:'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=80'
  };
  const css = `
    .fxp-section{margin:26px 0;border:1px solid rgba(255,255,255,.1);border-radius:22px;background:rgba(255,255,255,.045);overflow:hidden}
    .fxp-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;padding:22px}.fxp-head h2{font:800 1.15rem 'Clash Display',sans-serif;margin:0}.fxp-head p{margin:5px 0 0;color:rgba(255,255,255,.52);font-size:.72rem;line-height:1.6}.fxp-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:0 22px 22px}.fxp-card{overflow:hidden;border:1px solid rgba(255,255,255,.1);border-radius:16px;background:rgba(0,0,0,.16)}.fxp-card-img{height:145px;background-size:cover;background-position:center}.fxp-card-body{padding:13px}.fxp-card-body b{display:block;font:800 .9rem 'Clash Display',sans-serif}.fxp-meta{font-size:.65rem;color:rgba(255,255,255,.5);margin-top:4px}.fxp-btn{display:inline-flex;align-items:center;justify-content:center;margin-top:10px;border:0;border-radius:100px;padding:8px 12px;background:linear-gradient(135deg,#ff5c00,#ff2d78);color:#fff;font:800 .65rem 'Cabinet Grotesk',sans-serif;cursor:pointer}.fxp-btn.alt{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12)}
    .fxp-planner{padding:20px 22px 22px;background:linear-gradient(135deg,rgba(255,92,0,.08),rgba(255,45,120,.04))}.fxp-form{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}.fxp-form input,.fxp-form select{width:100%;background:rgba(0,0,0,.22);border:1px solid rgba(255,255,255,.13);color:#fff;border-radius:11px;padding:10px 11px;outline:0;font-size:.72rem}.fxp-form input:focus,.fxp-form select:focus{border-color:rgba(255,92,0,.55)}.fxp-form .wide{grid-column:span 2}.fxp-results{margin-top:14px}.fxp-match{display:flex;align-items:center;gap:12px;padding:11px;border:1px solid rgba(255,255,255,.1);border-radius:14px;margin-top:8px;background:rgba(0,0,0,.16)}.fxp-match-img{width:48px;height:48px;border-radius:12px;background-size:cover;background-position:center;flex:0 0 auto}.fxp-match-main{flex:1;min-width:0}.fxp-match-main b{font-size:.78rem}.fxp-match-main span{display:block;color:rgba(255,255,255,.5);font-size:.63rem;margin-top:2px}.fxp-score{font:900 .72rem 'Clash Display';color:#ffd600}.fxp-empty{padding:22px;color:rgba(255,255,255,.48);font-size:.7rem;text-align:center}
    .fxp-portfolio{margin-top:18px}.fxp-media-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:0 22px 22px}.fxp-media{min-height:145px;border-radius:15px;border:1px solid rgba(255,255,255,.1);overflow:hidden;background-size:cover;background-position:center;position:relative}.fxp-media:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,rgba(0,0,0,.75))}.fxp-media span{position:absolute;z-index:1;bottom:10px;left:10px;right:10px;font-size:.65rem;color:#fff}.fxp-specs{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;padding:0 22px 22px}.fxp-spec{padding:11px 12px;border-radius:13px;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.14)}.fxp-spec small{display:block;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,.35);font-size:.53rem;font-weight:800}.fxp-spec b{display:block;font-size:.68rem;margin-top:3px}
    @media(max-width:800px){.fxp-grid{grid-template-columns:1fr 1fr}.fxp-form{grid-template-columns:1fr 1fr}.fxp-form .wide{grid-column:auto}.fxp-media-grid{grid-template-columns:1fr 1fr}}
    @media(max-width:560px){.fxp-grid,.fxp-media-grid,.fxp-specs{grid-template-columns:1fr}.fxp-form{grid-template-columns:1fr}.fxp-head{padding:17px}.fxp-grid,.fxp-media-grid,.fxp-specs{padding-left:17px;padding-right:17px}.fxp-planner{padding:17px}}
  `;
  if (!document.getElementById('flooxProductUpgradeStyle')) { const s=document.createElement('style'); s.id='flooxProductUpgradeStyle'; s.textContent=css; document.head.appendChild(s); }

  function section(title, sub, cls='') {
    const el=document.createElement('section'); el.className=`fxp-section ${cls}`; el.innerHTML=`<div class="fxp-head"><div><h2>${title}</h2><p>${sub}</p></div></div>`; return el;
  }
  function categoryImage(u){
    const t=`${u?.performer_type||''} ${(u?.genres||[]).join(' ')}`.toLowerCase();
    return t.includes('dj')?img.dj:t.includes('band')?img.band:t.includes('singer')||t.includes('vocal')?img.singer:img.concert;
  }

  async function planner(){
    if(!/floox-search-results\.html$/i.test(location.pathname)) return;
    if(document.getElementById('flooxPlanner')) return;
    const host=document.querySelector('.content'); if(!host) return;
    const el=section('Plan the event, then find the talent','Tell Floox what you are planning and get a shortlist instead of manually opening dozens of profiles.'); el.id='flooxPlanner';
    const box=document.createElement('div'); box.className='fxp-planner'; box.innerHTML=`<form class="fxp-form" id="fxpPlannerForm"><input name="eventType" placeholder="Event type · Wedding, Corporate…"><input name="city" placeholder="City"><input name="genre" placeholder="Genre / vibe"><input name="budget" type="number" min="0" placeholder="Budget ₹"><input name="eventDate" type="date"><input class="wide" name="q" placeholder="Describe the experience you want"><button class="fxp-btn wide" type="submit">Find my best matches →</button></form><div class="fxp-results" id="fxpPlannerResults"></div>`; el.appendChild(box); host.insertBefore(el,host.firstElementChild||null);
    box.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();const out=box.querySelector('#fxpPlannerResults');if(!F.isLoggedIn()){location.href='floox-login.html?redirect='+encodeURIComponent(location.href);return}const c=Object.fromEntries(new FormData(e.target));out.innerHTML='<div class="fxp-empty">Finding the strongest matches…</div>';try{const r=await F.apiGet('marketplace?action=match&'+new URLSearchParams(c),true);const matches=r.matches||[];if(!matches.length){out.innerHTML='<div class="fxp-empty">No strong matches yet. Try a wider city, genre or budget.</div>';return}out.innerHTML=matches.slice(0,6).map(x=>{const u=x.profile||{};return `<div class="fxp-match"><div class="fxp-match-img" style="background-image:url('${esc(u.avatar||categoryImage(u))}')"></div><div class="fxp-match-main"><b>${esc(u.stageName||u.stage_name||u.name||'Floox Artist')}</b><span>${esc(u.city||'India')} · ${esc((u.genres||[]).slice(0,2).join(' · ')||u.performer_type||'Performer')}</span></div><div class="fxp-score">${Number(x.score||0)}%</div><a class="fxp-btn alt" href="floox-profile.html?id=${encodeURIComponent(u.id||'')}">View</a></div>`}).join('')}catch(err){out.innerHTML=`<div class="fxp-empty">${esc(err.message||'Could not find matches.')}</div>`}});
  }

  async function activity(){
    if(!/(^|\/)index\.html$/i.test(location.pathname) && location.pathname!=='/' && !/floox-public\.html$/i.test(location.pathname)) return;
    if(document.getElementById('flooxLiveActivity')) return;
    const main=document.querySelector('main')||document.body; let artists=[],events=[]; try{const [a,e]=await Promise.all([F.getArtists({limit:6}),F.getEvents({limit:6})]);artists=a.artists||[];events=e.events||[]}catch{return}
    if(!artists.length&&!events.length)return;
    const el=section('Live on Floox','A snapshot of what is moving on the platform right now. Discover talent, events and fresh activity.');el.id='flooxLiveActivity';
    const grid=document.createElement('div');grid.className='fxp-grid';artists.slice(0,3).forEach(u=>{const card=document.createElement('article');card.className='fxp-card';card.innerHTML=`<div class="fxp-card-img" style="background-image:url('${esc(u.avatar||categoryImage(u))}')"></div><div class="fxp-card-body"><b>${esc(u.stageName||u.stage_name||u.name||'Artist')}</b><div class="fxp-meta">${esc(u.city||'India')} · ${esc((u.genres||[]).slice(0,2).join(' · ')||u.performer_type||'Performer')}</div><a class="fxp-btn" href="floox-profile.html?id=${encodeURIComponent(u.id||'')}">Discover artist</a></div>`;grid.appendChild(card)});events.slice(0,3).forEach(e=>{const card=document.createElement('article');card.className='fxp-card';card.innerHTML=`<div class="fxp-card-img" style="background-image:url('${esc(e.cover_image||e.image||img.event)}')"></div><div class="fxp-card-body"><b>${esc(e.name||e.event_name||'Upcoming event')}</b><div class="fxp-meta">${esc(e.city||'India')} · ${esc(e.event_date||e.date||'Date TBA')}</div></div>`;grid.appendChild(card)});el.appendChild(grid);const anchor=[...main.querySelectorAll('section')].find(s=>/how floox works|featured|organiser/i.test(s.textContent||''));if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(el,anchor);else main.appendChild(el);
  }

  async function portfolio(){
    if(!/(floox-(organiser-profile|profile))\.html$/i.test(location.pathname)) return;
    if(document.getElementById('flooxPortfolio')) return;
    const id=new URLSearchParams(location.search).get('id'); if(!id) return;
    let u=null; try{u=(await F.getProfile(id)).user}catch{return}
    if(!u)return;
    const content=document.getElementById('content')||document.querySelector('.hero')?.parentElement||document.querySelector('.wrap'); if(!content)return;
    const host=section(u.role==='organiser'?'Event portfolio':'Performance portfolio',u.role==='organiser'?'A visual snapshot of the experiences this organiser creates.':'See the artist as a performer — media, formats, genres and booking essentials.','fxp-portfolio');host.id='flooxPortfolio';
    const media=[]; const raw=[u.portfolio,u.media_links,u.media,u.portfolio_images,u.gallery].filter(Boolean);
    raw.forEach(v=>{if(Array.isArray(v))v.forEach(x=>media.push(x));else if(typeof v==='object')Object.values(v).forEach(x=>media.push(x));else String(v).split(/[,\n]+/).forEach(x=>media.push(x.trim()))});
    const urls=media.map(x=>typeof x==='string'?x:(x?.url||x?.src||x?.href)).filter(x=>/^https?:\/\//i.test(String(x))).slice(0,6);
    const mediaGrid=document.createElement('div');mediaGrid.className='fxp-media-grid';
    const fallback=categoryImage(u);
    if(urls.length) urls.forEach((url,i)=>{const m=document.createElement('div');m.className='fxp-media';m.style.backgroundImage=`url('${esc(url)}')`;m.innerHTML=`<span>${u.role==='organiser'?'Event highlight':'Performance highlight'} ${i+1}</span>`;mediaGrid.appendChild(m)});else{const m=document.createElement('div');m.className='fxp-media';m.style.backgroundImage=`url('${fallback}')`;m.style.gridColumn='1/-1';m.innerHTML=`<span>Portfolio imagery will appear here as this profile adds media.</span>`;mediaGrid.appendChild(m)}
    host.appendChild(mediaGrid);
    const specs=document.createElement('div');specs.className='fxp-specs';const rows=[['Formats',(u.performance_types||u.event_types||[]).slice?.(0,3)?.join(' · ')||'Available on request'],['Genres',(u.genres||[]).slice?.(0,4)?.join(' · ')||'Not added'],['Languages',(u.languages||[]).slice?.(0,4)?.join(' · ')||'Not added'],['Budget',u.min_fee?`₹${Number(u.min_fee).toLocaleString('en-IN')} onwards`:'Quote based']];rows.forEach(([a,b])=>{const s=document.createElement('div');s.className='fxp-spec';s.innerHTML=`<small>${a}</small><b>${esc(b)}</b>`;specs.appendChild(s)});host.appendChild(specs);
    const after=document.querySelector('#content > .grid')||content.querySelector('.grid'); if(after&&after.parentNode)after.parentNode.insertBefore(host,after.nextSibling);else content.appendChild(host);
  }

  function run(){planner();activity();portfolio();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  window.addEventListener('load',run,{once:true});
  const observer=new MutationObserver(()=>run()); observer.observe(document.documentElement,{childList:true,subtree:true});
})();
