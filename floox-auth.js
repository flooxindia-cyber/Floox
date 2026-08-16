// floox-auth.js — Shared authentication & API helper v5
// Floox — Vercel + Supabase
// Single source of truth for session, API calls, OTP, profile helpers and routing.
// IMPORTANT: All production API calls use the Vercel /api/* routes.

const FLOOX = (() => {
  'use strict';

  const API = '/api';

  // =========================================================
  // SESSION
  // =========================================================

  function getToken() {
    return localStorage.getItem('floox_token');
  }

  function getUser() {
    const raw = localStorage.getItem('floox_user');
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      // Corrupt local session should never break the page.
      localStorage.removeItem('floox_user');
      return null;
    }
  }

  function isLoggedIn() {
    return !!getToken() && !!getUser();
  }

  function saveSession(token, user) {
    if (token) {
      localStorage.setItem('floox_token', token);
    }

    if (user) {
      localStorage.setItem('floox_user', JSON.stringify(user));
    }
  }

  function clearSession() {
    localStorage.removeItem('floox_token');
    localStorage.removeItem('floox_user');
  }

  // =========================================================
  // ROLE / ROUTING
  // =========================================================

  function normaliseRole(role) {
    return String(role || '').trim().toLowerCase();
  }

  function dashboardForRole(role) {
    switch (normaliseRole(role)) {
      case 'artist':
        return 'floox-dashboard-artist.html';

      case 'organiser':
      case 'organizer':
        return 'floox-dashboard-organiser.html';

      case 'fan':
      case 'user':
        return 'floox-dashboard-fan.html';

      default:
        return 'floox-public.html';
    }
  }

  function dashboardUrl(user = getUser()) {
    return dashboardForRole(user && user.role);
  }

  function goToDashboard(user = getUser()) {
    if (!user || !user.role) {
      window.location.href = 'floox-login.html';
      return false;
    }

    window.location.href = dashboardForRole(user.role);
    return true;
  }

  function goToHome() {
    window.location.href = 'floox-public.html';
  }

  // =========================================================
  // API HELPERS
  // =========================================================

  async function parseResponse(response) {
    const text = await response.text();

    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text);
    } catch {
      // This gives a useful error when Vercel returns HTML
      // instead of JSON (404/500/routing problems).
      const preview = text.replace(/\s+/g, ' ').slice(0, 180);
      throw new Error(
        `Server returned an invalid response (${response.status}).` +
        (preview ? ` ${preview}` : '')
      );
    }
  }

  async function request(endpoint, options = {}) {
    const {
      method = 'GET',
      body,
      auth = false,
      headers: extraHeaders = {}
    } = options;

    const headers = {
      Accept: 'application/json',
      ...extraHeaders
    };

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (auth) {
      const token = getToken();

      if (!token) {
        throw new Error('Authentication required. Please sign in again.');
      }

      headers.Authorization = 'Bearer ' + token;
    }

    let response;

    try {
      response = await fetch(API + '/' + endpoint, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body)
      });
    } catch {
      throw new Error(
        'Unable to connect to Floox. Please check your internet connection and try again.'
      );
    }

    // If a stale token is rejected, clear the local session.
    if (response.status === 401 && auth) {
      clearSession();
    }

    const data = await parseResponse(response);

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        `Request failed (${response.status}).`
      );
    }

    return data;
  }

  async function apiPost(endpoint, body = {}, auth = false) {
    return request(endpoint, {
      method: 'POST',
      body,
      auth
    });
  }

  async function apiGet(endpoint, auth = true) {
    return request(endpoint, {
      method: 'GET',
      auth
    });
  }

  async function apiDelete(endpoint, auth = true) {
    return request(endpoint, {
      method: 'DELETE',
      auth
    });
  }

  // =========================================================
  // LOGIN
  // =========================================================

  async function login(email, password) {
    const data = await apiPost('login', {
      email: String(email || '').trim().toLowerCase(),
      password
    });

    if (!data.token || !data.user) {
      throw new Error('Login response is incomplete. Please try again.');
    }

    saveSession(data.token, data.user);
    return data.user;
  }

  // =========================================================
  // REGISTRATION
  // =========================================================

  async function register(payload) {
    return apiPost('register', payload);
  }

  // =========================================================
  // OTP
  // =========================================================

  async function verifyOtp(email, otp, purpose = 'registration') {
    const data = await apiPost('verify-otp', {
      email: String(email || '').trim().toLowerCase(),
      otp: String(otp || '').trim(),
      purpose
    });

    // Registration verification may establish the session.
    if (data.token && data.user) {
      saveSession(data.token, data.user);
    }

    return data;
  }

  async function resendOtp(email, purpose = 'registration') {
    return apiPost('resend-otp', {
      email: String(email || '').trim().toLowerCase(),
      purpose
    });
  }

  // =========================================================
  // PASSWORD RESET
  // =========================================================

  async function forgotPassword(email) {
    return apiPost('forgot-password', {
      email: String(email || '').trim().toLowerCase()
    });
  }

  async function resetPassword(email, otp, newPassword) {
    return apiPost('reset-password', {
      email: String(email || '').trim().toLowerCase(),
      otp: String(otp || '').trim(),
      newPassword
    });
  }

  async function changePassword(currentPassword, newPassword) {
    return apiPost(
      'change-password',
      {
        currentPassword,
        newPassword
      },
      true
    );
  }

  // =========================================================
  // LOGOUT
  // =========================================================

  function logout(redirect = 'floox-public.html') {
    clearSession();

    // Use a safe relative redirect. The default is the real Floox
    // public landing page, not index.html.
    window.location.href = redirect || 'floox-public.html';
  }

  // =========================================================
  // CURRENT USER / PROFILE
  // =========================================================

  async function getMe() {
    const token = getToken();

    if (!token) {
      throw new Error('Authentication required. Please sign in again.');
    }

    const data = await apiGet('me', true);

    if (!data.user) {
      throw new Error('Invalid user response.');
    }

    saveSession(token, data.user);
    return data.user;
  }

  async function updateMe(fields) {
    const data = await apiPost('me', fields, true);

    if (data.user) {
      saveSession(getToken(), data.user);
    }

    return data;
  }

  async function saveArtistProfile(fields) {
    const data = await apiPost('artist-profile', fields, true);

    if (data.user) {
      saveSession(getToken(), data.user);
    }

    return data;
  }

  async function saveOrganiserProfile(fields) {
    const data = await apiPost('organiser-profile', fields, true);

    if (data.user) {
      saveSession(getToken(), data.user);
    }

    return data;
  }

  async function getProfile(id) {
    if (!id) {
      throw new Error('Profile ID is required.');
    }

    return apiGet(
      'get-profile?id=' + encodeURIComponent(id),
      true
    );
  }

  // =========================================================
  // DIRECTORIES
  // =========================================================

  async function getArtists(params = {}) {
    const qs = new URLSearchParams(params).toString();

    return apiGet(
      'artists' + (qs ? '?' + qs : ''),
      false
    );
  }

  async function getOrganisers(params = {}) {
    const qs = new URLSearchParams(params).toString();

    return apiGet(
      'organisers' + (qs ? '?' + qs : ''),
      true
    );
  }

  // =========================================================
  // LIKES / CONTACT / MESSAGING
  // =========================================================

  async function toggleLike(artistId) {
    return apiPost(
      'toggle-like',
      { artistId },
      true
    );
  }

  async function getLikes() {
    return apiGet('get-likes', true);
  }

  async function revealContact(artistId) {
    return apiPost(
      'reveal-contact',
      { artistId },
      true
    );
  }

  async function getRevealsRemaining() {
    return apiGet('get-reveals-remaining', true);
  }

  async function sendMessage(payload) {
    return apiPost(
      'send-message',
      payload,
      true
    );
  }

  // =========================================================
  // FILE UPLOAD
  // =========================================================

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('No file selected.'));
        return;
      }

      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not read the selected file.'));

      reader.readAsDataURL(file);
    });
  }

  async function uploadFile(file, mediaType = 'image', onProgress) {
    if (!file) {
      throw new Error('Please select a file.');
    }

    const token = getToken();

    if (!token) {
      throw new Error('Not logged in. Please sign in again.');
    }

    if (typeof onProgress === 'function') {
      onProgress(10);
    }

    const base64 = await fileToBase64(file);

    if (typeof onProgress === 'function') {
      onProgress(35);
    }

    const data = await request('upload-media', {
      method: 'POST',
      auth: true,
      body: {
        fileData: base64,
        fileName: file.name,
        fileType: file.type,
        mediaType
      }
    });

    if (typeof onProgress === 'function') {
      onProgress(100);
    }

    return data;
  }

  // =========================================================
  // AUTH GUARDS
  // =========================================================

  function requireAuth(role) {
    const user = getUser();
    const token = getToken();

    if (!token || !user) {
      clearSession();
      window.location.href = 'floox-login.html';
      return null;
    }

    if (role) {
      const wanted = normaliseRole(role);
      const actual = normaliseRole(user.role);

      // Treat organiser/organizer as the same role.
      const sameRole =
        (wanted === 'organiser' || wanted === 'organizer') &&
        (actual === 'organiser' || actual === 'organizer');

      if (wanted !== actual && !sameRole) {
        // Never send a logged-in user to the public page just because
        // their role is wrong. Send them to their own dashboard.
        window.location.href = dashboardForRole(actual);
        return null;
      }
    }

    return user;
  }

  function redirectIfLoggedIn() {
    const user = getUser();
    const token = getToken();

    if (!token || !user) {
      return false;
    }

    goToDashboard(user);
    return true;
  }

  // =========================================================
  // NAVIGATION
  // =========================================================

  function updateNav() {
    const user = getUser();

    const loginLinks = document.querySelectorAll('[data-auth="login"]');
    const logoutLinks = document.querySelectorAll('[data-auth="logout"]');
    const userNameEls = document.querySelectorAll('[data-auth="username"]');
    const dashLinks = document.querySelectorAll('[data-auth="dashboard"]');

    if (user) {
      loginLinks.forEach(el => {
        el.style.display = 'none';
      });

      logoutLinks.forEach(el => {
        el.style.display = 'inline-flex';
      });

      userNameEls.forEach(el => {
        const name = user.name || user.email || 'User';
        el.textContent = String(name).split(' ')[0];
      });

      dashLinks.forEach(el => {
        el.style.display = 'inline-flex';
        el.href = dashboardForRole(user.role);

        // Make dashboard controls impossible to mis-route.
        if (!el.dataset.flooxDashboardBound) {
          el.dataset.flooxDashboardBound = '1';

          el.addEventListener('click', event => {
            event.preventDefault();
            goToDashboard(getUser());
          });
        }
      });
    } else {
      loginLinks.forEach(el => {
        el.style.display = 'inline-flex';
      });

      logoutLinks.forEach(el => {
        el.style.display = 'none';
      });

      dashLinks.forEach(el => {
        el.style.display = 'none';
      });
    }
  }

  // =========================================================
  // UI HELPERS
  // =========================================================

  function toast(msg, type = 'info') {
    let el = document.getElementById('flooxToast');

    if (!el) {
      el = document.createElement('div');
      el.id = 'flooxToast';

      el.style.cssText = [
        'position:fixed',
        'bottom:2rem',
        'left:50%',
        'transform:translateX(-50%) translateY(80px)',
        'z-index:99999',
        'background:#1C1000',
        'color:#fff',
        'border-radius:100px',
        'padding:.85rem 1.6rem',
        'font-size:.88rem',
        'display:flex',
        'align-items:center',
        'gap:.6rem',
        'opacity:0',
        'transition:all .35s cubic-bezier(.34,1.56,.64,1)',
        'pointer-events:none',
        'box-shadow:0 8px 28px rgba(0,0,0,.4)',
        'font-family:"Plus Jakarta Sans",sans-serif',
        'max-width:90vw',
        'text-align:center'
      ].join(';');

      document.body.appendChild(el);
    }

    const colors = {
      success: '#22C55E',
      error: '#FF2D78',
      info: '#00C2A8'
    };

    const dot = colors[type] || colors.info;

    // textContent avoids injecting arbitrary user/server HTML.
    el.innerHTML = '';
    const dotEl = document.createElement('span');
    dotEl.style.cssText =
      `width:8px;height:8px;border-radius:50%;background:${dot};flex-shrink:0`;

    const textEl = document.createElement('span');
    textEl.textContent = String(msg || '');

    el.appendChild(dotEl);
    el.appendChild(textEl);

    el.style.transform = 'translateX(-50%) translateY(0)';
    el.style.opacity = '1';

    clearTimeout(el._flooxTimer);

    el._flooxTimer = setTimeout(() => {
      el.style.transform = 'translateX(-50%) translateY(80px)';
      el.style.opacity = '0';
    }, 4000);
  }

  function fmtBytes(bytes) {
    const b = Number(bytes) || 0;

    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';

    return (b / 1048576).toFixed(1) + ' MB';
  }

  // =========================================================
  // PUBLIC API
  // =========================================================

  return {
    // session
    getToken,
    getUser,
    isLoggedIn,
    saveSession,
    clearSession,

    // routing
    normaliseRole,
    dashboardForRole,
    dashboardUrl,
    goToDashboard,
    goToHome,
    requireAuth,
    redirectIfLoggedIn,

    // API
    apiGet,
    apiPost,
    apiDelete,

    // authentication
    login,
    register,
    verifyOtp,
    resendOtp,
    forgotPassword,
    resetPassword,
    changePassword,
    logout,

    // profile
    getMe,
    updateMe,
    saveArtistProfile,
    saveOrganiserProfile,
    getProfile,

    // directories
    getArtists,
    getOrganisers,

    // interaction
    toggleLike,
    getLikes,
    revealContact,
    getRevealsRemaining,
    sendMessage,

    // upload
    fileToBase64,
    uploadFile,

    // UI
    updateNav,
    toast,
    fmtBytes
  };
})();

// Keep navigation consistent on every page that loads floox-auth.js.
document.addEventListener('DOMContentLoaded', () => {
  try {
    FLOOX.updateNav();
  } catch (err) {
    console.error('Floox navigation error:', err);
  }
});
