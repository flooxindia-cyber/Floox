// Floox server function — organiser directory
const {
  corsOk, json,
  directoryUser,
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

async function queryOrganisers({ city, q, id, limit = 20, offset = 0 } = {}) {
  const parts = [
    'role=eq.organiser',
    'verified=eq.true',
    `limit=${limit}`,
    `offset=${offset}`,
  ];
  if (id) parts.push(`id=eq.${encodeURIComponent(id)}`);
  if (city) parts.push(`city=ilike.*${encodeURIComponent(city)}*`);
  if (q) {
    const safe = encodeURIComponent(q);
    parts.push(`or=(name.ilike.*${safe}*,org_name.ilike.*${safe}*,bio.ilike.*${safe}*,org_type.ilike.*${safe}*)`);
  }

  const res = await fetch(supabaseUrl('users', parts.join('&')), { headers: supabaseHeaders() });
  const data = await readJson(res);
  if (!res.ok) throw new Error(data.message || data.error || 'DB query error');
  return data;
}

async function countOrganisers({ city, q, id } = {}) {
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
    const [rawOrgs, total] = await Promise.all([
      queryOrganisers(filters),
      countOrganisers(filters),
    ]);
    const organisers = rawOrgs.map(directoryUser);
    return json(200, { organisers, total, offset: filters.offset, limit: filters.limit });
  } catch (err) {
    console.error('organisers error:', err);
    return json(500, { error: 'Failed to fetch organisers.' });
  }
};
