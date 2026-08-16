// Floox server function
// Internal server function
// Body: { likedId: "<uuid>" }
// Auth: Bearer token required
// Returns: { liked: true|false, likeCount: number }

const {
  corsOk, json,
  verifyToken, extractBearer,
  findUser,
  toggleLike, getLikeCount,
} = require('./_utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsOk();
  if (event.httpMethod !== 'POST')
    return json(405, { error: 'Method not allowed' });

  // ── Auth required ──────────────────────────────────────────────────────────
  const token = extractBearer(event);
  if (!token) return json(401, { error: 'Sign in to like profiles.' });

  let decoded;
  try { decoded = verifyToken(token); }
  catch { return json(401, { error: 'Session expired. Please sign in again.' }); }

  // ── Validate caller ────────────────────────────────────────────────────────
  const caller = await findUser('id', 'eq', decoded.id);
  if (!caller) return json(401, { error: 'Account not found.' });

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'Invalid JSON' }); }

  const { likedId } = body;
  if (!likedId) return json(400, { error: 'likedId is required.' });
  if (likedId === decoded.id) return json(400, { error: "You can't like your own profile." });

  // ── Check target exists ────────────────────────────────────────────────────
  const target = await findUser('id', 'eq', likedId);
  if (!target) return json(404, { error: 'Profile not found.' });

  try {
    const result = await toggleLike(decoded.id, likedId);
    const likeCount = await getLikeCount(likedId);
    return json(200, { liked: result.liked, likeCount });
  } catch (err) {
    console.error('toggle-like error:', err);
    return json(500, { error: 'Could not update like. Please try again.' });
  }
};
