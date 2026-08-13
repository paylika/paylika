-- ============================================================
--  Paylika — lecture (DÉV) des chats connectés au bot
--  Permet à l'app (onglet Accès) et au dev d'afficher les groupes
--  où le bot est admin. telegram_users reste privé (données perso).
--  ⚠️ À restreindre avant la production (derrière l'auth du proprio).
-- ============================================================

drop policy if exists "dev anon read connections" on public.telegram_connections;
create policy "dev anon read connections"
  on public.telegram_connections
  for select to anon
  using (true);
