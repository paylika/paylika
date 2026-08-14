// Paylika — UniTech Pay : webhook de confirmation.
// Vérifie la signature HMAC, puis crée l'abonnement + le paiement (commission
// 10 %) et envoie le lien d'accès Telegram.
//
// Secrets : UNITECH_API_KEY (secret HMAC), TELEGRAM_BOT_TOKEN

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const COMMISSION_RATE = 0.1;

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const API_KEY = Deno.env.get("UNITECH_API_KEY") ?? "";
const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const tg = (method: string, payload: Record<string, unknown>) =>
  fetch(`https://api.telegram.org/bot${TG_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then((r) => r.json());

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  // Diagnostic (dev) : état du dernier paiement (?debug=last).
  const dbgUrl = new URL(req.url);
  if (dbgUrl.searchParams.get("debug") === "last") {
    const { data: intent } = await admin
      .from("payment_intents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    let plan: any = null;
    let conn: any = null;
    let tu: any = null;
    if (intent?.plan_id) {
      plan = (await admin.from("plans").select("id, name, group_id, owner_id").eq("id", intent.plan_id).maybeSingle()).data;
      if (plan?.group_id) {
        conn = (await admin.from("telegram_connections").select("chat_id, status, owner_id").eq("group_id", plan.group_id).maybeSingle()).data;
      }
    }
    if (intent?.telegram_user_id) {
      tu = (await admin.from("telegram_users").select("chat_id").eq("telegram_user_id", intent.telegram_user_id).maybeSingle()).data;
    }
    return new Response(
      JSON.stringify({ intent, plan, connection: conn, telegram_user: tu }, null, 2),
      { headers: { "content-type": "application/json" } },
    );
  }

  // Redirection navigateur après paiement → page de remerciement.
  if (req.method === "GET") {
    return new Response(
      `<!doctype html><html lang="fr"><head><meta charset="utf-8">` +
        `<meta name="viewport" content="width=device-width,initial-scale=1">` +
        `<title>Paylika — Paiement reçu</title></head>` +
        `<body style="font-family:system-ui,sans-serif;background:#F4EDE3;color:#211B18;` +
        `display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;text-align:center">` +
        `<div><div style="font-size:40px">✅</div><h2>Paiement reçu</h2>` +
        `<p style="color:#8A817A">Votre accès arrive sur Telegram.</p>` +
        `<a href="https://t.me/Paylikabot" style="color:#7B1126;font-weight:600">Retourner sur Telegram</a></div></body></html>`,
      { headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }

  const raw = await req.text();

  // Vérification de signature (si présente).
  const sigHeader =
    req.headers.get("x-unitechpay-signature") ??
    req.headers.get("X-UnitechPay-Signature") ??
    "";
  if (API_KEY && sigHeader) {
    const expected = await hmacHex(API_KEY, raw);
    if (expected.toLowerCase() !== sigHeader.toLowerCase()) {
      console.error("signature mismatch");
      return new Response("bad signature", { status: 401 });
    }
  }

  let evt: any;
  try {
    evt = JSON.parse(raw);
  } catch {
    return new Response("bad request", { status: 400 });
  }

  try {
    const completed =
      evt.status === "completed" ||
      evt.event === "payment_success" ||
      evt.event === "payment_completed";
    if (completed) {
      await grantAccess(evt);
    }
  } catch (e) {
    console.error("webhook error:", e);
  }

  return new Response("ok");
});

async function grantAccess(evt: any) {
  const reference = evt.reference as string;

  // Idempotence.
  const { data: seen } = await admin
    .from("payments")
    .select("id")
    .eq("provider_ref", reference)
    .maybeSingle();
  if (seen) return;

  const cols = "plan_id, group_id, telegram_user_id, amount, reference";
  let intent: any = null;
  // 1) par référence
  intent = (await admin.from("payment_intents").select(cols).eq("reference", reference).maybeSingle()).data;
  // 2) par transaction_id
  if (!intent && evt.transaction_id != null) {
    intent = (await admin
      .from("payment_intents")
      .select(cols)
      .eq("transaction_id", String(evt.transaction_id))
      .maybeSingle()).data;
  }
  // 3) repli : dernier intent 'pending' du même montant
  if (!intent && evt.amount != null) {
    intent = (await admin
      .from("payment_intents")
      .select(cols)
      .eq("status", "pending")
      .eq("amount", Number(evt.amount))
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()).data;
  }
  if (!intent?.plan_id) {
    console.error("intent introuvable pour", reference, evt.transaction_id);
    return;
  }

  const { data: plan } = await admin
    .from("plans")
    .select("interval_days, price, owner_id")
    .eq("id", intent.plan_id)
    .maybeSingle();
  const intervalDays = plan?.interval_days ?? 30;
  const owner = plan?.owner_id ?? null; // le paiement appartient au proprio de l'offre
  const amount = Number(evt.amount ?? intent.amount ?? plan?.price ?? 0);
  const telegramUserId = intent.telegram_user_id as number | null;

  // Résoudre / créer l'abonné (scopé au propriétaire).
  let subscriberId: string | null = null;
  let chatId: number | null = null;
  if (telegramUserId) {
    const { data: tu } = await admin
      .from("telegram_users")
      .select("chat_id, username, first_name")
      .eq("telegram_user_id", telegramUserId)
      .maybeSingle();
    chatId = tu?.chat_id ?? null;

    const { data: existing } = await admin
      .from("subscribers")
      .select("id")
      .eq("owner_id", owner)
      .eq("telegram_user_id", telegramUserId)
      .maybeSingle();
    subscriberId = existing?.id ?? null;
    if (!subscriberId) {
      const { data: sub } = await admin
        .from("subscribers")
        .insert({
          owner_id: owner,
          full_name: tu?.first_name ?? "Abonné Telegram",
          telegram_username: tu?.username ?? null,
          telegram_user_id: telegramUserId,
        })
        .select("id")
        .single();
      subscriberId = sub.id;
    }
  }

  const now = Date.now();
  const { data: subscription } = await admin
    .from("subscriptions")
    .insert({
      owner_id: owner,
      subscriber_id: subscriberId,
      plan_id: intent.plan_id,
      group_id: intent.group_id ?? null,
      status: "active",
      started_at: new Date(now).toISOString(),
      expires_at: new Date(now + intervalDays * 86400000).toISOString(),
    })
    .select("id")
    .single();

  const commission = Math.round(amount * COMMISSION_RATE);
  await admin.from("payments").insert({
    owner_id: owner,
    subscription_id: subscription?.id ?? null,
    subscriber_id: subscriberId,
    amount,
    currency: "XOF",
    method: "unitech",
    provider: "unitech",
    provider_ref: reference,
    commission,
    net_amount: amount - commission,
    status: "completed",
    paid_at: new Date(now).toISOString(),
  });

  await admin
    .from("payment_intents")
    .update({ status: "completed" })
    .eq("reference", intent.reference ?? reference);

  // Accès Telegram : lien d'invitation à usage unique en privé.
  if (intent.group_id && chatId) {
    const { data: conn } = await admin
      .from("telegram_connections")
      .select("chat_id")
      .eq("group_id", intent.group_id)
      .maybeSingle();
    if (conn?.chat_id) {
      const link = await tg("createChatInviteLink", {
        chat_id: conn.chat_id,
        member_limit: 1,
        name: `paylika-${reference.slice(0, 10)}`,
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
