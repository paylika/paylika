// Paylika — Telegram webhook (Supabase Edge Function).
//
// Receives Telegram updates and:
//  1. /start        -> capture the user (chat_id + telegram id) so we can DM them later
//  2. join request  -> approve only if the user has an ACTIVE subscription for that group
//  3. my_chat_member-> register a chat where the bot was made admin (to link it in-app)
//
// Deploy:  supabase functions deploy telegram-webhook --no-verify-jwt
// Secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET  (see supabase/functions/README.md)

import { admin } from "../_shared/supabase.ts";
import { sendMessage, approveJoin, declineJoin } from "../_shared/telegram.ts";

const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");

Deno.serve(async (req) => {
  // Only Telegram (with our shared secret header) may call this.
  if (WEBHOOK_SECRET) {
    const got = req.headers.get("x-telegram-bot-api-secret-token");
    if (got !== WEBHOOK_SECRET) return new Response("forbidden", { status: 403 });
  }

  let update: any;
  try {
    update = await req.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }

  try {
    if (update.message?.text?.startsWith("/start")) {
      await handleStart(update.message);
    } else if (update.chat_join_request) {
      await handleJoinRequest(update.chat_join_request);
    } else if (update.my_chat_member) {
      await handleMyChatMember(update.my_chat_member);
    }
  } catch (e) {
    // Never fail the response, or Telegram will retry-storm.
    console.error("handler error:", e);
  }

  return new Response("ok");
});

/** /start — remember who this user is so we can message them later. */
async function handleStart(message: any) {
  const from = message.from;
  const chatId = message.chat.id;

  await admin.from("telegram_users").upsert(
    {
      telegram_user_id: from.id,
      chat_id: chatId,
      username: from.username ?? null,
      first_name: from.first_name ?? null,
    },
    { onConflict: "telegram_user_id" },
  );

  // TODO: read the deep-link payload ("/start <offerId>") to route straight to payment.
  await sendMessage(
    chatId,
    "👋 Bienvenue sur <b>Paylika</b>.\n\nVotre accès sera géré automatiquement une fois votre paiement confirmé.",
  );
}

/** Approve a join request only if the user has an active subscription for that group. */
async function handleJoinRequest(req: any) {
  const chatId = req.chat.id;
  const userId = req.from.id;

  // Which Paylika group is this Telegram chat linked to?
  const { data: conn } = await admin
    .from("telegram_connections")
    .select("group_id")
    .eq("chat_id", chatId)
    .maybeSingle();

  if (!conn?.group_id) {
    // Chat not linked yet — leave the request pending (owner links it in-app first).
    return;
  }

  // Find the subscriber behind this Telegram user.
  const { data: sub } = await admin
    .from("subscribers")
    .select("id")
    .eq("telegram_user_id", userId)
    .maybeSingle();

  let active = false;
  if (sub) {
    const { data: subscription } = await admin
      .from("subscriptions")
      .select("id")
      .eq("subscriber_id", sub.id)
      .eq("group_id", conn.group_id)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    active = !!subscription;
  }

  if (active) {
    await approveJoin(chatId, userId);
  } else {
    await declineJoin(chatId, userId);
    // TODO: DM the user a payment link (requires they have /started the bot).
  }
}

/** Register / update a chat where the bot's admin status changed. */
async function handleMyChatMember(evt: any) {
  const chat = evt.chat;
  const status = evt.new_chat_member?.status;
  const isAdmin = status === "administrator";

  await admin.from("telegram_connections").upsert(
    {
      chat_id: chat.id,
      title: chat.title ?? null,
      status: isAdmin ? "pending" : "removed",
    },
    { onConflict: "chat_id" },
  );
}
