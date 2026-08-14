-- ============================================================
--  Paylika — Correctif : autoriser les nouveaux modes de livraison.
--  L'ancienne contrainte groups_kind_check n'autorisait que quelques valeurs
--  (telegram/gym). Le sens est désormais porté par delivery_type, donc on
--  retire cette contrainte pour que kind puisse valoir whatsapp/link/receipt.
--  À exécuter dans Supabase → SQL Editor → Run.
-- ============================================================

alter table public.groups drop constraint if exists groups_kind_check;
