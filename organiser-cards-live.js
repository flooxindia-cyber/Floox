// Floox — live organiser discovery for the home page
// Real organisers come from the database. Demo organisers keep the discovery UI populated
// until the platform has enough real organiser profiles.
(() => {
  'use strict';

  const esc=v=>String(v??'').replace(/[&<>\'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
  const palette=[['rgba(255,214,0,.3)','rgba(255,92,0,.2)','🎪'],['rgba(0,194,168,.3)','rgba(124,58,237,.2)','🎶'],['rgba(255,45,120,.3)','rgba(124,58,237,.2)','🌟'],['rgba(34,197,94,.25)','rgba(0,194,168,.2)','🏆']];

  // These are presentation-only demo profiles. Real registered organisers are always preferred.
  // They use stable demo IDs so the profile page can render them consistently.
  const DEMO_ORGANISERS=[
    {id:'demo-org-wavelength',org_name:'Wavelength Events',org_type:'Event Agency',city:'Mumbai',event_types:['Corporate','Concerts','Weddings'],bio:"Mumbai's premium event agency. We book 50+ artists per year across corporate galas, music festivals and private celebrations.",verified:true,demo:true},
    {id:'demo-org-rhythm-house',org_name:'Rhythm House Productions',org_type:'Event Production',city:'Delhi NCR',event_types:['Live Music','Festivals','Clubs'],bio:"Delhi's go-to for live music experiences. Specialising in concert production, venue management and artist management.",verified:true,demo:true},
    {id:'demo-org-starlight',org_name:'Starlight Occasions',org_type:'Event Planner',city:'Bangalore',event_types:['Weddings','Private','Corporate'],bio:'Creating unforgettable celebrations in Bangalore. From intimate gatherings to grand weddings, we book the perfect talent.',verified:true,demo:true},
    {id:'demo-org-goa-beats',org_name:'Goa Beats Co.',org_type:'Event Collective',city:'Goa',event_types:['Beach Events','DJ Nights','Festivals'],bio:"Goa's freshest event collective. We run beach parties, sunset DJ sessions and multi-day music festivals on the coast.",verified:false,demo:true}
  ];

  function card(o,i){
    const org=o.org_name||o.orgName||o.name||'Event Organiser';
    const city=o.city||'India';
    const type=o.org_type||o.orgType||'Event Organiser';
    const tags=[...(Array.isArray(o.event_types)?o.event_types:[]),...(Array.isArray(o.eventTypes)?o.eventTypes:[]),...(Array.isArray(o.genres)?o.genres:[])].filter(Boolean).slice(0,3);
    const p=palette[i%palette.length];
    const avatar=o.avatar||null;
    const visual=avatar
      ? `<img src="${esc(avatar)}" alt="${esc(org)}" style="width:100%;height:100%;object-fit:cover;border-radius:18px">`
      : p[2];
    const profileUrl=`floox-organiser-profile.html?id=${encodeURIComponent(o.id||'')}`;
    return `<div class="ocard rv" data-live-organiser="1" data-demo="${o.demo?'1':'0'}" onclick="window.location.href='${profileUrl}'">
      <div class="ocard-header"><div class="ocard-logo" style="background:linear-gradient(135deg,${p[0]},${p[1]})">${visual}</div><div class="ocard-badge ${o.verified?'obadge-ver':'obadge-new'}">${o.verified?'Verified':'New'}</div></div>
      <div class="ocard-body"><div class="ocard-name">${esc(org)}</div><div class="ocard-city">📍 ${esc(city)}</div><div class="ocard-tags">${(tags.length?tags:[type]).map(t=>`<span class="otag">${esc(t)}</span>`).join('')}</div><div class="ocard-stats"><span>🎪 ${esc(type)}</span></div><p class="ocard-desc">${esc(o.bio||'Event organiser on Floox. View the profile to learn more and connect.')}</p><a href="${profileUrl}" class="ocard-cta" onclick="event.stopPropagation()">View Profile →</a></div>
    </div>`;
  }

  function publicRealOrganisers(items){
    return (items||[]).filter(o=>o.profile_complete!==false && o.profileComplete!==false);
  }

  async function load(){
    const grid=document.getElementById('organiserGrid');
    if(!grid)return;

    let real=[];
    try{
      if(window.FLOOX?.getOrganisers){
        const r=await FLOOX.getOrganisers({limit:8});
        real=publicRealOrganisers(r.organisers||[]);
      }
    }catch(e){console.warn('Live organiser cards:',e);}

    // Keep real users first, then fill the section with demos so it never looks empty.
    const seen=new Set(real.map(o=>String(o.id||o.org_name||o.name||'').toLowerCase()));
    const demos=DEMO_ORGANISERS.filter(o=>!seen.has(String(o.id).toLowerCase()));
    const items=[...real,...demos].slice(0,8);

    grid.innerHTML=items.length
      ? items.map(card).join('')
      : `<div style="grid-column:1/-1;text-align:center;padding:2.5rem;color:var(--txt2)">No organiser profiles available right now.</div>`;
    grid.querySelectorAll('.rv').forEach(el=>el.classList.add('visible'));
  }

  async function liveOrganiserSearch(){
    const qEl=document.getElementById('searchQ');
    const cEl=document.getElementById('searchC');
    const dd=document.getElementById('searchDropdown');
    if(!qEl||!cEl||!dd)return;

    const q=(qEl.value||'').trim();
    const city=(cEl.value||'').trim();
    if(!q&&!city)return;

    let real=[];
    try{
      if(window.FLOOX?.getOrganisers){
        const r=await FLOOX.getOrganisers({q:q||undefined,city:city||undefined,limit:8});
        real=publicRealOrganisers(r.organisers||[]);
      }
    }catch(e){console.warn('Live organiser search:',e);}

    const pool=[...real,...DEMO_ORGANISERS];
    const qWords=(q+' '+city).toLowerCase().split(/\s+/).filter(Boolean);
    const matched=pool.filter(o=>{
      const hay=[o.name,o.org_name,o.orgName,o.org_type,o.orgType,o.city,o.bio,
        ...(Array.isArray(o.event_types)?o.event_types:[]),...(Array.isArray(o.eventTypes)?o.eventTypes:[]),...(Array.isArray(o.genres)?o.genres:[])]
        .filter(Boolean).join(' ').toLowerCase();
      return qWords.every(w=>hay.includes(w));
    }).slice(0,8);
    if(!matched.length)return;

    const existing=dd.querySelector('.sd-section:has(.sd-badge.org)');
    if(existing)existing.remove();

    let section='<div class="sd-section"><div class="sd-label">Organisers</div>';
    matched.forEach(o=>{
      const name=o.org_name||o.orgName||o.name||'Event Organiser';
      const type=o.org_type||o.orgType||'Event Organiser';
      const profileUrl='floox-organiser-profile.html?id='+encodeURIComponent(o.id||'');
      const avatar=o.avatar ? '<img src="'+esc(o.avatar)+'" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">' : '🎪';
      section+='<div class="sd-item" onclick="window.location.href=\''+profileUrl+'\'">'
        +'<div class="sd-avatar">'+avatar+'</div><div class="sd-info">'
        +'<div class="sd-name">'+esc(name)+'</div><div class="sd-meta">📍 '+esc(o.city||'India')+(type?'&nbsp;·&nbsp;'+esc(type):'')+'</div>'
        +'</div><span class="sd-badge org">Organiser</span></div>';
    });
    section+='</div>';
    if(dd.querySelector('.sd-section'))dd.insertAdjacentHTML('beforeend',section);
    else{dd.innerHTML=section;dd.style.display='block';}
  }

  function setupBrowseAllOrganisers(){
    const links=document.querySelectorAll('a,button');
    links.forEach(el=>{
      const text=(el.textContent||'').replace(/→|➜|➤|↗/g,'').trim().toLowerCase();
      if(text==='join as organiser'||text==='join as organizer'){
        el.textContent='BROWSE ALL ORGANISERS →';
        el.setAttribute('href','floox-search-results.html?type=organiser');
        el.removeAttribute('onclick');
      }
    });
  }

  function bindSearch(){
    const q=document.getElementById('searchQ');
    const c=document.getElementById('searchC');
    if(!q||!c)return;
    const original=window.liveSearch;
    const wrapped=function(){
      if(typeof original==='function')original();
      clearTimeout(wrapped._timer);
      wrapped._timer=setTimeout(liveOrganiserSearch,180);
    };
    window.liveSearch=wrapped;
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{load();bindSearch();setupBrowseAllOrganisers();},{once:true});
  }else{
    load();bindSearch();setupBrowseAllOrganisers();
  }
})();
