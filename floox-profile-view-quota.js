// Floox daily full-profile view allowance UI.
(() => {
  'use strict';
  const F = window.FLOOX;
  if (!F || !F.isLoggedIn()) return;

  const isSearch = /floox-search-results\.html$/i.test(location.pathname);
  const isProfile = /floox-(organiser-profile|profile)\.html$/i.test(location.pathname);
  if (!isSearch && !isProfile) return;

  const style = document.createElement('style');
  style.textContent = `
    .floox-quota{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 18px;padding:12px 15px;border-radius:14px;border:1px solid rgba(255,92,0,.24);background:rgba(255,92,0,.07);font-size:.72rem;line-height:1.5}
    .floox-quota strong{font-weight:900}
    .floox-quota .fq-count{font-weight:900;color:#ff7a32;white-space:nowrap}
    .floox-quota.fq-empty{border-color:rgba(255,45,120,.3);background:rgba(255,45,120,.08)}
    .floox-quota.fq-empty .fq-count{color:#ff5c8f}
    @media(max-width:600px){.floox-quota{align-items:flex-start;flex-direction:column;gap:3px}}
  `;
  document.head.appendChild(style);

  let box = null;
  function ensureBox() {
    if (box && document.body.contains(box)) return box;
    box = document.createElement('div');
    box.className = 'floox-quota';
    box.innerHTML = '<span>Daily profile views</span><span class="fq-count">Checking…</span>';
    if (isSearch) {
      const meta = document.querySelector('.meta');
      if (meta) meta.parentNode.insertBefore(box, meta);
      else document.querySelector('.content')?.prepend(box);
    } else {
      const hero = document.querySelector('.hero');
      if (hero) hero.parentNode.insertBefore(box, hero);
      else document.querySelector('.wrap')?.prepend(box);
    }
    return box;
  }

  function render(remaining, limit = 5) {
    const el = ensureBox();
    if (!el) return;
    const n = Math.max(0, Number(remaining ?? limit));
    el.classList.toggle('fq-empty', n === 0);
    const label = n === 0
      ? `You’ve used all ${limit} profile views for today. Resets tomorrow.`
      : `${n} of ${limit} complete profile views remaining today`;
    el.querySelector('.fq-count').textContent = label;
  }

  window.FlooxProfileQuota = { render };
  window.FLOOXProfileQuota = { render };

  window.addEventListener('floox:profile-quota', e => {
    if (e.detail) render(e.detail.remaining, e.detail.limit || 5);
  });

  async function load() {
    if (!document.body) return;
    ensureBox();
    try {
      const d = await F.apiGet('get-profile-views-remaining', true);
      render(d.remaining, d.limit || 5);
    } catch {
      // The profile-view API remains authoritative; this indicator is only UX.
      const el = ensureBox();
      if (el) el.querySelector('.fq-count').textContent = '5 profile views available today';
    }
  }

  if (isSearch) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load, { once: true });
    else load();
  }
})();
