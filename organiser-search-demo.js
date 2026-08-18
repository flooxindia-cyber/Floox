// Floox — demo + live organiser search suggestions
(() => {
  'use strict';

  const DEMO_ORGANISERS = [
    {id:'demo-wavelength',name:'Wavelength Events',genre:'Corporate & Concerts',city:'Mumbai',emoji:'🎪',tags:['organiser','organizer','event organiser','corporate','concerts','weddings','events']},
    {id:'demo-rhythmhouse',name:'Rhythm House Productions',genre:'Live Music & Festivals',city:'Delhi',emoji:'🎶',tags:['organiser','organizer','event organiser','live music','festivals','clubs','concerts']},
    {id:'demo-starlight',name:'Starlight Occasions',genre:'Weddings & Private Events',city:'Bangalore',emoji:'🌟',tags:['organiser','organizer','event organiser','weddings','private','corporate','events']},
    {id:'demo-goabeats',name:'Goa Beats Co.',genre:'Beach & DJ Events',city:'Goa',emoji:'🏆',tags:['organiser','organizer','event organiser','beach','dj','festivals','parties']},
    {id:'demo-spiceevents',name:'Spice Events Pune',genre:'College & Corporate',city:'Pune',emoji:'🎭',tags:['organiser','organizer','event organiser','corporate','college fests','concerts']},
    {id:'demo-chennaifest',name:'Chennai Cultural Hub',genre:'Classical & Cultural',city:'Chennai',emoji:'🎼',tags:['organiser','organizer','event organiser','classical','cultural','sabha','concerts']},
    {id:'demo-urbanstage',name:'Urban Stage Collective',genre:'Concerts & Nightlife',city:'Hyderabad',emoji:'🎤',tags:['organiser','organizer','event organiser','concerts','nightlife','dj','music']},
    {id:'demo-northstar',name:'Northstar Experiences',genre:'Corporate & Luxury Events',city:'Jaipur',emoji:'✨',tags:['organiser','organizer','event organiser','corporate','luxury','weddings','events']}
  ];

  const esc = v => String(v ?? '').replace(/[&<>\'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));

  function demoMatches(q, city) {
    const words = (q + ' ' + city).toLowerCase().split(/\s+/).filter(Boolean);
    return DEMO_ORGANISERS.filter(o => words.every(w =>
      [o.name,o.city,o.genre,...o.tags].join(' ').toLowerCase().includes(w)
    )).slice(0, 8);
  }

  function liveMatches(q, city) {
    if (!window.FLOOX?.getOrganisers) return Promise.resolve([]);
    return FLOOX.getOrganisers({q:q||undefined,city:city||undefined,limit:8})
      .then(r => (r.organisers || []).filter(o => o.profile_complete !== false && o.profileComplete !== false))
      .catch(() => []);
  }

  function demoRow(o) {
    const url = 'floox-search-results.html?q=' + encodeURIComponent(o.name) + '&type=organiser';
    return '<div class="sd-item" onclick="window.location.href=\'' + url + '\'">'
      + '<div class="sd-avatar">' + o.emoji + '</div>'
      + '<div class="sd-info"><div class="sd-name">' + esc(o.name) + '</div>'
      + '<div class="sd-meta">📍 ' + esc(o.city) + '&nbsp;&middot;&nbsp;' + esc(o.genre) + '</div></div>'
      + '<span class="sd-badge org">Organiser</span></div>';
  }

  function liveRow(o) {
    const name = o.org_name || o.orgName || o.name || 'Event Organiser';
    const type = o.org_type || o.orgType || 'Event Organiser';
    const url = 'floox-organiser-profile.html?id=' + encodeURIComponent(o.id || '');
    const avatar = o.avatar
      ? '<img src="' + esc(o.avatar) + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">'
      : '🎪';
    return '<div class="sd-item" onclick="window.location.href=\'' + url + '\'">'
      + '<div class="sd-avatar">' + avatar + '</div>'
      + '<div class="sd-info"><div class="sd-name">' + esc(name) + '</div>'
      + '<div class="sd-meta">📍 ' + esc(o.city || 'India') + '&nbsp;&middot;&nbsp;' + esc(type) + '</div></div>'
      + '<span class="sd-badge org">Organiser</span></div>';
  }

  async function addOrganiserResults() {
    const qEl = document.getElementById('searchQ');
    const cEl = document.getElementById('searchC');
    const dd = document.getElementById('searchDropdown');
    if (!qEl || !cEl || !dd) return;

    const q = (qEl.value || '').trim();
    const city = (cEl.value || '').trim();
    if (!q && !city) return;

    const demo = demoMatches(q, city);
    const live = await liveMatches(q, city);
    const liveNames = new Set(live.map(o => String(o.org_name || o.orgName || o.name || '').trim().toLowerCase()));
    const demos = demo.filter(o => !liveNames.has(o.name.toLowerCase()));

    // "organiser", "organizer", "event" etc. should return the demo list even
    // when the real API has no matching organiser yet.
    const explicitOrgQuery = /\b(organi[sz]er|organisation|organization|event|events)\b/i.test(q + ' ' + city);
    if (!demos.length && !live.length && !explicitOrgQuery) return;

    let existingOrg = dd.querySelector('.sd-demo-live-organisers');
    if (existingOrg) existingOrg.remove();

    const rows = demos.map(demoRow).concat(live.map(liveRow)).join('');
    const section = '<div class="sd-section sd-demo-live-organisers"><div class="sd-label">Organisers</div>' + rows + '</div>';

    const artistSections = dd.querySelectorAll('.sd-section:not(.sd-demo-live-organisers)');
    if (artistSections.length) dd.insertAdjacentHTML('beforeend', section);
    else {
      dd.innerHTML = section;
      dd.style.display = 'block';
    }
  }

  function bind() {
    if (window.__flooxOrganiserDemoSearchBound) return;
    window.__flooxOrganiserDemoSearchBound = true;
    const original = window.liveSearch;
    window.liveSearch = function() {
      if (typeof original === 'function') original();
      clearTimeout(window.__flooxOrgSearchTimer);
      window.__flooxOrgSearchTimer = setTimeout(addOrganiserResults, 120);
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, {once:true});
  else bind();
})();
