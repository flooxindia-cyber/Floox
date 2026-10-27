import { createClient } from '@supabase/supabase-js';
import { makeKey, canonLink, findDuplicate, safeHttps } from '../lib/dedupe.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// TODO: tumhare login system ke hisaab se isko likhna hai.
// Jab tak yeh null deta hai, har request 401 degi (safe default).
async function getUserFromRequest(req) {
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Login required' });
  if (!user.otp_verified) return res.status(403).json({ error: 'Verify phone first' });

  const b = req.body || {};

  // 1) Validation
  if (!b.title || b.title.trim().length < 5) return res.status(400).json({ error: 'Title too short' });
  if (!b.city) return res.status(400).json({ error: 'City required' });
  if (!b.start_at || isNaN(new Date(b.start_at)) || new Date(b.start_at) < new Date())
    return res.status(400).json({ error: 'Date must be in future' });
  if ((b.description || '').match(/https?:\/\//g)?.length > 2)
    return res.status(400).json({ error: 'Too many links' });
  if (b.poster_url && !b.poster_url.startsWith(`https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/`))
    return res.status(400).json({ error: 'Invalid poster' });

  const slots = Number(b.artist_slots_open) || 0;
  if (slots < 0 || slots > 50) return res.status(400).json({ error: 'Slots 0 se 50 ke beech hone chahiye' });

  const link = b.ticket_link ? safeHttps(b.ticket_link) : null;
  if (b.ticket_link && !link) return res.status(400).json({ error: 'Ticket link https:// se shuru hona chahiye' });

  // 2) Rate limit: 24 ghante mein max 3 events
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase.from('events')
    .select('id', { count: 'exact', head: true })
    .eq('organiser_id', user.id).gte('created_at', since);
  if (count >= 3) return res.status(429).json({ error: 'Daily limit reached' });

  // 3) Duplicate check
  const cand = {
    title: b.title.trim(),
    city: b.city,
    start_at: new Date(b.start_at).toISOString(),
    ticket_link: link
  };
  cand.dedupe_key = makeKey(cand);
  cand.canonical_link = link ? canonLink(link) : null;

  const dupId = await findDuplicate(supabase, cand);
  if (dupId) return res.status(409).json({ error: 'duplicate', existing_id: dupId });

  // 4) Insert
  const { data, error } = await supabase.from('events').insert({
    organiser_id: user.id,
    source: 'floox',
    title: cand.title,
    description: b.description,
    category: b.category,
    city: b.city,
    area: b.area,
    venue: b.venue,
    start_at: cand.start_at,
    end_at: b.end_at ? new Date(b.end_at).toISOString() : null,
    is_free: b.is_free,
    price: b.price,
    ticket_link: link,
    contact_phone: b.contact_phone,
    poster_url: b.poster_url,
    is_public: b.is_public !== false,
    artist_slots_open: slots,
    dedupe_key: cand.dedupe_key,
    canonical_link: cand.canonical_link,
    status: 'live'
  }).select().single();

  if (error?.code === '23505') return res.status(409).json({ error: 'duplicate' });
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
}