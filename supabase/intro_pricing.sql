-- Paylika — prix de lancement (promo) par formule.
--
-- Un abonné paie `intro_price` pour ses `intro_periods` PREMIERS paiements de
-- cette formule (plan), puis le prix normal `price` à chaque paiement suivant.
-- `intro_price` NULL ou `intro_periods` NULL/0  =  pas de promo (comportement
-- actuel inchangé). Tout est défini par le vendeur (montant promo, nb de
-- périodes, prix normal, périodicité = interval_days de la formule).
--
-- Le comptage « combien de fois cet acheteur a déjà payé cette formule » se fait
-- sur payment_intents (status='completed', par plan_id + telegram_user_id OU
-- customer_phone) dans unitech-create. Aucune colonne supplémentaire nécessaire.
--
-- À exécuter dans Supabase → SQL Editor.

alter table public.plans add column if not exists intro_price   numeric(12,2);
alter table public.plans add column if not exists intro_periods int;
