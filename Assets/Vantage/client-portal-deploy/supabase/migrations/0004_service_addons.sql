-- Vantage Client Portal — Rush Delivery + Pitch Deck Narrative service add-ons
-- Run in Supabase SQL Editor after 0003.

alter table public.clients
  add column if not exists addon_rush_delivery boolean not null default false,
  add column if not exists addon_pitch_deck boolean not null default false;
