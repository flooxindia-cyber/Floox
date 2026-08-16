// Floox server function
// Shared helpers — Supabase edition

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

function corsOk() {
  return { statusCode: 204, headers: CORS, body: '' };
}

function json(statusCode, body, extra = {}) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...CORS, ...extra },
    body: JSON.stringify(body),
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'floox_dev_secret_change_in_prod';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function extractBearer(event) {
  const auth = event.headers?.authorization || event.headers?.Authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

async function hashPassword(pw) {
  return bcrypt.hash(pw, 10);
}

async function checkPassword(pw, hash) {
  return bcrypt.compare(pw, hash);
}

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

async function readJson(res, fallback = {}) {
  const text = await res.text();
  if (!text) return fallback;
  try { return JSON.parse(text); } catch { return fallback; }
}

async function findUser(field, op, value) {
  const qs = `${field}=${op}.${encodeURIComponent(value)}&limit=1`;
  const res = await fetch(supabaseUrl('users', qs), { headers: supabaseHeaders() });
  const data = await readJson(res);
  if (!res.ok) throw new Error(data.message || data.error || 'DB error');
  return data[0] || null;
}

async function createUser(user) {
  const res = await fetch(supabaseUrl('users'), {
    method: 'POST',
    headers: supabaseHeaders(),
    body: JSON.stringify(user),
  });
  const data = await readJson(res);
  if (!res.ok) throw new Error(data.message || data.error || 'DB insert error');
  return Array.isArray(data) ? data[0] : data;
}

async function updateUser(id, fields) {
  const qs = `id=eq.${encodeURIComponent(id)}`;
  const res = await fetch(supabaseUrl('users', qs), {
    method: 'PATCH',
    headers: supabaseHeaders(),
    body: JSON.stringify({ ...fields, updated_at: new Date().toISOString() }),
  });
  const data = await readJson(res);
  if (!res.ok) throw new Error(data.message || data.error || 'DB update error');
  return Array.isArray(data) ? data[0] : data;
}

async function queryArtists({ genre, city, q, id, limit = 20, offset = 0 } = {}) {
  const parts = [
    'role=eq.artist',
    'verified=eq.true',
    `limit=${limit}`,
    `offset=${offset}`,
  ];

  if (id) parts.push(`id=eq.${encodeURIComponent(id)}`);
  if (genre) parts.push(`genres=cs.{"${encodeURIComponent(genre)}"}`);
  if (city) parts.push(`city=ilike.*${encodeURIComponent(city)}*`);
  if (q) {
    const safeQ = encodeURIComponent(q);
    parts.push(`or=(name.ilike.*${safeQ}*,stage_name.ilike.*${safeQ}*,bio.ilike.*${safeQ}*)`);
  }

  const res = await fetch(supabaseUrl('users', parts.join('&')), { headers: supabaseHeaders() });
  const data = await readJson(res);
  if (!res.ok) throw new Error(data.message || data.error || 'DB query error');
  return data;
}

async function countArtists({ genre, city, q, id } = {}) {
  const parts = ['role=eq.artist', 'verified=eq.true'];
  if (id) parts.push(`id=eq.${encodeURIComponent(id)}`);
  if (genre) parts.push(`genres=cs.{"${encodeURIComponent(genre)}"}`);
  if (city) parts.push(`city=ilike.*${encodeURIComponent(city)}*`);
  if (q) {
    const safeQ = encodeURIComponent(q);
    parts.push(`or=(name.ilike.*${safeQ}*,stage_name.ilike.*${safeQ}*,bio.ilike.*${safeQ}*)`);
  }

  const headers = { ...supabaseHeaders(), Prefer: 'count=exact' };
  const res = await fetch(supabaseUrl('users', parts.join('&') + '&select=id'), { method: 'HEAD', headers });
  const range = res.headers.get('content-range') || '0/0';
  return parseInt(range.split('/')[1], 10) || 0;
}

function publicUser(u) {
  if (!u) return null;
  const { password_hash, created_at, updated_at, ...rest } = u;
  return {
    ...rest,
    createdAt: created_at,
    updatedAt: updated_at,
    stageName: rest.stage_name,
    performerType: rest.performer_type,
    orgName: rest.org_name,
    orgType: rest.org_type,
    socialLinks: rest.social_links || {},
    mediaLinks: rest.media_links || [],
    performanceTypes: rest.performance_types || [],
    eventTypes: rest.event_types || [],
    minFee: rest.min_fee,
    maxFee: rest.max_fee,
    coverImage: rest.cover_image,
    riderNotes: rest.rider_notes,
    profileComplete: rest.profile_complete,
  };
}

// Safe directory representation. Contact/private business fields stay behind
// the authenticated /api/get-profile endpoint.
function directoryUser(u) {
  const safe = publicUser(u);
  if (!safe) return null;
  delete safe.email;
  delete safe.phone;
  delete safe.gst_number;
  delete safe.riderNotes;
  delete safe.rider_notes;
  delete safe.equipment;
  return safe;
}

async function toggleLike(likerId, likedId) {
  const qs = `liker_id=eq.${encodeURIComponent(likerId)}&liked_id=eq.${encodeURIComponent(likedId)}&limit=1`;
  const res = await fetch(supabaseUrl('likes', qs), { headers: supabaseHeaders() });
  const data = await readJson(res);
  if (!res.ok) throw new Error(data.message || 'DB error checking like');

  if (data.length > 0) {
    const delQs = `liker_id=eq.${encodeURIComponent(likerId)}&liked_id=eq.${encodeURIComponent(likedId)}`;
    const del = await fetch(supabaseUrl('likes', delQs), { method: 'DELETE', headers: supabaseHeaders() });
    if (!del.ok) throw new Error('Could not remove like.');
    return { liked: false };
  }

  const insert = await fetch(supabaseUrl('likes'), {
    method: 'POST',
    headers: supabaseHeaders(),
    body: JSON.stringify({ liker_id: likerId, liked_id: likedId }),
  });
  if (!insert.ok) {
    const d = await readJson(insert);
    throw new Error(d.message || 'Could not save like.');
  }
  return { liked: true };
}

async function getLikesByUser(userId) {
  const qs = `liker_id=eq.${encodeURIComponent(userId)}&select=liked_id,created_at&order=created_at.desc`;
  const res = await fetch(supabaseUrl('likes', qs), { headers: supabaseHeaders() });
  const data = await readJson(res);
  if (!res.ok) throw new Error(data.message || 'DB error fetching likes');
  return data;
}

async function getLikeCount(likedId) {
  const headers = { ...supabaseHeaders(), Prefer: 'count=exact' };
  const qs = `liked_id=eq.${encodeURIComponent(likedId)}&select=id`;
  const res = await fetch(supabaseUrl('likes', qs), { method: 'HEAD', headers });
  const range = res.headers.get('content-range') || '0/0';
  return parseInt(range.split('/')[1], 10) || 0;
}

async function createMessage({ senderId, receiverId, subject, body, eventDate = '', eventType = '', budget = '' }) {
  const res = await fetch(supabaseUrl('messages'), {
    method: 'POST',
    headers: supabaseHeaders(),
    body: JSON.stringify({
      sender_id: senderId,
      receiver_id: receiverId,
      subject: subject || '',
      body,
      event_date: eventDate,
      event_type: eventType,
      budget,
    }),
  });
  const data = await readJson(res);
  if (!res.ok) throw new Error(data.message || 'DB insert error (messages)');
  return Array.isArray(data) ? data[0] : data;
}

module.exports = {
  corsOk, json,
  signToken, verifyToken, extractBearer,
  hashPassword, checkPassword,
  findUser, createUser, updateUser,
  queryArtists, countArtists,
  publicUser, directoryUser,
  toggleLike, getLikesByUser, getLikeCount,
  createMessage,
};
