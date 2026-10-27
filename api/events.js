import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const COLS = 'id,title,description,category,city,area,venue,start_at,end_at,is_free,price,price_note,age_limit,ticket_link,poster_url,artist_slots_open,source,external_platform';const IST = 5.5 * 3600 * 1000;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  const { id, city, category, range, free, limit } = req.query;

  let q = supabase.from('events').select(COLS).eq('status', 'live').eq('is_public', true);

  if (id) {
    const { data, error } = await q.eq('id', id).maybeSingle();
    if (error) return res.status(500).json({ error: 'Server error' });
    return data ? res.status(200).json({ event: data }) : res.status(404).json({ error: 'Not found' });
  }

  q = q.gte('start_at', new Date().toISOString()).order('start_at', { ascending: true })
       .limit(Math.min(Number(limit) || 30, 60));
  if (city) q = q.eq('city', city);
  if (category) q = q.eq('category', category);
  if (free === '1') q = q.eq('is_free', true);

  const n = new Date(Date.now() + IST);
  if (range === 'today') {
    const end = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 23, 59, 59, 999) - IST);
    q = q.lte('start_at', end.toISOString());
  } else if (range === 'week') {
    q = q.lte('start_at', new Date(Date.now() + 7 * 86400000).toISOString());
  }

  const { data, error } = await q;
  if (error) return res.status(500).json({ error: 'Server error' });
  return res.status(200).json({ events: data });
}