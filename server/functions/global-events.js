// Floox — Global + India live event discovery
// Read-only event aggregator. Existing event/user APIs are intentionally untouched.

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 's-maxage=300, stale-while-revalidate=900',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(body),
  };
}

function clean(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function normalizeTicketmasterEvent(item) {
  const venue = item._embedded?.venues?.[0] || {};
  const attraction = item._embedded?.attractions?.[0] || {};
  const location = venue.location || {};
  const image = Array.isArray(item.images)
    ? [...item.images].sort((a, b) => (b.width || 0) - (a.width || 0))[0]
    : null;
  const price = item.priceRanges?.[0] || {};

  return {
    provider: 'ticketmaster',
    provider_id: item.id,
    title: item.name || 'Untitled event',
    description: clean(item.info || item.pleaseNote || '', ''),
    category: clean(item.classifications?.[0]?.segment?.name || item.classifications?.[0]?.genre?.name || 'Other', 'Other'),
    start_at: item.dates?.start?.dateTime || item.dates?.start?.localDate || null,
    end_at: item.dates?.end?.dateTime || item.dates?.end?.localDate || null,
    timezone: item.dates?.timezone || null,
    venue_name: venue.name || '',
    city: venue.city?.name || '',
    state: venue.state?.name || venue.state?.stateCode || '',
    country: venue.country?.name || venue.country?.countryCode || '',
    latitude: location.latitude ? Number(location.latitude) : null,
    longitude: location.longitude ? Number(location.longitude) : null,
    image_url: image?.url || '',
    organizer_name: attraction.name || item.promoter?.[0]?.name || '',
    official_url: item.url || '',
    ticket_url: item.url || '',
    price_min: Number.isFinite(price.min) ? Number(price.min) : null,
    price_max: Number.isFinite(price.max) ? Number(price.max) : null,
    currency: price.currency || null,
    source_updated_at: new Date().toISOString(),
  };
}

async function ticketmaster({ keyword, city, countryCode, startDateTime, size = 20 }) {
  const key = process.env.TICKETMASTER_API_KEY;
  if (!key) return [];

  const url = new URL('https://app.ticketmaster.com/discovery/v2/events.json');
  url.searchParams.set('apikey', key);
  url.searchParams.set('size', String(Math.min(Math.max(Number(size) || 20, 1), 50)));
  url.searchParams.set('sort', 'date,asc');
  if (keyword) url.searchParams.set('keyword', keyword);
  if (city) url.searchParams.set('city', city);
  if (countryCode) url.searchParams.set('countryCode', countryCode);
  if (startDateTime) url.searchParams.set('startDateTime', startDateTime);

  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Ticketmaster returned ${res.status}`);

  const json = await res.json();
  return (json._embedded?.events || []).map(normalizeTicketmasterEvent);
}

async function eventbrite({ keyword, locationAddress, startDateRange, pageSize = 20 }) {
  const token = process.env.EVENTBRITE_API_TOKEN;
  if (!token) return [];

  const url = new URL('https://www.eventbriteapi.com/v3/events/search/');
  url.searchParams.set('status', 'live');
  url.searchParams.set('expand', 'venue,organizer,ticket_availability');
  url.searchParams.set('page_size', String(Math.min(Math.max(Number(pageSize) || 20, 1), 50)));
  if (keyword) url.searchParams.set('q', keyword);
  if (locationAddress) url.searchParams.set('location.address', locationAddress);
  if (startDateRange) url.searchParams.set('start_date.range_start', startDateRange);

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(`Eventbrite returned ${res.status}`);

  const json = await res.json();
  return (json.events || []).map((item) => ({
    provider: 'eventbrite',
    provider_id: item.id,
    title: item.name?.text || 'Untitled event',
    description: item.description?.text || '',
    category: item.category?.name || 'Other',
    start_at: item.start?.utc || null,
    end_at: item.end?.utc || null,
    timezone: item.start?.timezone || null,
    venue_name: item.venue?.name || '',
    city: item.venue?.address?.city || '',
    state: item.venue?.address?.region || '',
    country: item.venue?.address?.country || '',
    latitude: item.venue?.latitude ? Number(item.venue.latitude) : null,
    longitude: item.venue?.longitude ? Number(item.venue.longitude) : null,
    image_url: item.logo?.url || '',
    organizer_name: item.organizer?.name || '',
    official_url: item.url || '',
    ticket_url: item.url || '',
    price_min: null,
    price_max: null,
    currency: null,
    source_updated_at: new Date().toISOString(),
  }));
}

async function getEvents(query = {}) {
  const keyword = clean(query.keyword || query.q);
  const city = clean(query.city);
  const countryCode = clean(query.countryCode);
  const region = clean(query.region);
  const source = clean(query.source).toLowerCase();
  const limit = Math.min(Math.max(Number(query.limit) || 24, 1), 50);
  const startDateTime = query.startDateTime || new Date().toISOString();

  const jobs = [];
  if (!source || source === 'ticketmaster') {
    jobs.push(ticketmaster({ keyword, city, countryCode, startDateTime, size: limit }));
  }
  if (!source || source === 'eventbrite') {
    jobs.push(eventbrite({ keyword, locationAddress: city || region, startDateRange: startDateTime, pageSize: limit }));
  }

  const settled = await Promise.allSettled(jobs);
  const events = settled.flatMap((item) => item.status === 'fulfilled' ? item.value : []);

  const byId = new Map();
  for (const event of events) {
    const key = `${event.provider}:${event.provider_id}`;
    if (!byId.has(key)) byId.set(key, event);
  }

  return [...byId.values()]
    .filter((event) => !countryCode || event.country === countryCode || event.country === countryCode.toUpperCase())
    .sort((a, b) => String(a.start_at || '').localeCompare(String(b.start_at || '')))
    .slice(0, limit);
}

exports.handler = async (event) => {
  try {
    const params = event.queryStringParameters || {};
    if (event.httpMethod === 'OPTIONS') return response(204, {});
    if (event.httpMethod !== 'GET') return response(405, { error: 'Method not allowed.' });

    const events = await getEvents(params);
    return response(200, {
      ok: true,
      count: events.length,
      updated_at: new Date().toISOString(),
      events,
    });
  } catch (error) {
    console.error('global-events:', error);
    return response(500, {
      ok: false,
      error: 'Unable to fetch live events right now.',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

exports.getEvents = getEvents;
