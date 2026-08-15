# Floox — Supabase Setup Guide

This version uses **Supabase** as the database instead of Netlify Blobs.
The rest of the stack stays the same: Netlify Functions + JWT auth.

---

## Step 1 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in / sign up (free tier is plenty).
2. Click **New project** → give it a name (e.g. `floox`) → choose a region close to your users → set a database password → **Create project**.
3. Wait ~1 minute for provisioning.

---

## Step 2 — Run the database schema

1. In your Supabase project, go to **SQL Editor** (left sidebar).
2. Click **New query**.
3. Open the file `supabase-schema.sql` from this folder and **paste the entire contents** into the editor.
4. Click **Run** (or press Ctrl+Enter).

This creates the `users` table with all required columns, indexes, RLS policies, and an auto-`updated_at` trigger.

---

## Step 3 — Get your Supabase credentials

In your Supabase project go to **Project Settings → API**:

| What you need | Where to find it |
|---|---|
| **Project URL** | "Project URL" box — looks like `https://xyzxyz.supabase.co` |
| **service_role secret** | Under "Project API keys" → `service_role` → click the eye icon to reveal |

> ⚠️ Use the **service_role** key, NOT the `anon` key. The service role bypasses Row Level Security and lets your functions read/write all rows. Keep it secret — it never goes in the browser.

---

## Step 4 — Set environment variables in Netlify

Go to: **Netlify Dashboard → Your site → Site configuration → Environment variables → Add variable**

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Your project URL, e.g. `https://xyzxyz.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Your `service_role` secret key |
| `JWT_SECRET` | Any long random string, e.g. `floox_super_secret_2024_xyz` |
| `CLOUDINARY_CLOUD_NAME` | From Cloudinary dashboard (only if using media upload) |
| `CLOUDINARY_API_KEY` | From Cloudinary (optional) |
| `CLOUDINARY_API_SECRET` | From Cloudinary (optional) |

---

## Step 5 — Deploy

Push all files to GitHub — Netlify auto-deploys. Or click **Trigger deploy** in the Netlify dashboard.

---

## File structure

```
/
├── index.html
├── floox-auth.js
├── floox-shared.css
├── floox-login.html
├── floox-artist-register.html
├── floox-organiser-register.html
├── floox-platform.html
├── floox-public.html
├── floox-contact.html
├── floox-dashboard-artist.html
├── floox-dashboard-organiser.html
├── netlify.toml
├── package.json                  ← only bcryptjs + jsonwebtoken now
├── supabase-schema.sql           ← run once in Supabase SQL editor
└── netlify/
    └── functions/
        ├── _utils.js             ← Supabase REST calls (no extra SDK)
        ├── register.js
        ├── login.js
        ├── me.js
        ├── artist-profile.js
        ├── organiser-profile.js
        ├── upload-media.js       ← unchanged (Cloudinary)
        ├── change-password.js
        └── artists.js
```

---

## How it works

The functions call the **Supabase REST API** directly using `fetch` — no SDK install needed. The `_utils.js` file handles all DB operations:

| Helper | What it does |
|---|---|
| `findUser(field, op, value)` | SELECT one user by any column |
| `createUser(obj)` | INSERT a new user, returns the row |
| `updateUser(id, fields)` | PATCH user by id, returns updated row |
| `queryArtists(filters)` | SELECT artists with genre/city/search filters |
| `countArtists(filters)` | HEAD request to get total count (for pagination) |

All functions use the `service_role` key, so they bypass RLS and have full read/write access.

---

## Testing locally

```bash
npm install
npm install -g netlify-cli
netlify dev
```

Create a `.env` file in the project root:
```
SUPABASE_URL=https://xyzxyz.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
JWT_SECRET=your_jwt_secret_here
```

Then open `http://localhost:8888` — functions run at `/.netlify/functions/`.

---

## Viewing your data

In Supabase, go to **Table Editor → users** to see all registered users. You can filter, sort, and edit rows directly in the dashboard.

To see only artists: use the filter `role = artist`.

> Note: the `password_hash` column is visible in the dashboard but is never returned to the browser by any function.
