import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/** Shape consumed by the dashboard cards. */
export type DashboardData = {
  totalSubscribers: number;
  activeMembers: number;
  expiredCount: number;
  churnPct: number;
  monthlyRevenue: number;
  totalRevenue: number;
  currency: string;
  renewals: {
    time: string;
    title: string;
    subtitle: string;
    tone: "normal" | "due";
  }[];
  members: { name: string; role: string; initials: string }[];
  revenueByGroup: { label: string; value: number; highlight?: boolean }[];
  accessGrid: ("active" | "expiring" | "off")[];
};

const MONTHS_FR = [
  "jan", "fév", "mar", "avr", "mai", "juin",
  "juil", "aoû", "sep", "oct", "nov", "déc",
];

function shortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS_FR[d.getMonth()]}`;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** Load and shape everything the dashboard needs, in a few queries. */
export async function fetchDashboard(): Promise<DashboardData> {
  const [subsRes, subscriptionsRes, paymentsRes] = await Promise.all([
    supabase
      .from("subscribers")
      .select("full_name, created_at, subscriptions(status, groups(name))", {
        count: "exact",
      })
      .order("created_at", { ascending: false }),
    supabase
      .from("subscriptions")
      .select("status, expires_at, subscribers(full_name), groups(name)")
      .order("expires_at", { ascending: true }),
    supabase
      .from("payments")
      .select("amount, currency, paid_at, subscriptions(groups(name))"),
  ]);

  if (subsRes.error) throw subsRes.error;
  if (subscriptionsRes.error) throw subscriptionsRes.error;
  if (paymentsRes.error) throw paymentsRes.error;

  const subscribers = subsRes.data ?? [];
  const subscriptions = (subscriptionsRes.data ?? []) as any[];
  const payments = (paymentsRes.data ?? []) as any[];

  const totalSubscribers = subsRes.count ?? subscribers.length;
  const activeMembers = subscriptions.filter((s) => s.status === "active").length;
  const expiredCount = subscriptions.filter((s) => s.status === "expired").length;
  const totalSubs = subscriptions.length || 1;
  const churnPct = Math.round((expiredCount / totalSubs) * 1000) / 10;

  // Renewals: overdue first, then soonest expiry.
  const now = Date.now();
  const renewals = [...subscriptions]
    .sort((a, b) => {
      const ea = a.expires_at ? new Date(a.expires_at).getTime() : Infinity;
      const eb = b.expires_at ? new Date(b.expires_at).getTime() : Infinity;
      return ea - eb;
    })
    .slice(0, 5)
    .map((s) => {
      const exp = s.expires_at ? new Date(s.expires_at).getTime() : null;
      const overdue = s.status === "expired" || (exp !== null && exp < now);
      return {
        time: shortDate(s.expires_at),
        title: s.groups?.name ?? "Groupe",
        subtitle: overdue
          ? `${s.subscribers?.full_name ?? "Abonné"} — expiré`
          : `${s.subscribers?.full_name ?? "Abonné"}`,
        tone: (overdue ? "due" : "normal") as "normal" | "due",
      };
    });

  // Recent subscribers (already ordered desc).
  const members = subscribers.slice(0, 5).map((s: any) => ({
    name: s.full_name,
    role: s.subscriptions?.[0]?.groups?.name ?? "Abonné",
    initials: initialsOf(s.full_name),
  }));

  // Revenue.
  let currency = "XOF";
  let totalRevenue = 0;
  let monthlyRevenue = 0;
  // Rolling 30-day window (more robust than a calendar month for fresh data).
  const since30 = now - 30 * 24 * 3600 * 1000;
  const byGroup = new Map<string, number>();
  for (const p of payments) {
    const amt = Number(p.amount) || 0;
    if (p.currency) currency = p.currency;
    totalRevenue += amt;
    if (p.paid_at && new Date(p.paid_at).getTime() >= since30) {
      monthlyRevenue += amt;
    }
    const g = p.subscriptions?.groups?.name ?? "Autre";
    byGroup.set(g, (byGroup.get(g) ?? 0) + amt);
  }
  const revenueSorted = [...byGroup.entries()].sort((a, b) => b[1] - a[1]);
  const revenueByGroup = revenueSorted.slice(0, 6).map(([label, value], i) => ({
    label: label.length > 8 ? label.slice(0, 8) + "…" : label,
    value,
    highlight: i === 0,
  }));

  // Access grid (40 dots) proportional to active / expiring / off.
  const gridTotal = 40;
  const activeDots = Math.round((activeMembers / totalSubs) * gridTotal);
  const expiringDots = Math.round((expiredCount / totalSubs) * gridTotal);
  const accessGrid: ("active" | "expiring" | "off")[] = [];
  for (let i = 0; i < gridTotal; i++) {
    if (i < activeDots) accessGrid.push("active");
    else if (i < activeDots + expiringDots) accessGrid.push("expiring");
    else accessGrid.push("off");
  }

  return {
    totalSubscribers,
    activeMembers,
    expiredCount,
    churnPct,
    monthlyRevenue,
    totalRevenue,
    currency,
    renewals,
    members,
    revenueByGroup,
    accessGrid,
  };
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const d = await fetchDashboard();
      setError(null);
      setData(d);
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

export { firstName };
