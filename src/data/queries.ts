import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

/** Tiny async loader: fetches on mount and exposes `reload` (pull-to-refresh). */
export function useAsync<T>(fn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const d = await fnRef.current();
      setData(d);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload };
}

export const PERIODICITIES: { label: string; days: number }[] = [
  { label: "Journalier", days: 1 },
  { label: "Hebdomadaire", days: 7 },
  { label: "Mensuel", days: 30 },
  { label: "Trimestriel", days: 90 },
  { label: "Semestriel", days: 180 },
  { label: "Annuel", days: 365 },
];

export function intervalLabel(days: number): string {
  const m = PERIODICITIES.find((p) => p.days === days);
  if (m) return m.label;
  return `${days} j`;
}

export type Offre = {
  id: string;
  name: string;
  price: number;
  comparePrice: number | null;
  currency: string;
  interval_days: number;
  groupId: string;
  groupName: string;
  groupKind: string;
};

export async function fetchOffres(): Promise<Offre[]> {
  const { data, error } = await supabase
    .from("plans")
    .select("id, name, price, compare_price, currency, interval_days, group_id, groups(name, kind)")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price) || 0,
    comparePrice: p.compare_price != null ? Number(p.compare_price) : null,
    currency: p.currency,
    interval_days: p.interval_days,
    groupId: p.group_id,
    groupName: p.groups?.name ?? "—",
    groupKind: p.groups?.kind ?? "telegram",
  }));
}

export type SubscriberRow = {
  id: string;
  name: string;
  username: string | null;
  status: string;
  groupName: string;
  subscriptionId: string | null;
  expiresAt: string | null;
};

export async function fetchSubscribers(): Promise<SubscriberRow[]> {
  const { data, error } = await supabase
    .from("subscribers")
    .select(
      "id, full_name, telegram_username, subscriptions(id, status, expires_at, groups(name))",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((s: any) => {
    const sub = s.subscriptions?.[0];
    return {
      id: s.id,
      name: s.full_name,
      username: s.telegram_username,
      status: sub?.status ?? "aucun",
      groupName: sub?.groups?.name ?? "—",
      subscriptionId: sub?.id ?? null,
      expiresAt: sub?.expires_at ?? null,
    };
  });
}

/** Manually add a subscriber + an active subscription to a group's plan. */
export async function addSubscriber(input: {
  fullName: string;
  telegramUsername?: string;
  groupId: string;
}): Promise<void> {
  const owner = await currentUserId();
  const { data: sub, error: e1 } = await supabase
    .from("subscribers")
    .insert({
      owner_id: owner,
      full_name: input.fullName,
      telegram_username: input.telegramUsername || null,
    })
    .select("id")
    .single();
  if (e1) throw e1;

  const { data: plan } = await supabase
    .from("plans")
    .select("id, interval_days")
    .eq("group_id", input.groupId)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  const days = plan?.interval_days ?? 30;
  const expires = new Date(Date.now() + days * 86400000).toISOString();
  const { error: e2 } = await supabase.from("subscriptions").insert({
    owner_id: owner,
    subscriber_id: sub.id,
    plan_id: plan?.id ?? null,
    group_id: input.groupId,
    status: "active",
    expires_at: expires,
  });
  if (e2) throw e2;
}

/** Renew: push expiry out by `days` and reactivate. */
export async function extendSubscription(
  subscriptionId: string,
  currentExpiry: string | null,
  days = 30,
): Promise<void> {
  const base = Math.max(
    Date.now(),
    currentExpiry ? new Date(currentExpiry).getTime() : Date.now(),
  );
  const expires = new Date(base + days * 86400000).toISOString();
  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "active", expires_at: expires })
    .eq("id", subscriptionId);
  if (error) throw error;
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "expired" })
    .eq("id", subscriptionId);
  if (error) throw error;
}

export async function deleteSubscriber(id: string): Promise<void> {
  const { error } = await supabase.from("subscribers").delete().eq("id", id);
  if (error) throw error;
}

export type Group = { id: string; name: string; kind: string };

export async function fetchGroups(): Promise<Group[]> {
  const { data, error } = await supabase
    .from("groups")
    .select("id, name, kind")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Group[];
}

export type Tier = { intervalDays: number; price: number; comparePrice?: number | null };
export type NewOffer = {
  offerName: string;
  currency: string;
  groupId?: string;
  newGroup?: { name: string; kind: string };
  tiers: Tier[];
};

