-- Paylika — retrait ATOMIQUE (corrige la course TOCTOU : deux retraits
-- simultanés pouvaient débiter 2× le solde).
--
-- La fonction recalcule le solde disponible ET insère le payout dans la MÊME
-- transaction, sérialisée par propriétaire via un verrou consultatif.
-- Le revenu ne compte QUE les paiements 'completed' (corrige aussi le bug où
-- 'pending'/'refunded' gonflaient le solde).
--
-- À exécuter dans Supabase → SQL Editor.

create or replace function public.create_payout(
  p_owner uuid,
  p_amount bigint,
  p_method text,
  p_destination text,
  p_country text default 'SN'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_revenue   bigint;
  v_out       bigint;
  v_net       bigint;
  v_available bigint;
  v_id        uuid;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  -- Sérialise TOUS les retraits d'un même propriétaire : la 2e requête attend
  -- que la 1re ait fini (calcul + insertion) avant de calculer à son tour.
  perform pg_advisory_xact_lock(hashtext(p_owner::text)::bigint);

  select coalesce(sum(amount), 0) into v_revenue
    from public.payments
    where owner_id = p_owner and status = 'completed';

  -- Les retraits non 'failed' (pending/completed/unknown) sont déjà « sortis ».
  select coalesce(sum(amount), 0) into v_out
    from public.payouts
    where owner_id = p_owner and status <> 'failed';

  v_net       := v_revenue - round(v_revenue * 0.1);
  v_available := v_net - v_out;

  if p_amount > v_available then
    raise exception 'INSUFFICIENT_BALANCE:%', v_available;
  end if;

  insert into public.payouts (owner_id, amount, method, destination, status)
  values (p_owner, p_amount, p_method, p_destination, 'pending')
  returning id into v_id;

  return v_id;
end;
$$;

-- Seul le service_role (Edge Function) l'appelle ; on retire l'accès public.
revoke all on function public.create_payout(uuid, bigint, text, text, text) from public, anon, authenticated;
