-- Vantage Client Portal: client notification ledger and internal profiles
-- Adds private records for client-facing emails and Ryan-only profile drafts.

-- =========================================================================
-- CLIENT NOTIFICATIONS
-- =========================================================================

create table if not exists public.client_notifications (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  event_type text not null check (
    event_type in (
      'portal_welcome',
      'discovery_received',
      'deliverables_ready',
      'gate_feedback_received',
      'final_package_available',
      'revision_balance_added'
    )
  ),
  dedupe_key text not null,
  recipient_email text not null,
  status text not null default 'pending' check (
    status in ('pending', 'approved', 'sent', 'failed')
  ),
  provider_message_id text,
  template_version text not null,
  payload jsonb not null default '{}'::jsonb,
  approved_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, event_type, dedupe_key)
);

alter table public.client_notifications enable row level security;

revoke all on table public.client_notifications from anon;
grant select, insert, update, delete on table public.client_notifications to authenticated;
grant select, insert, update, delete on table public.client_notifications to service_role;

create policy "client_notifications_admin_select"
  on public.client_notifications for select
  to authenticated
  using (public.is_admin());

create policy "client_notifications_admin_all"
  on public.client_notifications for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists client_notifications_client_idx
  on public.client_notifications (client_id);

create index if not exists client_notifications_status_idx
  on public.client_notifications (status);

-- =========================================================================
-- CLIENT PROFILES
-- =========================================================================

create table if not exists public.client_profiles (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  version integer not null,
  status text not null default 'draft' check (
    status in ('draft', 'approved', 'superseded')
  ),
  visibility text not null default 'internal' check (visibility = 'internal'),
  profile_json jsonb not null,
  profile_markdown text not null,
  input_snapshot jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references auth.users,
  notion_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, version)
);

alter table public.client_profiles enable row level security;

revoke all on table public.client_profiles from anon;
grant select, insert, update, delete on table public.client_profiles to authenticated;
grant select, insert, update, delete on table public.client_profiles to service_role;

create policy "client_profiles_admin_select"
  on public.client_profiles for select
  to authenticated
  using (public.is_admin());

create policy "client_profiles_admin_all"
  on public.client_profiles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists client_profiles_client_version_idx
  on public.client_profiles (client_id, version desc);

create index if not exists client_profiles_status_idx
  on public.client_profiles (status);
