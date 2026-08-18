// Floox server function
// Auth-gated: only logged-in users can see full profiles (including phone/contact).
// Directory data remains safe for guests; this endpoint is the authenticated
// full-profile view.
//
// Full-profile viewing is limited to 5 unique profiles per registered user per
// India calendar day. Re-opening a profile already viewed today does not use
// another slot. A user's own profile is never counted.

const {
  corsOk, json,
  verifyToken, extractBearer,
  findUser, publicUser,
} = require('./_utils');

const DEMO_ORGANISERS = {
  'demo-org-wavelength': {
    id: 'demo-org-wavelength', role: 'organiser', verified: true, demo: true,
    name: 'Wavelength Events', org_name: 'Wavelength Events', org_type: 'Event Agency', city: 'Mumbai',
    bio: "Mumbai's premium event agency. We book artists for corporate galas, music festivals, weddings and private celebrations.",
    event_types: ['Corporate', 'Concerts', 'Weddings'], preferred_genres: ['Live Music', 'Bollywood', 'DJ'], events_per_year: 50,
  },
  'demo-org-rhythm-house': {
    id: 'demo-org-rhythm-house', role: 'organiser', verified: true, demo: true,
    name: 'Rhythm House Productions', org_name: 'Rhythm House Productions', org_type: 'Event Production', city: 'Delhi NCR',
    bio: "Delhi's go-to team for live music experiences, concert production, venue management and artist management.",
    event_types: ['Live Music', 'Festivals', 'Clubs'], preferred_genres: ['Live Music', 'Rock', 'Indie'], events_per_year: 62,
  },
  'demo-org-starlight': {
    id: 'demo-org-starlight', role: 'organiser', verified: true, demo: true,
    name: 'Starlight Occasions', org_name: 'Starlight Occasions', org_type: 'Wedding & Events', city: 'Bangalore',
    bio: 'Creating unforgettable celebrations in Bangalore, from intimate gatherings to grand weddings and corporate events.',
    event_types: ['Weddings', 'Private', 'Corporate'], preferred_genres: ['Bollywood', 'Acoustic', 'DJ'], events_per_year: 35,
  },
  'demo-org-goa-beats': {
    id: 'demo-org-goa-beats', role: 'organiser', verified: true, demo: true,
    name: 'Goa Beats Co.', org_name: 'Goa Beats Co.', org_type: 'Event Collective', city: 'Goa',
    bio: "Goa's freshest event collective. We run beach parties, sunset DJ sessions and multi-day music festivals on the coast.",
    event_types: ['Beach Events', 'DJ Nights', 'Festivals'], preferred_genres: ['EDM', 'House', 'Techno'], events_per_year: 18,
  },
};

function dbHeaders() {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_KEY env var is not set');
  return { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` };
}
function dbUrl(table, qs = '') {
  const base = process.env.SUPABASE_URL;
  if (!base) throw new Error('SUPABASE_URL env var is not set');
  return `${base}/rest/v1/${table}${qs ? '?' + qs : ''}`;
}
async function consumeFullProfileView(viewerId, profileId) {
  const r = await fetch(dbUrl('rpc/consume_full_profile_view'), {
    method: 'POST',
    headers: dbHeaders(),
    body: JSON.stringify({ p_viewer_id: viewerId, p_profile_id: profileId }),
  });
  const text = await r.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { throw new Error('Invalid profile-view limit response.'); }
  if (!r.ok) throw new Error(data?.message || data?.hint || 'Could not check profile-view limit.');
  return Array.isArray(data) ? data[0] : data;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsOk();
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });

  const token = extractBearer(event);
  if (!token) return json(401, { error: 'Please sign in to view full profiles.' });

  let decoded;
  try { decoded = verifyToken(token); }
  catch { return json(401, { error: 'Session expired. Please sign in again.' }); }

  const caller = await findUser('id', 'eq', decoded.id);
  if (!caller) return json(401, { error: 'Account not found.' });

  const id = (event.queryStringParameters || {}).id;
  if (!id) return json(400, { error: 'Profile ID is required.' });

  try {
    const isSelf = String(id) === String(decoded.id);
    let target = null;
    let demoProfile = null;

    if (DEMO_ORGANISERS[id]) {
      demoProfile = DEMO_ORGANISERS[id];
    } else {
      target = await findUser('id', 'eq', id);
      if (!target) return json(404, { error: 'Profile not found.' });
      if (!target.verified) return json(404, { error: 'This profile is not yet verified.' });
    }

    // The daily allowance applies only when opening someone else's full profile.
    // The same profile can be reopened all day without consuming another slot.
    let profileViewsRemaining = 5;
    if (!isSelf) {
      const usage = await consumeFullProfileView(decoded.id, id);
      if (!usage?.allowed) {
        return json(429, {
          error: 'You have reached today\'s limit of 5 full profile views.',
          code: 'PROFILE_VIEW_LIMIT_REACHED',
          limit: 5,
          viewedToday: Number(usage?.viewed_today || 5),
          remaining: 0,
          resetsOn: 'next India calendar day',
        });
      }
      profileViewsRemaining = Number(usage?.remaining ?? 0);
    }

    if (demoProfile) {
      return json(200, {
        user: publicUser(demoProfile),
        profileViewsRemaining,
        profileViewLimit: 5,
      });
    }

    // Keep the existing artist profile-view metric. This is separate from the
    // five-profile daily allowance above.
    if (target.role === 'artist' && target.id !== decoded.id) {
      fetch(dbUrl('profile_views'), {
        method: 'POST',
        headers: { ...dbHeaders(), Prefer: 'return=minimal' },
        body: JSON.stringify({ artist_id: target.id, viewer_id: decoded.id }),
      }).catch(err => console.error('profile view tracking failed:', err));
    }

    return json(200, {
      user: publicUser(target),
      profileViewsRemaining,
      profileViewLimit: 5,
    });
  } catch (err) {
    console.error('get-profile error:', err);
    if (err?.message?.includes('profile-view')) {
      return json(503, { error: 'Profile-view limit service is temporarily unavailable. Please try again.' });
    }
    return json(500, { error: 'Could not load profile. Please try again.' });
  }
};