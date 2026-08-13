// Paylika — webhook PayDunya (IPN). Quand un paiement est confirmé :
//  1. re-confirme la facture auprès de PayDunya (source de vérité)
//  2. crée/prolonge l'abonnement + enregistre le paiement (commission 10 %)
//  3. donne l'accès Telegram (lien d'invitation à usage unique envoyé en privé)
//
// Secrets : PAYDUNYA_MASTER_KEY, PAYDUNYA_PRIVATE_KEY, PAYDUNYA_TOKEN, TELEGRAM_BOT_TOKEN
// Déploiement dashboard : Create function "paydunya-webhook", coller ce fichier, Deploy.
// (Pas de header secret ici : PayDunya n'en envoie pas — on re-confirme via l'API.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const COMMISSION_RATE = 0.1; // 10 % Paylika

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const PAYDUNYA_HEADERS = {
  "PAYDUNYA-MASTER-KEY": Deno.env.get("PAYDUNYA_MASTER_KEY") ?? "",
  "PAYDUNYA-PRIVATE-KEY": Deno.env.get("PAYDUNYA_PRIVATE_KEY") ?? "",
  "PAYDUNYA-TOKEN": Deno.env.get("PAYDUNYA_TOKEN") ?? "",
};

const PD_BASE =
  (Deno.env.get("PAYDUNYA_MODE") ?? "test") === "live"
    ? "https://app.paydunya.com/api/v1"
    : "https://app.paydunya.com/sandbox-api/v1";

const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const tg = (method: string, payload: Record<string, unknown>) =>
  fetch(`https://api.telegram.org/bot${TG_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then((r) => r.json());

Deno.serve(async (req) => {
  // Extract the invoice token from the IPN (form-encoded or JSON).
  let token: string | null = null;
  try {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const j = await req.json();
      token = j?.data?.invoice?.token ?? j?.invoice?.token ?? j?.token ?? null;
    } else {
      const form = await req.formData();
      token = (form.get("data[invoice][token]") ??
        form.get("token")) as string | null;
    }
  } catch (e) {
    console.error("IPN parse error:", e);
  }

  if (!token) return new Response("no token", { status: 200 });

  try {
    // Source of truth: re-confirm the invoice with PayDunya.
    const conf = await fetch(
      `https://app.paydunya.com/api/v1/checkout-invoice/confirm/${token}`,
      { headers: PAYDUNYA_HEADERS },
    ).then((r) => r.json());

    if (conf.status !== "completed") {
      return new Response("not completed", { status: 200 });
    }

    await grantAccess(token, conf);
  } catch (e) {
    console.error("webhook error:", e);
  }

  return new Response("ok"); // always 200
});

async function grantAccess(token: string, conf: any) {
  // Idempotency: this payment reference already processed?
  const { data: seen } = await admin
    .from("payments")
    .select("id")
    .eq("provider_ref", token)
    .maybeSingle();
  if (seen) return;

  const custom = conf.custom_data ?? {};
  const planId = custom.plan_id as string | undefined;
  const groupId = custom.group_id as string | undefined;
  const intervalDays = Number(custom.interval_days) || 30;
  const telegramUserId = custom.telegram_user_id
    ? Number(custom.telegram_user_id)
    : null;
  const amount = Number(conf.invoice?.total_amount ?? 0);
  const currency = "XOF";

  if (!planId) {
    console.error("custom_data.plan_id manquant");
    return;
  }

  // Resolve or create the subscriber from the Telegram user.
  let subscriberId: string | null = null;
  let chatId: number | null = null;
  if (telegramUserId) {
    const { data: tu } = await admin
      .from("telegram_users")
      .select("chat_id, username, first_name, subscriber_id")
      .eq("telegram_user_id", telegramUserId)
      .maybeSingle();
    chatId = tu?.chat_id ?? null;
    subscriberId = tu?.subscriber_id ?? null;

    if (!subscriberId) {
      const { data: sub } = await admin
        .from("subscribers")
        .insert({
          full_name: tu?.first_name ?? "Abonné Telegram",
          telegram_username: tu?.username ?? null,
          telegram_user_id: telegramUserId,
        })
        .select("id")
        .single();
      subscriberId = sub.id;
      if (tu) {
        await admin
          .from("telegram_users")
          .update({ subscriber_id: subscriberId })
          .eq("telegram_user_id", telegramUserId);
      }
    }
  }

  // Create the active subscription.
  const now = Date.now();
  const expiresAt = new Date(now + intervalDays * 86400000).toISOString();
  const { data: subscription } = await admin
    .from("subscriptions")
    .insert({
      subscriber_id: subscriberId,
      plan_id: planId,
      group_id: groupId ?? null,
      status: "active",
      started_at: new Date(now).toISOString(),
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  // Record the payment with commission split.
  const commission = Math.round(amount * COMMISSION_RATE);
  await admin.from("payments").insert({
    subscription_id: subscription?.id ?? null,
    subscriber_id: subscriberId,
    amount,
    currency,
    method: "paydunya",
    provider: "paydunya",
    provider_ref: token,
    commission,
    net_amount: amount - commission,
    status: "completed",
    paid_at: new Date(now).toISOString(),
  });

  // Grant Telegram access: single-use invite link DM'd to the user.
  if (groupId && chatId) {
    const { data: conn } = await admin
      .from("telegram_connections")
      .select("chat_id")
      .eq("group_id", groupId)
      .maybeSingle();
    if (conn?.chat_id) {
      const link = await tg("createChatInviteLink", {
        chat_id: conn.chat_id,
        member_limit: 1,
        name: `paylika-${token.slice(0, 8)}`,
      });
      const invite = link?.result?.invite_link;
      if (invite) {
        await tg("sendMessage", {
          chat_id: chatId,
          text: `✅ Paiement confirmé !\n\nVoici votre lien d'accès (usage unique) :\n${invite}`,
        });
      }
    }
  }
}
