-- ============================================================
--  Paylika — Nettoyage multi-tenant.
--  1) Re-verrouille les policies : chaque compte ne voit QUE ses données.
--  2) Supprime les données de test / seed (owner_id NULL) qui traînent
--     (groupes Yoga Studio, Fitness Club, abonnés fictifs, etc.).
--  À exécuter dans Supabase → SQL Editor → Run.
-- ============================================================

-- 1) Supprimer TOUTES les policies existantes (dont d'éventuelles permissives).
do $$
declare t text; pol text;
begin
  foreach t in array array[
    'groups','plans','subscribers','subscriptions','payments','payouts',
    'telegram_connections','group_members'
  ] loop
    for pol in select policyname from pg_policies where schemaname='public' and tablename=t loop
      execute format('drop policy if exists %I on public.%I;', pol, t);
    end loop;
  end loop;
end $$;

-- 2) Policies strictes par propriétaire.
do $$
declare t text;
begin
  foreach t in array array[
    'groups','plans','subscribers','subscriptions','payments','payouts','group_members'
  ] loop
    execute format('create policy "own_sel" on public.%I for select to authenticated using (owner_id = auth.uid());', t);
    execute format('create policy "own_ins" on public.%I for insert to authenticated with check (owner_id = auth.uid());', t);
    execute format('create policy "own_upd" on public.%I for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());', t);
    execute format('create policy "own_del" on public.%I for delete to authenticated using (owner_id = auth.uid());', t);
  end loop;
end $$;

-- telegram_connections : réclamable tant que owner_id NULL (onboarding), puis privé.
create policy "conn_sel" on public.telegram_connections
  for select to authenticated using (owner_id = auth.uid() or owner_id is null);
create policy "conn_ins" on public.telegram_connections
  for insert to authenticated with check (owner_id = auth.uid() or owner_id is null);
create policy "conn_upd" on public.telegram_connections
  for update to authenticated using (owner_id = auth.uid() or owner_id is null) with check (owner_id = auth.uid());
create policy "conn_del" on public.telegram_connections
  for delete to authenticated using (owner_id = auth.uid());

-- 3) Supprimer les données de test / seed (owner_id NULL). Ordre enfant → parent.
delete from public.payments             where owner_id is null;
delete from public.subscriptions        where owner_id is null;
delete from public.group_members        where owner_id is null;
delete from public.telegram_connections where owner_id is null and group_id is not null;
delete from public.subscribers          where owner_id is null;
delete from public.plans                where owner_id is null;
delete from public.payouts              where owner_id is null;
delete from public.groups               where owner_id is null;
