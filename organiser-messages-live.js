// Floox — live messages tab for the organiser dashboard
// Reuses the same /api/messages, /api/send-message, /api/mark-messages-read
// endpoints that power floox-messages.html, so organisers see real
// conversations with artists and enquirers directly inside their dashboard.
(() => {
  'use strict';
  const esc = v => String(v ?? '').replace(/[&<>\'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const fmtTime = v => { const d = new Date(v); return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); };
  const fmtDate = v => { const d = new Date(v); if (Number.isNaN(d.getTime())) return ''; const now = new Date(); return d.toDateString() === now.toDateString() ? fmtTime(v) : d.toLocaleDateString([], {day:'2-digit',month:'short'}); };
  const toast = (msg, type='info') => window.FLOOX?.toast(msg, type);
  let convos = [];
  let activeId = null;

  function convoItemHTML(c) {
    const name = c.user?.name || 'Floox user';
    return `<div class="enquiry-item ${activeId===c.user?.id?'active':''}" onclick="openOrgConversation('${esc(c.user?.id)}')">
      <div class="enq-head"><span class="enq-from">${esc(name)}</span><span class="enq-time">${esc(fmtDate(c.lastMessage?.createdAt))}</span></div>
      <div class="enq-event">${esc(c.lastMessage?.body || 'No messages yet')}</div>
      <div class="enq-foot">${c.unread ? `<span class="bi-badge pending">${c.unread} new</span>` : `<span class="bi-badge completed">Read</span>`}</div>
    </div>`;
  }

  function renderList() {
    const box = document.getElementById('orgConvoList');
    if (!box) return;
    box.innerHTML = convos.length
      ? convos.map(convoItemHTML).join('')
      : `<div style="text-align:center;color:var(--muted);font-size:0.85rem;padding:2rem 1rem">No conversations yet.<br>Messages from artists and enquirers will appear here.</div>`;
  }

  function updateBadge() {
    const unread = convos.reduce((s, c) => s + (c.unread || 0), 0);
    const badge = document.getElementById('msgBadge');
    if (!badge) return;
    badge.textContent = unread;
    badge.style.display = unread ? 'inline' : 'none';
  }

  async function loadList() {
    const box = document.getElementById('orgConvoList');
    try {
      const d = await FLOOX.getMessages({ limit: 300 });
      convos = d.conversations || [];
      renderList();
      updateBadge();
    } catch (e) {
      if (box) box.innerHTML = `<div style="text-align:center;color:var(--muted);font-size:0.85rem;padding:2rem 1rem">Could not load messages.</div>`;
    }
  }

  window.openOrgConversation = async function (id) {
    activeId = id;
    renderList();
    const detail = document.getElementById('orgConvoDetail');
    if (!detail) return;
    detail.innerHTML = `<div style="text-align:center;color:var(--muted);font-size:0.85rem;padding:2rem">Loading…</div>`;
    try {
      const d = await FLOOX.getMessages({ with: id, limit: 300 });
      const me = FLOOX.getUser();
      const participant = d.participant;
      const thread = (d.messages || []).map(m => {
        const mine = m.senderId === me?.id;
        return `<div class="msg-bubble ${mine?'mine':''}">${esc(m.body)}<div class="msg-bubble-meta">${mine?'You':esc(participant?.name||'Them')} · ${esc(fmtTime(m.createdAt))}</div></div>`;
      }).join('') || `<div style="text-align:center;color:var(--muted);font-size:0.8rem;padding:1rem">Say hello to start the conversation.</div>`;
      detail.innerHTML = `
        <div style="font-family:var(--head);font-weight:800;font-size:1rem;margin-bottom:0.9rem">${esc(participant?.name||'Floox member')}</div>
        <div class="msg-thread" id="orgMsgThread">${thread}</div>
        <div class="msg-reply">
          <textarea id="orgReplyBody" maxlength="2000" placeholder="Write a reply…"></textarea>
          <div style="display:flex;align-items:center;gap:0.6rem;margin-top:0.6rem">
            <div style="flex:1;font-size:0.7rem;color:var(--muted)" id="orgReplyStatus"></div>
            <button class="tb-btn tb-teal" onclick="sendOrgReply('${esc(id)}')">Send →</button>
            <a class="tb-btn tb-ghost" href="floox-messages.html?with=${encodeURIComponent(id)}">Open full chat</a>
          </div>
        </div>`;
      const t = document.getElementById('orgMsgThread'); if (t) t.scrollTop = t.scrollHeight;
      await FLOOX.markMessagesRead(id);
      await loadList();
    } catch (e) {
      detail.innerHTML = `<div style="text-align:center;color:var(--muted);font-size:0.85rem;padding:2rem">Could not load this conversation.</div>`;
    }
  };

  window.sendOrgReply = async function (id) {
    const box = document.getElementById('orgReplyBody');
    const status = document.getElementById('orgReplyStatus');
    const body = (box?.value || '').trim();
    if (body.length < 10) { if (status) status.textContent = 'Write at least 10 characters.'; return; }
    if (status) status.textContent = 'Sending…';
    try {
      await FLOOX.sendMessage({ receiverId: id, subject: 'Direct message', body });
      if (box) box.value = '';
      await window.openOrgConversation(id);
      toast('Message sent.', 'success');
    } catch (e) {
      if (status) status.textContent = e.message || 'Could not send message.';
    }
  };

  window.renderOrganiserMessages = function () { loadList(); };

  const start = () => { if (!window.FLOOX?.getUser()) return; loadList(); setInterval(loadList, 20000); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else setTimeout(start, 0);
})();
