// Floox server function — event discovery + organiser event creation
const {
  corsOk, json,
  verifyToken, extractBearer,
  findUser,
} = require('./_utils');

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

function safeEvent(row) {
  return {
    id: row.id,
    organiserId: row.organiser_id,
    name: row.name,
    description: row.description || '',
    eventDate: row.event_date,
    venue: row.venue || '',
    city: row.city || '',
    eventType: row.event_type || 'Other',
    budget: row.budget || 0,
    genres: row.genres || [],
    status: row.status,
    artistsBooked: row.artists_booked || 0,
    coverImage: row.cover_image || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    organiser: row.organiser ? {
      id: row.organiser.id,
      name: row.organiser.name,
      orgName: row.organiser.org_name || row.organiser.name,
      city: row.organiser.city || '',
      avatar: row.organiser.avatar || '',
      verified: !!row.organiser.verified,
    } : null,
  };
}

async function listEvents({ q = '', city = '', type = '', limit = 50, offset = 0 } = {}) {
  const parts = [
    'select=*,organiser:users!events_organiser_id_fkey(id,name,org_name,city,avatar,verified)',
    'status=in.(published,upcoming)',
    `event_date=gte.${new Date().toISOString().slice(0, 10)}`,
    'order=event_date.asc,created_at.desc',
    `limit=${limit}`,
    `offset=${offset}`,
  ];
  if (city) parts.push(`city=ilike.*${encodeURIComponent(city)}*`);
  if (type) parts.push(`event_type=ilike.*${encodeURIComponent(type)}*`);
  if (q) {
    const safe = encodeURIComponent(q);
    parts.push(`or=(name.ilike.*${safe}*,description.ilike.*${safe}*,venue.ilike.*${safe}*,city.ilike.*${safe}*,event_type.ilike.*${safe}*)`);
  }

  const res = await fetch(supabaseUrl('events', parts.join('&')), { headers: supabaseHeaders() });
  const data = await readJson(res);
  if (!res.ok) throw new Error(data.message || data.error || 'DB query error');
  return data.map(safeEvent);
}

async function countEvents({ q = '', city = '', type = '' } = {}) {
  const parts = [
    'select=id',
    'status=in.(published,upcoming)',
    `event_date=gte.${new Date().toISOString().slice(0, 10)}`,
  ];
  if (city) parts.push(`city=ilike.*${encodeURIComponent(city)}*`);
  if (type) parts.push(`event_type=ilike.*${encodeURIComponent(type)}*`);
  if (q) {
    const safe = encodeURIComponent(q);
    parts.push(`or=(name.ilike.*${safe}*,description.ilike.*${safe}*,venue.ilike.*${safe}*,city.ilike.*${safe}*,event_type.ilike.*${safe}*)`);
  }
  const res = await fetch(supabaseUrl('events', parts.join('&')), {
    method: 'HEAD',
    headers: { ...supabaseHeaders(), Prefer: 'count=exact' },
  });
  const range = res.headers.get('content-range') || '0/0';
  return parseInt(range.split('/')[1], 10) || 0;
}

async function requireOrganiser(event) {
  const token = extractBearer(event);
  if (!token) return { error: json(401, { error: 'Please sign in as an organiser.' }) };
  let decoded;
  try { decoded = verifyToken(token); }
  catch { return { error: json(401, { error: 'Session expired. Please sign in again.' }) }; }
  const user = await findUser('id', 'eq', decoded.id);
  if (!user) return { error: json(401, { error: 'Account not found.' }) };
  if (user.role !== 'organiser') return { error: json(403, { error: 'Only organiser accounts can create events.' }) };
  if (!user.verified) return { error: json(403, { error: 'Please verify your email before creating events.' }) };
  return { user };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsOk();

  try {
    if (event.httpMethod === 'GET') {
      const p = event.queryStringParameters || {};
      const limit = Math.min(parseInt(p.limit, 10) || 50, 100);
      const offset = Math.max(parseInt(p.offset, 10) || 0, 0);
      const filters = { q: p.q || '', city: p.city || '', type: p.type || '', limit, offset };
      const [events, total] = await Promise.all([listEvents(filters), countEvents(filters)]);
      return json(200, { events, total, offset, limit });
    }

    if (event.httpMethod === 'POST') {
      const auth = await requireOrganiser(event);
      if (auth.error) return auth.error;
      let body;
      try { body = JSON.parse(event.body || '{}'); }
      catch { return json(400, { error: 'Invalid JSON.' }); }

      const name = String(body.name || '').trim();
      const eventDate = String(body.eventDate || body.date || '').trim();
      if (!name || !eventDate) return json(400, { error: 'Event name and date are required.' });

      const payload = {
        organiser_id: auth.user.id,
        name,
        description: String(body.description || '').trim(),
        event_date: eventDate,
        venue: String(body.venue || '').trim(),
        city: String(body.city || auth.user.city || '').trim(),
        event_type: String(body.eventType || body.type || 'Other').trim(),
        budget: Number(body.budget || 0) || 0,
        genres: Array.isArray(body.genres) ? body.genres : [],
        status: body.status === 'draft' ? 'draft' : 'published',
        artists_booked: 0,
        cover_image: String(body.coverImage || '').trim() || null,
      };

      const res = await fetch(supabaseUrl('events'), {
        method: 'POST',
        headers: supabaseHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await readJson(res);
      if (!res.ok) return json(res.status, { error: data.message || data.error || 'Could not create event.' });
      return json(201, { event: safeEvent(Array.isArray(data) ? data[0] : data), message: payload.status === 'draft' ? 'Event saved as draft.' : 'Event published successfully.' });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('events error:', err);
    return json(500, { error: 'Failed to process event request.' });
  }
};
