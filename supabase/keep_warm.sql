-- Paylika — garde la fonction offer-info « chaude » pour éviter le cold start
-- (le délai de réveil lent à la 1ère visite d'un lien de paiement après une
-- période d'inactivité). Ping toutes les 5 minutes via pg_cron + pg_net.
--
-- À exécuter UNE FOIS dans Supabase → SQL Editor.
-- (pg_cron et pg_net sont disponibles par défaut sur Supabase.)

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Supprime un éventuel job existant du même nom (rejouable sans erreur).
do $$
begin
  perform cron.unschedule('paylika-keep-warm');
exception when others then
  null;
end $$;

-- Toutes les 5 minutes : réveille offer-info (l'id 'warm' renvoie juste un 404,
-- mais l'appel maintient la fonction chaude).
select cron.schedule(
  'paylika-keep-warm',
  '*/5 * * * *',
  $$ select net.http_get('https://xkdiodbppotyiyldlwbg.functions.supabase.co/offer-info?id=warm'); $$
);
