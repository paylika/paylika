-- ============================================================
--  Paylika — planification de paylika-cron (kick-out + rappels + retraits)
--  À exécuter dans Supabase → SQL Editor.
--  ⚠️ Remplace TON_CRON_SECRET par la valeur du secret CRON_SECRET
--     que tu as mis dans Edge Functions → Secrets.
-- ============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Supprime l'ancien job s'il existe (pour ré-exécuter ce script sans erreur).
select cron.unschedule('paylika-daily')
where exists (select 1 from cron.job where jobname = 'paylika-daily');

-- Tous les jours à 09:00 UTC.
select cron.schedule(
  'paylika-daily',
  '0 9 * * *',
  $$
  select net.http_post(
    url := 'https://xkdiodbppotyiyldlwbg.functions.supabase.co/paylika-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'TON_CRON_SECRET'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Pour vérifier : select * from cron.job;
-- Pour lancer un test manuel tout de suite :
--   select net.http_post(
--     url := 'https://xkdiodbppotyiyldlwbg.functions.supabase.co/paylika-cron',
--     headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','TON_CRON_SECRET'),
--     body := '{}'::jsonb);
