-- Vantage Client Portal — Initial Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- =========================================================================
-- TABLES
-- =========================================================================

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  supabase_user_id uuid references auth.users on delete cascade unique,
  name text not null,
  email text not null,
  project_name text not null,
  tier text not null check (tier in ('tier1', 'tier2', 'tier3')),
  notion_drafting_page_id text,
  current_stage int not null default 1,
  amount_due numeric not null default 0,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid')),
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

create table public.deliverable_visibility (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  deliverable_code text not null,
  released boolean not null default false,
  released_at timestamptz,
  unique (client_id, deliverable_code)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  deliverable_code text not null,
  comment_text text not null,
  submitted_at timestamptz not null default now()
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  stage int not null,
  submitted_at timestamptz not null default now(),
  payment_confirmed boolean not null default false,
  notion_status_updated boolean not null default false
);

-- =========================================================================
-- ADMIN HELPER
-- =========================================================================
-- Returns true if the calling user is the owner/admin (Ryan).
-- Used by RLS policies below. Email is sourced from auth.users.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from auth.users
    where id = auth.uid()
      and lower(email) = '27manryan@gmail.com'
  );
$$;

-- =========================================================================
-- ROW LEVEL SECURITY
-- =========================================================================

alter table public.clients enable row level security;
alter table public.deliverable_visibility enable row level security;
alter table public.comments enable row level security;
alter table public.submissions enable row level security;

-- clients: a client sees only their own row; admin sees all.
create policy "clients_self_select"
  on public.clients for select
  using (supabase_user_id = auth.uid() or public.is_admin());

create policy "clients_admin_all"
  on public.clients for all
  using (public.is_admin())
  with check (public.is_admin());

-- deliverable_visibility: client sees only their own rows AND only released ones;
-- admin sees all and can write.
create policy "visibility_client_select_released"
  on public.deliverable_visibility for select
  using (
    public.is_admin()
    or (
      released = true
      and client_id in (
        select id from public.clients where supabase_user_id = auth.uid()
      )
    )
  );

create policy "visibility_admin_all"
  on public.deliverable_visibility for all
  using (public.is_admin())
  with check (public.is_admin());

-- comments: client reads/writes their own; admin sees all.
create policy "comments_client_select"
  on public.comments for select
  using (
    public.is_admin()
    or client_id in (
      select id from public.clients where supabase_user_id = auth.uid()
    )
  );

create policy "comments_client_insert"
  on public.comments for insert
  with check (
    public.is_admin()
    or client_id in (
      select id from public.clients where supabase_user_id = auth.uid()
    )
  );

create policy "comments_admin_all"
  on public.comments for all
  using (public.is_admin())
  with check (public.is_admin());

-- submissions: client can read/insert their own; admin sees all.
create policy "submissions_client_select"
  on public.submissions for select
  using (
    public.is_admin()
    or client_id in (
      select id from public.clients where supabase_user_id = auth.uid()
    )
  );

create policy "submissions_client_insert"
  on public.submissions for insert
  with check (
    public.is_admin()
    or client_id in (
      select id from public.clients where supabase_user_id = auth.uid()
    )
  );

create policy "submissions_admin_all"
  on public.submissions for all
  using (public.is_admin())
  with check (public.is_admin());

-- =========================================================================
-- INDEXES
-- =========================================================================
create index clients_user_idx on public.clients (supabase_user_id);
create index visibility_client_idx on public.deliverable_visibility (client_id);
create index comments_client_deliverable_idx on public.comments (client_id, deliverable_code);
create index submissions_client_idx on public.submissions (client_id);
