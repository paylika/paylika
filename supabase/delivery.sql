-- ============================================================
--  Paylika — TYPE DE LIVRAISON par offre.
--  Généralise au-delà de Telegram : chaque "groupe" (entité vendable) porte
--  un mode de livraison + une cible (lien secret livré APRÈS paiement).
--  À exécuter dans Supabase → SQL Editor → Run.
--
--  delivery_type : 'telegram' (auto add/kick) | 'whatsapp' (lien groupe) |
--                  'link' (URL / contenu) | 'receipt' (juste un reçu)
--  delivery_target : lien WhatsApp / URL à livrer (NULL pour telegram/receipt).
--                    ⚠️ jamais exposé publiquement avant paiement.
-- ============================================================

alter table public.groups add column if not exists delivery_type   text not null default 'telegram';
alter table public.groups add column if not exists delivery_target  text;

-- Une vente non-Telegram n'a pas d'abonné Telegram : l'abonnement peut donc
-- exister sans subscriber_id.
alter table public.subscriptions alter column subscriber_id drop not null;
