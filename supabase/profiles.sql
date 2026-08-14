-- ============================================================
--  Paylika — PROFILS propriétaires + stockage des photos (avatars).
--  À exécuter dans Supabase → SQL Editor → Run.
-- ============================================================

-- 1) Table profiles : 1 ligne par propriétaire (clé = son id auth).
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  full_name      text,
  business_name  text,
  avatar_url     text,
  payout_method  text default 'wave',
  payout_number  text,
  updated_at     timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "prof_sel" on public.profiles;
drop policy if exists "prof_ins" on public.profiles;
drop policy if exists "prof_upd" on public.profiles;
create policy "prof_sel" on public.profiles for select to authenticated using (id = auth.uid());
create policy "prof_ins" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "prof_upd" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- 2) Bucket de stockage des avatars (lecture publique).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 3) Policies storage : chacun gère UNIQUEMENT son dossier avatars/<uid>/…
drop policy if exists "avatars_read"   on storage.objects;
drop policy if exists "avatars_write"  on storage.objects;
drop policy if exists "avatars_update" on storage.objects;
drop policy if exists "avatars_delete" on storage.objects;

create policy "avatars_read" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "avatars_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
