// Floox — scheduled provider sync for the public global_events cache.
// This handler is intentionally separate from the existing organiser events API.
const { getEvents } = require('./global-events');

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_KEY env var is not set');
  return {
    'Content-Type': 'application/json',
    apikey: key,
    Authorization: `Bearer ${key}`,
    Prefer: 'resolution=merge-duplicates,return=minimal',
  };
}

function supabaseUrl(table, qs = '') {
  const base = process.env.SUPABASE_URL;
  if (!base) throw new Error('SUPABASE_URL env var is not set');
  return `${base}/rest/v1/${table}${qs ? `?${qs}` : ''}`;
}

async function readJson(res) {
  const text = await res.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return {}; }
}

function toRow(event) {
  return {
    provider: event.provider,
    provider_id: event.provider_id,
    title: event.title || 'Untitled event',
    description: event.description || '',
    category: event.category || 'Other',
    start_at: event.start_at || null,
    end_at: event.end_at || null,
    timezone: event.timezone || null,
    venue_name: event.venue_name || '',
    city: event.city || '',
    state: event.state || '',
    country: event.country || '',
    latitude: event.latitude ?? null,
    longitude: event.longitude ?? null,
    image_url: event.image_url || '',
    organizer_name: event.organizer_name || '',
    official_url: event.official_url || '',
    ticket_url: event.ticket_url || '',
    price_min: event.price_min ?? null,
    price_max: event.price_max ?? null,
    currency: event.currency || null,
    source_updated_at: event.source_updated_at || null,
    last_synced_at: new Date().toISOString(),
  };
}

function cronAuthorized(event) {
  // Vercel sends the configured CRON_SECRET as a Bearer token to cron requests.
  // When the secret is absent, fail closed in production. Development may still call the endpoint.
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  const header = event.headers?.authorization || event.headers?.Authorization || '';
  return header === `Bearer ${secret}`;
}

exports.handler = async (event) => {
  if (!cronAuthorized(event)) {
    return { statusCode: 401, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized.' }) };
  }
  try {
    const india = await getEvents({ countryCode: 'IN', limit: 50, live: '1' });
    const global = await getEvents({ limit: 100, live: '1' });
    const unique = new Map();
    for (const item of [...india, ...global]) unique.set(`${item.provider}:${item.provider_id}`, item);
    const rows = [...unique.values()].map(toRow);

    if (rows.length) {
      const res = await fetch(supabaseUrl('global_events'), {
        method: 'POST',
        headers: supabaseHeaders(),
        body: JSON.stringify(rows),
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.message || data.error || `Supabase cache update failed (${res.status})`);
    }

    // Remove only expired external events. No existing Floox organiser events are touched.
    const cleanup = await fetch(
      supabaseUrl('global_events', `end_at=lt.${encodeURIComponent(new Date().toISOString())}&provider=neq.floox`),
      { method: 'DELETE', headers: supabaseHeaders() },
    );
    if (!cleanup.ok) console.warn('global-events cleanup failed:', cleanup.status);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, synced: rows.length, synced_at: new Date().toISOString() }),
    };
  } catch (error) {
    console.error('global-events-sync:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Event sync failed.' }),
    };
  }
};
