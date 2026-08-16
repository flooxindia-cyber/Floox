// Floox server function — authenticated message inbox/conversations
const { corsOk, json, verifyToken, extractBearer } = require('./_utils');

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const dbHeaders = () => {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_KEY env var is not set');
  return { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` };
};

const dbUrl = (table, qs = '') => {
  const base = process.env.SUPABASE_URL;
  if (!base) throw new Error('SUPABASE_URL env var is not set');
  return `${base}/rest/v1/${table}${qs ? '?' + qs : ''}`;
};

async function readJson(res) {
  const text = await res.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return {}; }
}

function authUser(event) {
  const token = extractBearer(event);
  if (!token) throw Object.assign(new Error('Sign in to view messages.'), { status: 401 });
  try { return verifyToken(token); }
  catch { throw Object.assign(new Error('Session expired. Please sign in again.'), { status: 401 }); }
}

function safeParticipant(u) {
  return {
    id: u.id,
    name: u.stage_name || u.org_name || u.name || 'Floox user',
    role: u.role || '',
    avatar: u.avatar || '',
    city: u.city || '',
    verified: !!u.verified,
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsOk();
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });

  let decoded;
  try { decoded = authUser(event); }
  catch (err) { return json(err.status || 401, { error: err.message }); }

  const withId = String(event.queryStringParameters?.with || '').trim();
  const limit = Math.min(Math.max(Number(event.queryStringParameters?.limit || 200), 1), 500);
  const uid = encodeURIComponent(decoded.id);

  try {
    let query;
    if (withId) {
      const wid = encodeURIComponent(withId);
      query = `or=(and(sender_id.eq.${uid},receiver_id.eq.${wid}),and(sender_id.eq.${wid},receiver_id.eq.${uid}))&order=created_at.asc&limit=${limit}`;
    } else {
      query = `or=(sender_id.eq.${uid},receiver_id.eq.${uid})&order=created_at.desc&limit=${limit}`;
    }

    const res = await fetch(dbUrl('messages', query), { headers: dbHeaders() });
    const messages = await readJson(res);
    if (!res.ok) throw new Error(messages.message || messages.error || 'Could not load messages.');

    const ids = [...new Set((messages || []).flatMap(m => [m.sender_id, m.receiver_id]).filter(id => id && id !== decoded.id))];
    let users = [];
    if (ids.length) {
      const inList = ids.map(id => `"${String(id).replace(/"/g, '')}"`).join(',');
      const ur = await fetch(dbUrl('users', `id=in.(${inList})&select=id,name,stage_name,org_name,role,avatar,city,verified`), { headers: dbHeaders() });
      users = await readJson(ur);
      if (!ur.ok) throw new Error(users.message || users.error || 'Could not load message participants.');
    }

    const participantMap = Object.fromEntries((users || []).map(u => [u.id, safeParticipant(u)]));
    const normalized = (messages || []).map(m => ({
      id: m.id,
      senderId: m.sender_id,
      receiverId: m.receiver_id,
      subject: m.subject || '',
      body: m.body || '',
      eventDate: m.event_date || '',
      eventType: m.event_type || '',
      budget: m.budget || '',
      read: !!m.read,
      createdAt: m.created_at,
      sender: participantMap[m.sender_id] || null,
      receiver: participantMap[m.receiver_id] || null,
    }));

    if (withId) {
      return json(200, { messages: normalized, participant: participantMap[withId] || null });
    }

    const conversations = new Map();
    for (const m of normalized) {
      const otherId = m.senderId === decoded.id ? m.receiverId : m.senderId;
      if (!otherId || conversations.has(otherId)) {
        if (otherId && conversations.has(otherId) && !m.read && m.receiverId === decoded.id) conversations.get(otherId).unread += 1;
        continue;
      }
      conversations.set(otherId, {
        user: participantMap[otherId] || { id: otherId, name: 'Floox user' },
        lastMessage: m,
        unread: !m.read && m.receiverId === decoded.id ? 1 : 0,
      });
    }

    return json(200, { messages: normalized, conversations: [...conversations.values()] });
  } catch (err) {
    console.error('messages error:', err);
    return json(500, { error: 'Could not load messages. Please try again.' });
  }
};
