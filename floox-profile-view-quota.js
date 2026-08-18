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
    .floox-quota{display:flex;align-items:center;gap:14px;margin:0 0 18px;padding:14px 16px;border-radius:16px;border:1px solid rgba(255,92,0,.24);background:rgba(255,92,0,.07);font-size:.72rem;line-height:1.5}
    .floox-quota .fq-main{flex:1;min-width:0}.floox-quota .fq-title{font-weight:900;color:#fff}.floox-quota .fq-sub{display:block;color:rgba(255,255,255,.5);margin-top:2px}
    .floox-quota .fq-count{font-weight:900;color:#ff7a32;white-space:nowrap}.floox-quota .fq-bar{height:5px;background:rgba(255,255,255,.1);border-radius:100px;overflow:hidden;margin-top:8px}.floox-quota .fq-fill{height:100%;width:0;background:linear-gradient(90deg,#ff5c00,#ff2d78);border-radius:100px;transition:width .3s}
    .floox-quota .fq-action{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#fff;border-radius:100px;padding:7px 11px;font:800 .65rem 'Cabinet Grotesk',sans-serif;white-space:nowrap;cursor:pointer}.floox-quota .fq-action:hover{border-color:#ff5c00}
    .floox-quota.fq-empty{border-color:rgba(255,45,120,.3);background:rgba(255,45,120,.08)}.floox-quota.fq-empty .fq-count{color:#ff6b9a}
    @media(max-width:600px){.floox-quota{align-items:flex-start}.floox-quota .fq-action{display:none}.floox-quota .fq-count{font-size:.68rem}.floox-quota .fq-sub{font-size:.65rem}}
  `;
  document.head.appendChild(style);

  let box = null;
  function ensureBox() {
    if (box && document.body.contains(box)) return box;
    box = document.createElement('div');
    box.className = 'floox-quota';
    box.innerHTML = '<div class="fq-main"><div class="fq-title">Daily profile access</div><span class="fq-sub">Checking your allowance…</span><div class="fq-bar"><div class="fq-fill"></div></div></div><span class="fq-count">—</span><button class="fq-action" type="button">Save profiles</button>';
    if (isSearch) {
      const meta = document.querySelector('.meta');
      if (meta) meta.parentNode.insertBefore(box, meta);
      else document.querySelector('.content')?.prepend(box);
    } else {
      const hero = document.querySelector('.hero');
      if (hero) hero.parentNode.insertBefore(box, hero);
      else document.querySelector('.wrap')?.prepend(box);
    }
    box.querySelector('.fq-action')?.addEventListener('click', () => {
      const target = document.querySelector('.heart,.cta,.tab');
      target?.scrollIntoView({behavior:'smooth',block:'center'});
      if (!target) F.toast?.('You can shortlist profiles without using another profile view.');
    });
    return box;
  }

  function render(remaining, limit = 5) {
    const el = ensureBox();
    if (!el) return;
    const n = Math.max(0, Number(remaining ?? limit));
    const total = Math.max(1, Number(limit) || 5);
    el.classList.toggle('fq-empty', n === 0);
    el.querySelector('.fq-count').textContent = n === 0 ? '0 left today' : `${n} of ${total} left today`;
    el.querySelector('.fq-sub').textContent = n === 0
      ? `You’ve explored today’s full profile allowance. It refreshes tomorrow.`
      : `Opening a new complete profile uses 1 view. Reopening the same profile does not.`;
    el.querySelector('.fq-fill').style.width = `${Math.max(0,Math.min(100,(n/total)*100))}%`;
  }

  window.FlooxProfileQuota = { render };
  window.FLOOXProfileQuota = { render };
  window.addEventListener('floox:profile-quota', e => { if (e.detail) render(e.detail.remaining, e.detail.limit || 5); });

  async function load() {
    if (!document.body) return;
    ensureBox();
    try {
      const d = await F.apiGet('get-profile-views-remaining', true);
      render(d.remaining, d.limit || 5);
    } catch {
      const el = ensureBox();
      if (el) {
        el.querySelector('.fq-count').textContent = 'Unavailable';
        el.querySelector('.fq-sub').textContent = 'We couldn’t load your allowance. Your profile access rules are still enforced server-side.';
        el.querySelector('.fq-fill').style.width = '0';
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load, { once: true });
  else load();
})();
