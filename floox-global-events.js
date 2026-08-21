// Floox — additive live global + India events widget
// Loads only on the home page and Discover page via floox-auth.js.
(() => {
  'use strict';

  const API = '/api/global-events';
  const EVENT_SOURCE = 'floox-global-events';
  const REFRESH_MS = 5 * 60 * 1000;
  let activeRegion = 'global';
  let state = { events: [], loading: false, error: null, query: '' };
  let refreshTimer = null;

  const isDiscover = /floox-search-results\.html$/i.test(location.pathname);

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function safeUrl(value) {
    try {
      const url = new URL(String(value || ''), location.origin);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '#';
    } catch {
      return '#';
    }
  }

  function formatDate(value) {
    if (!value) return 'Date TBA';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }

  function locationText(event) {
    return [event.venue_name, event.city, event.country].filter(Boolean).join(' • ') || 'Location TBA';
  }

  function priceText(event) {
    if (event.price_min == null && event.price_max == null) return '';
    const currency = escapeHtml(event.currency || '');
    if (event.price_min != null && event.price_max != null && Number(event.price_min) !== Number(event.price_max)) {
      return `${currency} ${Number(event.price_min).toLocaleString()} – ${Number(event.price_max).toLocaleString()}`.trim();
    }
    const value = event.price_min ?? event.price_max;
    return `${currency} ${Number(value).toLocaleString()}`.trim();
  }

  function card(event) {
    const image = safeUrl(event.image_url);
    const booking = safeUrl(event.ticket_url || event.official_url);
    const imageMarkup = image !== '#'
      ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(event.title)}" loading="lazy" referrerpolicy="no-referrer">`
      : '<div class="fge-no-image">🎟️</div>';
    const price = priceText(event);
    return `<article class="fge-card">
      <div class="fge-image">${imageMarkup}<span class="fge-source">${escapeHtml(event.provider || 'Event')}</span></div>
      <div class="fge-body">
        <div class="fge-type">${escapeHtml(event.category || 'Event')}</div>
        <h3>${escapeHtml(event.title || 'Untitled event')}</h3>
        <div class="fge-meta">📅 ${escapeHtml(formatDate(event.start_at))}</div>
        <div class="fge-meta">📍 ${escapeHtml(locationText(event))}</div>
        ${event.organizer_name ? `<div class="fge-meta">🎪 ${escapeHtml(event.organizer_name)}</div>` : ''}
        ${price ? `<div class="fge-price">${price}</div>` : ''}
        ${booking !== '#' ? `<a class="fge-book" href="${escapeHtml(booking)}" target="_blank" rel="noopener noreferrer sponsored">Book on Official Website ↗</a>` : '<span class="fge-no-book">Official booking link unavailable</span>'}
      </div>
    </article>`;
  }

  function styles() {
    if (document.getElementById('floox-global-events-style')) return;
    const style = document.createElement('style');
    style.id = 'floox-global-events-style';
    style.textContent = `
      #flooxGlobalEvents{margin:48px auto;max-width:1180px;padding:0 5%;font-family:inherit;position:relative}
      .fge-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:18px}
      .fge-kicker{font-size:.68rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#ff7a35;display:flex;align-items:center;gap:7px}
      .fge-live{width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 5px rgba(34,197,94,.09);display:inline-block}
      .fge-title{font-family:'Clash Display','Bricolage Grotesque',sans-serif;font-size:clamp(1.8rem,3.6vw,3rem);line-height:1;font-weight:800;margin-top:6px}
      .fge-sub{color:rgba(255,255,255,.55);font-size:.77rem;margin-top:7px}
      .fge-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap;justify-content:flex-end}
      .fge-tab{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.045);color:rgba(255,255,255,.65);border-radius:999px;padding:8px 13px;font-size:.7rem;font-weight:900;cursor:pointer}
      .fge-tab.active{border-color:rgba(255,92,0,.55);background:rgba(255,92,0,.13);color:#ff9a62}
      .fge-refresh{border:1px solid rgba(255,255,255,.12);background:transparent;color:#fff;border-radius:999px;padding:8px 11px;font-size:.7rem;font-weight:900;cursor:pointer}
      .fge-search{display:flex;gap:8px;margin:0 0 14px}
      .fge-search input{flex:1;min-width:0;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.12);border-radius:13px;color:#fff;padding:11px 13px;outline:none}
      .fge-search input:focus{border-color:rgba(255,92,0,.5);box-shadow:0 0 0 4px rgba(255,92,0,.07)}
      .fge-search button{border:0;border-radius:13px;padding:0 16px;background:linear-gradient(135deg,#ff5c00,#ff2d78);color:#fff;font-weight:900}
      .fge-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
      .fge-card{background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.10);border-radius:18px;overflow:hidden;min-width:0;transition:transform .22s,border-color .22s,box-shadow .22s}
      .fge-card:hover{transform:translateY(-4px);border-color:rgba(255,92,0,.35);box-shadow:0 16px 36px rgba(0,0,0,.22)}
      .fge-image{height:155px;position:relative;background:linear-gradient(135deg,rgba(255,92,0,.2),rgba(124,58,237,.2));overflow:hidden}
      .fge-image img{width:100%;height:100%;object-fit:cover}
      .fge-no-image{height:100%;display:grid;place-items:center;font-size:2.4rem;background:radial-gradient(circle at 40% 30%,rgba(255,92,0,.25),transparent 45%)}
      .fge-source{position:absolute;left:10px;top:10px;padding:4px 8px;border-radius:999px;background:rgba(0,0,0,.58);border:1px solid rgba(255,255,255,.13);font-size:.57rem;font-weight:900;color:rgba(255,255,255,.8)}
      .fge-body{padding:13px}
      .fge-type{font-size:.56rem;text-transform:uppercase;letter-spacing:.1em;color:#39e6ca;font-weight:900}
      .fge-body h3{font-family:'Clash Display','Bricolage Grotesque',sans-serif;font-size:1rem;line-height:1.08;margin-top:4px;min-height:2.18em}
      .fge-meta{font-size:.64rem;line-height:1.6;color:rgba(255,255,255,.55);margin-top:5px}
      .fge-price{font-size:.66rem;color:#ffd600;font-weight:900;margin-top:8px}
      .fge-book{display:inline-flex;margin-top:10px;border-radius:10px;background:linear-gradient(135deg,#ff5c00,#ff2d78);color:#fff;padding:8px 10px;font-size:.62rem;font-weight:900}
      .fge-no-book{display:inline-flex;margin-top:10px;color:rgba(255,255,255,.32);font-size:.6rem}
      .fge-state{padding:34px 18px;border:1px dashed rgba(255,255,255,.12);border-radius:16px;color:rgba(255,255,255,.55);text-align:center}
      .fge-state strong{display:block;color:#fff;font-family:'Clash Display',sans-serif;font-size:1rem;margin-bottom:5px}
      .fge-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px;font-size:.61rem;color:rgba(255,255,255,.34)}
      .fge-more{color:#ff9a62;font-weight:900}
      @media(max-width:1000px){.fge-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
      @media(max-width:720px){#flooxGlobalEvents{padding:0 4%;margin:36px auto}.fge-head{align-items:flex-start;flex-direction:column}.fge-actions{justify-content:flex-start}.fge-grid{display:flex;overflow:auto;scroll-snap-type:x mandatory;padding-bottom:8px}.fge-card{flex:0 0 78%;scroll-snap-align:start}.fge-image{height:175px}.fge-search{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function mount() {
    if (document.getElementById('flooxGlobalEvents')) return document.getElementById('flooxGlobalEvents');
    const section = document.createElement('section');
    section.id = 'flooxGlobalEvents';
    section.innerHTML = `
      <div class="fge-head">
        <div>
          <div class="fge-kicker"><span class="fge-live"></span> Live Event Discovery</div>
          <div class="fge-title">Events happening around you — and around the world.</div>
          <div class="fge-sub">Automatically refreshed from supported official event providers. Floox never takes the ticket payment.</div>
        </div>
        <div class="fge-actions">
          <button type="button" class="fge-tab active" data-fge-region="global">🌍 Worldwide</button>
          <button type="button" class="fge-tab" data-fge-region="india">🇮🇳 India</button>
          <button type="button" class="fge-refresh" id="fgeRefresh" title="Refresh events">↻</button>
        </div>
      </div>
      <form class="fge-search" id="fgeSearchForm">
        <input id="fgeSearchInput" placeholder="Search concerts, sports, festivals, conferences..." autocomplete="off">
        <button type="submit">Search</button>
      </form>
      <div id="fgeBody"><div class="fge-state"><strong>Loading live events…</strong>Pulling the latest supported event listings.</div></div>
      <div class="fge-foot"><span>Last refreshed: <span id="fgeUpdated">—</span></span><span class="fge-more">Official booking links open in a new tab ↗</span></div>
    `;

    if (isDiscover) {
      const content = document.querySelector('main.content');
      if (content) content.insertBefore(section, content.firstChild);
      else document.body.appendChild(section);
    } else {
      const main = document.querySelector('main');
      if (main) main.appendChild(section);
      else document.body.appendChild(section);
    }

    section.querySelectorAll('[data-fge-region]').forEach((button) => {
      button.addEventListener('click', () => {
        activeRegion = button.dataset.fgeRegion || 'global';
        section.querySelectorAll('[data-fge-region]').forEach((b) => b.classList.toggle('active', b === button));
        load();
      });
    });
    section.querySelector('#fgeRefresh')?.addEventListener('click', () => load(true));
    section.querySelector('#fgeSearchForm')?.addEventListener('submit', (event) => {
      event.preventDefault();
      state.query = section.querySelector('#fgeSearchInput')?.value.trim() || '';
      load(true);
    });
    return section;
  }

  function queryParams() {
    const params = new URLSearchParams({ limit: '24' });
    if (state.query) params.set('keyword', state.query);
    if (activeRegion === 'india') params.set('countryCode', 'IN');
    return params;
  }

  async function load(force = false) {
    if (state.loading) return;
    const root = mount();
    styles();
    state.loading = true;
    if (force || !state.events.length) {
      const body = root.querySelector('#fgeBody');
      if (body) body.innerHTML = '<div class="fge-state"><strong>Updating live events…</strong>Checking the latest provider listings.</div>';
    }
    try {
      const response = await fetch(`${API}?${queryParams().toString()}`, { headers: { Accept: 'application/json' } });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || 'Unable to fetch events');
      state.events = Array.isArray(json.events) ? json.events : [];
      state.error = null;
      render(root, json.updated_at);
    } catch (error) {
      state.error = error;
      const body = root.querySelector('#fgeBody');
      if (body) body.innerHTML = `<div class="fge-state"><strong>Live events are temporarily unavailable.</strong>${escapeHtml(error.message || 'Please try again shortly.')}</div>`;
    } finally {
      state.loading = false;
    }
  }

  function render(root, updatedAt) {
    const body = root.querySelector('#fgeBody');
    if (!body) return;
    if (!state.events.length) {
      body.innerHTML = '<div class="fge-state"><strong>No matching events yet.</strong>Try another search or switch between India and Worldwide.</div>';
    } else {
      body.innerHTML = `<div class="fge-grid">${state.events.map(card).join('')}</div>`;
    }
    const stamp = updatedAt ? new Date(updatedAt) : new Date();
    const stampText = Number.isNaN(stamp.getTime()) ? 'just now' : stamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updated = root.querySelector('#fgeUpdated');
    if (updated) updated.textContent = stampText;
  }

  function init() {
    if (document.querySelector(`[data-${EVENT_SOURCE}]`)) return;
    const marker = document.createElement('span');
    marker.hidden = true;
    marker.dataset.flooxGlobalEvents = '1';
    document.body.appendChild(marker);
    styles();
    mount();
    load();
    clearInterval(refreshTimer);
    refreshTimer = setInterval(() => load(true), REFRESH_MS);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
