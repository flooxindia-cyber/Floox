// Floox server function — live organiser dashboard statistics
const { corsOk, json, verifyToken, extractBearer, findUser } = require('./_utils');

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_KEY env var is not set');
  return {
    'Content-Type': 'application/json',
    apikey: key,
    Authorization: `Bearer ${key}`,
    Prefer: 'return=representation',
  };
}

function supabaseUrl(table, qs = '') {
  const base = process.env.SUPABASE_URL;
  if (!base) throw new Error('SUPABASE_URL env var is not set');
  return `${base}/rest/v1/${table}${qs ? '?' + qs : ''}`;
}

async function readJson(res) {
  const text = await res.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return {}; }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsOk();
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });

  const token = extractBearer(event);
  if (!token) return json(401, { error: 'Authentication required.' });

  let decoded;
  try { decoded = verifyToken(token); }
  catch { return json(401, { error: 'Session expired. Please sign in again.' }); }

  try {
    const user = await findUser('id', 'eq', decoded.id);
    if (!user || user.role !== 'organiser') return json(403, { error: 'Organiser access required.' });

    const qs = [
      'select=id,name,event_date,venue,city,event_type,budget,status,artists_booked,cover_image,created_at,updated_at',
      `organiser_id=eq.${encodeURIComponent(user.id)}`,
      'order=event_date.asc,created_at.desc',
      'limit=200',
    ].join('&');

    const res = await fetch(supabaseUrl('events', qs), { headers: supabaseHeaders() });
    const events = await readJson(res);
    if (!res.ok) throw new Error(events.message || events.error || 'Could not load organiser events.');

    const today = new Date().toISOString().slice(0, 10);
    const totalEvents = events.length;
    const upcomingEvents = events.filter(e =>
      !['completed', 'cancelled', 'draft'].includes(String(e.status || '').toLowerCase()) &&
      String(e.event_date || '') >= today
    ).length;
    const publishedEvents = events.filter(e => ['published', 'upcoming'].includes(String(e.status || '').toLowerCase())).length;
    const artistsBooked = events.reduce((sum, e) => sum + (Number(e.artists_booked) || 0), 0);
    const totalBudget = events.reduce((sum, e) => sum + (Number(e.budget) || 0), 0);

    return json(200, {
      stats: { totalEvents, upcomingEvents, publishedEvents, artistsBooked, totalBudget },
      events: events.map(e => ({
        id: e.id,
        name: e.name,
        eventDate: e.event_date,
        venue: e.venue || '',
        city: e.city || '',
        eventType: e.event_type || 'Other',
        budget: Number(e.budget) || 0,
        status: e.status || 'published',
        artistsBooked: Number(e.artists_booked) || 0,
        coverImage: e.cover_image || '',
        createdAt: e.created_at,
        updatedAt: e.updated_at,
      })),
    });
  } catch (err) {
    console.error('organiser-stats error:', err);
    return json(500, { error: 'Could not load live dashboard statistics.' });
  }
};
