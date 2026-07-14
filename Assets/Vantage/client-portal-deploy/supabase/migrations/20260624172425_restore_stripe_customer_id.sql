alter table public.clients
  add column if not exists stripe_customer_id text;
