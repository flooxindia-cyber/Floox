// Floox server function
// GET /api/me
// Internal server function

const {
  corsOk, json,
  verifyToken, extractBearer,
  findUser, updateUser,
  publicUser,
} = require('./_utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsOk();

  const token = extractBearer(event);
  if (!token) return json(401, { error: 'Authentication required.' });

  let decoded;
  try { decoded = verifyToken(token); }
  catch { return json(401, { error: 'Session expired. Please sign in again.' }); }

  try {
    // ── GET ─────────────────────────────────────────────────────────────────
    if (event.httpMethod === 'GET') {
      const user = await findUser('id', 'eq', decoded.id);
      if (!user) return json(404, { error: 'Account not found.' });
      return json(200, { user: publicUser(user) });
    }

    // ── POST (update) ────────────────────────────────────────────────────────
    if (event.httpMethod === 'POST') {
      let body;
      try { body = JSON.parse(event.body || '{}'); }
      catch { return json(400, { error: 'Invalid JSON' }); }

      // Allowed camelCase → snake_case map
      const fieldMap = {
        name: 'name', phone: 'phone', city: 'city', bio: 'bio', avatar: 'avatar',
        genres: 'genres', socialLinks: 'social_links',
        stageName: 'stage_name', performerType: 'performer_type',
        orgName: 'org_name', orgType: 'org_type',
        profileComplete: 'profile_complete',
      };

      const patch = {};
      Object.entries(fieldMap).forEach(([camel, snake]) => {
        if (body[camel] !== undefined) patch[snake] = body[camel];
      });

      if (Object.keys(patch).length === 0)
        return json(400, { error: 'No valid fields to update.' });

      const updated = await updateUser(decoded.id, patch);
      return json(200, { user: publicUser(updated), message: 'Profile updated successfully.' });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('me error:', err);
    return json(500, { error: 'Request failed. Please try again.' });
  }
};
