const IST = 5.5 * 3600 * 1000;

export const norm = s =>
  String(s || '').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]/gu, '');

export const dayIST = iso => new Date(new Date(iso).getTime() + IST).toISOString().slice(0, 10);

export const makeKey = ev => `${norm(ev.title)}|${norm(ev.city)}|${dayIST(ev.start_at)}`;

export function safeHttps(u) {
  try { const x = new URL(u); return x.protocol === 'https:' ? x.href : null; }
  catch { return null; }
}

export function canonLink(u) {
  try {
    const x = new URL(u);
    ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','fbclid','gclid','ref']
      .forEach(k => x.searchParams.delete(k));
    const q = x.searchParams.toString();
    return (x.hostname.replace(/^www\./, '') + x.pathname.replace(/\/+$/, '') + (q ? '?' + q : '')).toLowerCase();
  } catch { return null; }
}

// existing event ki id deta hai, ya null
export async function findDuplicate(supabase, ev) {
  const canon = ev.canonical_link || (ev.ticket_link ? canonLink(ev.ticket_link) : null);
  if (canon) {
    const { data } = await supabase.from('events').select('id')
      .eq('canonical_link', canon).eq('status', 'live').limit(1);
    if (data?.length) return data[0].id;
  }
  const key = ev.dedupe_key || makeKey(ev);
  const { data: byKey } = await supabase.from('events').select('id')
    .eq('dedupe_key', key).eq('status', 'live').limit(1);
  if (byKey?.length) return byKey[0].id;

  const { data: similar } = await supabase.rpc('find_similar_event',
    { p_title: ev.title, p_city: ev.city, p_start: ev.start_at });
  return similar || null;
}