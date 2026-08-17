-- Paylika — un même numéro WhatsApp = UN SEUL compte (même avec un email différent).
--
-- Le numéro est stocké dans les métadonnées du compte
-- (auth.users.raw_user_meta_data->>'whatsapp'), normalisé "+<indicatif><chiffres>"
-- côté client (page /signup et /login).
--
-- À exécuter dans Supabase → SQL Editor.
-- NB : s'il existe déjà 2 comptes avec le même numéro, l'index échouera —
--      il faudra d'abord dédoublonner.

-- 1) Contrainte DURE : refuse un 2e compte avec le même numéro (backstop anti-course).
create unique index if not exists uq_users_whatsapp
  on auth.users ((raw_user_meta_data->>'whatsapp'))
  where raw_user_meta_data->>'whatsapp' is not null;

-- 2) Vérification PUBLIQUE : « ce numéro est-il déjà pris ? » (message clair AVANT
--    de tenter l'inscription). Ne renvoie qu'un booléen, aucune donnée exposée.
create or replace function public.phone_taken(p_phone text)
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from auth.users
    where raw_user_meta_data->>'whatsapp' = p_phone
  );
$$;

revoke all on function public.phone_taken(text) from public;
grant execute on function public.phone_taken(text) to anon, authenticated;
