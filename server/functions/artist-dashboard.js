// Floox server function — live artist dashboard data
const { corsOk, json, verifyToken, extractBearer, findUser } = require('./_utils');

function dbHeaders(prefer = 'return=representation') {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_KEY env var is not set');
  return { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}`, Prefer: prefer };
}
function dbUrl(table, qs = '') {
  const base = process.env.SUPABASE_URL;
  if (!base) throw new Error('SUPABASE_URL env var is not set');
  return `${base}/rest/v1/${table}${qs ? '?' + qs : ''}`;
}
async function readJson(res) {
  const text = await res.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return {}; }
}
function auth(event) {
  const token = extractBearer(event);
  if (!token) throw Object.assign(new Error('Authentication required.'), { status: 401 });
  try { return verifyToken(token); }
  catch { throw Object.assign(new Error('Session expired. Please sign in again.'), { status: 401 }); }
}
function safeBooking(b, organiserMap) {
  const organiser = organiserMap[b.organiser_id] || null;
  return {
    id: b.id,
    event: b.event_name,
    date: b.event_date,
    city: b.city || '',
    venue: b.venue || '',
    fee: Number(b.fee || 0),
    status: b.status,
    paymentStatus: b.payment_status,
    notes: b.notes || '',
    organiser: organiser ? {
      id: organiser.id,
      name: organiser.org_name || organiser.name || 'Organiser',
      city: organiser.city || '',
      avatar: organiser.avatar || '',
      verified: !!organiser.verified,
    } : { name: 'Organiser', city: '' },
    createdAt: b.created_at,
    updatedAt: b.updated_at,
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return corsOk();
  let decoded;
  try { decoded = auth(event); } catch (e) { return json(e.status || 401, { error: e.message }); }

  try {
    const user = await findUser('id', 'eq', decoded.id);
    if (!user || user.role !== 'artist') return json(403, { error: 'Artist account required.' });

    if (event.httpMethod === 'POST') {
      let body = {};
      try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid JSON.' }); }
      if (body.action !== 'update-booking') return json(400, { error: 'Unsupported action.' });
      const bookingId = String(body.bookingId || '').trim();
      const status = String(body.status || '').trim();
      if (!bookingId || !['confirmed', 'cancelled', 'completed'].includes(status)) return json(400, { error: 'Invalid booking update.' });
      const qs = `id=eq.${encodeURIComponent(bookingId)}&artist_id=eq.${encodeURIComponent(decoded.id)}`;
      const patch = { status };
      if (status === 'completed') patch.payment_status = 'paid';
      const r = await fetch(dbUrl('artist_bookings', qs), { method: 'PATCH', headers: dbHeaders(), body: JSON.stringify(patch) });
      const data = await readJson(r);
      if (!r.ok) return json(r.status, { error: data.message || data.error || 'Could not update booking.' });
      return json(200, { booking: Array.isArray(data) ? data[0] : data, message: `Booking ${status}.` });
    }

    if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });

    const uid = encodeURIComponent(decoded.id);
    const bookingsRes = await fetch(dbUrl('artist_bookings', `artist_id=eq.${uid}&order=event_date.asc,created_at.desc&limit=200`), { headers: dbHeaders('return=minimal') });
    const bookings = await readJson(bookingsRes);
    if (!bookingsRes.ok) throw new Error(bookings.message || bookings.error || 'Could not load bookings.');

    const organiserIds = [...new Set((bookings || []).map(b => b.organiser_id).filter(Boolean))];
    let organisers = [];
    if (organiserIds.length) {
      const inList = organiserIds.map(id => `"${String(id).replace(/"/g, '')}"`).join(',');
      const ur = await fetch(dbUrl('users', `id=in.(${inList})&select=id,name,org_name,city,avatar,verified`), { headers: dbHeaders('return=minimal') });
      organisers = await readJson(ur);
      if (!ur.ok) throw new Error(organisers.message || organisers.error || 'Could not load organisers.');
    }
    const organiserMap = Object.fromEntries((organisers || []).map(o => [o.id, o]));
    const normalizedBookings = (bookings || []).map(b => safeBooking(b, organiserMap));

    const viewsRes = await fetch(dbUrl('profile_views', `artist_id=eq.${uid}&select=id,created_at&order=created_at.desc&limit=5000`), { headers: dbHeaders('return=minimal') });
    const views = await readJson(viewsRes);
    if (!viewsRes.ok) throw new Error(views.message || views.error || 'Could not load profile views.');

    const messagesRes = await fetch(dbUrl('messages', `receiver_id=eq.${uid}&order=created_at.desc&limit=200`), { headers: dbHeaders('return=minimal') });
    const messages = await readJson(messagesRes);
    if (!messagesRes.ok) throw new Error(messages.message || messages.error || 'Could not load enquiries.');

    const senderIds = [...new Set((messages || []).map(m => m.sender_id).filter(Boolean))];
    let senders = [];
    if (senderIds.length) {
      const inList = senderIds.map(id => `"${String(id).replace(/"/g, '')}"`).join(',');
      const sr = await fetch(dbUrl('users', `id=in.(${inList})&select=id,name,org_name,role,avatar,city,verified`), { headers: dbHeaders('return=minimal') });
      senders = await readJson(sr);
      if (!sr.ok) throw new Error(senders.message || senders.error || 'Could not load enquiry senders.');
    }
    const senderMap = Object.fromEntries((senders || []).map(s => [s.id, s]));
    const enquiries = (messages || []).map(m => ({
      id: m.id,
      from: senderMap[m.sender_id]?.org_name || senderMap[m.sender_id]?.name || 'Floox user',
      senderId: m.sender_id,
      event: m.subject || m.event_type || 'New enquiry',
      date: m.event_date || '',
      budget: m.budget || '',
      city: senderMap[m.sender_id]?.city || '',
      message: m.body || '',
      read: !!m.read,
      createdAt: m.created_at,
    }));

    const completed = normalizedBookings.filter(b => b.status === 'completed');
    const confirmed = normalizedBookings.filter(b => b.status === 'confirmed');
    const pending = normalizedBookings.filter(b => b.status === 'pending');
    const earnings = completed.reduce((sum, b) => sum + b.fee, 0);
    const pendingPayout = confirmed.filter(b => b.paymentStatus !== 'paid').reduce((sum, b) => sum + b.fee, 0);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEarnings = completed.filter(b => new Date(b.date) >= monthStart).reduce((sum, b) => sum + b.fee, 0);

    return json(200, {
      user,
      stats: {
        totalBookings: normalizedBookings.length,
        totalEarnings: earnings,
        profileViews: (views || []).length,
        newEnquiries: enquiries.filter(e => !e.read).length,
        completedShows: completed.length,
        pendingBookings: pending.length,
        confirmedBookings: confirmed.length,
        pendingPayout,
        monthEarnings,
        rating: null,
      },
      bookings: normalizedBookings,
      enquiries,
      views: (views || []).map(v => v.created_at),
    });
  } catch (err) {
    console.error('artist-dashboard error:', err);
    return json(500, { error: 'Could not load your live dashboard data.' });
  }
};
