// Paylika — Le propriétaire donne/renvoie manuellement un accès à un groupe.
// Crée un lien d'invitation éphémère (usage unique, 24h) et l'envoie en privé
// au membre si possible ; renvoie aussi le lien pour que le proprio le copie.
// Sert au dépannage (app qui bug) et à l'accès gratuit offert.
//
// Appel : POST { groupId, telegramUserId? }  + header Authorization: Bearer <jwt>
// Secret : TELEGRAM_BOT_TOKEN

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "content-type": "application/json" } });

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const tg = (method: string, payload: Record<string, unknown>) =>
  fetch(`https://api.telegram.org/bot${TG_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then((r) => r.json());

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "Non authentifié." }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData } = await userClient.auth.getUser();
    const owner = userData.user?.id;
    if (!owner) return json({ error: "Session invalide." }, 401);

    const body = await req.json().catch(() => null);
    const groupId = String(body?.groupId ?? "");
    const telegramUserId = body?.telegramUserId ? Number(body.telegramUserId) : null;
    if (!groupId) return json({ error: "Groupe manquant." }, 400);

    // Le groupe appartient-il bien à ce propriétaire ?
    const { data: g } = await admin.from("groups").select("owner_id").eq("id", groupId).maybeSingle();
    if (!g || g.owner_id !== owner) return json({ error: "Groupe non autorisé." }, 403);

    const { data: conn } = await admin
      .from("telegram_connections")
      .select("chat_id")
      .eq("group_id", groupId)
      .maybeSingle();
    if (!conn?.chat_id) return json({ error: "Groupe non connecté à Telegram." }, 400);

    // Lien éphémère : usage unique + expire dans 24h.
    const expire = Math.floor(Date.now() / 1000) + 24 * 3600;
    const link = await tg("createChatInviteLink", {
      chat_id: conn.chat_id,
      member_limit: 1,
      expire_date: expire,
      name: "paylika-acces",
    });
    const invite = link?.result?.invite_link;
    if (!invite) return json({ error: "Création du lien impossible (droits du bot ?).", detail: link }, 502);

    // Envoi en privé si on connaît la conversation du membre.
    let dmSent = false;
    if (telegramUserId) {
      const { data: tu } = await admin
        .from("telegram_users")
        .select("chat_id")
        .eq("telegram_user_id", telegramUserId)
        .maybeSingle();
      if (tu?.chat_id) {
        await tg("sendMessage", {
          chat_id: tu.chat_id,
          text: `Voici votre lien d'accès (usage unique, valable 24h) :\n${invite}`,
        });
        dmSent = true;
      }
    }

    return json({ ok: true, link: invite, dmSent });
  } catch (e) {
    return json({ error: "Erreur serveur.", detail: String(e) }, 500);
  }
});
