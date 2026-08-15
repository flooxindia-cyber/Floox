// Vercel API — Floox user profile

const {
  verifyToken,
  findUser,
  updateUser,
  publicUser,
} = require('../netlify/functions/_utils');

function sendJson(res, status, body) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  return res.status(status).json(body);
}

function getToken(req) {
  const auth = req.headers.authorization || '';

  if (!auth.startsWith('Bearer ')) {
    return null;
  }

  return auth.slice(7).trim();
}

module.exports = async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    return res.status(204).end();
  }

  const token = getToken(req);

  if (!token) {
    return sendJson(res, 401, {
      error: 'Authentication required.'
    });
  }

  let decoded;

  try {
    decoded = verifyToken(token);
  } catch {
    return sendJson(res, 401, {
      error: 'Session expired. Please sign in again.'
    });
  }

  try {
    // ─────────────────────────────────────────────
    // GET — Fetch own profile
    // ─────────────────────────────────────────────
    if (req.method === 'GET') {
      const user = await findUser('id', 'eq', decoded.id);

      if (!user) {
        return sendJson(res, 404, {
          error: 'Account not found.'
        });
      }

      return sendJson(res, 200, {
        user: publicUser(user)
      });
    }

    // ─────────────────────────────────────────────
    // POST — Update own profile
    // ─────────────────────────────────────────────
    if (req.method === 'POST') {
      let body = req.body || {};

      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          return sendJson(res, 400, {
            error: 'Invalid JSON'
          });
        }
      }

      const fieldMap = {
        name: 'name',
        phone: 'phone',
        city: 'city',
        bio: 'bio',
        avatar: 'avatar',
        genres: 'genres',
        socialLinks: 'social_links',
        stageName: 'stage_name',
        performerType: 'performer_type',
        orgName: 'org_name',
        orgType: 'org_type',
        profileComplete: 'profile_complete',
      };

      const patch = {};

      Object.entries(fieldMap).forEach(([camel, snake]) => {
        if (body[camel] !== undefined) {
          patch[snake] = body[camel];
        }
      });

      if (Object.keys(patch).length === 0) {
        return sendJson(res, 400, {
          error: 'No valid fields to update.'
        });
      }

      const updated = await updateUser(decoded.id, patch);

      return sendJson(res, 200, {
        user: publicUser(updated),
        message: 'Profile updated successfully.'
      });
    }

    return sendJson(res, 405, {
      error: 'Method not allowed'
    });

  } catch (err) {
    console.error('me error:', err);

    return sendJson(res, 500, {
      error: 'Request failed. Please try again.'
    });
  }
};