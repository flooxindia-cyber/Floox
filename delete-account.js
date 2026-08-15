// netlify/functions/delete-account.js
// POST /.netlify/functions/delete-account
// Requires: Authorization: Bearer <token>
// Permanently deletes the authenticated user's account.
// Uses raw Supabase REST API (same as all other functions — no SDK needed).

const {
  corsOk, json,
  verifyToken, extractBearer,
  findUser,
} = require('./_utils');

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_KEY not set');
  return {
    'Content-Type':  'application/json',
    'apikey':        key,
    'Authorization': `Bearer ${key}`,
    'Prefer':        'return=representation',
  };
}

function supabaseUrl(table, qs = '') {
  const base = process.env.SUPABASE_URL;
  if (!base) throw new Error('SUPABASE_URL not set');
  return `${base}/rest/v1/${table}${qs ? '?' + qs : ''}`;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsOk();
  if (event.httpMethod !== 'POST')
    return json(405, { error: 'Method not allowed' });

  const token = extractBearer(event);
  if (!token) return json(401, { error: 'Authentication required.' });

  let decoded;
  try { decoded = verifyToken(token); }
  catch { return json(401, { error: 'Session expired. Please sign in again.' }); }

  try {
    // Confirm user exists
    const user = await findUser('id', 'eq', decoded.id);
    if (!user) return json(404, { error: 'Account not found.' });

    // DELETE the user row via REST API
    const qs  = `id=eq.${encodeURIComponent(decoded.id)}`;
    const res = await fetch(supabaseUrl('users', qs), {
      method:  'DELETE',
      headers: supabaseHeaders(),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || 'DB delete error');
    }

    console.log(`Account deleted: ${user.email} (${user.role}) at ${new Date().toISOString()}`);

    return json(200, {
      message: `Account for ${user.name} has been permanently deleted.`,
      deleted: true,
    });
  } catch (err) {
    console.error('delete-account error:', err);
    return json(500, { error: 'Could not delete account. Please try again.' });
  }
};
