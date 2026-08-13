// Paylika — tâche planifiée (à appeler ~1x/jour).
//  1. KICK-OUT : expire + retire du groupe Telegram les abonnements échus
//  2. RAPPELS : prévient les abonnés dont l'accès expire sous 3 jours
//  3. RETRAITS : exécute les retraits 'pending' via UniTech withdraw_funds
//
// Protégée par le secret CRON_SECRET (header x-cron-secret).
// Secrets : UNITECH_API_KEY, TELEGRAM_BOT_TOKEN, CRON_SECRET

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const API = "https://api.unitech.sn/api";
const API_KEY = Deno.env.get("UNITECH_API_KEY") ?? "";
const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const APP_URL = Deno.env.get("PAYLIKA_APP_URL") ?? "https://paylika.paylika-app.workers.dev";
const CRON_SECRET = Deno.env.get("CRON_SECRET");

const tg = (method: string, payload: Record<string, unknown>) =>
  fetch(`https://api.telegram.org/bot${TG_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then((r) => r.json());

const PAYOUT_METHOD: Record<string, string> = {
  wave: "wave",
  orange_money: "orange",
  free_money: "orange",
};

Deno.serve(async (req) => {
  if (CRON_SECRET && req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response("forbidden", { status: 403 });
  }

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const result = { kicked: 0, reminded: 0, paidOut: 0 };

  // ---- 1) KICK-OUT : abonnements actifs échus ----
  const { data: expired } = await admin
    .from("subscriptions")
    .select("id, group_id, plan_id, subscribers(telegram_user_id)")
    .eq("status", "active")
    .lt("expires_at", nowIso)
    .limit(300);

  for (const s of (expired ?? []) as any[]) {
    const uid = s.subscribers?.telegram_user_id;
    if (uid && s.group_id) {
      const { data: conn } = await admin
        .from("telegram_connections")
        .select("chat_id")
        .eq("group_id", s.group_id)
        .maybeSingle();
      if (conn?.chat_id) {
        // kick = ban puis unban (il pourra revenir après paiement)
        await tg("banChatMember", { chat_id: conn.chat_id, user_id: uid });
        await tg("unbanChatMember", { chat_id: conn.chat_id, user_id: uid, only_if_banned: true });
      }
      const { data: tu } = await admin
        .from("telegram_users")
        .select("chat_id")
        .eq("telegram_user_id", uid)
        .maybeSingle();
      if (tu?.chat_id) {
        await tg("sendMessage", {
          chat_id: tu.chat_id,
          text: "⛔ Votre accès a expiré. Renouvelez pour rejoindre le groupe :",
          reply_markup: {
            inline_keyboard: [[{ text: "Renouveler", url: `${APP_URL}/pay/${s.plan_id}?tg=${uid}` }]],
          },
        });
      }
    }
    await admin.from("subscriptions").update({ status: "expired" }).eq("id", s.id);
    result.kicked++;
  }

  // ---- 2) RAPPELS : expire sous 3 jours ----
  const soonIso = new Date(now + 3 * 86400000).toISOString();
  const { data: soon } = await admin
    .from("subscriptions")
    .select("plan_id, expires_at, subscribers(telegram_user_id)")
    .eq("status", "active")
    .gt("expires_at", nowIso)
    .lt("expires_at", soonIso)
    .limit(300);

  for (const s of (soon ?? []) as any[]) {
    const uid = s.subscribers?.telegram_user_id;
    if (!uid) continue;
    const { data: tu } = await admin
      .from("telegram_users")
      .select("chat_id")
      .eq("telegram_user_id", uid)
      .maybeSingle();
    if (tu?.chat_id) {
      const days = Math.max(1, Math.ceil((new Date(s.expires_at).getTime() - now) / 86400000));
      await tg("sendMessage", {
        chat_id: tu.chat_id,
        text: `⏰ Votre abonnement expire dans ${days} j. Pensez à renouveler :`,
        reply_markup: {
          inline_keyboard: [[{ text: "Renouveler", url: `${APP_URL}/pay/${s.plan_id}?tg=${uid}` }]],
        },
      });
      result.reminded++;
    }
  }

  // ---- 3) RETRAITS 'pending' → UniTech withdraw_funds ----
  const { data: payouts } = await admin
    .from("payouts")
    .select("id, amount, method, destination")
    .eq("status", "pending")
    .limit(50);

  for (const p of (payouts ?? []) as any[]) {
    const method = PAYOUT_METHOD[p.method] ?? "wave";
    try {
      const res = await fetch(`${API}?action=withdraw_funds`, {
        method: "POST",
        headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(p.amount), method, account: p.destination }),
      });
      const data = await res.json().catch(() => null);
      const ok = data?.success === true;
      await admin
        .from("payouts")
        .update({ status: ok ? "completed" : "failed" })
        .eq("id", p.id);
      if (ok) result.paidOut++;
    } catch (_e) {
      await admin.from("payouts").update({ status: "failed" }).eq("id", p.id);
    }
  }

  return new Response(JSON.stringify({ ok: true, ...result }), {
    headers: { "content-type": "application/json" },
  });
});
