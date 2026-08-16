// Floox API gateway — single Vercel Serverless Function
// Keeps all existing server/functions handlers while exposing them through /api/*.

const path = require('path');

const HANDLERS = {
  'artist-profile': require('../server/functions/artist-profile').handler,
  artists: require('../server/functions/artists').handler,
  'change-password': require('../server/functions/change-password').handler,
  'delete-account': require('../server/functions/delete-account').handler,
  'forgot-password': require('../server/functions/forgot-password').handler,
  'get-likes': require('../server/functions/get-likes').handler,
  'get-profile': require('../server/functions/get-profile').handler,
  'get-reveals-remaining': require('../server/functions/get-reveals-remaining').handler,
  login: require('../server/functions/login').handler,
  me: require('../server/functions/me').handler,
  'organiser-profile': require('../server/functions/organiser-profile').handler,
  organisers: require('../server/functions/organisers').handler,
  register: require('../server/functions/register').handler,
  'resend-otp': require('../server/functions/resend-otp').handler,
  'reset-password': require('../server/functions/reset-password').handler,
  'reveal-contact': require('../server/functions/reveal-contact').handler,
  'send-message': require('../server/functions/send-message').handler,
  'toggle-like': require('../server/functions/toggle-like').handler,
  'upload-media': require('../server/functions/upload-media').handler,
  'verify-otp': require('../server/functions/verify-otp').handler,
};

function json(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify(payload));
}

function getRoute(req) {
  const raw = req.query?.route || req.query?.path || '';
  if (Array.isArray(raw)) return raw.join('/').replace(/^\/+|\/+$/g, '');
  return String(raw).replace(/^\/+|\/+$/g, '').split('?')[0];
}

module.exports = async function handler(req, res) {
  const route = getRoute(req);
  const fn = HANDLERS[route];

  if (!fn) {
    return json(res, 404, { error: `API route not found: /api/${route}` });
  }

  try {
    return await fn(req, res);
  } catch (err) {
    console.error(`API gateway error [${route}]:`, err);
    return json(res, 500, { error: 'Internal server error.' });
  }
};
