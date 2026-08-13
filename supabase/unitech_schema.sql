-- ============================================================
--  Paylika — UniTech Pay : table de correspondance paiement → offre
--  (UniTech ne transporte pas de métadonnées, on mappe via la référence).
--  À exécuter dans Supabase → SQL Editor → Run.
-- ============================================================

create table if not exists public.payment_intents (
  reference text primary key,
  transaction_id text,
  plan_id uuid references public.plans(id) on delete set null,
  group_id uuid references public.groups(id) on delete set null,
  telegram_user_id bigint,
  amount numeric(12,2),
  status text not null default 'pending', -- pending | completed | failed
  created_at timestamptz not null default now()
);

-- RLS activée SANS policy publique : seules les Edge Functions (service_role)
-- y accèdent. La clé anon ne peut ni lire ni écrire.
alter table public.payment_intents enable row level security;