/** Create a group (if new) then one plan per tier. Returns created plan ids. */
export async function createOffer(input: NewOffer): Promise<string[]> {
  const owner = await currentUserId();
  let groupId = input.groupId;
  if (!groupId && input.newGroup) {
    const { data, error } = await supabase
      .from("groups")
      .insert({ name: input.newGroup.name, kind: input.newGroup.kind, owner_id: owner })
      .select("id")
      .single();
    if (error) throw error;
    groupId = data.id;
  }
  if (!groupId) throw new Error("Choisissez ou créez un groupe.");
  if (!input.tiers.length) throw new Error("Ajoutez au moins une formule.");

  const rows = input.tiers.map((t) => ({
    owner_id: owner,
    group_id: groupId,
    name: `${input.offerName} — ${intervalLabel(t.intervalDays)}`,
    price: t.price,
    compare_price: t.comparePrice ?? null,
    currency: input.currency,
    interval_days: t.intervalDays,
  }));
  const { data, error } = await supabase.from("plans").insert(rows).select("id");
  if (error) throw error;
  return (data ?? []).map((r: any) => r.id as string);
}

/** Count of offers (plans) — for onboarding detection. */
export async function countOffers(): Promise<number> {
  const { count, error } = await supabase
    .from("plans")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function fetchOffre(id: string): Promise<Offre | null> {
  const { data, error } = await supabase
    .from("plans")
    .select("id, name, price, compare_price, currency, interval_days, group_id, groups(name, kind)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const p: any = data;
  return {
    id: p.id,
    name: p.name,
    price: Number(p.price) || 0,
    comparePrice: p.compare_price != null ? Number(p.compare_price) : null,
    currency: p.currency,
    interval_days: p.interval_days,
    groupId: p.group_id,
    groupName: p.groups?.name ?? "—",
    groupKind: p.groups?.kind ?? "telegram",
  };
}

export async function updateOffer(
  id: string,
  input: { name: string; price: number; intervalDays: number },
): Promise<void> {
  const { error } = await supabase
    .from("plans")
    .update({
      name: input.name,
      price: input.price,
      interval_days: input.intervalDays,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteOffer(id: string): Promise<void> {
  const { error } = await supabase.from("plans").delete().eq("id", id);
  if (error) throw error;
}

export type Connection = {
  chatId: number;
  title: string | null;
  groupId: string | null;
  status: string;
};

export async function fetchConnections(): Promise<Connection[]> {
  const { data, error } = await supabase
    .from("telegram_connections")
    .select("chat_id, title, group_id, status")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((c: any) => ({
    chatId: c.chat_id,
    title: c.title,
    groupId: c.group_id,
    status: c.status,
  }));
}

/**
 * Returns the signed-in owner id, guaranteeing a NON-expired session first.
 * If the access token is missing/expired (which would make server-side
 * `auth.uid()` NULL and silently break every RLS-protected write), we refresh
 * it; if that fails, we throw a clear message instead of a cryptic RLS error.
 */
async function currentUserId(): Promise<string> {
  let {
    data: { session },
  } = await supabase.auth.getSession();

  // Refresh proactively when the token is missing or about to expire (<60s).
  const expiresInMs = session?.expires_at ? session.expires_at * 1000 - Date.now() : -1;
  if (!session || expiresInMs < 60_000) {
    const { data } = await supabase.auth.refreshSession();
    if (data.session) session = data.session;
  }

  const uid = session?.user?.id ?? null;
  if (!uid) throw new Error("Session expirée. Reconnectez-vous pour continuer.");
  return uid;
}

export async function linkConnection(chatId: number, groupId: string): Promise<void> {
  const owner = await currentUserId();
  const { error } = await supabase
    .from("telegram_connections")
    .update({ group_id: groupId, status: "linked", owner_id: owner })
    .eq("chat_id", chatId);
  if (error) throw error;
}

export async function unlinkConnection(chatId: number): Promise<void> {
  const { error } = await supabase
    .from("telegram_connections")
    .update({ group_id: null, status: "pending" })
    .eq("chat_id", chatId);
  if (error) throw error;
}

/** Onboarding: create a Paylika group for a detected Telegram chat + link it. */
export async function connectGroup(chatId: number, title: string): Promise<string> {
  const owner = await currentUserId();
  const { data: g, error } = await supabase
    .from("groups")
    .insert({ name: title || "Mon groupe", kind: "telegram", telegram_chat_id: String(chatId), owner_id: owner })
    .select("id")
    .single();
  if (error) throw error;
  const { error: e2 } = await supabase
    .from("telegram_connections")
    .update({ group_id: g.id, status: "linked", owner_id: owner })
    .eq("chat_id", chatId);
  if (e2) throw e2;
  return g.id as string;
}

/** Onboarding: connections not yet linked to a Paylika group. */
export async function fetchPendingConnections(): Promise<Connection[]> {
  const all = await fetchConnections();
  return all.filter((c) => !c.groupId);
}

/** Create a single-tier offer and return the created plan id (for the share link). */
export async function createSimpleOffer(input: {
  offerName: string;
  groupId: string;
  intervalDays: number;
  price: number;
  comparePrice?: number | null;
}): Promise<string> {
  const owner = await currentUserId();
  const { data, error } = await supabase
    .from("plans")
    .insert({
      owner_id: owner,
      group_id: input.groupId,
      name: `${input.offerName} — ${intervalLabel(input.intervalDays)}`,
      price: input.price,
      compare_price: input.comparePrice ?? null,
      currency: "XOF",
      interval_days: input.intervalDays,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

const COMMISSION_RATE = 0.1; // 10% — see docs/ROADMAP.md

export type Transaction = {
  id: string;
  kind: "in" | "out";
  label: string;
  amount: number; // net effect on balance (+ in, - out)
  date: string | null;
  status: string;
};

export type Money = {
  totalRevenue: number;
  commission: number; // Paylika 10%
  netEarned: number; // revenue - commission
  paidOut: number; // completed + pending payouts
  available: number; // netEarned - paidOut
  paymentsCount: number;
  payoutsCount: number;
  currency: string;
  transactions: Transaction[];
};

export async function fetchMoney(): Promise<Money> {
  const [paymentsRes, payoutsRes] = await Promise.all([
    supabase
      .from("payments")
      .select("id, amount, currency, status, paid_at, subscriptions(groups(name))")
      .order("paid_at", { ascending: false }),
    supabase
      .from("payouts")
      .select("id, amount, method, destination, status, created_at")
      .order("created_at", { ascending: false }),
  ]);
  if (paymentsRes.error) throw paymentsRes.error;
  // payouts table may not exist yet (before schema_v2.sql) — degrade gracefully.
  if (payoutsRes.error) console.warn("payouts indisponible:", payoutsRes.error.message);

  const payments = (paymentsRes.data ?? []) as any[];
  const payouts = (payoutsRes.error ? [] : payoutsRes.data ?? []) as any[];

  let totalRevenue = 0;
  let currency = "XOF";
  for (const p of payments) {
    totalRevenue += Number(p.amount) || 0;
    if (p.currency) currency = p.currency;
  }
  const commission = Math.round(totalRevenue * COMMISSION_RATE);
  const netEarned = totalRevenue - commission;

  let paidOut = 0;
  for (const p of payouts) {
    if (p.status !== "failed") paidOut += Number(p.amount) || 0;
  }

  const transactions: Transaction[] = [
    ...payments.map((p) => ({
      id: `pay-${p.id}`,
      kind: "in" as const,
      label: p.subscriptions?.groups?.name
        ? `Paiement — ${p.subscriptions.groups.name}`
        : "Paiement reçu",
      amount: Math.round((Number(p.amount) || 0) * (1 - COMMISSION_RATE)),
      date: p.paid_at,
      status: p.status,
    })),
    ...payouts.map((p) => ({
      id: `out-${p.id}`,
      kind: "out" as const,
      label: `Retrait — ${p.method ?? "mobile money"}`,
      amount: -(Number(p.amount) || 0),
      date: p.created_at,
      status: p.status,
    })),
  ].sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return db - da;
  });

  return {
    totalRevenue,
    commission,
    netEarned,
    paidOut,
    available: netEarned - paidOut,
    paymentsCount: payments.length,
    payoutsCount: payouts.length,
    currency,
    transactions,
  };
}

const PAYOUT_URL =
  "https://xkdiodbppotyiyldlwbg.functions.supabase.co/unitech-payout";

/**
 * Retrait instantané : la fonction Edge revérifie le solde côté serveur et
 * exécute le transfert UniTech tout de suite. On lui passe le jeton de session.
 */
export async function createPayout(input: {
  amount: number;
  method: string;
  destination: string;
}): Promise<void> {
  await currentUserId(); // garantit une session fraîche
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Session expirée. Reconnectez-vous pour continuer.");

  let data: any = null;
  try {
    const res = await fetch(PAYOUT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    });
    data = await res.json().catch(() => null);
    if (res.ok && data?.ok) return;
  } catch {
    throw new Error("Connexion impossible. Réessayez.");
  }
  throw new Error(data?.error ?? "Retrait impossible. Réessayez.");
}

// ---- Profil propriétaire ----

export type Profile = {
  fullName: string;
  businessName: string;
  avatarUrl: string | null;
  payoutMethod: string;
  payoutNumber: string;
};

export async function fetchProfile(): Promise<Profile> {
  const owner = await currentUserId();
  const { data } = await supabase
    .from("profiles")
    .select("full_name, business_name, avatar_url, payout_method, payout_number")
    .eq("id", owner)
    .maybeSingle();
  return {
    fullName: data?.full_name ?? "",
    businessName: data?.business_name ?? "",
    avatarUrl: data?.avatar_url ?? null,
    payoutMethod: data?.payout_method ?? "wave",
    payoutNumber: data?.payout_number ?? "",
  };
}

export async function saveProfile(input: {
  fullName: string;
  businessName: string;
  avatarUrl?: string | null;
  payoutMethod: string;
  payoutNumber: string;
}): Promise<void> {
  const owner = await currentUserId();
  const { error } = await supabase.from("profiles").upsert({
    id: owner,
    full_name: input.fullName || null,
    business_name: input.businessName || null,
    ...(input.avatarUrl !== undefined ? { avatar_url: input.avatarUrl } : {}),
    payout_method: input.payoutMethod,
    payout_number: input.payoutNumber || null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

/** Upload an avatar image to Storage (avatars/<uid>/…) and return its public URL. */
export async function uploadAvatar(uri: string, mimeType?: string): Promise<string> {
  const owner = await currentUserId();
  const resp = await fetch(uri);
  const blob = await resp.blob();
  const type = mimeType || blob.type || "image/jpeg";
  const ext = type.includes("png") ? "png" : "jpg";
  const path = `${owner}/avatar_${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, blob, { contentType: type, upsert: true });
  if (error) throw error;
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

const DELETE_ACCOUNT_URL =
  "https://xkdiodbppotyiyldlwbg.functions.supabase.co/delete-account";

/** Permanently delete the current owner's account and all their data. */
export async function deleteAccount(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Session expirée. Reconnectez-vous.");
  let data: any = null;
  try {
    const res = await fetch(DELETE_ACCOUNT_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    data = await res.json().catch(() => null);
    if (res.ok && data?.ok) {
      await supabase.auth.signOut();
      return;
    }
  } catch {
    throw new Error("Connexion impossible. Réessayez.");
  }
  throw new Error(data?.error ?? "Suppression impossible.");
}

export type OfferStat = {
  id: string;
  name: string;
  groupName: string;
  price: number;
  intervalDays: number;
  active: number;
  total: number;
  revenue: number;
  share: number; // % of total revenue
};

export type Bars = { label: string; value: number; highlight?: boolean }[];

export type Stats = {
  totalSubscribers: number;
  activeMembers: number;
  expiredCount: number;
  churnPct: number;
  totalRevenue: number;
  netRevenue: number;
  commission: number;
  mrr: number; // monthly recurring revenue (net of nothing — gross monthly)
  arpu: number; // net revenue per subscriber
  currency: string;
  membersByGroup: Bars;
  revenueByGroup: Bars;
  offers: OfferStat[];
};

function toBars(m: Map<string, number>): Bars {
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value], i) => ({
      label: label.length > 8 ? label.slice(0, 8) + "…" : label,
      value,
      highlight: i === 0,
    }));
}

export async function fetchStats(): Promise<Stats> {
  const [plansRes, subsRes, paymentsRes, subsCountRes] = await Promise.all([
    supabase
      .from("plans")
      .select("id, name, price, interval_days, group_id, groups(name, kind)")
      .order("created_at"),
    supabase.from("subscriptions").select("id, plan_id, group_id, status"),
    supabase
      .from("payments")
      .select("amount, currency, subscriptions(plan_id, groups(name))"),
    supabase.from("subscribers").select("id", { count: "exact", head: true }),
  ]);
  if (plansRes.error) throw plansRes.error;
  if (subsRes.error) throw subsRes.error;
  if (paymentsRes.error) throw paymentsRes.error;

  const plans = (plansRes.data ?? []) as any[];
  const subs = (subsRes.data ?? []) as any[];
  const payments = (paymentsRes.data ?? []) as any[];

  const totalSubscribers = subsCountRes.count ?? subs.length;
  const activeMembers = subs.filter((s) => s.status === "active").length;
  const expiredCount = subs.filter((s) => s.status === "expired").length;
  const totalSubs = subs.length || 1;
  const churnPct = Math.round((expiredCount / totalSubs) * 1000) / 10;

  let totalRevenue = 0;
  let currency = "XOF";
  const revByGroup = new Map<string, number>();
  const revByPlan = new Map<string, number>();
  for (const p of payments) {
    const amt = Number(p.amount) || 0;
    if (p.currency) currency = p.currency;
    totalRevenue += amt;
    const g = p.subscriptions?.groups?.name ?? "Autre";
    revByGroup.set(g, (revByGroup.get(g) ?? 0) + amt);
    const pl = p.subscriptions?.plan_id;
    if (pl) revByPlan.set(pl, (revByPlan.get(pl) ?? 0) + amt);
  }
  const commission = Math.round(totalRevenue * 0.1);
  const netRevenue = totalRevenue - commission;

  const planById = new Map(plans.map((p) => [p.id, p]));
  let mrr = 0;
  const memByGroup = new Map<string, number>();
  for (const s of subs) {
    if (s.status !== "active") continue;
    const pl = planById.get(s.plan_id);
    if (pl) {
      const months = Math.max(1, (pl.interval_days || 30) / 30);
      mrr += (Number(pl.price) || 0) / months;
      const g = pl.groups?.name ?? "Autre";
      memByGroup.set(g, (memByGroup.get(g) ?? 0) + 1);
    }
  }
  mrr = Math.round(mrr);
  const arpu = totalSubscribers ? Math.round(netRevenue / totalSubscribers) : 0;

  const offers: OfferStat[] = plans
    .map((pl) => {
      const active = subs.filter((s) => s.plan_id === pl.id && s.status === "active").length;
      const total = subs.filter((s) => s.plan_id === pl.id).length;
      const revenue = revByPlan.get(pl.id) ?? 0;
      return {
        id: pl.id,
        name: pl.name,
        groupName: pl.groups?.name ?? "—",
        price: Number(pl.price) || 0,
        intervalDays: pl.interval_days,
        active,
        total,
        revenue,
        share: totalRevenue ? Math.round((revenue / totalRevenue) * 100) : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  return {
    totalSubscribers,
    activeMembers,
    expiredCount,
    churnPct,
    totalRevenue,
    netRevenue,
    commission,
    mrr,
    arpu,
    currency,
    membersByGroup: toBars(memByGroup),
    revenueByGroup: toBars(revByGroup),
    offers,
  };
}

export type Notif = {
  id: string;
  kind: "expired" | "expiring" | "payment";
  title: string;
  subtitle: string;
  date: string | null;
};

/** Derived activity feed for the notifications view. */
export async function fetchNotifications(): Promise<Notif[]> {
  const [subs, money] = await Promise.all([fetchSubscribers(), fetchMoney()]);
  const now = Date.now();
  const notifs: Notif[] = [];

  for (const s of subs) {
    if (s.status === "expired") {
      notifs.push({
        id: `exp-${s.id}`,
        kind: "expired",
        title: `${s.name} — accès expiré`,
        subtitle: `${s.groupName} · à relancer`,
        date: s.expiresAt,
      });
    } else if (s.status === "active" && s.expiresAt) {
      const days = (new Date(s.expiresAt).getTime() - now) / 86400000;
      if (days <= 3) {
        notifs.push({
          id: `soon-${s.id}`,
          kind: "expiring",
          title: `${s.name} — expire bientôt`,
          subtitle: `${s.groupName} · dans ${Math.max(0, Math.ceil(days))} j`,
          date: s.expiresAt,
        });
      }
    }
  }

  for (const t of money.transactions.filter((t) => t.kind === "in").slice(0, 6)) {
    notifs.push({
      id: t.id,
      kind: "payment",
      title: "Paiement reçu",
      subtitle: t.label,
      date: t.date,
    });
  }

  return notifs.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return db - da;
  });
}
