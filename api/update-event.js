import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const user = await getUserFromRequest(req); // tumhara existing logic
  if (!user) return res.status(401).json({ error: 'Login required' });

  const b = req.body || {};
  if (!b.id) return res.status(400).json({ error: 'Event id required' });

  const { data: ev } = await supabase.from('events').select('organiser_id').eq('id', b.id).single();
  if (!ev || ev.organiser_id !== user.id) return res.status(403).json({ error: 'Not allowed' });

  // sirf yeh fields edit ho sakti hain; status ya organiser_id kabhi nahi
  const allowed = ['title','description','category','city','area','venue','start_at','end_at',
                   'is_free','price','ticket_link','contact_phone','poster_url','looking_for_artists'];
  const update = {};
  for (const k of allowed) if (k in b) update[k] = b[k];

  const { data, error } = await supabase.from('events').update(update).eq('id', b.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}