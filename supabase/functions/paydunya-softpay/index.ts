// Paylika — SOFTPAY : paiement intégré (page Paylika) via PayDunya.
// Crée une facture puis déclenche le paiement sur l'opérateur choisi (Wave, OM).
// Wave renvoie une URL Wave à ouvrir pour confirmer. La confirmation finale
// arrive via l'IPN paydunya-webhook (création abonnement + accès Telegram).
//
// Appel : POST { offer, tg, operator: "wave"|"orange_money", fullName, phone, email? }
// Secrets : PAYDUNYA_MASTER_KEY, PAYDUNYA_PRIVATE_KEY, PAYDUNYA_TOKEN (+ PAYDUNYA_MODE)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const FUNCTIONS_BASE = SUPABASE_URL.replace(".supabase.co", ".functions.supabase.co");

const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const H = {
  "PAYDUNYA-MASTER-KEY": Deno.env.get("PAYDUNYA_MASTER_KEY") ?? "",
  "PAYDUNYA-PRIVATE-KEY": Deno.env.get("PAYDUNYA_PRIVATE_KEY") ?? "",
  "PAYDUNYA-TOKEN": Deno.env.get("PAYDUNYA_TOKEN") ?? "",
  "Content-Type": "application/json",
};

const PD_BASE =
  (Deno.env.get("PAYDUNYA_MODE") ?? "test") === "live"
    ? "https://app.paydunya.com/api/v1"
    : "https://app.paydunya.com/sandbox-api/v1";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Requête invalide." }, 400);
  }

  const { offer, tg, operator, fullName, phone, email } = body ?? {};
  if (!offer || !operator || !phone) {
    return json({ error: "Champs manquants (offre, opérateur, numéro)." }, 400);
  }

  const { data: plan } = await admin
    .from("plans")
    .select("id, name, price, group_id, interval_days")
    .eq("id", offer)
    .maybeSingle();
  if (!plan) return json({ error: "Offre introuvable." }, 404);

  // 1) Créer la facture.
  const invoiceBody = {
    invoice: {
      items: {
        item_0: {
          name: plan.name,
          quantity: 1,
          unit_price: String(plan.price),
          total_price: String(plan.price),
          description: plan.name,
        },
      },
      total_amount: Number(plan.price),
      description: `Abonnement : ${plan.name}`,
    },
    store: { name: "Paylika" },
    custom_data: {
      plan_id: plan.id,
      group_id: plan.group_id,
      interval_days: plan.interval_days,
      telegram_user_id: tg ?? "",
    },
    actions: {
      callback_url: `${FUNCTIONS_BASE}/paydunya-webhook`,
      return_url: "https://t.me/Paylikabot",
      cancel_url: "https://t.me/Paylikabot",
    },
  };

  const inv = await fetch(`${PD_BASE}/checkout-invoice/create`, {
    method: "POST",
    headers: H,
    body: JSON.stringify(invoiceBody),
  }).then((r) => r.json());

  if (inv.response_code !== "00" || !inv.token) {
    console.error("invoice error", JSON.stringify(inv));
    return json({ error: "Création de la facture impossible.", detail: inv }, 502);
  }
  const token = inv.token;

  // 2) Déclencher le paiement sur l'opérateur.
  let endpoint = "";
  let payload: Record<string, unknown> = {};
  if (operator === "wave") {
    endpoint = "softpay/wave-senegal";
    payload = {
      wave_senegal_fullName: fullName || "Client Paylika",
      wave_senegal_email: email || "client@paylika.app",
      wave_senegal_phone: phone,
      wave_senegal_payment_token: token,
    };
  } else if (operator === "orange_money") {
    endpoint = "softpay/orange-money-senegal";
    payload = {
      customer_name: fullName || "Client Paylika",
      customer_email: email || "client@paylika.app",
      phone_number: phone,
      customer_address: "Dakar",
      invoice_token: token,
    };
  } else {
    return json({ error: "Opérateur non supporté." }, 400);
  }

  const sp = await fetch(`${PD_BASE}/${endpoint}`, {
    method: "POST",
    headers: H,
    body: JSON.stringify(payload),
  }).then((r) => r.json());

  // Wave renvoie généralement { success, url } (URL Wave à ouvrir).
  return json({
    ok: sp.success === true || sp.success === "true" || !!sp.url,
    url: sp.url ?? null,
    message: sp.message ?? "",
    token,
    raw: sp,
  });
});
