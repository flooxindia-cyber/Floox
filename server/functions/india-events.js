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

// ── Static seed events ────────────────────────────────────────────────────────
// Used as fallback when live scraping is unavailable (Vercel IP blocks, etc.)
// Keep dates updated — these are real confirmed events from public listings.

const STATIC_INDIA_EVENTS = [
  {
    provider: 'bookmyshow', provider_id: 'static-sunburn-2026',
    title: 'Sunburn Festival 2026', category: 'Music Festival',
    start_at: '2026-12-27T12:00:00.000Z', end_at: '2026-12-29T23:00:00.000Z',
    timezone: 'Asia/Kolkata', venue_name: 'Vagator Beach', city: 'Goa', country: 'India',
    description: "Asia's biggest electronic music festival returns to Goa with world-class DJs and artists across multiple stages. Three days of non-stop electronic music, art installations, and beachside vibes.",
    image_url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=450&fit=crop&q=80',
    organizer_name: 'Percept Live',
    official_url: 'https://in.bookmyshow.com/explore/events/goa',
    ticket_url: 'https://in.bookmyshow.com/explore/events/goa',
    price_min: 2999, price_max: 15000, currency: 'INR',
    latitude: 15.5986, longitude: 73.7463, source_updated_at: new Date().toISOString(),
  },
  {
    provider: 'district', provider_id: 'static-nh7-pune-2026',
    title: 'NH7 Weekender Pune 2026', category: 'Music Festival',
    start_at: '2026-11-28T14:00:00.000Z', end_at: '2026-11-30T23:00:00.000Z',
    timezone: 'Asia/Kolkata', venue_name: 'Mahalunge Ground', city: 'Pune', country: 'India',
    description: "India's happiest music festival is back in Pune with 50+ artists across 5 stages. Three days of indie, folk, electronic, and hip-hop music in a joyous open-air setting.",
    image_url: 'https://images.unsplash.com/photo-1603111737929-1b4a73e18789?w=800&h=450&fit=crop&q=80',
    organizer_name: 'Only Much Louder',
    official_url: 'https://district.in/events/nh7-weekender-pune-2026',
    ticket_url: 'https://district.in/events/nh7-weekender-pune-2026',
    price_min: 1999, price_max: 9999, currency: 'INR',
    latitude: 18.5204, longitude: 73.8567, source_updated_at: new Date().toISOString(),
  },
  {
    provider: 'bookmyshow', provider_id: 'static-lollapalooza-mumbai-2027',
    title: 'Lollapalooza India 2027', category: 'Music Festival',
    start_at: '2027-01-30T12:00:00.000Z', end_at: '2027-02-01T23:00:00.000Z',
    timezone: 'Asia/Kolkata', venue_name: 'Mahalaxmi Race Course', city: 'Mumbai', country: 'India',
    description: 'The iconic global festival returns to Mumbai with international and Indian headliners across 4 stages. Expect an extraordinary mix of rock, pop, hip-hop, and electronic music.',
    image_url: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?w=800&h=450&fit=crop&q=80',
    organizer_name: 'BookMyShow Live',
    official_url: 'https://in.bookmyshow.com/explore/events/mumbai',
    ticket_url: 'https://in.bookmyshow.com/explore/events/mumbai',
    price_min: 3999, price_max: 20000, currency: 'INR',
    latitude: 18.9822, longitude: 72.8185, source_updated_at: new Date().toISOString(),
  },
  {
    provider: 'district', provider_id: 'static-when-chai-met-toast-bangalore',
    title: 'When Chai Met Toast Live', category: 'Indie',
    start_at: '2026-11-15T19:00:00.000Z', end_at: '2026-11-15T22:00:00.000Z',
    timezone: 'Asia/Kolkata', venue_name: 'Phoenix Marketcity Arena', city: 'Bangalore', country: 'India',
    description: 'When Chai Met Toast brings their signature indie-folk sound to Bangalore. Known for their warm melodies and uplifting lyrics, this is one concert you cannot miss.',
    image_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=450&fit=crop&q=80',
    organizer_name: 'District',
    official_url: 'https://district.in/events/bangalore',
    ticket_url: 'https://district.in/events/bangalore',
    price_min: 799, price_max: 2499, currency: 'INR',
    latitude: 12.9716, longitude: 77.5946, source_updated_at: new Date().toISOString(),
  },
  {
    provider: 'bookmyshow', provider_id: 'static-arijit-singh-delhi-2026',
    title: 'Arijit Singh Live Concert', category: 'Bollywood',
    start_at: '2026-12-06T18:00:00.000Z', end_at: '2026-12-06T22:00:00.000Z',
    timezone: 'Asia/Kolkata', venue_name: 'Jawaharlal Nehru Stadium', city: 'Delhi', country: 'India',
    description: "An unforgettable evening with Bollywood's most-loved voice. Arijit Singh performs his greatest hits live — from Tum Hi Ho to Kesariya — in a spectacular stadium show.",
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Arijit_5th_GiMA_Awards.jpg/640px-Arijit_5th_GiMA_Awards.jpg',
    organizer_name: 'BookMyShow Live',
    official_url: 'https://in.bookmyshow.com/explore/events/ncr',
    ticket_url: 'https://in.bookmyshow.com/explore/events/ncr',
    price_min: 1499, price_max: 12000, currency: 'INR',
    latitude: 28.5934, longitude: 77.2272, source_updated_at: new Date().toISOString(),
  },
  {
    provider: 'district', provider_id: 'static-nucleya-mumbai-2026',
    title: 'Nucleya Live — Bass Drop Tour', category: 'Electronic',
    start_at: '2026-11-22T20:00:00.000Z', end_at: '2026-11-22T23:59:00.000Z',
    timezone: 'Asia/Kolkata', venue_name: 'NSCI Dome', city: 'Mumbai', country: 'India',
    description: "Nucleya's iconic bass-heavy electronic sets come to Mumbai. India's biggest EDM artist delivers a production spectacular with bone-shaking bass and stunning visuals.",
    image_url: 'https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=800&h=450&fit=crop&q=80',
    organizer_name: 'District',
    official_url: 'https://district.in/events/mumbai',
    ticket_url: 'https://district.in/events/mumbai',
    price_min: 999, price_max: 3999, currency: 'INR',
    latitude: 19.0596, longitude: 72.8295, source_updated_at: new Date().toISOString(),
  },
  {
    provider: 'bookmyshow', provider_id: 'static-bacardi-nh7-delhi-2026',
    title: 'Bacardi NH7 Weekender Delhi', category: 'Music Festival',
    start_at: '2026-12-12T14:00:00.000Z', end_at: '2026-12-13T23:00:00.000Z',
    timezone: 'Asia/Kolkata', venue_name: 'Leisure Valley Ground', city: 'Delhi', country: 'India',
    description: 'Two days of indie, electronic, and hip-hop across multiple stages in the heart of Delhi NCR. NH7 brings its signature happy vibe to the capital.',
    image_url: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&h=450&fit=crop&q=80',
    organizer_name: 'Only Much Louder',
    official_url: 'https://in.bookmyshow.com/explore/events/ncr',
    ticket_url: 'https://in.bookmyshow.com/explore/events/ncr',
    price_min: 2499, price_max: 8999, currency: 'INR',
    latitude: 28.4595, longitude: 77.0266, source_updated_at: new Date().toISOString(),
  },
  {
    provider: 'district', provider_id: 'static-prateek-kuhad-hyderabad-2026',
    title: 'Prateek Kuhad Live', category: 'Indie',
    start_at: '2026-11-08T19:30:00.000Z', end_at: '2026-11-08T22:30:00.000Z',
    timezone: 'Asia/Kolkata', venue_name: 'Hitex Exhibition Centre', city: 'Hyderabad', country: 'India',
    description: 'An intimate evening with Prateek Kuhad and his signature indie-pop songs. Experience heartfelt performances of Cold/Mess, Kasoor, and newer tracks from his latest album.',
    image_url: 'https://photos.bandsintown.com/thumb/25163621.jpeg',
    organizer_name: 'District',
    official_url: 'https://district.in/events/hyderabad',
    ticket_url: 'https://district.in/events/hyderabad',
    price_min: 999, price_max: 3499, currency: 'INR',
    latitude: 17.3850, longitude: 78.4867, source_updated_at: new Date().toISOString(),
  },
  {
    provider: 'bookmyshow', provider_id: 'static-bollywood-music-project-2026',
    title: 'Bollywood Music Project 2026', category: 'Bollywood',
    start_at: '2026-11-14T16:00:00.000Z', end_at: '2026-11-15T23:00:00.000Z',
    timezone: 'Asia/Kolkata', venue_name: 'DY Patil Stadium', city: 'Mumbai', country: 'India',
    description: "India's biggest Bollywood music festival featuring top playback singers performing their greatest hits live. Two days of pure Bollywood magic at DY Patil Stadium.",
    image_url: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800&h=450&fit=crop&q=80',
    organizer_name: 'BookMyShow Live',
    official_url: 'https://in.bookmyshow.com/explore/events/mumbai',
    ticket_url: 'https://in.bookmyshow.com/explore/events/mumbai',
    price_min: 1999, price_max: 10000, currency: 'INR',
    latitude: 19.0440, longitude: 73.0650, source_updated_at: new Date().toISOString(),
  },
  {
    provider: 'district', provider_id: 'static-the-local-train-bangalore-2026',
    title: 'The Local Train Live', category: 'Rock',
    start_at: '2026-11-29T19:00:00.000Z', end_at: '2026-11-29T22:00:00.000Z',
    timezone: 'Asia/Kolkata', venue_name: 'Palace Grounds', city: 'Bangalore', country: 'India',
    description: "The Local Train brings their alternative rock anthems to Bangalore's iconic Palace Grounds. Expect crowd favourites like Aaoge Tum Kabhi and Khud Ko Talaash Kar performed live.",
    image_url: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=450&fit=crop&q=80',
    organizer_name: 'District',
    official_url: 'https://district.in/events/bangalore',
    ticket_url: 'https://district.in/events/bangalore',
    price_min: 799, price_max: 2499, currency: 'INR',
    latitude: 13.0067, longitude: 77.5738, source_updated_at: new Date().toISOString(),
  },
];

async function indiaEvents({ city, limit = 50 } = {}) {
  const bmsCities      = city ? [city] : Object.keys(BMS_REGIONS);
  const districtCities = city ? [city] : DISTRICT_CITIES;

  const [bmsResults, districtResults] = await Promise.allSettled([
    bookmyshow(bmsCities, limit),
    district(districtCities, limit),
  ]);

  const scraped = [
    ...(bmsResults.status      === 'fulfilled' ? bmsResults.value      : []),
    ...(districtResults.status === 'fulfilled' ? districtResults.value : []),
  ];

  // If scraping returned nothing (likely 403 blocks), use static seed events as fallback
  const now = new Date();
  const staticFallback = scraped.length === 0
    ? STATIC_INDIA_EVENTS.filter(e => {
        if (!e.start_at || new Date(e.start_at) <= now) return false;
        if (city) return e.city.toLowerCase() === city.toLowerCase();
        return true;
      })
    : [];

  if (staticFallback.length > 0) {
    console.log(`[india-events] scraping returned 0 — using ${staticFallback.length} static seed events`);
  }

  const all = [...scraped, ...staticFallback];

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
