-- ============================================================
--  Paylika — Stockage des CONTENUS numériques vendus (fichiers).
--  Bucket PRIVÉ : le fichier n'est jamais public. Après paiement, la fonction
--  access-status génère une URL signée temporaire (service_role).
--  À exécuter dans Supabase → SQL Editor → Run.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('content', 'content', false)
on conflict (id) do nothing;

-- Le propriétaire téléverse / gère UNIQUEMENT son dossier content/<uid>/…
drop policy if exists "content_write"  on storage.objects;
drop policy if exists "content_read"   on storage.objects;
drop policy if exists "content_update" on storage.objects;
drop policy if exists "content_delete" on storage.objects;

create policy "content_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'content' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "content_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'content' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "content_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'content' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "content_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'content' and (storage.foldername(name))[1] = auth.uid()::text);
-- Pas de lecture publique : les acheteurs reçoivent une URL signée après paiement.
