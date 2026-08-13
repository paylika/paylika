-- ============================================================
--  Paylika — v2 : retraits (payouts) + policies de suppression (DÉV)
--  À exécuter dans Supabase → SQL Editor → Run.
-- ============================================================

-- Retraits du solde vers un moyen mobile money.
create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  amount numeric(12,2) not null,
  currency text not null default 'XOF',
  method text,               -- wave | orange_money | free_money ...
  destination text,          -- numéro de téléphone
  status text not null default 'pending' check (status in ('pending','completed','failed')),
  created_at timestamptz not null default now()
);

alter table public.payouts enable row level security;

drop policy if exists "dev anon read payouts" on public.payouts;
create policy "dev anon read payouts" on public.payouts for select to anon using (true);

drop policy if exists "dev anon insert payouts" on public.payouts;
create policy "dev anon insert payouts" on public.payouts for insert to anon with check (true);

drop policy if exists "dev anon update payouts" on public.payouts;
create policy "dev anon update payouts" on public.payouts for update to anon using (true) with check (true);

-- Suppression (DÉV) sur les tables principales — à retirer avant la prod.
do $$
declare t text;
begin
  foreach t in array array['groups','plans','subscribers','subscriptions','payments'] loop
    execute format('drop policy if exists "dev anon delete" on public.%I;', t);
    execute format('create policy "dev anon delete" on public.%I for delete to anon using (true);', t);
  end loop;
end $$;
