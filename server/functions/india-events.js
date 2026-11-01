// Floox — India event aggregator
// Scrapes public-facing data from BookMyShow and District (Insider.in)
// These are public listing pages that do NOT require login.
// All events redirect to the official site for ticket purchase — Floox never sells tickets.

'use strict';

// ── Shared fetch helper ───────────────────────────────────────────────────────

async function safeFetch(url, options = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);

  // Route through ScraperAPI when key is set — bypasses Vercel IP blocks from BMS/District
  const scraperKey = process.env.SCRAPER_API_KEY;
  if (!scraperKey) console.warn('[india-events] SCRAPER_API_KEY not set — direct fetch will likely 403');
  const finalUrl = scraperKey
    ? `https://api.scraperapi.com/?api_key=${scraperKey}&url=${encodeURIComponent(url)}`
    : url;
  console.log(`[india-events] fetching via ${scraperKey ? 'ScraperAPI' : 'direct'}: ${url.slice(0, 80)}`);

  try {
    const res = await fetch(finalUrl, {
      ...options,
      signal: ctrl.signal,
      // When routing via ScraperAPI, let it handle headers; otherwise set our own
      headers: scraperKey ? {} : {
        'User-Agent':
          'Mozilla/5.0 (compatible; Floox-EventBot/1.0; +https://floox.in)',
        Accept: 'application/json, text/html;q=0.9',
        'Accept-Language': 'en-IN,en;q=0.8',
        ...options.headers,
      },
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ── City slug maps ────────────────────────────────────────────────────────────

// BookMyShow uses numeric region IDs for its API.
const BMS_REGIONS = {
  mumbai:    { id: 'Mumbai',    code: 'HR-48' },
  delhi:     { id: 'NCR',      code: 'HR-NCR' },
  bengaluru: { id: 'Bangalore', code: 'HR-51' },
  bangalore: { id: 'Bangalore', code: 'HR-51' },
  hyderabad: { id: 'Hyderabad', code: 'HR-55' },
  chennai:   { id: 'Chennai',  code: 'HR-49' },
  kolkata:   { id: 'Kolkata',  code: 'HR-50' },
  pune:      { id: 'Pune',     code: 'HR-100' },
  ahmedabad: { id: 'Ahmedabad',code: 'HR-56' },
  jaipur:    { id: 'Jaipur',   code: 'HR-57' },
  goa:       { id: 'Goa',      code: 'HR-304' },
  chandigarh:{ id: 'Chandigarh',code: 'HR-321' },
  lucknow:   { id: 'Lucknow',  code: 'HR-109' },
  surat:     { id: 'Surat',    code: 'HR-58' },
  kochi:     { id: 'Kochi',    code: 'HR-54' },
  indore:    { id: 'Indore',   code: 'HR-343' },
};

// District (Insider.in) uses city slugs directly in their API.
const DISTRICT_CITIES = [
  'mumbai', 'delhi', 'bangalore', 'hyderabad', 'chennai',
  'kolkata', 'pune', 'ahmedabad', 'jaipur', 'goa',
  'chandigarh', 'lucknow', 'kochi', 'indore',
];

// ── BookMyShow ────────────────────────────────────────────────────────────────
//
// BMS exposes a public browse API that their website uses.
// We hit the "events" category, not movies or sports, so we only get
// concerts, comedy shows, festivals, workshops, etc.

function normalizeBmsEvent(item, cityName) {
  const dateStr = item.EventDate
    ? new Date(Number(item.EventDate) * 1000).toISOString()
    : null;

  const imageUrl = item.EventImageUrl
    ? (item.EventImageUrl.startsWith('http')
        ? item.EventImageUrl
        : `https://in.bmscdn.com/ieapp/events/images/xl/${item.EventImageUrl}`)
    : '';

  const bookingUrl = item.EventCode
    ? `https://in.bookmyshow.com/events/${item.EventSlug || item.EventCode}`
    : 'https://in.bookmyshow.com/explore/events';

  return {
    provider:          'bookmyshow',
    provider_id:       String(item.EventCode || item.EventId || Math.random()),
    title:             String(item.EventName || item.EventTitle || 'Untitled').trim(),
    description:       String(item.EventDescription || item.ShortDescription || '').slice(0, 500),
    category:          String(item.EventSubCategory || item.EventCategory || 'Event').trim(),
    start_at:          dateStr,
    end_at:            item.EventEndDate
                         ? new Date(Number(item.EventEndDate) * 1000).toISOString()
                         : null,
    timezone:          'Asia/Kolkata',
    venue_name:        String(item.VenueName || item.Venue || '').trim(),
    city:              cityName,
    state:             '',
    country:           'India',
    latitude:          item.Latitude  ? Number(item.Latitude)  : null,
    longitude:         item.Longitude ? Number(item.Longitude) : null,
    image_url:         imageUrl,
    organizer_name:    String(item.OrganizerName || '').trim(),
    official_url:      bookingUrl,
    ticket_url:        bookingUrl,
    price_min:         item.MinPrice != null ? Number(item.MinPrice) : null,
    price_max:         item.MaxPrice != null ? Number(item.MaxPrice) : null,
    currency:          'INR',
    source_updated_at: new Date().toISOString(),
  };
}

async function fetchBmsCity(cityKey) {
  const region = BMS_REGIONS[cityKey.toLowerCase()];
  if (!region) return [];

  // BMS browse API — public, no auth required.
  // Returns the same data the /explore/events page uses.
  const url =
    `https://in.bookmyshow.com/api/explore/v1/discover/regions/${region.id}/categories/` +
    `events/more?sortBy=popularity&pageNumber=1&pageSize=20`;

  try {
    const res = await safeFetch(url, {
      headers: {
        Referer:  'https://in.bookmyshow.com/',
        Origin:   'https://in.bookmyshow.com',
        'x-region-code': region.code,
        'x-region-slug': region.id.toLowerCase(),
      },
    });

    if (!res.ok) {
      console.warn(`BMS ${cityKey}: HTTP ${res.status}`);
      return [];
    }

    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { return []; }

    const items =
      json?.BookMyShow?.arrEvents  ||  // v1 shape
      json?.EventListings           ||  // alt shape
      json?.resultData              ||
      [];

    if (!Array.isArray(items)) return [];
    return items.map(item => normalizeBmsEvent(item, region.id));
  } catch (err) {
    console.warn(`BMS ${cityKey} fetch failed:`, err.message);
    return [];
  }
}

/**
 * Fetch BookMyShow events across multiple cities.
 * @param {string[]} cities  lowercase city keys, e.g. ['mumbai','delhi']
 * @param {number}   limit   max events to return total
 */
async function bookmyshow(cities = Object.keys(BMS_REGIONS), limit = 50) {
  const jobs = cities
    .filter(c => BMS_REGIONS[c.toLowerCase()])
    .slice(0, 6) // cap parallel fetches
    .map(c => fetchBmsCity(c));

  const settled = await Promise.allSettled(jobs);
  const all = settled.flatMap(r => r.status === 'fulfilled' ? r.value : []);

  // Deduplicate by provider_id
  const seen = new Map();
  for (const e of all) {
    const key = `bms:${e.provider_id}`;
    if (!seen.has(key)) seen.set(key, e);
  }

  return [...seen.values()]
    .filter(e => e.start_at)                         // drop events with no date
    .filter(e => new Date(e.start_at) > new Date())  // future only
    .sort((a, b) => a.start_at.localeCompare(b.start_at))
    .slice(0, limit);
}

// ── District / Insider.in ─────────────────────────────────────────────────────
//
// District (formerly Insider.in) has a clean public events API
// that their website uses.  No login, no API key needed.

function normalizeDistrictEvent(item) {
  const venue    = item.venues?.[0] || {};
  const city     = venue.city || item.city || '';
  const bookingUrl = item.slug
    ? `https://district.in/events/${item.slug}`
    : `https://district.in/events`;
  const imageUrl =
    item.horizontal_cover_image ||
    item.cover_image ||
    (item.event_images?.[0]?.url) ||
    '';

  const start = item.min_show_start_time
    ? new Date(Number(item.min_show_start_time) * 1000).toISOString()
    : null;
  const end   = item.max_show_end_time
    ? new Date(Number(item.max_show_end_time)   * 1000).toISOString()
    : null;

  const minPrice = item.min_price != null ? Number(item.min_price) / 100 : null; // paise → ₹
  const maxPrice = item.max_price != null ? Number(item.max_price) / 100 : null;

  return {
    provider:          'district',
    provider_id:       String(item._id || item.id || Math.random()),
    title:             String(item.name || item.title || 'Untitled').trim(),
    description:       String(item.description || item.subtitle || '').replace(/<[^>]+>/g, '').slice(0, 500),
    category:          String(item.category?.name || item.type || 'Event').trim(),
    start_at:          start,
    end_at:            end,
    timezone:          'Asia/Kolkata',
    venue_name:        String(venue.name || '').trim(),
    city:              city,
    state:             String(venue.state || '').trim(),
    country:           'India',
    latitude:          venue.lat  ? Number(venue.lat)  : null,
    longitude:         venue.lng  ? Number(venue.lng)  : null,
    image_url:         imageUrl,
    organizer_name:    String(item.group?.name || item.organizer || '').trim(),
    official_url:      bookingUrl,
    ticket_url:        bookingUrl,
    price_min:         minPrice,
    price_max:         maxPrice,
    currency:          'INR',
    source_updated_at: new Date().toISOString(),
  };
}

async function fetchDistrictCity(citySlug) {
  // Insider/District public API used by their website
  const url =
    `https://api.insider.in/v2/events?` +
    `status=published` +
    `&city=${encodeURIComponent(citySlug)}` +
    `&type=events` +
    `&tags=&page_size=20&page=1` +
    `&sort=event_date`;

  try {
    const res = await safeFetch(url, {
      headers: {
        Referer: 'https://district.in/',
        Origin:  'https://district.in',
      },
    });
    if (!res.ok) {
      console.warn(`District ${citySlug}: HTTP ${res.status}`);
      return [];
    }
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { return []; }

    const items =
      json?.data?.results ||
      json?.results        ||
      json?.events         ||
      [];

    if (!Array.isArray(items)) return [];
    return items.map(normalizeDistrictEvent);
  } catch (err) {
    console.warn(`District ${citySlug} fetch failed:`, err.message);
    return [];
  }
}

/**
 * Fetch District / Insider.in events across multiple cities.
 * @param {string[]} cities  city slugs, e.g. ['mumbai','bangalore']
 * @param {number}   limit   max events to return total
 */
async function district(cities = DISTRICT_CITIES, limit = 50) {
  const jobs = cities.slice(0, 6).map(c => fetchDistrictCity(c));
  const settled = await Promise.allSettled(jobs);
  const all = settled.flatMap(r => r.status === 'fulfilled' ? r.value : []);

  const seen = new Map();
  for (const e of all) {
    const key = `district:${e.provider_id}`;
    if (!seen.has(key)) seen.set(key, e);
  }

  return [...seen.values()]
    .filter(e => e.start_at)
    .filter(e => new Date(e.start_at) > new Date())
    .sort((a, b) => a.start_at.localeCompare(b.start_at))
    .slice(0, limit);
}

// ── Combined India fetch ──────────────────────────────────────────────────────

/**
 * Fetch events from all India sources (BMS + District).
 * Deduplicates by title + city + date to avoid near-duplicates across providers.
 *
 * @param {object} opts
 * @param {string} [opts.city]    filter to one city (lowercase)
 * @param {number} [opts.limit]   max events (default 50)
 */
async function indiaEvents({ city, limit = 50 } = {}) {
  const bmsCities      = city ? [city] : Object.keys(BMS_REGIONS);
  const districtCities = city ? [city] : DISTRICT_CITIES;

  const [bmsResults, districtResults] = await Promise.allSettled([
    bookmyshow(bmsCities, limit),
    district(districtCities, limit),
  ]);

  const all = [
    ...(bmsResults.status      === 'fulfilled' ? bmsResults.value      : []),
    ...(districtResults.status === 'fulfilled' ? districtResults.value : []),
  ];

  // Deduplicate: same provider_id wins; near-duplicates (same title+city+day) defer to BMS
  const byId     = new Map();
  const dedupe   = new Map();

  for (const e of all) {
    const idKey = `${e.provider}:${e.provider_id}`;
    if (byId.has(idKey)) continue;
    byId.set(idKey, e);

    // Near-duplicate check across providers
    const day   = e.start_at ? e.start_at.slice(0, 10) : '';
    const fuzzy = `${e.title.toLowerCase().replace(/[^a-z0-9]/g, '')}|${e.city.toLowerCase()}|${day}`;
    if (!dedupe.has(fuzzy)) dedupe.set(fuzzy, e);
  }

  return [...dedupe.values()]
    .filter(e => new Date(e.start_at) > new Date())
    .sort((a, b) => a.start_at.localeCompare(b.start_at))
    .slice(0, limit);
}

module.exports = { indiaEvents, bookmyshow, district, BMS_REGIONS, DISTRICT_CITIES };
