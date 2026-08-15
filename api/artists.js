// Vercel API — Floox artists directory

const {
  queryArtists,
  countArtists,
  publicUser,
} = require('../netlify/functions/_utils');

function sendJson(res, status, body) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  return res.status(status).json(body);
}

module.exports = async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return sendJson(res, 405, {
      error: 'Method not allowed'
    });
  }

  const {
    genre = '',
    city = '',
    q = '',
    id = '',
    limit = '20',
    offset = '0'
  } = req.query || {};

  const filters = {
    genre: genre || undefined,
    city: city || undefined,
    q: q || undefined,
    id: id || undefined,
    limit: Math.min(parseInt(limit, 10) || 20, 50),
    offset: parseInt(offset, 10) || 0,
  };

  try {
    const [rawArtists, total] = await Promise.all([
      queryArtists(filters),
      countArtists(filters),
    ]);

    const artists = rawArtists.map(publicUser);

    return sendJson(res, 200, {
      artists,
      total,
      offset: filters.offset,
      limit: filters.limit
    });

  } catch (err) {
    console.error('artists error:', err);

    return sendJson(res, 500, {
      error: 'Failed to fetch artists.'
    });
  }
};