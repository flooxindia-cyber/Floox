// Floox — live organiser cards for the home page
(() => {
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>\'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const palette=[['rgba(255,214,0,.3)','rgba(255,92,0,.2)','🎪'],['rgba(0,194,168,.3)','rgba(124,58,237,.2)','🎶'],['rgba(255,45,120,.3)','rgba(124,58,237,.2)','🌟'],['rgba(34,197,94,.25)','rgba(0,194,168,.2)','🏆']];
  function card(o,i){
    const org=o.org_name||o.name||'Event Organiser', city=o.city||'India', type=o.org_type||'Event Organiser';
    const tags=[...(Array.isArray(o.event_types)?o.event_types:[]),...(Array.isArray(o.genres)?o.genres:[])].slice(0,3);
    const p=palette[i%palette.length];
    const visual=o.avatar?`<img src="${esc(o.avatar)}" alt="${esc(org)}" style="width:100%;height:100%;object-fit:cover;border-radius:18px">`:p[2];
    return `<div class="ocard rv" data-live-organiser="1" onclick="window.location.href='floox-organiser-profile.html?id=${encodeURIComponent(o.id)}'">
      <div class="ocard-header"><div class="ocard-logo" style="background:linear-gradient(135deg,${p[0]},${p[1]})">${visual}</div><div class="ocard-badge ${o.verified?'obadge-ver':'obadge-new'}">${o.verified?'Verified':'New'}</div></div>
      <div class="ocard-body"><div class="ocard-name">${esc(org)}</div><div class="ocard-city">📍 ${esc(city)}</div><div class="ocard-tags">${(tags.length?tags:[type]).map(t=>`<span class="otag">${esc(t)}</span>`).join('')}</div><div class="ocard-stats"><span>🎪 ${esc(type)}</span></div><p class="ocard-desc">${esc(o.bio||'Event organiser on Floox. View the profile to learn more and connect.')}</p><a href="floox-organiser-profile.html?id=${encodeURIComponent(o.id)}" class="ocard-cta" onclick="event.stopPropagation()">View Profile →</a></div>
    </div>`;
  }
  async function load(){
    const grid=document.getElementById('organiserGrid'); if(!grid||!window.FLOOX?.isLoggedIn())return;
    try{
      const r=await FLOOX.getOrganisers({limit:8});
      const items=(r.organisers||[]).filter(o=>o.profile_complete!==false);
      if(!items.length){grid.innerHTML=`<div style="grid-column:1/-1;text-align:center;padding:2.5rem;color:var(--txt2)">No public organiser profiles yet. Be the first to join Floox.</div>`;return;}
      grid.innerHTML=items.map(card).join('');
      grid.querySelectorAll('.rv').forEach(el=>el.classList.add('visible'));
    }catch(e){console.warn('Live organiser cards:',e);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else setTimeout(load,0);
})();
