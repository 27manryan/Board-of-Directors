-- Vantage Client Portal — Packages, Gates, Payments
-- Replaces 0001 schema. Drops and recreates tables (no production data yet).
-- Run in Supabase SQL Editor.

-- =========================================================================
-- DROP existing tables (cascades RLS policies + indexes)
-- =========================================================================
drop table if exists public.submissions cascade;
drop table if exists public.comments cascade;
drop table if exists public.deliverable_visibility cascade;
drop table if exists public.clients cascade;

-- =========================================================================
-- TABLES
-- =========================================================================

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  supabase_user_id uuid references auth.users on delete cascade unique,
  name text not null,
  email text not null,
  project_name text not null,

  -- Engagement structure
  package text not null check (package in ('foundation', 'clarity', 'command')),
  addon_competitive_audit boolean not null default false,
  addon_internal_messaging boolean not null default false,
  project_total numeric not null,

  -- Gate progression
  current_gate int not null default 1 check (current_gate between 1 and 3),

  -- 50/25/25 payment statuses
  payment_1_status text not null default 'unpaid' check (payment_1_status in ('unpaid', 'paid')),
  payment_2_status text not null default 'unpaid' check (payment_2_status in ('unpaid', 'paid')),
  payment_3_status text not null default 'unpaid' check (payment_3_status in ('unpaid', 'paid')),

  -- Integrations
  notion_drafting_page_id text,
  stripe_customer_id text,

  created_at timestamptz not null default now(),

  -- Add-ons only valid for Foundation/Clarity (Command already includes D09 and D10)
  constraint addons_not_on_command check (
    package <> 'command'
    or (addon_competitive_audit = false and addon_internal_messaging = false)
  )
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
  gate int not null check (gate between 1 and 3),
  submitted_at timestamptz not null default now(),
  payment_confirmed boolean not null default false,
  notion_status_updated boolean not null default false
);

-- =========================================================================
-- ADMIN HELPER
-- =========================================================================
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

create policy "clients_self_select"
  on public.clients for select
  using (supabase_user_id = auth.uid() or public.is_admin());

create policy "clients_admin_all"
  on public.clients for all
  using (public.is_admin())
  with check (public.is_admin());

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
