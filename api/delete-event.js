import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Login required' });

  const { id } = req.body || {};
  const { data: ev } = await supabase.from('events').select('organiser_id').eq('id', id).single();
  if (!ev || ev.organiser_id !== user.id) return res.status(403).json({ error: 'Not allowed' });

  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}