// Thin wrapper around the Telegram Bot API.
// The token is read from the TELEGRAM_BOT_TOKEN secret — never hard-coded.

const TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const API = `https://api.telegram.org/bot${TOKEN}`;

export async function tg(method: string, payload: Record<string, unknown>) {
  if (!TOKEN) throw new Error("TELEGRAM_BOT_TOKEN manquant (secret non défini).");
  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.ok) console.error("Telegram API error:", method, JSON.stringify(data));
  return data;
}

export const sendMessage = (
  chat_id: number,
  text: string,
  extra: Record<string, unknown> = {},
) => tg("sendMessage", { chat_id, text, parse_mode: "HTML", ...extra });

export const approveJoin = (chat_id: number, user_id: number) =>
  tg("approveChatJoinRequest", { chat_id, user_id });

export const declineJoin = (chat_id: number, user_id: number) =>
  tg("declineChatJoinRequest", { chat_id, user_id });

const banMember = (chat_id: number, user_id: number) =>
  tg("banChatMember", { chat_id, user_id });

const unbanMember = (chat_id: number, user_id: number) =>
  tg("unbanChatMember", { chat_id, user_id, only_if_banned: true });

/** Kick = ban then unban, so the user can rejoin after paying again. */
export async function kickMember(chat_id: number, user_id: number) {
  await banMember(chat_id, user_id);
  await unbanMember(chat_id, user_id);
}

/** Single-use invite link handed to a paid user. */
export const createInviteLink = (chat_id: number, name?: string) =>
  tg("createChatInviteLink", { chat_id, member_limit: 1, name });
