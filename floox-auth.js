// floox-auth.js — Shared authentication & API helper  v2
// Loaded on every page via <script src="floox-auth.js">

const FLOOX = (() => {
  const API = '/.netlify/functions';

  // ── Token management ──────────────────────────────────────────────────────
  function getToken()   { return localStorage.getItem('floox_token'); }
  function getUser()    { const u = localStorage.getItem('floox_user'); try { return u ? JSON.parse(u) : null; } catch { return null; } }
  function isLoggedIn() { return !!getToken() && !!getUser(); }

  function saveSession(token, user) {
    localStorage.setItem('floox_token', token);
    localStorage.setItem('floox_user', JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem('floox_token');
    localStorage.removeItem('floox_user');
  }

  // ── API helpers ───────────────────────────────────────────────────────────
  async function apiPost(endpoint, body, auth = false) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) { const t = getToken(); if (t) headers['Authorization'] = 'Bearer ' + t; }
    const res  = await fetch(API + '/' + endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  async function apiGet(endpoint, auth = true) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) { const t = getToken(); if (t) headers['Authorization'] = 'Bearer ' + t; }
    const res  = await fetch(API + '/' + endpoint, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  // ── Auth actions ──────────────────────────────────────────────────────────
  async function login(email, password) {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  let data;

  try {
    data = await res.json();
  } catch {
    throw new Error('Login server returned an invalid response.');
  }

  if (!res.ok) {
    throw new Error(data.error || 'Login failed. Please try again.');
  }

  saveSession(data.token, data.user);
  return data.user;
}

  async function register(payload) {
    return await apiPost('register', payload);
  }

  function logout(redirect = 'index.html') {
    clearSession();
    window.location.href = redirect;
  }

  // ── Profile helpers ───────────────────────────────────────────────────────
  async function getMe() {
    const data = await apiGet('me', true);
    // Keep local storage in sync
    const token = getToken();
    if (token) saveSession(token, data.user);
    return data.user;
  }

  async function updateMe(fields) {
    const data = await apiPost('me', fields, true);
    const token = getToken();
    if (token) saveSession(token, data.user);
    return data;
  }

  async function saveArtistProfile(fields) {
    const data = await apiPost('artist-profile', fields, true);
    const token = getToken();
    if (token) saveSession(token, data.user);
    return data;
  }

  async function saveOrganiserProfile(fields) {
    const data = await apiPost('organiser-profile', fields, true);
    const token = getToken();
    if (token) saveSession(token, data.user);
    return data;
  }

  async function changePassword(currentPassword, newPassword) {
    return await apiPost('change-password', { currentPassword, newPassword }, true);
  }

  // ── Artists directory (public) ────────────────────────────────────────────
  async function getArtists(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return await apiGet('artists?' + qs, false);
  }

  // ── Organisers directory (auth-gated) ─────────────────────────────────────
  // Only logged-in users can browse organisers
  async function getOrganisers(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return await apiGet('organisers?' + qs, true);
  }

  // ── Full profile by ID (auth-gated) ───────────────────────────────────────
  // Returns the complete profile of any user (phone, contact, etc.)
  // Only works if the viewer is logged in
  async function getProfile(id) {
    return await apiGet('get-profile?id=' + encodeURIComponent(id), true);
  }

  // ── File → base64 ─────────────────────────────────────────────────────────
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ── Upload single file to Cloudinary via function ─────────────────────────
  async function uploadFile(file, mediaType = 'image', onProgress) {
    const base64 = await fileToBase64(file);
    if (onProgress) onProgress(30);
    const token = getToken();
    if (!token) throw new Error('Not logged in');
    const res = await fetch(API + '/upload-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ fileData: base64, fileName: file.name, fileType: file.type, mediaType })
    });
    if (onProgress) onProgress(90);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  }

  // ── Nav update ────────────────────────────────────────────────────────────
  function updateNav() {
    const user = getUser();
    const loginLinks  = document.querySelectorAll('[data-auth="login"]');
    const logoutLinks = document.querySelectorAll('[data-auth="logout"]');
    const userNameEls = document.querySelectorAll('[data-auth="username"]');
    const dashLinks   = document.querySelectorAll('[data-auth="dashboard"]');

    if (user) {
      loginLinks.forEach(el  => el.style.display = 'none');
      logoutLinks.forEach(el => el.style.display = 'inline-flex');
      userNameEls.forEach(el => el.textContent = user.name.split(' ')[0]);
      dashLinks.forEach(el => {
        el.style.display = 'inline-flex';
        el.href = user.role === 'artist'    ? 'floox-dashboard-artist.html'
               :  user.role === 'organiser' ? 'floox-dashboard-organiser.html'
               :  'floox-dashboard-fan.html';
      });
    } else {
      loginLinks.forEach(el  => el.style.display = 'inline-flex');
      logoutLinks.forEach(el => el.style.display = 'none');
      dashLinks.forEach(el  => el.style.display = 'none');
    }
  }

  // ── Redirect if not logged in ─────────────────────────────────────────────
  function requireAuth(role) {
    if (!isLoggedIn()) { window.location.href = 'floox-login.html'; return false; }
    const user = getUser();
    if (role && user.role !== role) { window.location.href = 'index.html'; return false; }
    return user;
  }

  // ── Toast ─────────────────────────────────────────────────────────────────
  function toast(msg, type = 'info') {
    let el = document.getElementById('flooxToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'flooxToast';
      el.style.cssText = 'position:fixed;bottom:2rem;left:50%;transform:translateX(-50%) translateY(80px);z-index:9999;background:#1C1000;color:#fff;border-radius:100px;padding:0.85rem 1.6rem;font-size:0.88rem;display:flex;align-items:center;gap:0.6rem;opacity:0;transition:all 0.35s cubic-bezier(0.34,1.56,0.64,1);pointer-events:none;box-shadow:0 8px 28px rgba(0,0,0,0.4);font-family:"Plus Jakarta Sans",sans-serif;max-width:90vw;text-align:center';
      document.body.appendChild(el);
    }
    const colors = { success: '#22C55E', error: '#FF2D78', info: '#00C2A8' };
    el.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:${colors[type]||colors.info};flex-shrink:0"></span><span>${msg}</span>`;
    el.style.transform = 'translateX(-50%) translateY(0)';
    el.style.opacity   = '1';
    clearTimeout(el._t);
    el._t = setTimeout(() => {
      el.style.transform = 'translateX(-50%) translateY(80px)';
      el.style.opacity   = '0';
    }, 4000);
  }

  // ── Format bytes ──────────────────────────────────────────────────────────
  function fmtBytes(b) {
    if (b < 1024)    return b + ' B';
    if (b < 1048576) return (b/1024).toFixed(1) + ' KB';
    return (b/1048576).toFixed(1) + ' MB';
  }

  // Run nav update on every page load
  document.addEventListener('DOMContentLoaded', updateNav);

  return {
    getToken, getUser, isLoggedIn,
    login, register, logout,
    getMe, updateMe, saveArtistProfile, saveOrganiserProfile,
    changePassword, getArtists, getOrganisers, getProfile,
    uploadFile, updateNav, requireAuth,
    toast, fmtBytes, apiPost, apiGet,
    saveSession, clearSession,
  };
})();
