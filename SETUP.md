# Floox — Setup Guide

Stack: **Vercel** (hosting + serverless functions) · **Supabase** (PostgreSQL) · **Cloudinary** (media) · **Resend** (email OTP)

---

## 1. Supabase Setup

### 1a. Create a project
1. Go to [supabase.com](https://supabase.com) → **New project**
2. Name it `floox`, choose the region closest to India (Singapore `ap-southeast-1` recommended)
3. Set a strong database password → **Create project** (takes ~1 min)

### 1b. Run the database schema
1. In your Supabase project → **SQL Editor** → **New query**
2. Paste the contents of `supabase-schema.sql` → **Run**

This creates:
- `users` table (auth, profiles for artists/organisers/fans)
- `events` table (organiser-posted events)
- `global_events` table (BMS, District, Ticketmaster cache)
- `messages`, `likes`, `profile_views`, `otps` tables
- All indexes and RLS policies

### 1c. Get your credentials
**Supabase Dashboard → Project Settings → API:**

| Variable | Where to find |
|---|---|
| `SUPABASE_URL` | "Project URL" — e.g. `https://abcxyz.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Under "Project API keys" → `service_role` → reveal |

> ⚠️ Use `service_role` key, NOT the `anon` key. Never expose it in frontend code.

### 1d. Storage bucket for media (optional — if not using Cloudinary)
If you want to use Supabase Storage instead of Cloudinary:
1. **Storage** → **New bucket** → name it `floox-media` → set to **Public**
2. No extra env var needed — the upload function uses `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`

---

## 2. Cloudinary Setup (Media Uploads)

Cloudinary handles artist profile photos, cover images, and event posters.

1. Sign up at [cloudinary.com](https://cloudinary.com) (free tier: 25GB storage, 25GB bandwidth/month)
2. Go to **Dashboard** → note your **Cloud name** (already set to `cqes6im5` in the frontend — use your own)
3. Go to **Settings → Upload → Upload presets** → **Add upload preset**:
   - Preset name: `floox_artist_media`
   - Signing mode: **Unsigned** (lets frontend upload directly)
   - Folder: `floox/`
   - Save
4. Go to **Settings → API Keys** → copy API Key and API Secret

> 📌 If you have a different cloud name than `cqes6im5`, update the hardcoded references in:
> - `artist-dashboard-polish.js` (2 places)
> - `organiser-dashboard-polish.js` (2 places)
> - `upload-media.js` (root level)

---

## 3. Resend Setup (Email OTP)

1. Sign up at [resend.com](https://resend.com)
2. **API Keys** → **Create API Key** → copy it
3. **Domains** → add and verify your sending domain (or use `onboarding@resend.dev` for testing)

---

## 4. Vercel Setup

### 4a. Connect repo
1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import `flooxindia-cyber/Floox` from GitHub
2. Framework preset: **Other** (it's a plain HTML/JS site with serverless functions in `/api`)
3. Root directory: leave as `/`

### 4b. Set Environment Variables
**Vercel Dashboard → Your Project → Settings → Environment Variables**

Add each variable below. Set scope to **Production**, **Preview**, and **Development**.

#### Required (app won't work without these)

| Variable | Value | Where to get it |
|---|---|---|
| `SUPABASE_URL` | `https://YOUR_ID.supabase.co` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_KEY` | `eyJ...` (long JWT) | Supabase → Project Settings → API → service_role |
| `JWT_SECRET` | Any long random string | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `RESEND_API_KEY` | `re_...` | resend.com → API Keys |

#### Required for media uploads (Cloudinary)

| Variable | Value | Where to get it |
|---|---|---|
| `CLOUDINARY_CLOUD_NAME` | `cqes6im5` (or your cloud name) | Cloudinary Dashboard |
| `CLOUDINARY_API_KEY` | numeric key | Cloudinary → Settings → API Keys |
| `CLOUDINARY_API_SECRET` | secret string | Cloudinary → Settings → API Keys |

#### Required for events discovery (BMS + District need NO key)

| Variable | Value | Where to get it |
|---|---|---|
| `CRON_SECRET` | Any random string | Generate locally |
| `SCRAPER_API_KEY` | your key | [scraperapi.com](https://scraperapi.com) → free tier (1000 req/month) |
| `TICKETMASTER_API_KEY` | optional | [developer.ticketmaster.com](https://developer.ticketmaster.com) |
| `EVENTBRITE_API_TOKEN` | optional | [eventbrite.com/platform](https://www.eventbrite.com/platform) |
| `BANDSINTOWN_APP_ID` | optional | [bandsintown.com](https://bandsintown.com) |
| `BANDSINTOWN_ARTISTS` | `Arijit Singh,Nucleya` | Comma-separated artist names |

> **BookMyShow and District** block requests from Vercel server IPs (HTTP 403). `SCRAPER_API_KEY` routes those requests through ScraperAPI's residential proxy pool, bypassing the block. Without it, BMS/District events will be empty.

### 4c. Verify cron job
In `vercel.json` the daily sync is already configured:
```json
"crons": [{ "path": "/api/global-events-sync", "schedule": "0 6 * * *" }]
```
This runs at 6 AM UTC (11:30 AM IST) daily. To trigger manually:
```
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://www.floox.in/api/global-events-sync
```

---

## 5. Local Development

```bash
# Install dependencies
npm install

# Copy env file and fill in your values
cp .env.example .env
# Edit .env with your actual keys

# Install Vercel CLI
npm i -g vercel

# Run locally (serves functions at localhost:3000/api/*)
vercel dev
```

---

## 6. Quick Checklist Before Going Live

- [ ] Supabase schema run (`supabase-schema.sql`)
- [ ] `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` set in Vercel
- [ ] `JWT_SECRET` set (strong, random)
- [ ] `RESEND_API_KEY` set + sending domain verified
- [ ] `CLOUDINARY_CLOUD_NAME` + `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET` set
- [ ] `CRON_SECRET` set
- [ ] Cloudinary upload preset `floox_artist_media` created (unsigned)
- [ ] Test `/api/global-events?countryCode=IN&limit=5` returns events
- [ ] Test artist registration + OTP email flow

---

## 7. Architecture Overview

```
floox.in (Vercel)
├── Static HTML/CSS/JS  (floox-*.html, *.css, *.js)
├── /api/*              (Vercel Serverless Functions)
│   ├── auth-js         ← login, register, JWT
│   ├── events          ← Floox organiser events (Supabase)
│   ├── global-events   ← BMS + District + Ticketmaster (Supabase cache + live scrape)
│   ├── global-events-sync ← Daily cron sync
│   ├── upload-media    ← Cloudinary signed upload
│   └── ...
│
Supabase (PostgreSQL)
├── users               ← all user accounts
├── events              ← organiser-posted events
├── global_events       ← BMS/District/TM cached events
├── messages, likes, otps, profile_views
│
Cloudinary
└── floox/              ← artist & organiser media
```
