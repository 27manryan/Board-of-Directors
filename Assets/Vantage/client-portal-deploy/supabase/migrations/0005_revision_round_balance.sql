-- Vantage Client Portal — Revision round balance (mid-engagement charges)
-- Run in Supabase SQL Editor after 0004.

alter table public.clients
  add column if not exists revision_round_balance numeric not null default 0;
