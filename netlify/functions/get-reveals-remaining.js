// netlify/functions/get-reveals-remaining.js
// GET /.netlify/functions/get-reveals-remaining
// Returns how many contact reveals the logged-in user has left today.

const {
  corsOk, json,
  verifyToken, extractBearer,
} = require('./_utils');

const DAILY_LIMIT = 5;

function sbHeaders() {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_KEY not set');
  return {
    'Content-Type':  'application/json',
    'apikey':        key,
    'Authorization': `Bearer ${key}`,
    'Prefer':        'count=exact',
  };
}
function sbUrl(table, qs = '') {
  const base = process.env.SUPABASE_URL;
  return `${base}/rest/v1/${table}${qs ? '?' + qs : ''}`;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsOk();
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });

  const token = extractBearer(event);
  if (!token) return json(200, { remaining: DAILY_LIMIT, limit: DAILY_LIMIT });

  let decoded;
  try { decoded = verifyToken(token); }
  catch { return json(200, { remaining: DAILY_LIMIT, limit: DAILY_LIMIT }); }

  try {
    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    nowIST.setHours(0, 0, 0, 0);
    const utcMidnight = new Date(nowIST.getTime() - (5.5 * 60 * 60 * 1000)).toISOString();

    const qs = `revealer_id=eq.${encodeURIComponent(decoded.id)}&otp_verified=eq.true&revealed_at=gte.${encodeURIComponent(utcMidnight)}&select=id`;
    const res = await fetch(sbUrl('contact_reveals', qs), { method: 'HEAD', headers: sbHeaders() });
    const range = res.headers.get('content-range') || '0/0';
    const used = parseInt(range.split('/')[1], 10) || 0;
    const remaining = Math.max(0, DAILY_LIMIT - used);

    return json(200, { remaining, limit: DAILY_LIMIT, used });
  } catch {
    return json(200, { remaining: DAILY_LIMIT, limit: DAILY_LIMIT });
  }
};
