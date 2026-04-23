-- Vantage Client Portal — Veteran discount, custom price, Pro Bono package
-- Run in Supabase SQL Editor after 0002.

-- New columns
alter table public.clients
  add column if not exists veteran_discount boolean not null default false,
  add column if not exists custom_price numeric;

-- Expand package constraint to include pro_bono
alter table public.clients drop constraint if exists clients_package_check;
alter table public.clients
  add constraint clients_package_check
  check (package in ('foundation', 'clarity', 'command', 'pro_bono'));

-- Pro bono clients have no add-ons (all deliverables included)
alter table public.clients drop constraint if exists addons_not_on_command;
alter table public.clients
  add constraint addons_not_on_command check (
    package not in ('command', 'pro_bono')
    or (addon_competitive_audit = false and addon_internal_messaging = false)
  );
