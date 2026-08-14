-- Paylika — pays de retrait par défaut du propriétaire.
-- À exécuter dans Supabase → SQL Editor → Run.
alter table public.profiles add column if not exists payout_country text default 'SN';
