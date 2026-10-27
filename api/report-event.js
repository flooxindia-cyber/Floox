import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Login required' });

  const { event_id, reason } = req.body || {};
  if (!event_id) return res.status(400).json({ error: 'Event id required' });

  const { error } = await supabase.from('event_reports').insert({
    event_id, reporter_id: user.id, reason: (reason || '').slice(0, 300)
  });
  if (error?.code === '23505') return res.status(200).json({ ok: true, note: 'Already reported' });
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}