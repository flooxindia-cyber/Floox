// Floox API gateway — single Vercel Serverless Function
// Keeps all existing server/functions handlers while exposing them through /api/*.

const { adapt } = require('./_adapter');

const HANDLERS = {
  'artist-profile': adapt(require('../server/functions/artist-profile').handler),
  artists: adapt(require('../server/functions/artists').handler),
  'change-password': adapt(require('../server/functions/change-password').handler),
  'delete-account': adapt(require('../server/functions/delete-account').handler),
  'forgot-password': adapt(require('../server/functions/forgot-password').handler),
  'get-likes': adapt(require('../server/functions/get-likes').handler),
  'get-profile': adapt(require('../server/functions/get-profile').handler),
  'get-reveals-remaining': adapt(require('../server/functions/get-reveals-remaining').handler),
  login: adapt(require('../server/functions/login').handler),
  me: adapt(require('../server/functions/me').handler),
  'organiser-profile': adapt(require('../server/functions/organiser-profile').handler),
  organisers: adapt(require('../server/functions/organisers').handler),
  register: adapt(require('../server/functions/register').handler),
  'resend-otp': adapt(require('../server/functions/resend-otp').handler),
  'reset-password': adapt(require('../server/functions/reset-password').handler),
  'reveal-contact': adapt(require('../server/functions/reveal-contact').handler),
  'send-message': adapt(require('../server/functions/send-message').handler),
  'toggle-like': adapt(require('../server/functions/toggle-like').handler),
  'upload-media': adapt(require('../server/functions/upload-media').handler),
  'verify-otp': adapt(require('../server/functions/verify-otp').handler),
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
