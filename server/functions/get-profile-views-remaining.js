// Floox server function
// Returns the authenticated user's remaining full-profile views for the current
// India calendar day. This endpoint never consumes a profile-view slot.

const { corsOk, json, verifyToken, extractBearer } = require('./_utils');

const DAILY_LIMIT = 5;

function dbHeaders() {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_KEY env var is not set');
  return {
    'Content-Type': 'application/json',
    apikey: key,
    Authorization: `Bearer ${key}`,
    Prefer: 'count=exact',
  };
}

function dbUrl(table, qs = '') {
  const base = process.env.SUPABASE_URL;
  if (!base) throw new Error('SUPABASE_URL env var is not set');
  return `${base}/rest/v1/${table}${qs ? '?' + qs : ''}`;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsOk();
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });

  const token = extractBearer(event);
  if (!token) return json(401, { error: 'Authentication required.' });

  let decoded;
  try { decoded = verifyToken(token); }
  catch { return json(401, { error: 'Session expired. Please sign in again.' }); }

  try {
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const qs = [
      `viewer_id=eq.${encodeURIComponent(decoded.id)}`,
      `viewed_on=eq.${encodeURIComponent(todayIST)}`,
      'select=id',
    ].join('&');

    const res = await fetch(dbUrl('full_profile_views', qs), {
      method: 'HEAD',
      headers: dbHeaders(),
    });

    if (!res.ok) throw new Error('Could not read profile-view usage.');
    const range = res.headers.get('content-range') || '*/0';
    const total = Number(range.split('/').pop()) || 0;

    return json(200, {
      remaining: Math.max(0, DAILY_LIMIT - total),
      used: total,
      limit: DAILY_LIMIT,
      resetsOn: 'next India calendar day',
    });
  } catch (err) {
    console.error('get-profile-views-remaining error:', err);
    return json(200, { remaining: DAILY_LIMIT, used: 0, limit: DAILY_LIMIT, resetsOn: 'next India calendar day' });
  }
};
