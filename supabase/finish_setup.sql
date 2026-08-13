-- ============================================================
--  Paylika — SQL final (à lancer une fois dans SQL Editor → Run)
--  1. Accès aux données pour les utilisateurs CONNECTÉS (authenticated)
--  2. Colonne compare_price (prix barré) sur les offres
-- ============================================================

-- 1) Accès role authenticated (DÉV — à restreindre par proprio en prod)
do $$
declare t text;
begin
  foreach t in array array[
    'groups','plans','subscribers','subscriptions','payments','payouts','telegram_connections'
  ] loop
    execute format('drop policy if exists "dev auth all" on public.%I;', t);
    execute format(
      'create policy "dev auth all" on public.%I for all to authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;

-- 2) Prix barré (comparaison) sur les formules
alter table public.plans
  add column if not exists compare_price numeric(12,2);
