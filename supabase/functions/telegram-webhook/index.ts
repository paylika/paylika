// Paylika — Telegram webhook (Supabase Edge Function, self-contained single file
// so it can be pasted straight into the Supabase dashboard function editor).
//
// Handles:
//  1. /start         -> capture the user (chat_id + telegram id) to DM them later
//  2. join request   -> approve only if the user has an ACTIVE subscription for that group
//  3. my_chat_member -> register a chat where the bot became admin (to link it in-app)
//
// Secrets required: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
const API = `https://api.telegram.org/bot${TOKEN}`;

// Service-role client — bypasses RLS (server-side only).
const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function tg(method: string, payload: Record<string, unknown>) {
  if (!TOKEN) throw new Error("TELEGRAM_BOT_TOKEN manquant.");
  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.ok) console.error("Telegram error:", method, JSON.stringify(data));
  return data;
}

const sendMessage = (chat_id: number, text: string) =>
  tg("sendMessage", { chat_id, text, parse_mode: "HTML" });
const approveJoin = (chat_id: number, user_id: number) =>
  tg("approveChatJoinRequest", { chat_id, user_id });
const declineJoin = (chat_id: number, user_id: number) =>
  tg("declineChatJoinRequest", { chat_id, user_id });

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
    console.error("handler error:", e); // never fail the response
  }

  return new Response("ok");
});

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
  await sendMessage(
    chatId,
    "👋 Bienvenue sur <b>Paylika</b>.\n\nVotre accès sera géré automatiquement une fois votre paiement confirmé.",
  );
}

async function handleJoinRequest(reqEvt: any) {
  const chatId = reqEvt.chat.id;
  const userId = reqEvt.from.id;

  const { data: conn } = await admin
    .from("telegram_connections")
    .select("group_id")
    .eq("chat_id", chatId)
    .maybeSingle();
  if (!conn?.group_id) return; // chat not linked yet

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

  if (active) await approveJoin(chatId, userId);
  else await declineJoin(chatId, userId);
}

async function handleMyChatMember(evt: any) {
  const chat = evt.chat;
  const isAdmin = evt.new_chat_member?.status === "administrator";
  await admin.from("telegram_connections").upsert(
    {
      chat_id: chat.id,
      title: chat.title ?? null,
      status: isAdmin ? "pending" : "removed",
    },
    { onConflict: "chat_id" },
  );
}
