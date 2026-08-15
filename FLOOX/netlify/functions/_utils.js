// netlify/functions/_utils.js
// Shared helpers — Supabase edition

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');

// ── CORS ─────────────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin':  '*',
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

// ── JWT ───────────────────────────────────────────────────────────────────────
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

// ── PASSWORD ──────────────────────────────────────────────────────────────────
async function hashPassword(pw) {
  return bcrypt.hash(pw, 10);
}

async function checkPassword(pw, hash) {
  return bcrypt.compare(pw, hash);
}

// ── SUPABASE CLIENT ───────────────────────────────────────────────────────────
// Uses the REST API directly — no extra SDK needed (just fetch, built into Node 18+)
// Required env vars:
//   SUPABASE_URL      — e.g. https://xyzxyz.supabase.co
//   SUPABASE_SERVICE_KEY — your service_role secret key (NOT the anon key)

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

// ── DB HELPERS ────────────────────────────────────────────────────────────────

/** Find one user by field, e.g. findUser('email', 'eq', 'a@b.com') */
async function findUser(field, op, value) {
  const qs  = `${field}=${op}.${encodeURIComponent(value)}&limit=1`;
  const res = await fetch(supabaseUrl('users', qs), { headers: supabaseHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'DB error');
  return data[0] || null;
}

/** Insert a new user row. Returns inserted row. */
async function createUser(user) {
  const res  = await fetch(supabaseUrl('users'), {
    method:  'POST',
    headers: supabaseHeaders(),
    body:    JSON.stringify(user),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'DB insert error');
  return Array.isArray(data) ? data[0] : data;
}

/** Update user by id. Fields is a plain object of columns to set. Returns updated row. */
async function updateUser(id, fields) {
  const qs   = `id=eq.${encodeURIComponent(id)}`;
  const res  = await fetch(supabaseUrl('users', qs), {
    method:  'PATCH',
    headers: supabaseHeaders(),
    body:    JSON.stringify({ ...fields, updated_at: new Date().toISOString() }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'DB update error');
  return Array.isArray(data) ? data[0] : data;
}

/** Query artists with optional filters. Returns array. */
async function queryArtists({ genre, city, q, limit = 20, offset = 0 } = {}) {
  const parts = [`role=eq.artist`, `profile_complete=eq.true`, `limit=${limit}`, `offset=${offset}`];
  if (genre) parts.push(`genres=cs.{"${genre}"}`);           // contains
  if (city)  parts.push(`city=ilike.*${encodeURIComponent(city)}*`);
  if (q)     parts.push(`or=(name.ilike.*${encodeURIComponent(q)}*,stage_name.ilike.*${encodeURIComponent(q)}*,bio.ilike.*${encodeURIComponent(q)}*)`);

  const qs  = parts.join('&');
  const res = await fetch(supabaseUrl('users', qs), { headers: supabaseHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'DB query error');
  return data;
}

/** Count artists matching optional filters */
async function countArtists({ genre, city, q } = {}) {
  const parts = [`role=eq.artist`, `profile_complete=eq.true`];
  if (genre) parts.push(`genres=cs.{"${genre}"}`);
  if (city)  parts.push(`city=ilike.*${encodeURIComponent(city)}*`);
  if (q)     parts.push(`or=(name.ilike.*${encodeURIComponent(q)}*,stage_name.ilike.*${encodeURIComponent(q)}*,bio.ilike.*${encodeURIComponent(q)}*)`);

  const headers = { ...supabaseHeaders(), 'Prefer': 'count=exact' };
  const qs  = parts.join('&') + '&select=id';
  const res = await fetch(supabaseUrl('users', qs), { method: 'HEAD', headers });
  const range = res.headers.get('content-range') || '0/0';
  return parseInt(range.split('/')[1], 10) || 0;
}

// ── USER SERIALISATION ────────────────────────────────────────────────────────
// Maps snake_case DB columns → camelCase frontend shape
// and strips password_hash before returning to client

function publicUser(u) {
  if (!u) return null;
  const {
    password_hash,
    // map snake_case → camelCase
    created_at,  updated_at,
    stage_name,  performer_type,
    org_name,    org_type,
    social_links, media_links,
    performance_types, event_types,
    min_fee,     max_fee,
    cover_image, rider_notes,
    profile_complete,
    ...rest
  } = u;

  return {
    ...rest,
    createdAt:        created_at,
    updatedAt:        updated_at,
    stageName:        stage_name,
    performerType:    performer_type,
    orgName:          org_name,
    orgType:          org_type,
    socialLinks:      social_links    || {},
    mediaLinks:       media_links     || [],
    performanceTypes: performance_types || [],
    eventTypes:       event_types     || [],
    minFee:           min_fee,
    maxFee:           max_fee,
    coverImage:       cover_image,
    riderNotes:       rider_notes,
    profileComplete:  profile_complete,
  };
}

// ── LIKES HELPERS ─────────────────────────────────────────────────────────────

/** Toggle like: returns { liked: true/false } */
async function toggleLike(likerId, likedId) {
  // Check if already liked
  const qs  = `liker_id=eq.${encodeURIComponent(likerId)}&liked_id=eq.${encodeURIComponent(likedId)}&limit=1`;
  const res = await fetch(supabaseUrl('likes', qs), { headers: supabaseHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'DB error checking like');

  if (data.length > 0) {
    // Already liked → unlike (DELETE)
    const delQs = `liker_id=eq.${encodeURIComponent(likerId)}&liked_id=eq.${encodeURIComponent(likedId)}`;
    await fetch(supabaseUrl('likes', delQs), { method: 'DELETE', headers: supabaseHeaders() });
    return { liked: false };
  } else {
    // Not liked → like (INSERT)
    await fetch(supabaseUrl('likes'), {
      method: 'POST',
      headers: supabaseHeaders(),
      body: JSON.stringify({ liker_id: likerId, liked_id: likedId }),
    });
    return { liked: true };
  }
}

/** Get all liked profile IDs for a given user */
async function getLikesByUser(userId) {
  const qs  = `liker_id=eq.${encodeURIComponent(userId)}&select=liked_id,created_at&order=created_at.desc`;
  const res = await fetch(supabaseUrl('likes', qs), { headers: supabaseHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'DB error fetching likes');
  return data; // array of { liked_id, created_at }
}

/** Get like count for a profile */
async function getLikeCount(likedId) {
  const headers = { ...supabaseHeaders(), 'Prefer': 'count=exact' };
  const qs  = `liked_id=eq.${encodeURIComponent(likedId)}&select=id`;
  const res = await fetch(supabaseUrl('likes', qs), { method: 'HEAD', headers });
  const range = res.headers.get('content-range') || '0/0';
  return parseInt(range.split('/')[1], 10) || 0;
}

// ── MESSAGE HELPERS ───────────────────────────────────────────────────────────

/** Send a message from one user to another */
async function createMessage({ senderId, receiverId, subject, body, eventDate = '', eventType = '', budget = '' }) {
  const res = await fetch(supabaseUrl('messages'), {
    method: 'POST',
    headers: supabaseHeaders(),
    body: JSON.stringify({
      sender_id:   senderId,
      receiver_id: receiverId,
      subject:     subject || '',
      body,
      event_date:  eventDate,
      event_type:  eventType,
      budget,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'DB insert error (messages)');
  return Array.isArray(data) ? data[0] : data;
}

module.exports = {
  corsOk, json,
  signToken, verifyToken, extractBearer,
  hashPassword, checkPassword,
  findUser, createUser, updateUser,
  queryArtists, countArtists,
  publicUser,
  toggleLike, getLikesByUser, getLikeCount,
  createMessage,
};
