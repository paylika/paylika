-- ============================================================
--  Paylika — Page de vente + Meta Pixel.
--  À exécuter dans Supabase → SQL Editor → Run.
-- ============================================================

-- Contenu de la page de vente, porté par l'offre (le "groupe"/entité vendable).
-- JSON : { cover, headline, subheadline, benefits:[], description, guarantee }
alter table public.groups add column if not exists sales_page jsonb;

-- Meta Pixel du propriétaire (public côté client, c'est fait pour).
alter table public.profiles add column if not exists meta_pixel_id text;

-- Images de couverture des pages de vente : bucket PUBLIC (une page de vente
-- doit charger son image sans authentification).
insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;

drop policy if exists "covers_read"   on storage.objects;
drop policy if exists "covers_write"  on storage.objects;
drop policy if exists "covers_update" on storage.objects;
drop policy if exists "covers_delete" on storage.objects;
create policy "covers_read" on storage.objects
  for select using (bucket_id = 'covers');
create policy "covers_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "covers_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "covers_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
