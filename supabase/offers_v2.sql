-- ============================================================
--  Paylika — offres à plusieurs formules + prix de comparaison
--  À exécuter dans Supabase → SQL Editor → Run.
-- ============================================================

-- Prix barré (comparaison) optionnel sur chaque formule.
alter table public.plans
  add column if not exists compare_price numeric(12,2);
