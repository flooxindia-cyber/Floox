// Floox server function
// Auth-gated: only logged-in users can see full profiles (including phone/contact).
// Directory data remains safe for guests; this endpoint is the authenticated
// full-profile view.

const {
  corsOk, json,
  verifyToken, extractBearer,
  findUser, publicUser,
} = require('./_utils');

function dbHeaders() {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_KEY env var is not set');
  return { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` };
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
  if (!token) return json(401, { error: 'Please sign in to view full profiles.' });

  let decoded;
  try { decoded = verifyToken(token); }
  catch { return json(401, { error: 'Session expired. Please sign in again.' }); }

  const caller = await findUser('id', 'eq', decoded.id);
  if (!caller) return json(401, { error: 'Account not found.' });

  const id = (event.queryStringParameters || {}).id;
  if (!id) return json(400, { error: 'Profile ID is required.' });

  try {
    const target = await findUser('id', 'eq', id);
    if (!target) return json(404, { error: 'Profile not found.' });
    if (!target.verified) return json(404, { error: 'This profile is not yet verified.' });

    // Every authenticated visit to an artist profile is a real profile-view event.
    // Self-visits are excluded so an artist cannot inflate their own metric.
    if (target.role === 'artist' && target.id !== decoded.id) {
      fetch(dbUrl('profile_views'), {
        method: 'POST',
        headers: { ...dbHeaders(), Prefer: 'return=minimal' },
        body: JSON.stringify({ artist_id: target.id, viewer_id: decoded.id }),
      }).catch(err => console.error('profile view tracking failed:', err));
    }

    return json(200, { user: publicUser(target) });
  } catch (err) {
    console.error('get-profile error:', err);
    return json(500, { error: 'Could not load profile. Please try again.' });
  }
};
