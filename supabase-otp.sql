create table if not exists public.email_otps (id uuid primary key default gen_random_uuid(), email text not null, user_id uuid references public.users(id) on delete cascade, purpose text not null check (purpose in ('registration','password_reset')), code_hash text not null, attempts integer not null default 0, created_at timestamptz not null default now(), expires_at timestamptz not null, used_at timestamptz);
create index if not exists email_otps_email_purpose_idx on public.email_otps(email,purpose,created_at desc);
create index if not exists email_otps_user_idx on public.email_otps(user_id);
alter table public.email_otps enable row level security;
drop policy if exists "No public access" on public.email_otps;
create policy "No public access" on public.email_otps for all using(false) with check(false);
