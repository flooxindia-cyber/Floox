// Vercel Serverless Function — thin shim so /api/global-events resolves.
// All logic lives in server/functions/global-events.js.
const { handler } = require('../server/functions/global-events');

module.exports = async function (req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(204).end();
  }

  const event = {
    httpMethod: req.method,
    headers: req.headers || {},
    body: req.body == null ? '' : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body)),
    queryStringParameters: req.query || {},
    path: req.url,
  };

  const result = await handler(event, {});
  Object.entries(result?.headers || {}).forEach(([k, v]) => res.setHeader(k, v));
  return res.status(result?.statusCode || 200).send(result?.body || '');
};
