<<<<<<< HEAD
// floox-auth.js — Shared authentication & API helper v4
// Floox — Vercel + Supabase
// IMPORTANT: All API calls use relative /api/* routes.
=======
// floox-auth.js — Shared authentication & API helper v3
// Centralized auth/session + role-based routing.
>>>>>>> 14b917eca2ff8fb33b97e6031def3bd9966804aa

const FLOOX = (() => {
  const API = '/api';

<<<<<<< HEAD
  /* =========================================================
     SESSION
  ========================================================= */

  function getToken() {
    return localStorage.getItem('floox_token');
  }

  function getUser() {
    const raw = localStorage.getItem('floox_user');

    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function isLoggedIn() {
    return !!getToken();
  }

  function saveSession(token, user) {
    if (token) {
      localStorage.setItem('floox_token', token);
    }

    if (user) {
      localStorage.setItem('floox_user', JSON.stringify(user));
    }
=======
  function getToken() { return localStorage.getItem('floox_token'); }
  function getUser() {
    const raw = localStorage.getItem('floox_user');
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
  function isLoggedIn() { return !!getToken(); }

  function saveSession(token, user) {
    if (token) localStorage.setItem('floox_token', token);
    if (user) localStorage.setItem('floox_user', JSON.stringify(user));
>>>>>>> 14b917eca2ff8fb33b97e6031def3bd9966804aa
  }

  function clearSession() {
    localStorage.removeItem('floox_token');
    localStorage.removeItem('floox_user');
  }

<<<<<<< HEAD
  /* =========================================================
     ROLE / DASHBOARD ROUTING
  ========================================================= */

  function dashboardForRole(role) {
    switch (String(role || '').toLowerCase()) {
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
=======
  function dashboardForRole(role) {
    switch (String(role || '').toLowerCase()) {
      case 'artist': return 'floox-dashboard-artist.html';
      case 'organiser': return 'floox-dashboard-organiser.html';
      case 'fan': return 'floox-dashboard-fan.html';
      default: return 'floox-public.html';
>>>>>>> 14b917eca2ff8fb33b97e6031def3bd9966804aa
    }
  }

  function dashboardUrl(user) {
    return dashboardForRole(user && user.role);
  }

<<<<<<< HEAD
  /* =========================================================
     GENERIC API HELPERS
  ========================================================= */

  async function apiPost(endpoint, body = {}, auth = false) {
    const headers = {
      'Content-Type': 'application/json'
    };

    const token = getToken();

    if (auth && token) {
      headers.Authorization = 'Bearer ' + token;
    }

    const response = await fetch(API + '/' + endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        'Request failed'
      );
    }

=======
  async function apiPost(endpoint, body = {}, auth = false) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (auth && token) headers.Authorization = 'Bearer ' + token;
    const res = await fetch(API + '/' + endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
>>>>>>> 14b917eca2ff8fb33b97e6031def3bd9966804aa
    return data;
  }

  async function apiGet(endpoint, auth = true) {
<<<<<<< HEAD
    const headers = {
      'Content-Type': 'application/json'
    };

    const token = getToken();

    if (auth && token) {
      headers.Authorization = 'Bearer ' + token;
    }

    const response = await fetch(API + '/' + endpoint, {
      method: 'GET',
      headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        'Request failed'
      );
    }

    return data;
  }

  /* =========================================================
     LOGIN
  ========================================================= */

  async function login(email, password) {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        'Login failed. Please try again.'
      );
    }

    if (!data.token || !data.user) {
      throw new Error(
        'Login response is incomplete. Please try again.'
      );
    }

    saveSession(data.token, data.user);

    return data.user;
  }

  /* =========================================================
     REGISTER
  ========================================================= */

  async function register(payload) {
    const data = await apiPost('register', payload);

    /*
      Registration should normally return:

      {
        requiresOtp: true,
        email: "...",
        role: "artist"
      }

      Do NOT automatically bypass OTP here.
      The verification page is responsible for verification.
    */

    return data;
  }

  /* =========================================================
     OTP
  ========================================================= */

  async function verifyOtp(
    email,
    otp,
    purpose = 'registration'
  ) {
    const response = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        otp,
        purpose
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        'Verification failed.'
      );
=======
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (auth && token) headers.Authorization = 'Bearer ' + token;
    const res = await fetch(API + '/' + endpoint, { headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  async function login(email, password) {
    const res = await fetch('/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Login failed. Please try again.');
    saveSession(data.token, data.user);
    return data.user;
  }

  async function register(payload) {
    const data = await apiPost('register', payload);
    if (window.FLOOX_DEMO && data && data.requiresOtp && typeof window.FLOOX_DEMO_OTP_VERIFY === 'function') {
      const verified = await window.FLOOX_DEMO_OTP_VERIFY(payload.email);
      if (verified && verified.token && verified.user) saveSession(verified.token, verified.user);
      return verified;
>>>>>>> 14b917eca2ff8fb33b97e6031def3bd9966804aa
    }

    /*
      Successful verification should establish the session
      if backend returns token + user.
    */

    if (data.token && data.user) {
      saveSession(data.token, data.user);
    }

    return data;
  }

<<<<<<< HEAD
  async function resendOtp(
    email,
    purpose = 'registration'
  ) {
    const response = await fetch('/api/resend-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        purpose
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        'Could not resend OTP.'
      );
    }

    return data;
  }

  /* =========================================================
     LOGOUT
  ========================================================= */
=======
  async function verifyOtp(email, otp, purpose = 'registration') {
    const res = await fetch('/api/verify-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, otp, purpose }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Verification failed.');
    if (data.token && data.user) saveSession(data.token, data.user);
    return data;
  }

  async function resendOtp(email, purpose = 'registration') {
    const res = await fetch('/api/resend-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, purpose }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not resend OTP.');
    return data;
  }
>>>>>>> 14b917eca2ff8fb33b97e6031def3bd9966804aa

  function logout(redirect = 'index.html') {
    clearSession();

    window.location.href = redirect;
  }

<<<<<<< HEAD
  /* =========================================================
     CURRENT USER
  ========================================================= */

  async function getMe() {
    const token = getToken();

    if (!token) {
      throw new Error('Authentication required.');
    }

    const data = await apiGet('me', true);

    if (!data.user) {
      throw new Error('Invalid user response.');
    }

    /*
      Preserve the current token and refresh the cached
      user information from Supabase/backend.
    */

    saveSession(token, data.user);

    return data.user;
  }

  /* =========================================================
     UPDATE USER
  ========================================================= */

  async function updateMe(fields) {
    const data = await apiPost(
      'me',
      fields,
      true
    );

    if (data.user) {
      saveSession(getToken(), data.user);
    }

    return data;
  }

  /* =========================================================
     ARTIST PROFILE
  ========================================================= */

  async function saveArtistProfile(fields) {
    const data = await apiPost(
      'artist-profile',
      fields,
      true
    );

    if (data.user) {
      saveSession(getToken(), data.user);
    }

=======
  async function getMe() {
    const token = getToken();
    if (!token) throw new Error('Authentication required.');
    const data = await apiGet('me', true);
    saveSession(token, data.user);
    return data.user;
  }

  async function updateMe(fields) {
    const data = await apiPost('me', fields, true);
    saveSession(getToken(), data.user);
    return data;
  }

  async function saveArtistProfile(fields) {
    const data = await apiPost('artist-profile', fields, true);
    saveSession(getToken(), data.user);
>>>>>>> 14b917eca2ff8fb33b97e6031def3bd9966804aa
    return data;
  }

  /* =========================================================
     ORGANISER PROFILE
  ========================================================= */

  async function saveOrganiserProfile(fields) {
<<<<<<< HEAD
    const data = await apiPost(
      'organiser-profile',
      fields,
      true
    );

    if (data.user) {
      saveSession(getToken(), data.user);
    }

    return data;
  }

  /* =========================================================
     CHANGE PASSWORD
  ========================================================= */

  async function changePassword(
    currentPassword,
    newPassword
  ) {
    return apiPost(
      'change-password',
      {
        currentPassword,
        newPassword
      },
      true
    );
  }

  /* =========================================================
     ARTISTS
  ========================================================= */

  async function getArtists(params = {}) {
    const query = new URLSearchParams(params).toString();

    const response = await fetch(
      '/api/artists' +
      (query ? '?' + query : ''),
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        'Failed to load artists.'
      );
    }

    return data;
  }

  /* =========================================================
     ORGANISERS
  ========================================================= */

  async function getOrganisers(params = {}) {
    const query = new URLSearchParams(params).toString();

    const response = await fetch(
      '/api/organisers' +
      (query ? '?' + query : ''),
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        'Failed to load organisers.'
      );
    }

    return data;
  }

  /* =========================================================
     PROFILE
  ========================================================= */

  async function getProfile(id) {
    return apiGet(
      'get-profile?id=' +
      encodeURIComponent(id),
      true
    );
  }

  /* =========================================================
     FILE UPLOAD
  ========================================================= */

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

=======
    const data = await apiPost('organiser-profile', fields, true);
    saveSession(getToken(), data.user);
    return data;
  }

  async function changePassword(currentPassword, newPassword) {
    return apiPost('change-password', { currentPassword, newPassword }, true);
  }

  async function getArtists(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch('/api/artists' + (qs ? '?' + qs : ''), { headers: { 'Content-Type': 'application/json' } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to load artists.');
    return data;
  }

  async function getOrganisers(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiGet('organisers' + (qs ? '?' + qs : ''), true);
  }

  async function getProfile(id) {
    return apiGet('get-profile?id=' + encodeURIComponent(id), true);
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
>>>>>>> 14b917eca2ff8fb33b97e6031def3bd9966804aa
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;

      reader.readAsDataURL(file);
    });
  }

<<<<<<< HEAD
  async function uploadFile(
    file,
    mediaType = 'image',
    onProgress
  ) {
    if (!file) {
      throw new Error('No file selected.');
    }

    const token = getToken();

    if (!token) {
      throw new Error('You must be logged in to upload files.');
    }

    const base64 = await fileToBase64(file);

    if (onProgress) {
      onProgress(30);
    }

    const response = await fetch(
      API + '/upload-media',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token
        },
        body: JSON.stringify({
          fileData: base64,
          fileName: file.name,
          fileType: file.type,
          mediaType
        })
      }
    );

    if (onProgress) {
      onProgress(90);
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error ||
        data.message ||
        'Upload failed.'
      );
    }

    if (onProgress) {
      onProgress(100);
    }

    return data;
  }

  /* =========================================================
     NAVIGATION / AUTH STATE
  ========================================================= */

  async function updateNav() {
    const loginLinks =
      document.querySelectorAll(
        '[data-auth="login"]'
      );

    const logoutLinks =
      document.querySelectorAll(
        '[data-auth="logout"]'
      );

    const userNameEls =
      document.querySelectorAll(
        '[data-auth="username"]'
      );

    const dashLinks =
      document.querySelectorAll(
        '[data-auth="dashboard"]'
      );

    const token = getToken();

    /*
      No session
    */

    if (!token) {
      loginLinks.forEach(
        el => el.style.display = 'inline-flex'
      );

      logoutLinks.forEach(
        el => el.style.display = 'none'
      );

      userNameEls.forEach(
        el => el.style.display = 'none'
      );

      dashLinks.forEach(
        el => el.style.display = 'none'
      );

      return null;
    }

    try {
      /*
        Always ask backend for the real user.
        This prevents stale localStorage roles from
        sending users to the wrong dashboard.
      */

      const user = await getMe();

      if (!user || !user.role) {
        throw new Error('Invalid session.');
      }

      const url = dashboardUrl(user);

      /*
        Hide login / show account controls
      */

      loginLinks.forEach(
        el => el.style.display = 'none'
      );

      logoutLinks.forEach(
        el => el.style.display = 'inline-flex'
      );

      userNameEls.forEach(el => {
        el.style.display = 'inline-flex';

        el.textContent =
          'Hi, ' +
          (
            user.name ||
            user.email ||
            'Account'
          )
            .split(' ')[0] +
          '! 👋';
      });

      /*
        Dashboard button
      */

      dashLinks.forEach(el => {
        el.style.display = 'inline-flex';
        el.href = url;

        /*
          Use onclick as a second protection.
        */

        el.onclick = function (event) {
          event.preventDefault();
          event.stopPropagation();

          window.location.assign(url);

          return false;
        };
      });

      /*
        Capture dashboard clicks in the capture phase.
        This protects against old inline JavaScript on
        index.html changing the destination.
      */

      if (
        !document.documentElement
          .dataset
          .flooxDashboardRouteGuard
      ) {
        document.documentElement
          .dataset
          .flooxDashboardRouteGuard = '1';

        document.addEventListener(
          'click',
          function (event) {
            const link =
              event.target.closest(
                '[data-auth="dashboard"]'
              );

            if (!link) return;

            event.preventDefault();
            event.stopImmediatePropagation();

            const cachedUser = getUser();

            if (
              cachedUser &&
              cachedUser.role
            ) {
              window.location.assign(
                dashboardForRole(
                  cachedUser.role
                )
              );
            } else {
              window.location.assign(
                'floox-login.html'
              );
            }
          },
          true
        );
      }

      /*
        Re-apply href after any legacy DOMContentLoaded
        handler has executed.
      */

      setTimeout(() => {
        dashLinks.forEach(el => {
          el.href = url;

          el.onclick = function (event) {
            event.preventDefault();
            event.stopPropagation();

            window.location.assign(url);

            return false;
          };
        });
      }, 0);

      return user;

    } catch (error) {

      /*
        Invalid/expired session
      */

      clearSession();

      loginLinks.forEach(
        el => el.style.display = 'inline-flex'
      );

      logoutLinks.forEach(
        el => el.style.display = 'none'
      );

      userNameEls.forEach(
        el => el.style.display = 'none'
      );

      dashLinks.forEach(
        el => el.style.display = 'none'
      );

=======
  async function uploadFile(file, mediaType = 'image', onProgress) {
    const base64 = await fileToBase64(file);
    if (onProgress) onProgress(30);
    const token = getToken();
    if (!token) throw new Error('Not logged in');
    const res = await fetch(API + '/upload-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ fileData: base64, fileName: file.name, fileType: file.type, mediaType })
    });
    if (onProgress) onProgress(90);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  }

  // IMPORTANT: verify the session with /api/me before exposing a dashboard link.
  // This prevents stale localStorage roles from sending users to the wrong page.
  async function updateNav() {
    const loginLinks = document.querySelectorAll('[data-auth="login"]');
    const logoutLinks = document.querySelectorAll('[data-auth="logout"]');
    const userNameEls = document.querySelectorAll('[data-auth="username"]');
    const dashLinks = document.querySelectorAll('[data-auth="dashboard"]');

    const token = getToken();
    if (!token) {
      loginLinks.forEach(el => el.style.display = 'inline-flex');
      logoutLinks.forEach(el => el.style.display = 'none');
      userNameEls.forEach(el => el.style.display = 'none');
      dashLinks.forEach(el => el.style.display = 'none');
      return null;
    }

    try {
      const user = await getMe();
      if (!user || !user.role) throw new Error('Invalid session');

      loginLinks.forEach(el => el.style.display = 'none');
      logoutLinks.forEach(el => el.style.display = 'inline-flex');
      userNameEls.forEach(el => {
        el.style.display = 'inline-flex';
        el.textContent = (user.name || user.email || 'Account').split(' ')[0];
      });
      dashLinks.forEach(el => {
        el.style.display = 'inline-flex';
        el.href = dashboardUrl(user);
        el.dataset.dashboardRole = user.role;
        el.onclick = () => { window.location.href = dashboardUrl(user); return false; };
      });
      return user;
    } catch (err) {
      // Invalid/expired token: remove it so the nav cannot point to a stale dashboard.
      clearSession();
      loginLinks.forEach(el => el.style.display = 'inline-flex');
      logoutLinks.forEach(el => el.style.display = 'none');
      userNameEls.forEach(el => el.style.display = 'none');
      dashLinks.forEach(el => el.style.display = 'none');
>>>>>>> 14b917eca2ff8fb33b97e6031def3bd9966804aa
      return null;
    }
  }

<<<<<<< HEAD
  /* =========================================================
     PROTECTED PAGE
  ========================================================= */

  async function requireAuth(role) {
    const token = getToken();

    if (!token) {
      window.location.replace(
        'floox-login.html'
      );

      return false;
    }

    try {
      const user = await getMe();

      if (!user || !user.role) {
        throw new Error(
          'Invalid account.'
        );
      }

      /*
        If page requires a specific role and the
        logged-in user has another role, send them
        to their own dashboard.
      */

      if (
        role &&
        String(user.role).toLowerCase() !==
        String(role).toLowerCase()
      ) {
        window.location.replace(
          dashboardUrl(user)
        );

        return false;
      }

      return user;

    } catch (error) {
      clearSession();

      window.location.replace(
        'floox-login.html'
      );

      return false;
    }
  }

  /* =========================================================
     GO TO DASHBOARD
  ========================================================= */

  async function goDashboard() {
    const token = getToken();

    if (!token) {
      window.location.href =
        'floox-login.html';

      return;
    }

    try {
      const user = await getMe();

      if (!user || !user.role) {
        throw new Error(
          'Invalid account.'
        );
      }

      window.location.assign(
        dashboardUrl(user)
      );

    } catch (error) {

      /*
        Use cached user only as fallback.
      */

      const cachedUser = getUser();

      if (
        cachedUser &&
        cachedUser.role
      ) {
        window.location.assign(
          dashboardForRole(
            cachedUser.role
          )
        );
      } else {
        clearSession();

        window.location.assign(
          'floox-login.html'
        );
      }
    }
  }

  /* =========================================================
     TOAST
  ========================================================= */

  let toastTimer;

  function toast(
    message,
    type = 'info'
  ) {
    let el =
      document.getElementById(
        'flooxToast'
      );

    if (!el) {
      el = document.createElement('div');

      el.id = 'flooxToast';

      el.style.cssText =
        'position:fixed;' +
        'bottom:2rem;' +
        'left:50%;' +
        'transform:translateX(-50%) translateY(80px);' +
        'z-index:99999;' +
        'background:#1C1000;' +
        'color:#fff;' +
        'border-radius:100px;' +
        'padding:.85rem 1.6rem;' +
        'font-size:.88rem;' +
        'display:flex;' +
        'align-items:center;' +
        'gap:.6rem;' +
        'opacity:0;' +
        'transition:all .35s;' +
        'pointer-events:none;' +
        'box-shadow:0 8px 28px rgba(0,0,0,.4);' +
        'max-width:90vw;' +
        'text-align:center;';

      document.body.appendChild(el);
    }

    const colors = {
      success: '#22C55E',
      error: '#FF2D78',
      info: '#00C2A8'
    };

    el.innerHTML =
      '<span style="' +
      'width:8px;' +
      'height:8px;' +
      'border-radius:50%;' +
      'background:' +
      (colors[type] || colors.info) +
      ';flex-shrink:0">' +
      '</span>' +
      '<span>' +
      String(message) +
      '</span>';

    el.style.transform =
      'translateX(-50%) translateY(0)';

    el.style.opacity = '1';

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      el.style.transform =
        'translateX(-50%) translateY(80px)';

      el.style.opacity = '0';
    }, 4000);
  }

  /* =========================================================
     FORMAT BYTES
  ========================================================= */

  function fmtBytes(bytes) {
    if (bytes < 1024) {
      return bytes + ' B';
    }

    if (bytes < 1048576) {
      return (
        bytes / 1024
      ).toFixed(1) + ' KB';
    }

    return (
      bytes / 1048576
    ).toFixed(1) + ' MB';
  }

  /* =========================================================
     INITIALIZE
  ========================================================= */

  document.addEventListener(
    'DOMContentLoaded',
    function () {
      updateNav();
    }
  );

  /* =========================================================
     PUBLIC API
  ========================================================= */

  return {
    getToken,
    getUser,
    isLoggedIn,

    dashboardForRole,
    dashboardUrl,

    login,
    register,

    verifyOtp,
    resendOtp,

    logout,

    getMe,
    updateMe,

    saveArtistProfile,
    saveOrganiserProfile,

    changePassword,

    getArtists,
    getOrganisers,
    getProfile,

    uploadFile,

    updateNav,
    requireAuth,
    goDashboard,

    toast,
    fmtBytes,

    apiPost,
    apiGet,

    saveSession,
    clearSession
=======
  // Use this on protected pages. It verifies the role against the backend,
  // rather than trusting only localStorage.
  async function requireAuth(role) {
    const token = getToken();
    if (!token) { window.location.replace('floox-login.html'); return false; }
    try {
      const user = await getMe();
      if (!user || !user.role) throw new Error('Invalid account');
      if (role && user.role !== role) {
        window.location.replace(dashboardUrl(user));
        return false;
      }
      return user;
    } catch (err) {
      clearSession();
      window.location.replace('floox-login.html');
      return false;
    }
  }

  function goDashboard() {
    const cached = getUser();
    if (!getToken()) { window.location.href = 'floox-login.html'; return; }
    // Try server verification; fallback only for transient API failures.
    getMe().then(user => {
      window.location.href = dashboardUrl(user);
    }).catch(() => {
      if (cached && cached.role) window.location.href = dashboardUrl(cached);
      else window.location.href = 'floox-login.html';
    });
  }

  function toast(msg, type = 'info') {
    let el = document.getElementById('flooxToast');
    if (!el) {
      el = document.createElement('div'); el.id = 'flooxToast';
      el.style.cssText = 'position:fixed;bottom:2rem;left:50%;transform:translateX(-50%) translateY(80px);z-index:9999;background:#1C1000;color:#fff;border-radius:100px;padding:.85rem 1.6rem;font-size:.88rem;display:flex;align-items:center;gap:.6rem;opacity:0;transition:all .35s;pointer-events:none;box-shadow:0 8px 28px rgba(0,0,0,.4);font-family:Arial,sans-serif;max-width:90vw;text-align:center';
      document.body.appendChild(el);
    }
    const colors = { success: '#22C55E', error: '#FF2D78', info: '#00C2A8' };
    el.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:${colors[type] || colors.info};flex-shrink:0"></span><span>${msg}</span>`;
    el.style.transform = 'translateX(-50%) translateY(0)'; el.style.opacity = '1';
    clearTimeout(el._t); el._t = setTimeout(() => { el.style.transform = 'translateX(-50%) translateY(80px)'; el.style.opacity = '0'; }, 4000);
  }

  function fmtBytes(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  document.addEventListener('DOMContentLoaded', () => { updateNav(); });

  return {
    getToken, getUser, isLoggedIn, dashboardForRole, dashboardUrl,
    login, register, verifyOtp, resendOtp, logout,
    getMe, updateMe, saveArtistProfile, saveOrganiserProfile,
    changePassword, getArtists, getOrganisers, getProfile,
    uploadFile, updateNav, requireAuth, goDashboard,
    toast, fmtBytes, apiPost, apiGet, saveSession, clearSession
>>>>>>> 14b917eca2ff8fb33b97e6031def3bd9966804aa
  };
})();