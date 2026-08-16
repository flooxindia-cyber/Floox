// Floox server function
// Internal server function
// Auth: Bearer token required
// Returns: { likes: ["uuid1", "uuid2", ...] }
// — returns all profile IDs that the current user has liked

const {
  corsOk, json,
  verifyToken, extractBearer,
  findUser,
  getLikesByUser,
} = require('./_utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsOk();
  if (event.httpMethod !== 'GET')
    return json(405, { error: 'Method not allowed' });

  // ── Auth required ──────────────────────────────────────────────────────────
  const token = extractBearer(event);
  if (!token) return json(401, { error: 'Authentication required.' });

  let decoded;
  try { decoded = verifyToken(token); }
  catch { return json(401, { error: 'Session expired. Please sign in again.' }); }

  const caller = await findUser('id', 'eq', decoded.id);
  if (!caller) return json(401, { error: 'Account not found.' });

  try {
    const rows = await getLikesByUser(decoded.id);
    // Return as a simple array of liked IDs for easy client-side lookup
    const likes = rows.map(r => r.liked_id);
    return json(200, { likes });
  } catch (err) {
    console.error('get-likes error:', err);
    return json(500, { error: 'Could not fetch likes.' });
  }
};
