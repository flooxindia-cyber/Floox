// netlify/functions/get-profile.js
// GET /.netlify/functions/get-profile?id=<uuid>
//
// Auth-gated: only logged-in users can see full profiles (including phone/contact).
// Returns full publicUser data for any profile_complete user by ID.

const {
  corsOk, json,
  verifyToken, extractBearer,
  findUser, publicUser,
} = require('./_utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsOk();
  if (event.httpMethod !== 'GET')
    return json(405, { error: 'Method not allowed' });

  // ── Must be logged in ──────────────────────────────────────────────────────
  const token = extractBearer(event);
  if (!token) return json(401, { error: 'Please sign in to view full profiles.' });

  let decoded;
  try { decoded = verifyToken(token); }
  catch { return json(401, { error: 'Session expired. Please sign in again.' }); }

  // ── Caller must themselves exist ───────────────────────────────────────────
  const caller = await findUser('id', 'eq', decoded.id);
  if (!caller) return json(401, { error: 'Account not found.' });

  // ── Fetch the requested profile ────────────────────────────────────────────
  const id = (event.queryStringParameters || {}).id;
  if (!id) return json(400, { error: 'Profile ID is required.' });

  try {
    const target = await findUser('id', 'eq', id);
    if (!target) return json(404, { error: 'Profile not found.' });
    if (!target.profile_complete)
      return json(404, { error: 'This profile is not yet public.' });

    // Return the full profile (publicUser strips password_hash)
    return json(200, { user: publicUser(target) });
  } catch (err) {
    console.error('get-profile error:', err);
    return json(500, { error: 'Could not load profile. Please try again.' });
  }
};
