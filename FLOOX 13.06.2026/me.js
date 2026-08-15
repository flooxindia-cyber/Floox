// netlify/functions/me.js
// GET  /.netlify/functions/me  → returns current user
// POST /.netlify/functions/me  → updates basic profile fields (name, phone, city, bio, avatar, cover_image, social_links)

const jwt = require('jsonwebtoken');
const { ok, err, preflight, findUser, updateUser, publicUser } = require('./_utils');

// Fields a user may update via this endpoint (basic profile only)
const ALLOWED_FIELDS = ['name', 'phone', 'city', 'bio', 'avatar', 'cover_image', 'social_links'];

async function authenticate(event) {
  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) return { authErr: err('Authentication required.', 401) };
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { decoded };
  } catch {
    return { authErr: err('Session expired. Please sign in again.', 401) };
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (!['GET', 'POST'].includes(event.httpMethod)) return err('Method not allowed', 405);

  if (!process.env.JWT_SECRET) return err('Server configuration error.', 500);

  const { decoded, authErr } = await authenticate(event);
  if (authErr) return authErr;

  // ── GET: return profile ───────────────────────────────────────────────────
  if (event.httpMethod === 'GET') {
    let user;
    try { user = await findUser('id', decoded.id); }
    catch (e) { return err('Database error.', 500); }
    if (!user) return err('Account not found.', 404);
    return ok({ user: publicUser(user) });
  }

  // ── POST: update profile ──────────────────────────────────────────────────
  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return err('Invalid JSON'); }

  const updates = {};
  for (const f of ALLOWED_FIELDS) {
    if (body[f] !== undefined) updates[f] = body[f];
  }

  if (Object.keys(updates).length === 0) return err('No valid fields to update.');

  let user;
  try { user = await updateUser(decoded.id, updates); }
  catch (e) { console.error('Update error:', e); return err('Could not update profile.', 500); }

  return ok({ user: publicUser(user) });
};
