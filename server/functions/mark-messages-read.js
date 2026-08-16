// Floox server function — mark received messages as read
const { corsOk, json, verifyToken, extractBearer } = require('./_utils');

const dbHeaders = () => {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_KEY env var is not set');
  return { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}`, Prefer: 'return=representation' };
};
const dbUrl = (table, qs = '') => {
  const base = process.env.SUPABASE_URL;
  if (!base) throw new Error('SUPABASE_URL env var is not set');
  return `${base}/rest/v1/${table}${qs ? '?' + qs : ''}`;
};
async function readJson(res) { const t = await res.text(); if (!t) return []; try { return JSON.parse(t); } catch { return []; } }

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsOk();
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const token = extractBearer(event);
  if (!token) return json(401, { error: 'Sign in to update messages.' });
  let decoded;
  try { decoded = verifyToken(token); } catch { return json(401, { error: 'Session expired. Please sign in again.' }); }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid JSON.' }); }
  const senderId = String(body.senderId || '').trim();
  if (!senderId) return json(400, { error: 'senderId is required.' });

  try {
    const qs = `receiver_id=eq.${encodeURIComponent(decoded.id)}&sender_id=eq.${encodeURIComponent(senderId)}&read=eq.false`;
    const res = await fetch(dbUrl('messages', qs), { method: 'PATCH', headers: dbHeaders(), body: JSON.stringify({ read: true }) });
    const data = await readJson(res);
    if (!res.ok) throw new Error(data.message || data.error || 'Could not update messages.');
    return json(200, { success: true, updated: Array.isArray(data) ? data.length : 0 });
  } catch (err) {
    console.error('mark-messages-read error:', err);
    return json(500, { error: 'Could not mark messages as read.' });
  }
};
