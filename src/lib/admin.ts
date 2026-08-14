import { supabase } from "./supabase";

const ADMIN_URL = "https://xkdiodbppotyiyldlwbg.functions.supabase.co/admin-api";

async function call<T>(action: string, args: Record<string, unknown> = {}): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Session expirée. Reconnectez-vous.");
  const res = await fetch(ADMIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...args }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? "Erreur admin.");
  return data as T;
}

export type AdminOverview = {
  owners: number;
  groups: number;
  subscribers: number;
  activeSubscribers: number;
  totalRevenue: number;
  paylikaEarnings: number;
  mrr: number;
  currency: string;
};

export type AdminOwner = {
  id: string;
  email: string;
  createdAt: string;
  banned: boolean;
  groups: number;
  subscribers: number;
  activeSubscribers: number;
  revenue: number;
  commission: number;
  mrr: number;
};

export type AdminOwnerDetail = {
  groups: { id: string; name: string; kind: string }[];
  subscriptions: {
    id: string;
    status: string;
    expires_at: string | null;
    group_id: string | null;
    subscribers: { full_name: string; telegram_user_id: number | null } | null;
  }[];
  connections: { group_id: string | null; chat_id: number; title: string | null; status: string }[];
};

export const adminWhoami = () => call<{ isAdmin: boolean; email: string }>("whoami");
export const adminOverview = () => call<AdminOverview>("overview");
export const adminOwners = () => call<{ owners: AdminOwner[] }>("owners").then((r) => r.owners);
export const adminOwnerDetail = (ownerId: string) => call<AdminOwnerDetail>("owner", { ownerId });
export const adminBan = (ownerId: string) => call<{ ok: boolean }>("ban", { ownerId });
export const adminUnban = (ownerId: string) => call<{ ok: boolean }>("unban", { ownerId });
export const adminResendLink = (groupId: string, telegramUserId: number) =>
  call<{ ok: boolean }>("resend_link", { groupId, telegramUserId });
