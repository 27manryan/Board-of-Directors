-- Vantage Client Portal — Final Deliverable Package
-- Adds storage for the single compiled deliverable file per client, gated behind
-- Payment 3 (or pro bono). Run in Supabase SQL Editor after 0006.

-- =========================================================================
-- PRIVATE STORAGE BUCKET
-- =========================================================================
-- Files are never publicly readable; the app serves them via short-lived
-- signed URLs created with the service-role key after an auth + gate check.
insert into storage.buckets (id, name, public)
values ('deliverables', 'deliverables', false)
on conflict (id) do nothing;

-- =========================================================================
-- TABLE — one compiled package per client (re-upload replaces)
-- =========================================================================
create table public.deliverable_files (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  storage_path text not null,
  file_name text not null,
  file_size bigint,
  content_type text,
  uploaded_at timestamptz not null default now(),
  unique (client_id)
);

-- =========================================================================
-- ROW LEVEL SECURITY
-- =========================================================================
-- The app reads via the service-role client, so these policies are
-- defense-in-depth: a client may see their file row only once it is unlocked
-- (pro bono, or Payment 3 paid). Admin sees and writes everything.
alter table public.deliverable_files enable row level security;

create policy "files_client_select_unlocked"
  on public.deliverable_files for select
  using (
    public.is_admin()
    or client_id in (
      select id from public.clients
      where supabase_user_id = auth.uid()
        and (package = 'pro_bono' or payment_3_status = 'paid')
    )
  );

create policy "files_admin_all"
  on public.deliverable_files for all
  using (public.is_admin())
  with check (public.is_admin());

-- =========================================================================
-- INDEXES
-- =========================================================================
create index deliverable_files_client_idx on public.deliverable_files (client_id);
