-- ============================================================
--  Floox — Supabase Schema
--  Run this once in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── users table ──────────────────────────────────────────────
create table if not exists public.users (
  id                uuid primary key default gen_random_uuid(),
  role              text not null check (role in ('fan', 'artist', 'organiser')),
  email             text not null unique,
  name              text not null,
  phone             text default '',
  city              text default '',
  password_hash     text not null,
  bio               text default '',
  avatar            text default '',
  cover_image       text default '',
  genres            text[]  default '{}',
  social_links      jsonb   default '{}',
  -- artist fields
  stage_name        text    default '',
  performer_type    text    default '',
  languages         text[]  default '{}',
  performance_types text[]  default '{}',
  event_types       text[]  default '{}',
  min_fee           numeric default null,
  max_fee           numeric default null,
  currency          text    default 'INR',
  media_links       jsonb   default '[]',
  portfolio         jsonb   default '[]',
  rider_notes       text    default '',
  equipment         text    default '',
  -- organiser fields
  org_name          text    default '',
  org_type          text    default '',
  website           text    default '',
  gst_number        text    default '',
  venue_types       text[]  default '{}',
  events_per_year   text    default '',
  budget_range      text    default '',
  preferred_genres  text[]  default '{}',
  -- meta
  verified          boolean default false,
  profile_complete  boolean default false,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ── Row Level Security ────────────────────────────────────────
-- We use the service_role key in our Netlify functions, which
-- bypasses RLS entirely — so we can keep RLS on for safety
-- and the functions still work fine.

alter table public.users enable row level security;

-- Public read for artist profiles (no password hash exposed in app)
create policy "Public artists are readable"
  on public.users for select
  using (role = 'artist' and profile_complete = true);

-- Organisers are NOT publicly readable — they require auth (via get-profile function)
-- The service_role key used in Netlify functions bypasses RLS entirely,
-- so the get-profile.js and organisers.js functions work correctly.
-- The auth check is enforced at the application layer (JWT verification in the function).

-- Users can read/update their own row (via service key in functions — always allowed)
-- These policies only matter if you ever use the anon/user JWT from Supabase Auth
create policy "Users can read own row"
  on public.users for select
  using (auth.uid()::text = id::text);

create policy "Users can update own row"
  on public.users for update
  using (auth.uid()::text = id::text);

-- ── Index for fast lookups ────────────────────────────────────
create index if not exists users_email_idx  on public.users (email);
create index if not exists users_role_idx   on public.users (role);
create index if not exists users_city_idx   on public.users (city);

-- ── Trigger: keep updated_at current ─────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_updated_at on public.users;
create trigger users_updated_at
  before update on public.users
  for each row execute function update_updated_at();

-- ============================================================
--  NEW TABLES — Run this in Supabase Dashboard → SQL Editor
--  (after the original schema above is already applied)
-- ============================================================

-- ── likes table ──────────────────────────────────────────────
-- Stores permanent likes (hearts) per user → profile
create table if not exists public.likes (
  id           uuid primary key default gen_random_uuid(),
  liker_id     uuid not null references public.users(id) on delete cascade,
  liked_id     uuid not null references public.users(id) on delete cascade,
  created_at   timestamptz default now(),
  unique(liker_id, liked_id)          -- one like per pair
);

alter table public.likes enable row level security;

-- Service role (used by Netlify functions) bypasses RLS
create policy "Likes readable by service"
  on public.likes for select using (true);

create index if not exists likes_liker_idx on public.likes (liker_id);
create index if not exists likes_liked_idx on public.likes (liked_id);

-- ── messages table ────────────────────────────────────────────
-- In-platform enquiry / booking messages from one user to another
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

-- ── contact_reveals table ────────────────────────────────────────────────
-- Tracks who revealed which profile's contact, and when (for daily limit enforcement)
-- Daily limit: 5 reveals per day per user (configurable in reveal-contact.js)
create table if not exists public.contact_reveals (
  id           uuid primary key default gen_random_uuid(),
  revealer_id  uuid not null references public.users(id) on delete cascade,
  revealed_id  uuid not null references public.users(id) on delete cascade,
  otp_code     text,                      -- 6-digit OTP sent to revealer's email
  otp_verified boolean default false,     -- true once OTP confirmed
  revealed_at  timestamptz default now()
);

alter table public.contact_reveals enable row level security;
create policy "Reveals readable by service"
  on public.contact_reveals for select using (true);

create index if not exists reveals_revealer_idx on public.contact_reveals (revealer_id);
create index if not exists reveals_revealed_idx on public.contact_reveals (revealed_id);

-- ── Enable Realtime for the users table ───────────────────────────────────
-- Run this in Supabase Dashboard → Database → Replication → Tables
-- OR run these SQL commands:
alter publication supabase_realtime add table public.users;
-- This allows INSERT and UPDATE events to be broadcast to connected clients.
-- Required for the auto-refresh feature on homepage and search pages.
