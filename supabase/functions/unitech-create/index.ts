// Paylika — UniTech Pay : crée un paiement (Wave / Orange Money) et renvoie
// l'URL de paiement. Stocke la correspondance référence → offre pour que le
// webhook puisse créer l'abonnement + l'accès Telegram.
//
// Appel : POST { offer, tg, operator: "wave"|"orange_money", phone, fullName? }
// Secret : UNITECH_API_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const FUNCTIONS_BASE = SUPABASE_URL.replace(".supabase.co", ".functions.supabase.co");
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
function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  });
}

const ACTIONS: Record<string, string> = {
  wave: "create_wave_payment",
  orange_money: "create_orange_om",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const body = await req.json().catch(() => null);
    const { offer, tg, operator, phone, fullName } = body ?? {};
    if (!offer || !operator || !phone) {
      return json({ error: "Champs manquants (offre, opérateur, numéro)." }, 400);
    }
    const action = ACTIONS[operator];
    if (!action) return json({ error: "Opérateur non supporté." }, 400);

    const { data: plan } = await admin
      .from("plans")
      .select("id, name, price, group_id")
      .eq("id", offer)
      .maybeSingle();
    if (!plan) return json({ error: "Offre introuvable." }, 404);

    const res = await fetch(`${API}?action=${action}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Number(plan.price),
        customer_number: String(phone).replace(/\s/g, ""),
        description: `Abonnement Paylika : ${plan.name}`,
        callback_success: `${FUNCTIONS_BASE}/unitech-webhook`,
        callback_cancel: "https://t.me/Paylikabot",
      }),
    });
    const text = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      /* non-JSON */
    }

    if (!data?.success || !data?.data?.payment_url) {
      return json(
        { error: "Création du paiement impossible.", status: res.status, detail: data ?? text?.slice(0, 300) },
        502,
      );
    }

    const d = data.data;
    // Mémorise la correspondance pour le webhook.
    await admin.from("payment_intents").upsert(
      {
        reference: d.reference,
        transaction_id: String(d.transaction_id ?? ""),
        plan_id: plan.id,
        group_id: plan.group_id,
        telegram_user_id: tg ? Number(tg) : null,
        amount: Number(plan.price),
        status: "pending",
      },
      { onConflict: "reference" },
    );

    return json({ ok: true, url: d.payment_url, reference: d.reference });
  } catch (e) {
    return json({ error: "Erreur serveur.", detail: String(e) }, 500);
  }
});
