// Floox product UX hotfix: keep the homepage aligned with the original visual system.
(() => {
  'use strict';
  const F = window.FLOOX;
  if (!F) return;

  const esc = s => String(s ?? '').replace(/[&<>\'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
  const IMG = {
    concert: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1200&q=82',
    singer: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=82',
    dj: 'https://images.unsplash.com/photo-1571266028243-d220c8f9e16a?auto=format&fit=crop&w=900&q=82',
    band: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=900&q=82',
    event: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=82'
  };
  const typeOf = u => `${u?.performer_type||u?.performerType||''} ${(u?.genres||[]).join(' ')}`.toLowerCase();
  const fallback = u => { const t=typeOf(u); return t.includes('dj')?IMG.dj:t.includes('band')?IMG.band:t.includes('singer')||t.includes('vocal')?IMG.singer:IMG.concert; };
  const real = u => [u?.avatar,u?.avatar_url,u?.profile_image,u?.profileImage,u?.profile_photo,u?.profilePhoto,u?.image,u?.image_url,u?.photo,u?.photo_url,u?.cover_image,u?.coverImage].find(x=>/^https?:\/\//i.test(String(x||''))) || null;
  const image = (u, alt='') => { const r=real(u), f=fallback(u); return `<img src="${esc(r||f)}" data-fallback="${esc(f)}" alt="${esc(alt)}" loading="lazy" onerror="this.onerror=null;this.src=this.dataset.fallback;">`; };

  const css = `
    /* Homepage featured cards: restore the original Floox image-led card language. */
    #artists .artists-grid{align-items:stretch}
    #artists .fxp-live-artist-card{background:#17100a!important;border:1px solid rgba(255,255,255,.11)!important;border-radius:18px!important;overflow:hidden!important;transition:transform .25s,border-color .25s,box-shadow .25s!important}
    #artists .fxp-live-artist-card:hover{transform:translateY(-6px)!important;border-color:rgba(255,92,0,.45)!important;box-shadow:0 18px 40px rgba(0,0,0,.28)!important}
    #artists .fxp-live-artist-card>a{display:block;height:100%}
    #artists .fxp-real-img{height:190px!important;aspect-ratio:auto!important;background:#21140b;overflow:hidden;position:relative}
    #artists .fxp-real-img:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 48%,rgba(0,0,0,.38));pointer-events:none}
    #artists .fxp-real-img img{width:100%;height:100%;object-fit:cover;transition:transform .45s}
    #artists .fxp-live-artist-card:hover .fxp-real-img img{transform:scale(1.045)}
    #artists .fxp-live-artist-card .acard-body{padding:17px!important;background:#17100a}
    #artists .fxp-live-artist-card .acard-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
    #artists .fxp-live-artist-card .acard-kind{font-size:.58rem!important;color:rgba(255,255,255,.42)!important;text-transform:uppercase;letter-spacing:.08em;font-weight:800}
    #artists .fxp-live-artist-card .acard-verified{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;background:rgba(34,197,94,.14);color:#22c55e;font-size:.65rem}
    #artists .fxp-live-artist-card .acard-name{font-family:'Clash Display',sans-serif!important;font-size:1.08rem!important;font-weight:700!important;color:#fff!important;margin-bottom:6px}
    #artists .fxp-live-artist-card .acard-meta{font-size:.7rem!important;color:rgba(255,255,255,.48)!important;margin-bottom:9px}
    #artists .fxp-live-artist-card .acard-tags{display:flex;gap:5px;flex-wrap:wrap;min-height:22px}
    #artists .fxp-live-artist-card .acard-tags span{font-size:.58rem!important;color:rgba(255,255,255,.55)!important;border:1px solid rgba(255,255,255,.09);border-radius:99px;padding:4px 7px}
    #artists .fxp-live-artist-card .acard-cta{display:inline-flex;margin-top:12px;font-size:.67rem!important;font-weight:800;color:#fff;border:1px solid rgba(255,255,255,.14);border-radius:99px;padding:7px 11px;transition:.2s}
    #artists .fxp-live-artist-card:hover .acard-cta{border-color:#ff5c00;color:#ff7a32}
    /* Never show the newly injected duplicate marketplace block on the homepage. */
    #flooxLiveActivity{display:none!important}
    .fxp-real-img img{display:block}
    @media(max-width:900px){#artists .fxp-real-img{height:170px!important}}
    @media(max-width:600px){#artists .fxp-real-img{height:210px!important}}
  `;
  if(!document.getElementById('flooxHomepageHotfixStyle')){const s=document.createElement('style');s.id='flooxHomepageHotfixStyle';s.textContent=css;document.head.appendChild(s);}

  async function getArtistData(){
    try{
      const r=await F.getArtists({limit:4});
      let list=r?.artists||[];
      // Fetch full profiles when the list endpoint omits media URLs.
      list=await Promise.all(list.slice(0,4).map(async u=>{
        if(real(u)||!u?.id||!F.getProfile) return u;
        try{const p=await F.getProfile(u.id); return {...u,...(p?.user||{})};}catch{return u;}
      }));
      return list;
    }catch{return []}
  }

  function renderFeatured(list){
    const grid=document.getElementById('artistGrid');
    const section=document.getElementById('artists');
    if(!grid||!section) return;
    if(!list.length){ section.style.display='none'; return; }
    section.style.display='';
    grid.innerHTML=list.map(u=>{
      const name=u.stageName||u.stage_name||u.name||'Artist';
      const href=`floox-profile.html?id=${encodeURIComponent(u.id||'')}`;
      const tags=(u.genres||[]).slice(0,2).map(g=>`<span>${esc(g)}</span>`).join('');
      return `<article class="acard fxp-live-artist-card"><a href="${href}" aria-label="View ${esc(name)}"><div class="acard-img fxp-real-img">${image(u,name)}</div><div class="acard-body"><div class="acard-top"><span class="acard-kind">${esc(u.performer_type||u.performerType||'Performer')}</span><span class="acard-verified">✓</span></div><div class="acard-name">${esc(name)}</div><div class="acard-meta">📍 ${esc(u.city||'India')}</div><div class="acard-tags">${tags||'<span>New profile</span>'}</div><span class="acard-cta">Discover artist →</span></div></a></article>`;
    }).join('');
  }

  async function homepage(){
    if(!/^(\/|\/index\.html)$/i.test(location.pathname)) return;
    // The original homepage already has the correct "Live on Floox" Now Playing bar.
    // Do not create another marketplace section here.
    document.getElementById('flooxLiveActivity')?.remove();
    renderFeatured(await getArtistData());
  }

  async function planner(){
    if(!/floox-search-results\.html$/i.test(location.pathname)||document.getElementById('flooxPlanner')) return;
    const host=document.querySelector('.content'); if(!host) return;
    const el=document.createElement('section');el.className='fxp-section';el.id='flooxPlanner';el.innerHTML='<div class="fxp-head"><div><h2>Plan the event, then find the talent</h2><p>Tell Floox what you are planning and get a shortlist instead of manually opening dozens of profiles.</p></div></div><div class="fxp-planner"><form class="fxp-form" id="fxpPlannerForm"><input name="eventType" placeholder="Event type · Wedding, Corporate…"><input name="city" placeholder="City"><input name="genre" placeholder="Genre / vibe"><input name="budget" type="number" min="0" placeholder="Budget ₹"><input name="eventDate" type="date"><input class="wide" name="q" placeholder="Describe the experience you want"><button class="fxp-btn wide" type="submit">Find my best matches →</button></form><div class="fxp-results" id="fxpPlannerResults"></div></div>';
    host.insertBefore(el,host.firstElementChild||null);
    el.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();const out=el.querySelector('#fxpPlannerResults');if(!F.isLoggedIn()){location.href='floox-login.html?redirect='+encodeURIComponent(location.href);return}out.innerHTML='<div class="fxp-empty">Finding the strongest matches…</div>';try{const q=new URLSearchParams(Object.fromEntries(new FormData(e.target)));const r=await F.apiGet('marketplace?action=match&'+q,true);const m=r?.matches||[];out.innerHTML=m.length?m.slice(0,6).map(x=>{const u=x.profile||{};return `<div class="fxp-match"><div class="fxp-match-img">${image(u,u.stageName||u.name||'Artist')}</div><div class="fxp-match-main"><b>${esc(u.stageName||u.stage_name||u.name||'Floox Artist')}</b><span>${esc(u.city||'India')} · ${esc((u.genres||[]).slice(0,2).join(' · ')||u.performer_type||'Performer')}</span></div><div class="fxp-score">${Number(x.score||0)}%</div><a class="fxp-btn alt" href="floox-profile.html?id=${encodeURIComponent(u.id||'')}">View</a></div>`}).join(''):'<div class="fxp-empty">No strong matches yet. Try a wider city, genre or budget.</div>';}catch(err){out.innerHTML='<div class="fxp-empty">Could not find matches right now.</div>'}});
  }

  async function portfolio(){
    if(!/(floox-(organiser-profile|profile))\.html$/i.test(location.pathname)||document.getElementById('flooxPortfolio')) return;
    const id=new URLSearchParams(location.search).get('id');if(!id||!F.getProfile)return;
    let u;try{u=(await F.getProfile(id))?.user}catch{return}if(!u)return;
    const content=document.getElementById('content')||document.querySelector('.wrap')||document.body;
    const el=document.createElement('section');el.className='fxp-section';el.id='flooxPortfolio';el.innerHTML=`<div class="fxp-head"><div><h2>${u.role==='organiser'?'Event portfolio':'Performance portfolio'}</h2><p>${u.role==='organiser'?'A visual snapshot of the experiences this organiser creates.':'See the performer through media, formats, genres and booking essentials.'}</p></div></div>`;
    const urls=[];for(const v of [u.portfolio,u.media_links,u.media,u.portfolio_images,u.gallery]){if(Array.isArray(v))v.forEach(x=>urls.push(typeof x==='string'?x:(x?.url||x?.src)));else if(typeof v==='string')v.split(/[,\n]+/).forEach(x=>urls.push(x.trim()));}const valid=urls.filter(x=>/^https?:\/\//i.test(String(x||''))).slice(0,6);
    const mg=document.createElement('div');mg.className='fxp-media-grid';(valid.length?valid:[fallback(u)]).forEach((url,i)=>{const m=document.createElement('div');m.className='fxp-media';m.style.backgroundImage=`url('${esc(url)}')`;m.innerHTML=`<span>${valid.length?'Performance highlight':'Portfolio imagery will appear here as media is added.'}</span>`;mg.appendChild(m)});el.appendChild(mg);
    const specs=document.createElement('div');specs.className='fxp-specs';[['Formats',(u.performance_types||u.event_types||[]).slice?.(0,3)?.join(' · ')||'Available on request'],['Genres',(u.genres||[]).slice?.(0,4)?.join(' · ')||'Not added'],['Languages',(u.languages||[]).slice?.(0,4)?.join(' · ')||'Not added'],['Budget',u.min_fee?`₹${Number(u.min_fee).toLocaleString('en-IN')} onwards`:'Quote based']].forEach(([a,b])=>{const s=document.createElement('div');s.className='fxp-spec';s.innerHTML=`<small>${a}</small><b>${esc(b)}</b>`;specs.appendChild(s)});el.appendChild(specs);content.appendChild(el);
  }

  function run(){homepage();planner();portfolio();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  window.addEventListener('load',run,{once:true});
})();
