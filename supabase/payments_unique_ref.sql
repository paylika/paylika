-- Paylika — garantit l'unicité de provider_ref sur payments.
-- C'est ce qui rend la livraison IDEMPOTENTE (un webhook rejoué ne crée pas de
-- 2e paiement ni de 2e lien d'accès). Idempotent : sans effet si déjà présent.
--
-- À exécuter dans Supabase → SQL Editor.
-- (Si ça échoue pour "duplicate key", c'est qu'il existe déjà des doublons de
--  provider_ref à nettoyer — dis-le-moi.)

create unique index if not exists uq_payments_provider_ref
  on public.payments (provider_ref);
