import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/** Tiny async loader (fetch once on mount). */
export function useAsync<T>(fn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const d = await fn();
        if (alive) {
          setData(d);
          setError(null);
        }
      } catch (e: any) {
        if (alive) setError(e?.message ?? "Erreur de chargement");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading, error };
}

export type Offre = {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval_days: number;
  groupName: string;
  groupKind: string;
};

export async function fetchOffres(): Promise<Offre[]> {
  const { data, error } = await supabase
    .from("plans")
    .select("id, name, price, currency, interval_days, groups(name, kind)")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price) || 0,
    currency: p.currency,
    interval_days: p.interval_days,
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
  const { data: sub, error: e1 } = await supabase
    .from("subscribers")
    .insert({
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

export type NewOffer = {
  planName: string;
  price: number;
  currency: string;
  intervalDays: number;
  groupId?: string;
  newGroup?: { name: string; kind: string };
};

/** Create a group (if new) then the plan (offer). Requires anon INSERT policy. */
export async function createOffer(input: NewOffer): Promise<void> {
  let groupId = input.groupId;
  if (!groupId && input.newGroup) {
    const { data, error } = await supabase
      .from("groups")
      .insert({ name: input.newGroup.name, kind: input.newGroup.kind })
      .select("id")
      .single();
    if (error) throw error;
    groupId = data.id;
  }
  if (!groupId) throw new Error("Choisissez ou créez un groupe.");
  const { error } = await supabase.from("plans").insert({
    group_id: groupId,
    name: input.planName,
    price: input.price,
    currency: input.currency,
    interval_days: input.intervalDays,
  });
  if (error) throw error;
}

export async function fetchOffre(id: string): Promise<Offre | null> {
  const { data, error } = await supabase
    .from("plans")
    .select("id, name, price, currency, interval_days, group_id, groups(name, kind)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const p: any = data;
  return {
    id: p.id,
    name: p.name,
    price: Number(p.price) || 0,
    currency: p.currency,
    interval_days: p.interval_days,
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

export async function linkConnection(chatId: number, groupId: string): Promise<void> {
  const { error } = await supabase
    .from("telegram_connections")
    .update({ group_id: groupId, status: "linked" })
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

export async function createPayout(input: {
  amount: number;
  method: string;
  destination: string;
}): Promise<void> {
  const { error } = await supabase.from("payouts").insert({
    amount: input.amount,
    method: input.method,
    destination: input.destination,
    status: "pending",
  });
  if (error) throw error;
}
