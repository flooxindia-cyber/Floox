// Floox server function — organiser directory
const {
  corsOk, json,
  directoryUser,
} = require('./_utils');

// Demo profiles keep the public organiser directory populated while the
// marketplace is still growing. Real Supabase organisers are always included first.
const DEMO_ORGANISERS = [
  {
    id: 'demo-org-wavelength', role: 'organiser', verified: true, demo: true,
    name: 'Wavelength Events', org_name: 'Wavelength Events', org_type: 'Event Agency',
    city: 'Mumbai',
    bio: "Mumbai's premium event agency. We book artists for corporate galas, music festivals, weddings and private celebrations.",
    event_types: ['Corporate', 'Concerts', 'Weddings'],
    preferred_genres: ['Live Music', 'Bollywood', 'DJ'],
    events_per_year: 50, avatar: '',
  },
  {
    id: 'demo-org-rhythm-house', role: 'organiser', verified: true, demo: true,
    name: 'Rhythm House Productions', org_name: 'Rhythm House Productions', org_type: 'Event Production',
    city: 'Delhi NCR',
    bio: "Delhi's go-to team for live music experiences, concert production, venue management and artist management.",
    event_types: ['Live Music', 'Festivals', 'Clubs'],
    preferred_genres: ['Live Music', 'Rock', 'Indie'],
    events_per_year: 62, avatar: '',
  },
  {
    id: 'demo-org-starlight', role: 'organiser', verified: true, demo: true,
    name: 'Starlight Occasions', org_name: 'Starlight Occasions', org_type: 'Wedding & Events',
    city: 'Bangalore',
    bio: 'Creating unforgettable celebrations in Bangalore, from intimate gatherings to grand weddings and corporate events.',
    event_types: ['Weddings', 'Private', 'Corporate'],
    preferred_genres: ['Bollywood', 'Acoustic', 'DJ'],
    events_per_year: 35, avatar: '',
  },
  {
    id: 'demo-org-goa-beats', role: 'organiser', verified: true, demo: true,
    name: 'Goa Beats Co.', org_name: 'Goa Beats Co.', org_type: 'Event Collective',
    city: 'Goa',
    bio: "Goa's freshest event collective. We run beach parties, sunset DJ sessions and multi-day music festivals on the coast.",
    event_types: ['Beach Events', 'DJ Nights', 'Festivals'],
    preferred_genres: ['EDM', 'House', 'Techno'],
    events_per_year: 18, avatar: '',
  },
];

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

function demoMatches(o, { city, q, id } = {}) {
  if (id && o.id !== id) return false;
  const hay = [o.name, o.org_name, o.org_type, o.city, o.bio, ...(o.event_types || []), ...(o.preferred_genres || [])].join(' ').toLowerCase();
  if (city && !String(o.city).toLowerCase().includes(String(city).toLowerCase())) return false;
  if (q && !hay.includes(String(q).toLowerCase())) return false;
  return true;
}

function getMatchingDemos(filters) {
  return DEMO_ORGANISERS.filter(o => demoMatches(o, filters));
}

async function queryOrganisers({ city, q, id, limit = 20, offset = 0 } = {}) {
  // Reserve four slots for demos so the public home page continues to show
  // organiser cards even when the real database contains only a few profiles.
  const realLimit = Math.max(0, limit - DEMO_ORGANISERS.length);
  const parts = [
    'role=eq.organiser',
    'verified=eq.true',
    `limit=${realLimit || 1}`,
    `offset=${offset}`,
  ];
  if (id && !String(id).startsWith('demo-org-')) parts.push(`id=eq.${encodeURIComponent(id)}`);
  if (city) parts.push(`city=ilike.*${encodeURIComponent(city)}*`);
  if (q) {
    const safe = encodeURIComponent(q);
    parts.push(`or=(name.ilike.*${safe}*,org_name.ilike.*${safe}*,bio.ilike.*${safe}*,org_type.ilike.*${safe}*)`);
  }

  if (realLimit === 0) return [];
  const res = await fetch(supabaseUrl('users', parts.join('&')), { headers: supabaseHeaders() });
  const data = await readJson(res);
  if (!res.ok) throw new Error(data.message || data.error || 'DB query error');
  return data;
}

async function countOrganisers({ city, q, id } = {}) {
  if (id && String(id).startsWith('demo-org-')) return getMatchingDemos({ city, q, id }).length;
  const parts = ['role=eq.organiser', 'verified=eq.true'];
  if (id) parts.push(`id=eq.${encodeURIComponent(id)}`);
  if (city) parts.push(`city=ilike.*${encodeURIComponent(city)}*`);
  if (q) {
    const safe = encodeURIComponent(q);
    parts.push(`or=(name.ilike.*${safe}*,org_name.ilike.*${safe}*,bio.ilike.*${safe}*,org_type.ilike.*${safe}*)`);
  }
  const headers = { ...supabaseHeaders(), Prefer: 'count=exact' };
  const res = await fetch(supabaseUrl('users', parts.join('&') + '&select=id'), { method: 'HEAD', headers });
  const range = res.headers.get('content-range') || '0/0';
  return parseInt(range.split('/')[1], 10) || 0;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsOk();
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });

  const p = event.queryStringParameters || {};
  const filters = {
    city: p.city || undefined,
    q: p.q || undefined,
    id: p.id || undefined,
    limit: Math.min(parseInt(p.limit, 10) || 20, 50),
    offset: Math.max(parseInt(p.offset, 10) || 0, 0),
  };

  try {
    const demos = getMatchingDemos(filters);
    if (filters.id && String(filters.id).startsWith('demo-org-')) {
      return json(200, { organisers: demos.map(directoryUser), total: demos.length, offset: 0, limit: filters.limit });
    }

    const [rawOrgs, total] = await Promise.all([
      queryOrganisers(filters),
      countOrganisers(filters),
    ]);
    const realOrganisers = rawOrgs.map(directoryUser);
    const demoOrganisers = demos.map(directoryUser);
    const organisers = [...realOrganisers, ...demoOrganisers].slice(0, filters.limit);
    return json(200, {
      organisers,
      total: total + demos.length,
      offset: filters.offset,
      limit: filters.limit,
    });
  } catch (err) {
    console.error('organisers error:', err);
    return json(500, { error: 'Failed to fetch organisers.' });
  }
};
