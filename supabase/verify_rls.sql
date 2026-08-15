-- Paylika — AUDIT RLS de la base de prod.
-- À exécuter dans Supabase → SQL Editor, puis colle le résultat.
--
-- Objectif : s'assurer qu'aucune policy « dev ouverte » (qui exposerait les
-- données de tous les comptes) ne reste active.

-- 1) Policies DANGEREUSES : permissives (true), ouvertes à 'anon', ou nommées 'dev'.
--    ⚠️ Si ça renvoie des lignes sur payments / payouts / subscribers /
--    subscriptions / groups / plans / telegram_connections → IDOR : rejoue
--    cleanup_tenancy.sql (ou multi_tenant.sql) pour rétablir les policies strictes.
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and (
    qual is not distinct from 'true'
    or with_check is not distinct from 'true'
    or 'anon' = any (roles)
    or policyname ilike '%dev%'
  )
order by tablename, policyname;

-- 2) RLS activé sur toutes les tables ? (rls_enabled doit être true partout)
select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where relnamespace = 'public'::regnamespace
  and relkind = 'r'
order by relname;
