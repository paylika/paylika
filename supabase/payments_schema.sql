-- ============================================================
--  Paylika — enrichissement de payments pour l'encaissement
--  (provider, référence, commission 10 %, montant net).
--  À exécuter dans Supabase → SQL Editor → Run.
-- ============================================================

alter table public.payments
  add column if not exists provider    text,
  add column if not exists provider_ref text,
  add column if not exists commission  numeric(12,2),
  add column if not exists net_amount  numeric(12,2);

-- Idempotence : un même paiement provider ne doit être traité qu'une fois.
create unique index if not exists uq_payments_provider_ref
  on public.payments(provider_ref)
  where provider_ref is not null;
