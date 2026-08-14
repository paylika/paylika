// Paylika — Retire un membre d'un groupe (retrait manuel depuis l'app).
// Bannit puis débannit (kick : il peut revenir) et lui envoie le lien de
// paiement en privé s'il a déjà parlé au bot → après paiement il revient.
//
// Appel : POST { groupId, telegramUserId }  + header Authorization: Bearer <jwt>
// Secret : TELEGRAM_BOT_TOKEN

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const BOT_URL = "https://t.me/Paylikabot";

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
    const telegramUserId = Number(body?.telegramUserId ?? 0);
    if (!groupId || !telegramUserId) return json({ error: "Paramètres manquants." }, 400);

    // Le groupe appartient-il bien à ce propriétaire ?
    const { data: g } = await admin
      .from("groups")
      .select("owner_id")
      .eq("id", groupId)
      .maybeSingle();
    if (!g || g.owner_id !== owner) return json({ error: "Groupe non autorisé." }, 403);

    const { data: conn } = await admin
      .from("telegram_connections")
      .select("chat_id")
      .eq("group_id", groupId)
      .maybeSingle();
    if (!conn?.chat_id) return json({ error: "Groupe non connecté à Telegram." }, 400);

    // Kick : bannir puis débannir → retiré mais peut revenir après paiement.
    await tg("banChatMember", { chat_id: conn.chat_id, user_id: telegramUserId });
    await tg("unbanChatMember", { chat_id: conn.chat_id, user_id: telegramUserId, only_if_banned: true });

    await admin
      .from("group_members")
      .update({ in_group: false })
      .eq("group_id", groupId)
      .eq("telegram_user_id", telegramUserId);

    // Relance de paiement en privé (si le membre a déjà parlé au bot).
    let dm = false;
    const { data: tu } = await admin
      .from("telegram_users")
      .select("chat_id")
      .eq("telegram_user_id", telegramUserId)
      .maybeSingle();
    if (tu?.chat_id) {
      const { data: plan } = await admin
        .from("plans")
        .select("id")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (plan?.id) {
        await tg("sendMessage", {
          chat_id: tu.chat_id,
          text:
            "Votre accès au groupe a pris fin. Pour revenir, réglez votre abonnement ici :\n" +
            `${BOT_URL}?start=${plan.id}`,
        });
        dm = true;
      }
    }

    return json({ ok: true, notified: dm });
  } catch (e) {
    return json({ error: "Erreur serveur.", detail: String(e) }, 500);
  }
});
