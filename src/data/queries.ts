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
};

export async function fetchSubscribers(): Promise<SubscriberRow[]> {
  const { data, error } = await supabase
    .from("subscribers")
    .select("id, full_name, telegram_username, subscriptions(status, groups(name))")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((s: any) => {
    const sub = s.subscriptions?.[0];
    return {
      id: s.id,
      name: s.full_name,
      username: s.telegram_username,
      status: sub?.status ?? "—",
      groupName: sub?.groups?.name ?? "—",
    };
  });
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

export type Money = {
  totalRevenue: number;
  commission: number; // Paylika 10%
  netBalance: number; // owner's payout balance
  paymentsCount: number;
  currency: string;
};

const COMMISSION_RATE = 0.1; // 10% — see docs/ROADMAP.md

export async function fetchMoney(): Promise<Money> {
  const { data, error } = await supabase
    .from("payments")
    .select("amount, currency, status");
  if (error) throw error;
  const rows = data ?? [];
  let totalRevenue = 0;
  let currency = "XOF";
  for (const p of rows as any[]) {
    totalRevenue += Number(p.amount) || 0;
    if (p.currency) currency = p.currency;
  }
  const commission = Math.round(totalRevenue * COMMISSION_RATE);
  return {
    totalRevenue,
    commission,
    netBalance: totalRevenue - commission,
    paymentsCount: rows.length,
    currency,
  };
}
