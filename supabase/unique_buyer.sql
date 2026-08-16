-- Paylika — chaque acheteur = UN abonné unique (plus de doublon par paiement).
-- Identité unique : telegram_user_id (Telegram) OU téléphone (non-Telegram).
--
-- À exécuter dans Supabase → SQL Editor.

-- 1) Le téléphone de l'acheteur est transporté du checkout jusqu'au webhook.
alter table public.payment_intents add column if not exists customer_phone text;
alter table public.payment_intents add column if not exists customer_name  text;

-- 2) On stocke le téléphone sur l'abonné pour le dédupliquer.
alter table public.subscribers add column if not exists phone text;

-- 3) Un même numéro = un seul abonné par propriétaire.
create unique index if not exists uq_subscribers_owner_phone
  on public.subscribers (owner_id, phone) where phone is not null;
