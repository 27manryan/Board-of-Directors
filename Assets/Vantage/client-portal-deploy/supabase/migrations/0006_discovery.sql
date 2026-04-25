-- Vantage Client Portal — Discovery Questionnaire
-- Adds notion_discovery_page_id to clients and a discovery_submissions table.

-- =========================================================================
-- SCHEMA CHANGES
-- =========================================================================

alter table public.clients
  add column if not exists notion_discovery_page_id text;

create table public.discovery_submissions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  submitted_at timestamptz not null default now(),
  answers jsonb not null default '{}'::jsonb
);

-- =========================================================================
-- ROW LEVEL SECURITY
-- =========================================================================

alter table public.discovery_submissions enable row level security;

create policy "discovery_submissions_client_select"
  on public.discovery_submissions for select
  using (
    public.is_admin()
    or client_id in (
      select id from public.clients where supabase_user_id = auth.uid()
    )
  );

create policy "discovery_submissions_client_insert"
  on public.discovery_submissions for insert
  with check (
    public.is_admin()
    or client_id in (
      select id from public.clients where supabase_user_id = auth.uid()
    )
  );

create policy "discovery_submissions_admin_all"
  on public.discovery_submissions for all
  using (public.is_admin())
  with check (public.is_admin());

-- =========================================================================
-- INDEXES
-- =========================================================================

create index discovery_submissions_client_idx on public.discovery_submissions (client_id);
