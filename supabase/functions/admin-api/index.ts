// Paylika — API SUPER-ADMIN (pilotage plateforme).
// Contourne la RLS de façon contrôlée : seuls les emails listés dans le secret
// PAYLIKA_ADMIN_EMAILS (séparés par des virgules) peuvent appeler les actions.
//
// Appel : POST { action, ...args }  + header Authorization: Bearer <jwt>
// Actions : whoami | overview | owners | owner | ban | unban | resend_link
// Secrets : PAYLIKA_ADMIN_EMAILS, TELEGRAM_BOT_TOKEN

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const BOT_URL = "https://t.me/Paylikabot";
const COMMISSION_RATE = 0.1;

const ADMIN_EMAILS = (Deno.env.get("PAYLIKA_ADMIN_EMAILS") ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

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

const num = (v: unknown) => Number(v) || 0;
const monthsOf = (days: number) => Math.max(1, (days || 30) / 30);

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
    const email = userData.user?.email?.toLowerCase() ?? "";
    const isAdmin = !!email && ADMIN_EMAILS.includes(email);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");

    // whoami : ouvert (permet à l'app de savoir s'il faut afficher l'Admin).
    if (action === "whoami") return json({ isAdmin, email });

    if (!isAdmin) return json({ error: "Accès réservé aux administrateurs Paylika." }, 403);

    switch (action) {
      case "overview":
        return json(await overview());
      case "owners":
        return json({ owners: await owners() });
      case "owner":
        return json(await ownerDetail(String(body.ownerId ?? "")));
      case "ban":
        return json(await setBanned(String(body.ownerId ?? ""), true));
      case "unban":
        return json(await setBanned(String(body.ownerId ?? ""), false));
      case "resend_link":
        return json(await resendLink(String(body.groupId ?? ""), Number(body.telegramUserId ?? 0)));
      default:
        return json({ error: "Action inconnue." }, 400);
    }
  } catch (e) {
    return json({ error: "Erreur serveur.", detail: String(e) }, 500);
  }
});

// -------- Agrégats plateforme --------

async function loadAll() {
  const [payments, subs, plans, groups, subscribers] = await Promise.all([
    admin.from("payments").select("owner_id, amount, commission, net_amount, status, paid_at"),
    admin.from("subscriptions").select("owner_id, plan_id, status, expires_at"),
    admin.from("plans").select("id, owner_id, price, interval_days"),
    admin.from("groups").select("id, owner_id"),
    admin.from("subscribers").select("id, owner_id"),
  ]);
  return {
    payments: (payments.data ?? []) as any[],
    subs: (subs.data ?? []) as any[],
    plans: (plans.data ?? []) as any[],
    groups: (groups.data ?? []) as any[],
    subscribers: (subscribers.data ?? []) as any[],
  };
}

async function overview() {
  const { payments, subs, plans, groups, subscribers } = await loadAll();
  const { data: usersList } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const ownersCount = usersList?.users?.length ?? 0;

  const planById = new Map(plans.map((p) => [p.id, p]));
  const totalRevenue = payments.reduce((s, p) => s + num(p.amount), 0);
  const paylikaEarnings = payments.reduce(
    (s, p) => s + (p.commission != null ? num(p.commission) : Math.round(num(p.amount) * COMMISSION_RATE)),
    0,
  );
  const now = Date.now();
  const activeSubs = subs.filter((s) => s.status === "active" && (!s.expires_at || new Date(s.expires_at).getTime() > now));
  let mrr = 0;
  for (const s of activeSubs) {
    const pl = planById.get(s.plan_id);
    if (pl) mrr += num(pl.price) / monthsOf(pl.interval_days);
  }

  return {
    owners: ownersCount,
    groups: groups.length,
    subscribers: subscribers.length,
    activeSubscribers: activeSubs.length,
    totalRevenue,
    paylikaEarnings,
    mrr: Math.round(mrr),
    currency: "XOF",
  };
}

async function owners() {
  const { payments, subs, plans, groups, subscribers } = await loadAll();
  const { data: usersList } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const planById = new Map(plans.map((p) => [p.id, p]));
  const now = Date.now();

  const rows = (usersList?.users ?? []).map((u: any) => {
    const oid = u.id;
    const oGroups = groups.filter((g) => g.owner_id === oid).length;
    const oSubscribers = subscribers.filter((s) => s.owner_id === oid).length;
    const oSubs = subs.filter((s) => s.owner_id === oid);
    const oActive = oSubs.filter((s) => s.status === "active" && (!s.expires_at || new Date(s.expires_at).getTime() > now));
    const oPayments = payments.filter((p) => p.owner_id === oid);
    const revenue = oPayments.reduce((s, p) => s + num(p.amount), 0);
    const commission = oPayments.reduce(
      (s, p) => s + (p.commission != null ? num(p.commission) : Math.round(num(p.amount) * COMMISSION_RATE)),
      0,
    );
    let mrr = 0;
    for (const s of oActive) {
      const pl = planById.get(s.plan_id);
      if (pl) mrr += num(pl.price) / monthsOf(pl.interval_days);
    }
    return {
      id: oid,
      email: u.email ?? "—",
      createdAt: u.created_at,
      banned: !!u.banned_until && new Date(u.banned_until).getTime() > now,
      groups: oGroups,
      subscribers: oSubscribers,
      activeSubscribers: oActive.length,
      revenue,
      commission,
      mrr: Math.round(mrr),
    };
  });
  rows.sort((a, b) => b.revenue - a.revenue);
  return rows;
}

async function ownerDetail(ownerId: string) {
  if (!ownerId) return { error: "ownerId manquant" };
  const [{ data: groups }, { data: subs }] = await Promise.all([
    admin.from("groups").select("id, name, kind").eq("owner_id", ownerId),
    admin
      .from("subscriptions")
      .select("id, status, expires_at, group_id, subscribers(full_name, telegram_user_id)")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  const { data: conns } = await admin
    .from("telegram_connections")
    .select("group_id, chat_id, title, status");
  return { groups: groups ?? [], subscriptions: subs ?? [], connections: conns ?? [] };
}

async function setBanned(ownerId: string, banned: boolean) {
  if (!ownerId) return { error: "ownerId manquant" };
  const { error } = await admin.auth.admin.updateUserById(ownerId, {
    ban_duration: banned ? "876000h" : "none",
  });
  if (error) return { error: error.message };
  return { ok: true, ownerId, banned };
}

async function resendLink(groupId: string, telegramUserId: number) {
  if (!groupId || !telegramUserId) return { error: "groupId / telegramUserId manquant" };
  const { data: tu } = await admin
    .from("telegram_users")
    .select("chat_id")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();
  if (!tu?.chat_id) return { error: "Cet utilisateur n'a jamais démarré le bot (pas de conversation privée)." };
  const { data: conn } = await admin
    .from("telegram_connections")
    .select("chat_id")
    .eq("group_id", groupId)
    .maybeSingle();
  if (!conn?.chat_id) return { error: "Groupe non connecté à Telegram." };

  const link = await tg("createChatInviteLink", { chat_id: conn.chat_id, member_limit: 1, name: "paylika-admin" });
  const invite = link?.result?.invite_link;
  if (!invite) return { error: "Création du lien impossible (droits du bot ?)." };
  await tg("sendMessage", {
    chat_id: tu.chat_id,
    text: `Voici votre lien d'accès (usage unique) :\n${invite}\n\n${BOT_URL}`,
  });
  return { ok: true };
}
