-- ============================================================
--  Paylika — MULTI-TENANT : chaque compte ne voit que SES données.
--  À exécuter dans Supabase → SQL Editor → Run.
--  ⚠️ Après ça : un nouveau compte démarre VIDE ; les anciennes données
--     de test (owner_id NULL) deviennent invisibles pour tout le monde.
-- ============================================================

-- 1) Colonne owner_id (auto = auth.uid() pour les insertions depuis l'app)
alter table public.groups               add column if not exists owner_id uuid default auth.uid();
alter table public.plans                add column if not exists owner_id uuid default auth.uid();
alter table public.subscribers          add column if not exists owner_id uuid default auth.uid();
alter table public.subscriptions        add column if not exists owner_id uuid default auth.uid();
alter table public.payments             add column if not exists owner_id uuid default auth.uid();
alter table public.payouts              add column if not exists owner_id uuid default auth.uid();
alter table public.telegram_connections add column if not exists owner_id uuid default auth.uid();

-- 2) Supprimer TOUTES les anciennes policies (dev ouvertes)
do $$
declare t text; pol text;
begin
  foreach t in array array[
    'groups','plans','subscribers','subscriptions','payments','payouts','telegram_connections'
  ] loop
    for pol in select policyname from pg_policies where schemaname='public' and tablename=t loop
      execute format('drop policy if exists %I on public.%I;', pol, t);
    end loop;
  end loop;
end $$;

-- 3) Policies par propriétaire (rôle authenticated)
do $$
declare t text;
begin
  foreach t in array array[
    'groups','plans','subscribers','subscriptions','payments','payouts'
  ] loop
    execute format('create policy "own_sel" on public.%I for select to authenticated using (owner_id = auth.uid());', t);
    execute format('create policy "own_ins" on public.%I for insert to authenticated with check (owner_id = auth.uid());', t);
    execute format('create policy "own_upd" on public.%I for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());', t);
    execute format('create policy "own_del" on public.%I for delete to authenticated using (owner_id = auth.uid());', t);
  end loop;
end $$;

-- 4) telegram_connections : un groupe non encore réclamé (owner_id NULL) est
--    visible/claimable par n'importe quel proprio (pour l'onboarding), puis
--    devient privé une fois réclamé.
create policy "conn_sel" on public.telegram_connections
  for select to authenticated using (owner_id = auth.uid() or owner_id is null);
create policy "conn_upd" on public.telegram_connections
  for update to authenticated using (owner_id = auth.uid() or owner_id is null)
  with check (owner_id = auth.uid());
create policy "conn_del" on public.telegram_connections
  for delete to authenticated using (owner_id = auth.uid());

-- Les tables telegram_users et payment_intents restent service_role only
-- (accédées uniquement par les Edge Functions).
