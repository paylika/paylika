-- ============================================================
--  Paylika — policies d'ÉCRITURE (DÉV UNIQUEMENT)
--  Autorise la clé anon à créer des groupes et des offres depuis
--  l'app, le temps de développer (avant l'authentification).
--  ⚠️ À RETIRER avant la production : l'écriture devra être
--  réservée au propriétaire authentifié (auth.uid()).
--  À exécuter dans Supabase → SQL Editor → Run.
-- ============================================================

do $$
declare t text;
begin
  foreach t in array array['groups','plans','subscribers','subscriptions','payments'] loop
    execute format('drop policy if exists "dev anon insert" on public.%I;', t);
    execute format('create policy "dev anon insert" on public.%I for insert to anon with check (true);', t);

    execute format('drop policy if exists "dev anon update" on public.%I;', t);
    execute format('create policy "dev anon update" on public.%I for update to anon using (true) with check (true);', t);
  end loop;
end $$;
