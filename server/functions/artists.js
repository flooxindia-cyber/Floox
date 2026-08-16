// Floox server function — artist directory
const {
  corsOk, json,
  queryArtists, countArtists,
  directoryUser,
} = require('./_utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsOk();
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });

  const p = event.queryStringParameters || {};
  const { genre = '', city = '', q = '', id = '', limit = '20', offset = '0' } = p;
  const filters = {
    verified: true,
    genre: genre || undefined,
    city: city || undefined,
    q: q || undefined,
    id: id || undefined,
    limit: Math.min(parseInt(limit, 10) || 20, 50),
    offset: Math.max(parseInt(offset, 10) || 0, 0),
  };

  try {
    const [rawArtists, total] = await Promise.all([
      queryArtists(filters),
      countArtists(filters),
    ]);
    const artists = rawArtists.map(directoryUser);
    return json(200, { artists, total, offset: filters.offset, limit: filters.limit });
  } catch (err) {
    console.error('artists error:', err);
    return json(500, { error: 'Failed to fetch artists.' });
  }
};
