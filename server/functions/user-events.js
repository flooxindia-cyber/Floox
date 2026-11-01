// Floox — any verified registered user can list an event on the discovery page.
// Events land in global_events with provider='floox', status='published'.
// They appear immediately on /events for all users to discover.
'use strict';

const { corsOk, json, verifyToken, extractBearer, findUser, supabaseHeaders, supabaseUrl, readJson } = require('./_utils');

async function currentUser(event) {
  const token = extractBearer(event);
  if (!token) return null;
  try {
    const decoded = verifyToken(token);
    return await findUser('id', 'eq', decoded.id);
  } catch { return null; }
}

// Slug a title to a stable provider_id
function slugify(str) {
  return String(str).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function toRow(body, user) {
  const now = new Date().toISOString();
  const title = String(body.title || '').trim();
  const startAt = body.start_at ? new Date(body.start_at).toISOString() : null;
  const endAt   = body.end_at   ? new Date(body.end_at).toISOString()   : null;

  // Stable provider_id: slug + user-id prefix so same user can't accidentally duplicate
  const pid = `u-${user.id.slice(0, 8)}-${slugify(title)}-${Date.now()}`;

  return {
    provider:         'floox',
    provider_id:      pid,
    title,
    description:      String(body.description || '').trim().slice(0, 1000),
    category:         String(body.category || 'Event').trim(),
    start_at:         startAt,
    end_at:           endAt,
    timezone:         'Asia/Kolkata',
    venue_name:       String(body.venue_name || body.venue || '').trim(),
    city:             String(body.city || user.city || '').trim(),
    state:            String(body.state || '').trim(),
    country:          'India',
    latitude:         body.latitude  ? Number(body.latitude)  : null,
    longitude:        body.longitude ? Number(body.longitude) : null,
    image_url:        String(body.image_url || '').trim(),
    organizer_name:   String(body.organizer_name || user.name || user.stage_name || '').trim(),
    official_url:     String(body.official_url || body.ticket_url || '').trim(),
    ticket_url:       String(body.ticket_url || body.official_url || '').trim(),
    price_min:        body.price_min != null ? Number(body.price_min) : null,
    price_max:        body.price_max != null ? Number(body.price_max) : null,
    currency:         'INR',
    source_updated_at: now,
    last_synced_at:   now,
    // Extra meta stored in description for now
    submitted_by:     user.id,
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsOk();

  // Only POST supported
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' });

  // Auth — any verified registered user
  const user = await currentUser(event);
  if (!user) return json(401, { error: 'Please sign in to list an event.' });
  if (!user.verified) return json(403, { error: 'Your account must be verified to list events. Check your email for the verification link.' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'Invalid JSON.' }); }

  // Required fields
  const title = String(body.title || '').trim();
  if (!title) return json(400, { error: 'Event title is required.' });

  const startAt = body.start_at ? new Date(body.start_at) : null;
  if (!startAt || isNaN(startAt)) return json(400, { error: 'A valid event date/time is required.' });
  if (startAt < new Date()) return json(400, { error: 'Event date must be in the future.' });

  const city = String(body.city || user.city || '').trim();
  if (!city) return json(400, { error: 'City is required.' });

  try {
    const row = toRow(body, user);
    const res = await fetch(
      supabaseUrl('global_events', 'on_conflict=provider%2Cprovider_id'),
      {
        method: 'POST',
        headers: { ...supabaseHeaders(), Prefer: 'return=representation,resolution=merge-duplicates' },
        body: JSON.stringify(row),
      }
    );
    const data = await readJson(res);
    if (!res.ok) return json(res.status, { error: data.message || data.error || 'Could not save event.' });

    const saved = Array.isArray(data) ? data[0] : data;
    return json(201, {
      ok: true,
      message: 'Your event is now live on Floox! 🎉',
      event: {
        id: saved.id,
        title: saved.title,
        provider_id: saved.provider_id,
        start_at: saved.start_at,
        city: saved.city,
      },
    });
  } catch (err) {
    console.error('user-events POST:', err);
    return json(500, { error: 'Failed to list event. Please try again.' });
  }
};
