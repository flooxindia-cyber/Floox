# Floox v2 — New Features Setup Guide

## What's New
1. **❤️ Likes (Permanent)** — logged-in users can like/follow artist & organiser profiles. Stored in Supabase `likes` table, not localStorage.
2. **📩 Contact + Message Form** — profile modal now shows phone/email PLUS an in-platform message form (subject, body, event date, budget).
3. **🔄 Auto-Refresh (Realtime)** — homepage, public page, and search results automatically refresh when a new artist or organiser registers.

---

## Step 1 — Run the new SQL in Supabase

Go to: **Supabase Dashboard → SQL Editor → New Query**

Paste and run the contents of `supabase-schema.sql` (the bottom section adds `likes` and `messages` tables + enables Realtime).

If you already ran the original schema, just run this part:

```sql
-- likes table
create table if not exists public.likes (
  id           uuid primary key default gen_random_uuid(),
  liker_id     uuid not null references public.users(id) on delete cascade,
  liked_id     uuid not null references public.users(id) on delete cascade,
  created_at   timestamptz default now(),
  unique(liker_id, liked_id)
);
alter table public.likes enable row level security;
create policy "Likes readable by service" on public.likes for select using (true);
create index if not exists likes_liker_idx on public.likes (liker_id);
create index if not exists likes_liked_idx on public.likes (liked_id);

-- messages table
create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references public.users(id) on delete cascade,
  receiver_id  uuid not null references public.users(id) on delete cascade,
  subject      text not null default '',
  body         text not null,
  event_date   text default '',
  event_type   text default '',
  budget       text default '',
  read         boolean default false,
  created_at   timestamptz default now()
);
alter table public.messages enable row level security;
create index if not exists messages_sender_idx   on public.messages (sender_id);
create index if not exists messages_receiver_idx on public.messages (receiver_id);

-- Enable Realtime
alter publication supabase_realtime add table public.users;
```

---

## Step 2 — Get your Supabase Anon Key

Go to: **Supabase Dashboard → Settings → API**

You need TWO values:
- **Project URL** — e.g. `https://xyzxyzxyz.supabase.co`
- **anon / public key** — the long `eyJ...` string (this is SAFE to put in frontend)

⚠️ Do NOT use the `service_role` key in the frontend. Only use `anon`.

---

## Step 3 — Replace placeholder values in 3 HTML files

Open each file and replace `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_ANON_KEY`:

### `floox-search-results.html`
```html
<script>
  const FLOOX_SUPABASE_URL  = 'https://xyzxyzxyz.supabase.co';  // ← your URL
  const FLOOX_SUPABASE_ANON = 'eyJhbGci...';                     // ← your anon key
</script>
```

### `floox-platform.html`
Same block — same values.

### `floox-public.html`
Same block — same values.

---

## Step 4 — Enable Realtime in Supabase Dashboard

Go to: **Supabase Dashboard → Database → Replication**

Find the `users` table and toggle **Realtime ON**.

(The SQL above also does this, but the toggle is the easiest way to verify.)

---

## New Netlify Functions Deployed

| Function | Method | What it does |
|---|---|---|
| `/.netlify/functions/toggle-like` | POST | Like/unlike a profile (auth required) |
| `/.netlify/functions/get-likes` | GET | Get all liked IDs for logged-in user |
| `/.netlify/functions/send-message` | POST | Send in-platform message (auth required) |

All existing functions are **unchanged**.

---

## How the Features Work

### ❤️ Like Button
- Card hearts on search results page → click to like/unlike
- Syncs with Supabase `likes` table immediately
- Page load fetches all your liked IDs from DB so hearts show filled correctly
- Works on both artist cards AND inside the profile modal (Follow button)
- Shows toast notification on like/unlike

### 📩 Contact + Message Form
- Profile modal shows **phone number** and **email** (for logged-in users)
- Below contact details: a message form with Subject, Event Date, Budget, and Message body
- On send: stored in `messages` table, shows success confirmation
- Guest users see a "Sign in to view contact details" nudge

### 🔄 Auto-Refresh
- Uses Supabase WebSocket Realtime (no polling, no extra cost)
- When a new artist/organiser registers OR completes their profile → all open pages refresh their artist listings automatically
- Search results page also shows a toast: "🎉 New profile just joined Floox!"
- Falls back gracefully if Supabase config not set (static data shown instead)

---

## File Changes Summary

### New files
- `netlify/functions/toggle-like.js`
- `netlify/functions/get-likes.js`
- `netlify/functions/send-message.js`

### Modified files
- `netlify/functions/_utils.js` — added `toggleLike`, `getLikesByUser`, `getLikeCount`, `createMessage` helpers
- `floox-search-results.html` — DB likes, realtime, contact+message modal
- `floox-platform.html` — dynamic artist grid, realtime refresh
- `floox-public.html` — dynamic artist scroll, realtime refresh
- `supabase-schema.sql` — added `likes` + `messages` tables + realtime publication
