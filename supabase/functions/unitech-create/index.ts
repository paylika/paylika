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
      .select("id, name, price, group_id")
      .eq("id", offer)
      .maybeSingle();
    if (!plan) return json({ error: "Offre introuvable." }, 404);

    const base: Record<string, unknown> = {
      amount: Number(plan.price),
      customer_number: String(phone).replace(/\s/g, ""),
      customer_name: fullName || "Client Paylika",
      description: `Abonnement Paylika : ${plan.name}`,
      callback_success: "https://t.me/Paylikabot",
      callback_cancel: "https://t.me/Paylikabot",
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
        amount: Number(plan.price),
        status: "pending",
      },
      { onConflict: "reference" },
    );

    return json({ ok: true, url, reference });
  } catch (e) {
    return json({ error: "Erreur serveur.", detail: String(e) }, 500);
  }
});
