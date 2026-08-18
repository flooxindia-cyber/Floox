-- Floox marketplace foundation (non-monetized)
-- Run after supabase-schema.sql in Supabase SQL Editor.
-- No payments, subscriptions, commissions or premium placement are included.

create extension if not exists "pgcrypto";

create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  status text not null default 'available' check (status in ('available','tentative','booked','unavailable')),
  note text default '',
  updated_at timestamptz default now(),
  unique(user_id,date)
);
create index if not exists availability_user_date_idx on public.availability(user_id,date);
alter table public.availability enable row level security;

create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.users(id) on delete cascade,
  provider_id uuid not null references public.users(id) on delete cascade,
  event_id uuid,
  event_name text default '',
  event_date date,
  city text default '',
  venue text default '',
  event_type text default '',
  guest_count integer,
  duration_hours numeric,
  budget numeric,
  requirements text default '',
  status text not null default 'pending' check (status in ('pending','responded','negotiating','accepted','declined','cancelled','completed')),
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists quote_requests_requester_idx on public.quote_requests(requester_id,created_at desc);
create index if not exists quote_requests_provider_idx on public.quote_requests(provider_id,created_at desc);
alter table public.quote_requests enable row level security;

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.quote_requests(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  performance_fee numeric default 0,
  travel_fee numeric default 0,
  accommodation_fee numeric default 0,
  equipment_fee numeric default 0,
  other_fee numeric default 0,
  total numeric default 0,
  currency text default 'INR',
  notes text default '',
  cancellation_terms text default '',
  valid_until timestamptz,
  status text not null default 'sent' check (status in ('sent','countered','accepted','declined','expired')),
  created_at timestamptz default now()
);
create index if not exists quotes_request_idx on public.quotes(request_id,created_at desc);
alter table public.quotes enable row level security;

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references public.users(id) on delete cascade,
  reviewed_id uuid not null references public.users(id) on delete cascade,
  booking_id uuid,
  rating numeric not null check (rating >= 1 and rating <= 5),
  quality numeric check (quality between 1 and 5),
  communication numeric check (communication between 1 and 5),
  professionalism numeric check (professionalism between 1 and 5),
  value numeric check (value between 1 and 5),
  punctuality numeric check (punctuality between 1 and 5),
  body text default '',
  verified_booking boolean default false,
  created_at timestamptz default now()
);
create index if not exists reviews_reviewed_idx on public.reviews(reviewed_id,created_at desc);
alter table public.reviews enable row level security;

create table if not exists public.profile_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  profile_id uuid not null references public.users(id) on delete cascade,
  note text not null default '',
  updated_at timestamptz default now(),
  unique(user_id,profile_id)
);
create index if not exists profile_notes_user_idx on public.profile_notes(user_id,updated_at desc);
alter table public.profile_notes enable row level security;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null default 'general',
  title text not null,
  body text default '',
  link text default '',
  read boolean default false,
  created_at timestamptz default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id,created_at desc);
alter table public.notifications enable row level security;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  event_type text default '',
  event_date date,
  city text default '',
  venue text default '',
  guest_count integer,
  budget numeric,
  notes text default '',
  status text default 'planning' check (status in ('planning','active','completed','cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists events_owner_idx on public.events(owner_id,created_at desc);
alter table public.events enable row level security;

create table if not exists public.event_tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text default '',
  due_date date,
  completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists event_tasks_event_idx on public.event_tasks(event_id,due_date);
alter table public.event_tasks enable row level security;

create table if not exists public.artist_bookings (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.users(id) on delete cascade,
  organiser_id uuid not null references public.users(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  quote_id uuid references public.quotes(id) on delete set null,
  status text not null default 'confirmed' check (status in ('confirmed','completed','cancelled')),
  created_at timestamptz default now(),
  completed_at timestamptz
);
create index if not exists artist_bookings_artist_idx on public.artist_bookings(artist_id,created_at desc);
create index if not exists artist_bookings_organiser_idx on public.artist_bookings(organiser_id,created_at desc);
alter table public.artist_bookings enable row level security;

-- The application uses the server service-role key, so these tables intentionally
-- have restrictive client RLS. Keep service-role credentials server-side only.
