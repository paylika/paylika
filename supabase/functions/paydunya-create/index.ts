// Paylika — crée une facture de paiement PayDunya pour une offre, puis
// redirige l'utilisateur vers la page de paiement (Wave / Orange Money / carte).
//
// Appel :  GET .../paydunya-create?offer=<planId>&tg=<telegramUserId>
// Secrets : PAYDUNYA_MASTER_KEY, PAYDUNYA_PRIVATE_KEY, PAYDUNYA_TOKEN
//
// Déploiement dashboard : Create function "paydunya-create", coller ce fichier, Deploy.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const FUNCTIONS_BASE = SUPABASE_URL.replace(".supabase.co", ".functions.supabase.co");

const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PAYDUNYA_HEADERS = {
  "PAYDUNYA-MASTER-KEY": Deno.env.get("PAYDUNYA_MASTER_KEY") ?? "",
  "PAYDUNYA-PRIVATE-KEY": Deno.env.get("PAYDUNYA_PRIVATE_KEY") ?? "",
  "PAYDUNYA-TOKEN": Deno.env.get("PAYDUNYA_TOKEN") ?? "",
  "Content-Type": "application/json",
};

// PAYDUNYA_MODE = "test" (sandbox, défaut) ou "live" (production).
const PD_BASE =
  (Deno.env.get("PAYDUNYA_MODE") ?? "test") === "live"
    ? "https://app.paydunya.com/api/v1"
    : "https://app.paydunya.com/sandbox-api/v1";

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // Diagnostic (dev) : vérifie que les secrets sont bien lus, sans exposer les valeurs.
  if (url.searchParams.get("debug") === "keys") {
    const mk = Deno.env.get("PAYDUNYA_MASTER_KEY") ?? "";
    const pk = Deno.env.get("PAYDUNYA_PRIVATE_KEY") ?? "";
    const tk = Deno.env.get("PAYDUNYA_TOKEN") ?? "";
    const info = (v: string) => ({
      present: v.length > 0,
      length: v.length,
      hasWhitespace: /\s/.test(v),
      head: v.slice(0, 4),
    });
    return Response.json({
      version: "diag-1",
      master: info(mk),
      private: info(pk),
      token: info(tk),
    });
  }

  const planId = url.searchParams.get("offer");
  const tg = url.searchParams.get("tg"); // telegram user id (optionnel)

  if (!planId) return new Response("Paramètre 'offer' manquant.", { status: 400 });

  const { data: plan } = await admin
    .from("plans")
    .select("id, name, price, currency, group_id, interval_days")
    .eq("id", planId)
    .maybeSingle();

  if (!plan) return new Response("Offre introuvable.", { status: 404 });

  const price = Number(plan.price);
  const body = {
    invoice: {
      items: {
        item_0: {
          name: plan.name,
          quantity: 1,
          unit_price: String(price),
          total_price: String(price),
          description: plan.name,
        },
      },
      total_amount: price,
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

  const res = await fetch(
    `${PD_BASE}/checkout-invoice/create`,
    { method: "POST", headers: PAYDUNYA_HEADERS, body: JSON.stringify(body) },
  );
  const data = await res.json();

  if (data.response_code !== "00" || !data.response_text) {
    console.error("PayDunya create error:", JSON.stringify(data));
    // DEBUG (dev): renvoie l'erreur PayDunya dans le corps pour diagnostic.
    return new Response(JSON.stringify(data), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }

  // Redirige le navigateur vers la page de paiement PayDunya.
  return Response.redirect(data.response_text, 302);
});
