// netlify/functions/artist-profile.js
// POST /.netlify/functions/artist-profile
// Requires: Authorization: Bearer <token>  (role must be 'artist')
// Updates artist-specific profile fields and marks profile_complete when enough data is present

const jwt = require('jsonwebtoken');
const { ok, err, preflight, findUser, updateUser, publicUser } = require('./_utils');

const ARTIST_FIELDS = [
  'stage_name', 'performer_type', 'genres', 'languages',
  'performance_types', 'event_types',
  'min_fee', 'max_fee', 'currency',
  'bio', 'city', 'phone',
  'avatar', 'cover_image',
  'media_links', 'portfolio',
  'rider_notes', 'equipment',
  'social_links',
];

function isProfileComplete(fields) {
  return !!(
    fields.stage_name &&
    fields.performer_type &&
    fields.genres?.length &&
    fields.city &&
    fields.bio
  );
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST')    return err('Method not allowed', 405);

  if (!process.env.JWT_SECRET) return err('Server configuration error.', 500);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) return err('Authentication required.', 401);
  let decoded;
  try { decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET); }
  catch { return err('Session expired. Please sign in again.', 401); }

  if (decoded.role !== 'artist') return err('Only artist accounts can update an artist profile.', 403);

  // ── Parse body ────────────────────────────────────────────────────────────
  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return err('Invalid JSON'); }

  const updates = {};
  for (const f of ARTIST_FIELDS) {
    if (body[f] !== undefined) updates[f] = body[f];
  }

  if (Object.keys(updates).length === 0) return err('No valid fields provided.');

  // ── Determine profile completeness ────────────────────────────────────────
  let current;
  try { current = await findUser('id', decoded.id); }
  catch { return err('Database error.', 500); }
  if (!current) return err('Account not found.', 404);

  const merged = { ...current, ...updates };
  updates.profile_complete = isProfileComplete(merged);

  // ── Save ──────────────────────────────────────────────────────────────────
  let user;
  try { user = await updateUser(decoded.id, updates); }
  catch (e) { console.error('Update error:', e); return err('Could not save profile.', 500); }

  return ok({ user: publicUser(user), profile_complete: user.profile_complete });
};
