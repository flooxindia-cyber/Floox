// Floox server function
// Internal server function
//
// Auth-gated: only logged-in users can browse organisers.
// Returns paginated list of profile_complete organisers.

const {
  corsOk, json,
  verifyToken, extractBearer,
  findUser, publicUser,
} = require('./_utils');

// ── Supabase helpers (inlined since _utils doesn't export queryOrganisers) ───
function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_KEY env var is not set');
  return {
    'Content-Type':  'application/json',
    'apikey':        key,
    'Authorization': `Bearer ${key}`,
    'Prefer':        'return=representation',
  };
}

function supabaseUrl(table, qs = '') {
  const base = process.env.SUPABASE_URL;
  if (!base) throw new Error('SUPABASE_URL env var is not set');
  return `${base}/rest/v1/${table}${qs ? '?' + qs : ''}`;
}

async function queryOrganisers({ city, q, limit = 20, offset = 0 } = {}) {
  const parts = [
    `role=eq.organiser`,
    `profile_complete=eq.true`,
    `limit=${limit}`,
    `offset=${offset}`,
  ];
  if (city) parts.push(`city=ilike.*${encodeURIComponent(city)}*`);
  if (q)    parts.push(`or=(name.ilike.*${encodeURIComponent(q)}*,org_name.ilike.*${encodeURIComponent(q)}*,bio.ilike.*${encodeURIComponent(q)}*,org_type.ilike.*${encodeURIComponent(q)}*)`);

  const res  = await fetch(supabaseUrl('users', parts.join('&')), { headers: supabaseHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'DB query error');
  return data;
}

async function countOrganisers({ city, q } = {}) {
  const parts = [`role=eq.organiser`, `profile_complete=eq.true`];
  if (city) parts.push(`city=ilike.*${encodeURIComponent(city)}*`);
  if (q)    parts.push(`or=(name.ilike.*${encodeURIComponent(q)}*,org_name.ilike.*${encodeURIComponent(q)}*,bio.ilike.*${encodeURIComponent(q)}*)`);

  const headers = { ...supabaseHeaders(), 'Prefer': 'count=exact' };
  const res = await fetch(supabaseUrl('users', parts.join('&') + '&select=id'), { method: 'HEAD', headers });
  const range = res.headers.get('content-range') || '0/0';
  return parseInt(range.split('/')[1], 10) || 0;
}

// ── Handler ───────────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsOk();
  if (event.httpMethod !== 'GET')
    return json(405, { error: 'Method not allowed' });

  // Must be logged in to search organisers
  const token = extractBearer(event);
  if (!token) return json(401, { error: 'Please sign in to browse organisers.' });

  let decoded;
  try { decoded = verifyToken(token); }
  catch { return json(401, { error: 'Session expired. Please sign in again.' }); }

  const caller = await findUser('id', 'eq', decoded.id);
  if (!caller) return json(401, { error: 'Account not found.' });

  const p = event.queryStringParameters || {};
  const { city = '', q = '', limit = '20', offset = '0' } = p;

  const filters = {
    city:   city  || undefined,
    q:      q     || undefined,
    limit:  Math.min(parseInt(limit,  10) || 20, 50),
    offset: parseInt(offset, 10) || 0,
  };

  try {
    const [rawOrgs, total] = await Promise.all([
      queryOrganisers(filters),
      countOrganisers(filters),
    ]);

    const organisers = rawOrgs.map(publicUser);
    return json(200, { organisers, total, offset: filters.offset, limit: filters.limit });
  } catch (err) {
    console.error('organisers error:', err);
    return json(500, { error: 'Failed to fetch organisers.' });
  }
};
