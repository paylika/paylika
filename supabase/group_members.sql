-- ============================================================
--  Paylika — ROSTER des membres par groupe.
--  Un bot Telegram ne peut PAS lister les membres d'un groupe : on construit
--  ce roster au fil de l'eau (paiement, entrée, ou première activité).
--  Sert aux badges « payé / non payé » et au retrait manuel.
--  À exécuter dans Supabase → SQL Editor → Run.
-- ============================================================

create table if not exists public.group_members (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid default auth.uid(),
  group_id         uuid references public.groups(id) on delete cascade,
  telegram_user_id bigint not null,
  username         text,
  first_name       text,
  first_seen       timestamptz not null default now(),
  last_seen        timestamptz not null default now(),
  in_group         boolean not null default true,
  unique (group_id, telegram_user_id)
);

create index if not exists idx_group_members_group on public.group_members(group_id);

alter table public.group_members enable row level security;

-- Écritures faites par les Edge Functions (service_role, bypass RLS).
-- Le propriétaire lit / met à jour / supprime uniquement ses propres lignes.
drop policy if exists "gm_sel" on public.group_members;
drop policy if exists "gm_upd" on public.group_members;
drop policy if exists "gm_del" on public.group_members;
create policy "gm_sel" on public.group_members for select to authenticated using (owner_id = auth.uid());
create policy "gm_upd" on public.group_members for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "gm_del" on public.group_members for delete to authenticated using (owner_id = auth.uid());
