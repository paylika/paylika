// Paylika — UniTech Pay : crée un paiement (Sénégal + international) et renvoie
// l'URL de paiement. Mappe référence → offre pour le webhook.
//
// Appel : POST { offer, tg, country, operator, phone, fullName? }
//   country : SN | CI | BF | TG | BJ
//   operator: SN → wave | orange_money ; autres → wave_money | orange_money | mtn_money | moov | togocell
// Secret : UNITECH_API_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const API = "https://api.unitech.sn/api";
const API_KEY = Deno.env.get("UNITECH_API_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const body = await req.json().catch(() => null);
    const { offer, tg, phone, fullName } = body ?? {};
    const country = (body?.country ?? "SN") as string;
    const operator = (body?.operator ?? "wave") as string;
    if (!offer || !phone) return json({ error: "Champs manquants (offre, numéro)." }, 400);

    const { data: plan } = await admin
      .from("plans")
      .select("id, name, price, intro_price, intro_periods, group_id, groups(delivery_type)")
      .eq("id", offer)
      .maybeSingle();
    if (!plan) return json({ error: "Offre introuvable." }, 404);

    // Redirection après paiement selon le mode de livraison.
    const deliveryType = (plan as any).groups?.delivery_type ?? "telegram";
    const APP_URL = "https://paylika.paylika-app.workers.dev";
    // Non-Telegram → page de livraison autonome (chargement quasi instantané).
    const successUrl = deliveryType === "telegram" ? "https://t.me/Paylikabot" : `${APP_URL}/access.html`;

    // Prix de lancement (promo) : le vendeur peut fixer un prix réduit pour les
    // `intro_periods` PREMIERS paiements de cette formule, puis le prix normal.
    // On compte les paiements DÉJÀ complétés par cet acheteur pour cette formule
    // (sur payment_intents 'completed', par téléphone ou telegram_user_id).
    const normalizedPhone = String(phone).replace(/\s/g, "");
    const regularPrice = Number(plan.price);
    const introPrice = (plan as any).intro_price != null ? Number((plan as any).intro_price) : null;
    const introPeriods = (plan as any).intro_periods != null ? Number((plan as any).intro_periods) : 0;

    let effectivePrice = regularPrice;
    if (introPrice != null && introPeriods > 0) {
      let q = admin
        .from("payment_intents")
        .select("reference", { count: "exact", head: true })
        .eq("plan_id", plan.id)
        .eq("status", "completed");
      q = tg ? q.eq("telegram_user_id", Number(tg)) : q.eq("customer_phone", normalizedPhone);
      const { count } = await q;
      if ((count ?? 0) < introPeriods) effectivePrice = introPrice;
    }

    // Frais forfaitaire 2% à la charge de l'ACHETEUR (couvre les frais UniTech).
    // Le vendeur touche son prix plein ; l'acheteur paie prix + 2%.
    const BUYER_FEE_RATE = 0.02;
    const buyerAmount = Math.round(effectivePrice * (1 + BUYER_FEE_RATE));

    const base: Record<string, unknown> = {
      amount: buyerAmount,
      customer_number: normalizedPhone,
      customer_name: fullName || "Client Paylika",
      description: `Paylika : ${plan.name}`,
      callback_success: successUrl,
      callback_cancel: successUrl,
    };

    // Choix de l'endpoint selon pays/opérateur.
    let action: string;
    let payload: Record<string, unknown>;
    if (country === "SN") {
      action = operator === "orange_money" ? "create_orange_om" : "create_wave_payment";
      payload = base;
    } else {
      action = "create_intl_payment";
      payload = { ...base, country, operator };
    }

    const res = await fetch(`${API}?action=${action}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      /* non-JSON */
    }

    const d = data?.data ?? data ?? {};
    const url = d.payment_url ?? d.qr_code ?? null;
    const reference = d.reference ?? null;
    const transactionId = d.transaction_id ?? null;

    if (!(data?.success === true) || !url) {
      return json(
        { error: "Création du paiement impossible.", status: res.status, detail: data ?? text?.slice(0, 300) },
        502,
      );
    }

    await admin.from("payment_intents").upsert(
      {
        reference,
        transaction_id: transactionId != null ? String(transactionId) : null,
        plan_id: plan.id,
        group_id: plan.group_id,
        telegram_user_id: tg ? Number(tg) : null,
        // Identité de l'acheteur non-Telegram (pour le dédupliquer côté webhook).
        customer_phone: normalizedPhone,
        customer_name: (fullName || "").trim() || null,
        // Prix vendeur RÉELLEMENT appliqué (promo ou normal) → source de vérité
        // pour la commission côté webhook.
        amount: effectivePrice,
        status: "pending",
      },
      { onConflict: "reference" },
    );

    return json({ ok: true, url, reference });
  } catch (e) {
    return json({ error: "Erreur serveur.", detail: String(e) }, 500);
  }
});
