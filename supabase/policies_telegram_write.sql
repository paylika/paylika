-- ============================================================
--  Paylika — liaison (DÉV) d'un chat Telegram à un groupe Paylika
--  Permet à l'app (onglet Accès) de définir group_id / status.
--  ⚠️ À restreindre avant la production (auth du proprio).
-- ============================================================

drop policy if exists "dev anon update connections" on public.telegram_connections;
create policy "dev anon update connections"
  on public.telegram_connections
  for update to anon
  using (true) with check (true);
