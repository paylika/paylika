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
  // Diagnostic / récupération manuelle du dernier paiement.
  if (req.method === "GET") {
    const dbg = new URL(req.url).searchParams.get("debug");
    if (dbg === "last") return await debugLast();
    if (dbg === "resend") return await debugResend();
    if (dbg === "members") return await debugMembers();
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
  const evtRef = (evt.reference ?? "") as string;

  const cols = "plan_id, group_id, telegram_user_id, amount, reference";
  let intent: any = null;
  // 1) par référence (si UniTech en fournit une)
  if (evtRef) {
    intent = (await admin.from("payment_intents").select(cols).eq("reference", evtRef).maybeSingle()).data;
  }
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
    console.error("intent introuvable pour", evtRef, evt.transaction_id);
    return;
  }

  // Référence canonique : celle de l'intent (le webhook UniTech ne renvoie pas
  // toujours `reference`). Sert au provider_ref ET à l'anti-doublon.
  const reference = (intent.reference ||
    evtRef ||
    (evt.transaction_id != null ? `txn_${evt.transaction_id}` : "")) as string;

  // Idempotence : ce paiement est-il déjà enregistré ?
  if (reference) {
    const { data: seen } = await admin
      .from("payments")
      .select("id")
      .eq("provider_ref", reference)
      .maybeSingle();
    if (seen) return;
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
      const { data: sub, error: subErr } = await admin
        .from("subscribers")
        .insert({
          owner_id: owner,
          full_name: tu?.first_name ?? "Abonné Telegram",
          telegram_username: tu?.username ?? null,
          telegram_user_id: telegramUserId,
        })
        .select("id")
        .maybeSingle();
      if (subErr) console.error("insert subscriber:", subErr.message);
      subscriberId = sub?.id ?? null;
    }
  }

  // 1) LIVRER L'ACCÈS EN PRIORITÉ — indépendant du journal comptable, pour que
  //    le lien parte même si l'enregistrement du paiement échoue.
  await deliverAccess(intent.group_id ?? null, chatId, reference);

  // 2) Journaliser abonnement + paiement (best-effort, erreurs remontées).
  const now = Date.now();
  const { data: subscription, error: subsErr } = await admin
    .from("subscriptions")
    .insert({
      owner_id: owner,
      subscriber_id: subscriberId,
      plan_id: intent.plan_id,
      group_id: intent.group_id ?? null,
      status: "active",
      started_at: new Date(now).toISOString(),
      // interval 0 = paiement unique → accès permanent (pas d'expiration/kick).
      expires_at: intervalDays > 0 ? new Date(now + intervalDays * 86400000).toISOString() : null,
    })
    .select("id")
    .maybeSingle();
  if (subsErr) console.error("insert subscription:", subsErr.message);

  const commission = Math.round(amount * COMMISSION_RATE);
  const { error: payErr } = await admin.from("payments").insert({
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
  if (payErr) console.error("insert payment:", payErr.message);

  await admin
    .from("payment_intents")
    .update({ status: "completed" })
    .eq("reference", intent.reference ?? reference);
}

/** Envoie le lien d'accès Telegram (usage unique) au payeur en privé. */
async function deliverAccess(
  groupId: string | null,
  chatId: number | null,
  reference: string,
) {
  if (!groupId || !chatId) {
    console.error("livraison impossible (group/chat manquant)", { groupId, chatId });
    return;
  }
  const { data: conn } = await admin
    .from("telegram_connections")
    .select("chat_id")
    .eq("group_id", groupId)
    .maybeSingle();
  if (!conn?.chat_id) {
    console.error("aucune connexion Telegram pour le groupe", groupId);
    return;
  }
  const link = await tg("createChatInviteLink", {
    chat_id: conn.chat_id,
    member_limit: 1,
    name: `paylika-${String(reference).slice(0, 10)}`,
  });
  const invite = link?.result?.invite_link;
  if (!invite) {
    console.error("createChatInviteLink a échoué:", JSON.stringify(link));
    return;
  }
  await tg("sendMessage", {
    chat_id: chatId,
    text: `✅ Paiement confirmé !\n\nVoici votre lien d'accès (usage unique) :\n${invite}`,
  });
}

/**
 * Diagnostic (GET ?debug=last) : suit le dernier paiement étape par étape
 * pour identifier POURQUOI le lien d'accès n'est pas parti.
 */
async function debugLast(): Promise<Response> {
  const trace: Record<string, unknown> = {};

  const { data: intent } = await admin
    .from("payment_intents")
    .select("reference, transaction_id, plan_id, group_id, telegram_user_id, amount, status, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  trace.intent = intent ?? "AUCUN INTENT — le paiement n'a pas été créé (unitech-create).";

  if (intent?.telegram_user_id) {
    const { data: tu } = await admin
      .from("telegram_users")
      .select("chat_id, username, first_name")
      .eq("telegram_user_id", intent.telegram_user_id)
      .maybeSingle();
    trace.telegram_user = tu ?? "ABSENT — le payeur n'a pas /start le bot : impossible de lui envoyer le lien.";
  } else {
    trace.telegram_user = "PAS DE telegram_user_id dans l'intent (lien ouvert sans passer par le bot).";
  }

  if (intent?.group_id) {
    const { data: conn } = await admin
      .from("telegram_connections")
      .select("chat_id, title, status")
      .eq("group_id", intent.group_id)
      .maybeSingle();
    trace.connection = conn ?? "AUCUNE connexion Telegram pour ce groupe : rien à quoi rattacher le lien.";
    if (conn?.chat_id) {
      const link = await tg("createChatInviteLink", {
        chat_id: conn.chat_id,
        member_limit: 1,
        name: "paylika-debug",
      });
      trace.invite_test = link?.ok
        ? { ok: true, link: link.result?.invite_link }
        : { ok: false, error: link?.description ?? "échec — le bot manque probablement du droit « Inviter via un lien »." };
    }
  } else {
    trace.connection = "PAS DE group_id dans l'intent.";
  }

  if (intent?.reference) {
    const { data: pay } = await admin
      .from("payments")
      .select("id, status, paid_at")
      .eq("provider_ref", intent.reference)
      .maybeSingle();
    trace.payment_recorded = pay ?? "NON — insertion du paiement échouée (voir payments_schema ci-dessous) ou webhook non appelé.";
  }

  // Sonde de schéma : les colonnes utilisées par l'insertion existent-elles ?
  const probe = await admin
    .from("payments")
    .select("provider, provider_ref, commission, net_amount, owner_id")
    .limit(1);
  trace.payments_schema = probe.error
    ? `⚠️ COLONNE MANQUANTE — exécute payments_schema.sql PUIS multi_tenant.sql : ${probe.error.message}`
    : "OK (toutes les colonnes présentes)";

  // Derniers paiements RÉELLEMENT enregistrés (toutes références confondues) :
  // tranche le faux négatif dû à une référence webhook ≠ référence intent.
  const { data: recent } = await admin
    .from("payments")
    .select("provider_ref, amount, status, paid_at")
    .order("paid_at", { ascending: false })
    .limit(3);
  trace.recent_payments = recent?.length ? recent : "AUCUN — la table payments est vide.";

  // Si vraiment aucun paiement, on tente une insertion-sonde pour capturer
  // l'erreur SQL exacte, puis on la supprime.
  if (!recent?.length && intent?.plan_id) {
    const { data: pl } = await admin
      .from("plans")
      .select("owner_id")
      .eq("id", intent.plan_id)
      .maybeSingle();
    const probeRef = "debug-probe-cleanup";
    const { error: insErr } = await admin.from("payments").insert({
      owner_id: pl?.owner_id ?? null,
      amount: 1,
      currency: "XOF",
      method: "debug",
      provider: "debug",
      provider_ref: probeRef,
      commission: 0,
      net_amount: 1,
      status: "completed",
      paid_at: new Date().toISOString(),
    });
    trace.insert_probe = insErr
      ? `ÉCHEC: ${insErr.message} | details: ${insErr.details ?? ""} | hint: ${insErr.hint ?? ""} | code: ${insErr.code ?? ""}`
      : "OK (l'insertion fonctionne — le souci vient d'ailleurs)";
    if (!insErr) await admin.from("payments").delete().eq("provider_ref", probeRef);
  }

  return new Response(JSON.stringify(trace, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/** Renvoie manuellement le lien d'accès du dernier paiement (GET ?debug=resend). */
async function debugResend(): Promise<Response> {
  const { data: intent } = await admin
    .from("payment_intents")
    .select("group_id, telegram_user_id, reference")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!intent) {
    return new Response(JSON.stringify({ error: "aucun intent" }), {
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
  let chatId: number | null = null;
  if (intent.telegram_user_id) {
    const { data: tu } = await admin
      .from("telegram_users")
      .select("chat_id")
      .eq("telegram_user_id", intent.telegram_user_id)
      .maybeSingle();
    chatId = tu?.chat_id ?? null;
  }
  await deliverAccess(intent.group_id ?? null, chatId, intent.reference ?? "resend");
  return new Response(
    JSON.stringify({ ok: true, sent_to_chat: chatId, group_id: intent.group_id }, null, 2),
    { headers: { "content-type": "application/json; charset=utf-8" } },
  );
}

/** Diagnostic roster (GET ?debug=members) : le bot enregistre-t-il les membres ? */
async function debugMembers(): Promise<Response> {
  const trace: Record<string, unknown> = {};

  // 1) Config webhook Telegram : le type "message" est-il bien livré ?
  const info = await tg("getWebhookInfo", {});
  trace.telegram_webhook = {
    url: info?.result?.url ?? null,
    allowed_updates: info?.result?.allowed_updates ?? "(défaut = tous sauf chat_member)",
    pending_update_count: info?.result?.pending_update_count ?? 0,
    last_error: info?.result?.last_error_message ?? null,
  };

  // 2) group_members réellement enregistrés (toutes lignes, via service_role).
  const { data: members, error } = await admin
    .from("group_members")
    .select("group_id, owner_id, telegram_user_id, first_name, username, last_seen, in_group")
    .order("last_seen", { ascending: false })
    .limit(10);
  trace.group_members = error ? `ERREUR: ${error.message}` : members ?? [];
  trace.group_members_count = members?.length ?? 0;

  // 3) Abonnements récents + telegram_user_id de l'abonné (source du badge).
  const { data: subs, error: subErr } = await admin
    .from("subscriptions")
    .select("id, owner_id, group_id, status, expires_at, subscriber_id, subscribers(telegram_user_id, full_name, owner_id)")
    .order("created_at", { ascending: false })
    .limit(6);
  trace.subscriptions = subErr ? `ERREUR: ${subErr.message}` : subs ?? [];

  // 4) Abonnés récents (pour voir si telegram_user_id est bien renseigné).
  const { data: subscribers } = await admin
    .from("subscribers")
    .select("id, full_name, telegram_user_id, owner_id, created_at")
    .order("created_at", { ascending: false })
    .limit(10);
  trace.subscribers = subscribers ?? [];

  return new Response(JSON.stringify(trace, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
