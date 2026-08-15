// netlify/functions/artists.js — Supabase edition
// GET /.netlify/functions/artists?genre=&city=&q=&limit=20&offset=0

const {
  corsOk, json,
  queryArtists, countArtists,
  publicUser,
} = require('./_utils');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsOk();
  if (event.httpMethod !== 'GET')
    return json(405, { error: 'Method not allowed' });

  const p = event.queryStringParameters || {};
  const { genre = '', city = '', q = '', id = '', limit = '20', offset = '0' } = p;

  const filters = {
    genre: genre || undefined,
    city:  city  || undefined,
    q:     q     || undefined,
    id:    id    || undefined,
    limit:  Math.min(parseInt(limit,  10) || 20, 50),
    offset: parseInt(offset, 10) || 0,
  };

  try {
    const [rawArtists, total] = await Promise.all([
      queryArtists(filters),
      countArtists(filters),
    ]);

    const artists = rawArtists.map(publicUser);
    return json(200, { artists, total, offset: filters.offset, limit: filters.limit });
  } catch (err) {
    console.error('artists error:', err);
    return json(500, { error: 'Failed to fetch artists.' });
  }
};
