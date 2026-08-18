// Floox — live organiser dashboard connector
// Replaces demo statistics/events with real Supabase-backed API data.
(() => {
  'use strict';

  if (!/floox-dashboard-organiser\.html$/i.test(location.pathname)) return;

  const getToken = () => localStorage.getItem('floox_token') || '';

  async function getJSON(url) {
    const token = getToken();
    const res = await fetch(url, {
      headers: { Accept: 'application/json', Authorization: token ? `Bearer ${token}` : '' },
      cache: 'no-store',
    });
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { throw new Error(`Invalid server response (${res.status}).`); }
    if (!res.ok) throw new Error(data.error || data.message || `Request failed (${res.status}).`);
    return data;
  }

  const money = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));

  function setStat(cardSelector, value, label, note, noteClass = 'neutral') {
    const card = document.querySelector(cardSelector);
    if (!card) return;
    const valueEl = card.querySelector('.stat-val');
    const labelEl = card.querySelector('.stat-label');
    const noteEl = card.querySelector('.stat-change');
    if (valueEl) valueEl.textContent = value;
    if (labelEl) labelEl.textContent = label;
    if (noteEl) { noteEl.textContent = note; noteEl.className = `stat-change ${noteClass}`; }
  }

  function eventHTML(e) {
    const date = new Date(`${e.eventDate}T00:00:00`);
    const valid = !Number.isNaN(date.getTime());
    const day = valid ? date.getDate() : '—';
    const month = valid ? date.toLocaleString('en-IN', { month: 'short' }) : '';
    const status = String(e.status || 'published').toLowerCase();
    const badge = status === 'completed' ? 'completed' : status === 'draft' ? 'draft' : status === 'cancelled' ? 'draft' : 'upcoming';
    return `<div class="event-item">
      <div class="ev-date ${badge}"><span class="ev-dd">${day}</span><span class="ev-mm">${esc(month)}</span></div>
      <div class="ev-info"><div class="ev-title">${esc(e.name || 'Untitled event')}</div>
      <div class="ev-meta"><span>${esc(e.eventType || 'Event')}</span><span class="ev-dot"></span><span>${esc(e.venue || 'Venue TBA')}</span><span class="ev-dot"></span><span>${esc(e.city || 'India')}</span></div>
      <div class="ev-meta"><span>${Number(e.artistsBooked || 0)} artist${Number(e.artistsBooked || 0) === 1 ? '' : 's'} booked</span><span class="ev-dot"></span><span>${money(e.budget)} budget</span></div></div>
      <div class="ev-actions"><span class="ev-badge ${badge}">${esc(status)}</span></div>
    </div>`;
  }

  function renderLiveEvents(events) {
    const upcoming = events.filter(e => {
      const status = String(e.status || '').toLowerCase();
      return !['completed','cancelled','draft'].includes(status) && String(e.eventDate || '') >= new Date().toISOString().slice(0,10);
    }).slice(0, 3);

    const overview = document.getElementById('upcomingEventsOverview');
    if (overview) {
      overview.innerHTML = upcoming.length
        ? upcoming.map(eventHTML).join('')
        : '<div style="text-align:center;color:var(--muted);font-size:.85rem;padding:1.5rem">No upcoming events in the database.<br><button class="tb-btn tb-ghost" style="margin-top:.8rem" onclick="openNewEventModal()">Create one →</button></div>';
    }

    const full = document.getElementById('eventsListFull');
    if (full) {
      full.innerHTML = events.length
        ? `<div class="card"><div class="card-body">${events.map(eventHTML).join('')}</div></div>`
        : '<div style="text-align:center;color:var(--muted);font-size:.85rem;padding:3rem">No events in the database yet.</div>';
    }
  }

  function clearDemoBookingNumbers() {
    const recent = document.getElementById('recentBookingsOverview');
    if (recent) recent.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:.85rem;padding:1.5rem">No booking records are stored yet.</div>';
    const all = document.getElementById('allBookingsList');
    if (all) all.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:.85rem;padding:2rem">No booking records are stored yet.</div>';
    const totalBig = document.getElementById('totalSpentBig');
    const month = document.getElementById('spendThisMonth');
    const pending = document.getElementById('pendingPayment');
    if (totalBig) totalBig.textContent = '₹0';
    if (month) month.textContent = '₹0';
    if (pending) pending.textContent = '₹0';
    const history = document.getElementById('paymentHistory');
    if (history) history.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:.85rem;padding:2rem">No payment records are stored yet.</div>';
  }

  async function refresh() {
    const user = (() => { try { return JSON.parse(localStorage.getItem('floox_user') || 'null'); } catch { return null; } })();
    if (!getToken() || !user || !['organiser','organizer'].includes(String(user.role || '').toLowerCase())) return;

    try {
      const data = await getJSON('/api/organiser-stats');
      const s = data.stats || {};
      const events = Array.isArray(data.events) ? data.events : [];

      setStat('.stat-card.c1', Number(s.totalEvents || 0).toLocaleString('en-IN'), 'Total Events', 'Live database', 'neutral');
      setStat('.stat-card.c2', Number(s.artistsBooked || 0).toLocaleString('en-IN'), 'Artists Booked', 'Across your events', 'up');
      setStat('.stat-card.c3', money(s.totalBudget), 'Total Event Budget', 'From event records', 'neutral');
      setStat('.stat-card.c4', Number(s.upcomingEvents || 0).toLocaleString('en-IN'), 'Upcoming Events', 'Currently scheduled', 'up');

      renderLiveEvents(events);
      clearDemoBookingNumbers();
    } catch (err) {
      console.error('Floox live organiser dashboard:', err);
      const overview = document.getElementById('upcomingEventsOverview');
      if (overview) overview.innerHTML = `<div style="text-align:center;color:#b91c1c;font-size:.85rem;padding:1.5rem">Could not load live dashboard data. ${esc(err.message)}</div>`;
    }
  }

  function init() {
    refresh();
    // Keep dashboard numbers current when events are created elsewhere.
    setInterval(refresh, 30000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
