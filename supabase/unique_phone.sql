-- Paylika — un même numéro WhatsApp = UN SEUL compte (même avec un email différent).
--
-- Le numéro est stocké dans les métadonnées du compte
-- (auth.users.raw_user_meta_data->>'whatsapp'), normalisé "+<indicatif><chiffres>"
-- côté client (pages /signup et /login).
--
-- ⚠️ On NE PEUT PAS créer d'index unique sur auth.users (Supabase la protège :
--    « must be owner of table users »). On applique donc l'unicité côté
--    application : la fonction phone_taken() ci-dessous (qui, elle, a le droit de
--    LIRE auth.users) est appelée AVANT chaque inscription pour refuser un numéro
--    déjà utilisé.
--
-- À exécuter dans Supabase → SQL Editor.

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
