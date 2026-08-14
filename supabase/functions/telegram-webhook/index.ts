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
const FUNCTIONS_BASE = (Deno.env.get("SUPABASE_URL") ?? "").replace(
  ".supabase.co",
  ".functions.supabase.co",
);
// Public Paylika web app (branded checkout page).
const APP_URL = Deno.env.get("PAYLIKA_APP_URL") ?? "https://paylika.paylika-app.workers.dev";

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

/** group_id d'un chat Telegram relié (ou null). */
async function groupForChat(chatId: number): Promise<string | null> {
  const { data } = await admin
    .from("telegram_connections")
    .select("group_id")
    .eq("chat_id", chatId)
    .maybeSingle();
  return data?.group_id ?? null;
}

/** Enregistre / met à jour un membre observé dans le roster du groupe. */
async function recordMember(groupId: string, from: any) {
  if (!from || from.is_bot) return;
  const { data: g } = await admin
    .from("groups")
    .select("owner_id")
    .eq("id", groupId)
    .maybeSingle();
  await admin.from("group_members").upsert(
    {
      owner_id: g?.owner_id ?? null,
      group_id: groupId,
      telegram_user_id: from.id,
      username: from.username ?? null,
      first_name: from.first_name ?? null,
      last_seen: new Date().toISOString(),
      in_group: true,
    },
    { onConflict: "group_id,telegram_user_id" },
  );
}

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
    } else if (
      update.message?.chat &&
      (update.message.chat.type === "group" || update.message.chat.type === "supergroup")
    ) {
      await handleGroupMessage(update.message);
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

  // "/start <offerId>" — deep-link payload from an offer's payment link.
  const parts = (message.text ?? "").split(" ");
  const payload = parts.length > 1 ? parts[1].trim() : "";

  await admin.from("telegram_users").upsert(
    {
      telegram_user_id: from.id,
      chat_id: chatId,
      username: from.username ?? null,
      first_name: from.first_name ?? null,
    },
    { onConflict: "telegram_user_id" },
  );

  if (payload) {
    // Offer deep link → present a "Pay" button (Paylika branded checkout page).
    const payUrl = `${APP_URL}/pay/${encodeURIComponent(payload)}?tg=${from.id}`;
    await tg("sendMessage", {
      chat_id: chatId,
      text:
        "💳 <b>Paylika</b>\n\nPour accéder au groupe, effectuez votre paiement ci-dessous. " +
        "Dès qu'il est confirmé, vous recevrez votre lien d'accès ici même.",
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "Payer maintenant", url: payUrl }]],
      },
    });
  } else {
    await sendMessage(
      chatId,
      "👋 Bienvenue sur <b>Paylika</b>.\n\nVotre accès sera géré automatiquement une fois votre paiement confirmé.",
    );
  }
}

async function handleGroupMessage(message: any) {
  const groupId = await groupForChat(message.chat.id);
  if (!groupId) return; // groupe non relié

  // Nouveaux arrivants (message de service).
  if (Array.isArray(message.new_chat_members) && message.new_chat_members.length) {
    for (const m of message.new_chat_members) await recordMember(groupId, m);
  }
  // Départ (message de service).
  if (message.left_chat_member) {
    await admin
      .from("group_members")
      .update({ in_group: false })
      .eq("group_id", groupId)
      .eq("telegram_user_id", message.left_chat_member.id);
  }
  // Activité normale : on note l'auteur comme membre présent.
  if (message.from) await recordMember(groupId, message.from);
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

  if (active) {
    await approveJoin(chatId, userId);
    await recordMember(conn.group_id, reqEvt.from);
  } else {
    await declineJoin(chatId, userId);
  }
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
