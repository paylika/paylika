-- ============================================================
--  Paylika — accès des utilisateurs CONNECTÉS (rôle authenticated)
--  Nos policies dev étaient pour 'anon' ; une fois connecté, les requêtes
--  passent en 'authenticated'. On leur donne le même accès (DÉV).
--  ⚠️ Phase suivante (prod) : restreindre par propriétaire (auth.uid()).
--  À exécuter dans Supabase → SQL Editor → Run.
-- ============================================================

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
