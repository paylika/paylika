import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { commissionOn, sellerNet } from "@/lib/pricing";

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

// Libellés simples/quotidiens (certains ne comprennent pas « hebdomadaire »,
// « trimestriel »…). Cohérents avec la page de paiement.
export const PERIODICITIES: { label: string; days: number }[] = [
  { label: "Par jour", days: 1 },
  { label: "Par semaine", days: 7 },
  { label: "Par mois", days: 30 },
  { label: "Par 3 mois", days: 90 },
  { label: "Par 6 mois", days: 180 },
  { label: "Par an", days: 365 },
];

export function intervalLabel(days: number): string {
  if (days <= 0) return "Paiement unique";
  const m = PERIODICITIES.find((p) => p.days === days);
  if (m) return m.label;
  return `${days} j`;
}

/** Pixel Meta de Paylika (réglage plateforme, public — présent côté client). */
export async function fetchPlatformPixelId(): Promise<string | null> {
  const { data } = await supabase
    .from("platform_settings")
    .select("meta_pixel_id")
    .eq("id", 1)
    .maybeSingle();
  return (data?.meta_pixel_id ?? null) as string | null;
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
  deliveryType: DeliveryType;
  salesPage?: SalesPage | null;
};

export type DeliveryType = "telegram" | "whatsapp" | "link" | "receipt";

export type SalesPage = {
  cover?: string | null;
  headline?: string;
  subheadline?: string;
  benefits?: string[];
  description?: string;
  guarantee?: string;
};

export const DELIVERY_TYPES: { value: DeliveryType; label: string; hint: string }[] = [
  { value: "telegram", label: "Groupe Telegram", hint: "Ajout et retrait automatiques (le plus verrouillé)." },
  { value: "whatsapp", label: "Groupe WhatsApp", hint: "L'acheteur reçoit un bouton pour rejoindre le groupe." },
  { value: "link", label: "Lien / contenu", hint: "Livrer un lien (formation, fichier, page privée…)." },
  { value: "receipt", label: "Simple encaissement", hint: "Juste un reçu de paiement, sans accès à livrer." },
];

export async function fetchOffres(): Promise<Offre[]> {
  const { data, error } = await supabase
    .from("plans")
    .select("id, name, price, compare_price, currency, interval_days, group_id, groups(name, kind, delivery_type)")
    .order("created_at", { ascending: false });
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
    deliveryType: (p.groups?.delivery_type ?? "telegram") as DeliveryType,
  }));
}

const APP_URL = "https://paylika.paylika-app.workers.dev";

/** Lien de partage d'une offre selon son mode de livraison. */
export function payLinkFor(offre: Pick<Offre, "id" | "deliveryType">): string {
  // Telegram passe par le bot (capture l'utilisateur pour le DM) ;
  // les autres modes vont directement sur la page de paiement web.
  // Telegram passe par le bot ; les autres modes vont sur la page de paiement.
  return offre.deliveryType === "telegram"
    ? `https://t.me/Paylikabot?start=${offre.id}`
    : // page de checkout autonome (chargement quasi instantané) plutôt que la SPA
      `${APP_URL}/checkout.html?offer=${offre.id}`;
}

/**
 * Garde-fou d'upload : refuse les fichiers trop lourds et les types dangereux.
 * (Complète les policies du bucket ; validation la plus proche de l'utilisateur.)
 */
function guardUpload(size: number, type: string, opts: { maxMB: number; kind: "image" | "content" }) {
  if (size > opts.maxMB * 1024 * 1024) {
    throw new Error(`Fichier trop volumineux (max ${opts.maxMB} Mo).`);
  }
  const t = (type || "").toLowerCase();
  if (opts.kind === "image") {
    if (t && !/^image\/(png|jpe?g|webp|gif)$/.test(t)) {
      throw new Error("Format d'image non supporté (PNG, JPG, WEBP ou GIF).");
    }
  } else if (/^(text\/html|image\/svg\+xml|application\/x-msdownload|application\/x-sh|application\/x-httpd-php)$/.test(t)) {
    throw new Error("Type de fichier non autorisé.");
  }
}

/** Upload d'une image de couverture (bucket public) → URL publique. */
export async function uploadCover(uri: string, mimeType?: string): Promise<string> {
  const owner = await currentUserId();
  const resp = await fetch(uri);
  const blob = await resp.blob();
  const type = mimeType || blob.type || "image/jpeg";
  guardUpload(blob.size, type, { maxMB: 5, kind: "image" });
  const ext = type.includes("png") ? "png" : "jpg";
  const path = `${owner}/cover_${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("covers")
    .upload(path, blob, { contentType: type, upsert: true });
  if (error) throw error;
  return supabase.storage.from("covers").getPublicUrl(path).data.publicUrl;
}

/**
 * Téléverse un fichier de contenu dans le bucket privé et renvoie sa référence
 * de livraison (`storage:<chemin>`). Livré via URL signée après paiement.
 */
export async function uploadContent(uri: string, fileName: string, mimeType?: string): Promise<string> {
  const owner = await currentUserId();
  const resp = await fetch(uri);
  const blob = await resp.blob();
  const type = mimeType || blob.type || "application/octet-stream";
  guardUpload(blob.size, type, { maxMB: 50, kind: "content" });
  const safe = (fileName || "fichier").replace(/[^\w.\-]+/g, "_").slice(-60);
  const path = `${owner}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage
    .from("content")
    .upload(path, blob, { contentType: type, upsert: true });
  if (error) throw error;
  return `storage:${path}`;
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
    // Choisit l'abonnement le plus pertinent (actif d'abord, puis expiration la
    // plus lointaine ; NULL = permanent = prioritaire) au lieu d'un arbitraire
    // subscriptions[0] — sinon statut/date faux et actions sur le mauvais abo.
    const subs: any[] = s.subscriptions ?? [];
    const rank = (x: any) => (x.status === "active" ? 1 : 0);
    const expVal = (x: any) => (x.expires_at == null ? Infinity : new Date(x.expires_at).getTime());
    const sub = subs.slice().sort((a, b) => rank(b) - rank(a) || expVal(b) - expVal(a))[0];
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

export type Group = { id: string; name: string; kind: string; telegramChatId?: string | null };

export async function fetchGroups(): Promise<Group[]> {
  const { data, error } = await supabase
    .from("groups")
    .select("id, name, kind, telegram_chat_id")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((g: any) => ({
    id: g.id,
    name: g.name,
    kind: g.kind,
    telegramChatId: g.telegram_chat_id ?? null,
  }));
}

export type Tier = { intervalDays: number; price: number; comparePrice?: number | null };
export type NewOffer = {
  offerName: string;
  currency: string;
  deliveryType: DeliveryType;
  deliveryTarget?: string | null; // lien WhatsApp / URL (whatsapp & link)
  salesPage?: SalesPage | null; // contenu de la page de vente
  groupId?: string; // telegram : groupe déjà connecté
  newGroupName?: string; // nom de l'entité vendable (si pas de groupe existant)
  tiers: Tier[];
};

/** Create the sellable entity (if new) then one plan per tier. Returns plan ids. */
export async function createOffer(input: NewOffer): Promise<string[]> {
  const owner = await currentUserId();
  if (!input.tiers.length) throw new Error("Ajoutez au moins une formule.");
  if ((input.deliveryType === "whatsapp" || input.deliveryType === "link") && !input.deliveryTarget?.trim()) {
    throw new Error("Renseignez le lien à livrer.");
  }

  let groupId = input.groupId;
  if (!groupId) {
    const { data, error } = await supabase
      .from("groups")
      .insert({
        name: input.newGroupName?.trim() || input.offerName.trim(),
        kind: input.deliveryType === "telegram" ? "telegram" : input.deliveryType,
        delivery_type: input.deliveryType,
        delivery_target: input.deliveryTarget?.trim() || null,
        sales_page: input.salesPage ?? null,
        owner_id: owner,
      })
      .select("id")
      .single();
    if (error) throw error;
    groupId = data.id;
  }
  if (!groupId) throw new Error("Impossible de créer l'offre.");

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
    .select("id, name, price, compare_price, currency, interval_days, group_id, groups(name, kind, delivery_type, sales_page)")
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
    deliveryType: (p.groups?.delivery_type ?? "telegram") as DeliveryType,
    salesPage: (p.groups?.sales_page ?? null) as SalesPage | null,
  };
}

/** Met à jour la page de vente d'une offre (via son groupe). */
export async function updateSalesPage(groupId: string, salesPage: SalesPage): Promise<void> {
  const { error } = await supabase
    .from("groups")
    .update({ sales_page: salesPage })
    .eq("id", groupId);
  if (error) throw error;
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

/** Toutes les formules (plans) d'un groupe — pour l'éditeur d'offre. */
export async function fetchGroupPlans(
  groupId: string,
): Promise<{ id: string; intervalDays: number; price: number; comparePrice: number | null }[]> {
  const { data, error } = await supabase
    .from("plans")
    .select("id, interval_days, price, compare_price")
    .eq("group_id", groupId)
    .order("interval_days", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((p: any) => ({
    id: p.id,
    intervalDays: p.interval_days,
    price: Number(p.price) || 0,
    comparePrice: p.compare_price != null ? Number(p.compare_price) : null,
  }));
}

/**
 * Met à jour TOUTES les formules d'une offre (un groupe) : modifie les
 * existantes, ajoute les nouvelles, supprime celles retirées. Permet d'ajouter
 * une périodicité à une offre existante depuis le crayon.
 */
export async function updateOfferTiers(input: {
  groupId: string;
  offerName: string;
  tiers: { id?: string; intervalDays: number; price: number; comparePrice?: number | null }[];
}): Promise<void> {
  const owner = await currentUserId();
  const { data: existing, error: e0 } = await supabase.from("plans").select("id").eq("group_id", input.groupId);
  if (e0) throw e0;
  const keptIds = new Set(input.tiers.filter((t) => t.id).map((t) => t.id as string));
  const toDelete = (existing ?? []).map((p: any) => p.id as string).filter((pid) => !keptIds.has(pid));
  if (toDelete.length) {
    const { error } = await supabase.from("plans").delete().in("id", toDelete);
    if (error) throw error;
  }
  for (const t of input.tiers) {
    const row = {
      owner_id: owner,
      group_id: input.groupId,
      name: `${input.offerName} — ${intervalLabel(t.intervalDays)}`,
      price: t.price,
      compare_price: t.comparePrice ?? null,
      interval_days: t.intervalDays,
      currency: "XOF",
    };
    if (t.id) {
      const { error } = await supabase.from("plans").update(row).eq("id", t.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("plans").insert(row);
      if (error) throw error;
    }
  }
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
  const commission = commissionOn(totalRevenue);
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
      amount: sellerNet(Number(p.amount) || 0),
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
  country?: string;
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
  payoutCountry: string;
  payoutMethod: string;
  payoutNumber: string;
};

export async function fetchProfile(): Promise<Profile> {
  const owner = await currentUserId();
  const { data } = await supabase
    .from("profiles")
    .select("full_name, business_name, avatar_url, payout_country, payout_method, payout_number")
    .eq("id", owner)
    .maybeSingle();
  return {
    fullName: data?.full_name ?? "",
    businessName: data?.business_name ?? "",
    avatarUrl: data?.avatar_url ?? null,
    payoutCountry: data?.payout_country ?? "SN",
    payoutMethod: data?.payout_method ?? "wave",
    payoutNumber: data?.payout_number ?? "",
  };
}

export async function saveProfile(input: {
  fullName: string;
  businessName: string;
  avatarUrl?: string | null;
  payoutCountry?: string;
  payoutMethod: string;
  payoutNumber: string;
}): Promise<void> {
  const owner = await currentUserId();
  const { error } = await supabase.from("profiles").upsert({
    id: owner,
    full_name: input.fullName || null,
    business_name: input.businessName || null,
    ...(input.avatarUrl !== undefined ? { avatar_url: input.avatarUrl } : {}),
    ...(input.payoutCountry !== undefined ? { payout_country: input.payoutCountry } : {}),
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
  guardUpload(blob.size, type, { maxMB: 5, kind: "image" });
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

// ---- Membres du groupe (roster + badges payé/non payé) ----

export type Member = {
  telegramUserId: number;
  name: string;
  username: string | null;
  paid: boolean;
  expiresAt: string | null;
  lastSeen: string;
  inGroup: boolean;
};

export async function fetchMembers(groupId: string): Promise<Member[]> {
  const [{ data: members }, { data: subs }] = await Promise.all([
    supabase
      .from("group_members")
      .select("telegram_user_id, username, first_name, last_seen, in_group")
      .eq("group_id", groupId)
      .order("last_seen", { ascending: false }),
    supabase
      .from("subscriptions")
      .select("expires_at, subscribers(telegram_user_id)")
      .eq("group_id", groupId)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString()),
  ]);
  const paid = new Map<number, string>();
  for (const s of (subs ?? []) as any[]) {
    const tid = s.subscribers?.telegram_user_id;
    if (tid != null) paid.set(Number(tid), s.expires_at);
  }
  return ((members ?? []) as any[]).map((m) => {
    const tid = Number(m.telegram_user_id);
    return {
      telegramUserId: tid,
      name: m.first_name || m.username || "Membre",
      username: m.username,
      paid: paid.has(tid),
      expiresAt: paid.get(tid) ?? null,
      lastSeen: m.last_seen,
      inGroup: m.in_group,
    };
  });
}

const MEMBER_REMOVE_URL =
  "https://xkdiodbppotyiyldlwbg.functions.supabase.co/member-remove";

/** Retire un membre du groupe (kick + relance de paiement). */
export async function removeMember(groupId: string, telegramUserId: number): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Session expirée. Reconnectez-vous.");
  let data: any = null;
  try {
    const res = await fetch(MEMBER_REMOVE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ groupId, telegramUserId }),
    });
    data = await res.json().catch(() => null);
    if (res.ok && data?.ok) return;
  } catch {
    throw new Error("Connexion impossible. Réessayez.");
  }
  throw new Error(data?.error ?? "Retrait impossible.");
}

const MEMBER_INVITE_URL =
  "https://xkdiodbppotyiyldlwbg.functions.supabase.co/member-invite";

/**
 * Donne/renvoie un accès à un membre : lien éphémère (usage unique, 24h),
 * envoyé en privé au membre si possible, et renvoyé pour copie.
 * telegramUserId optionnel → sans lui, on génère juste un lien à partager.
 */
export async function inviteMember(
  groupId: string,
  telegramUserId?: number,
): Promise<{ link: string; dmSent: boolean }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Session expirée. Reconnectez-vous.");
  let data: any = null;
  try {
    const res = await fetch(MEMBER_INVITE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ groupId, telegramUserId }),
    });
    data = await res.json().catch(() => null);
    if (res.ok && data?.ok) return { link: data.link, dmSent: !!data.dmSent };
  } catch {
    throw new Error("Connexion impossible. Réessayez.");
  }
  throw new Error(data?.error ?? "Envoi impossible.");
}

export type OfferStat = {
  id: string;
  name: string;
  groupName: string;
  price: number;
  intervalDays: number;
  active: number; // membres uniques actifs sur cette offre
  revenue: number; // revenu NET de cette offre
  share: number; // % du revenu net total
};

export type Bars = { label: string; value: number; highlight?: boolean }[];

export type Stats = {
  currency: string;
  totalRevenue: number; // encaissé (paiements complétés)
  netRevenue: number; // ce que garde le vendeur (après commission 10%)
  commission: number; // commission Paylika prélevée
  revenueThisMonth: number; // revenu NET encaissé ce mois-ci
  salesCount: number; // nombre de ventes (paiements complétés)
  activeMembers: number; // personnes uniques avec un accès en cours
  totalMembers: number; // personnes uniques ayant déjà payé
  newMembersThisMonth: number; // nouveaux membres ce mois
  membersByGroup: Bars; // membres actifs uniques par groupe
  revenueByGroup: Bars; // revenu net par groupe
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
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const [plansRes, subsRes, paymentsRes, subscribersRes] = await Promise.all([
    supabase.from("plans").select("id, name, price, interval_days, group_id, groups(name)").order("created_at"),
    supabase.from("subscriptions").select("subscriber_id, plan_id, status"),
    supabase.from("payments").select("amount, currency, status, paid_at, subscriptions(plan_id, groups(name))"),
    supabase.from("subscribers").select("id, created_at"),
  ]);
  if (plansRes.error) throw plansRes.error;
  if (subsRes.error) throw subsRes.error;
  if (paymentsRes.error) throw paymentsRes.error;

  const plans = (plansRes.data ?? []) as any[];
  const subs = (subsRes.data ?? []) as any[];
  // Revenu : uniquement les paiements COMPLÉTÉS (jamais pending/failed/refunded).
  const payments = ((paymentsRes.data ?? []) as any[]).filter((p) => p.status === "completed");
  const subscribers = (subscribersRes.data ?? []) as any[];

  let currency = "XOF";
  let grossTotal = 0;
  let grossThisMonth = 0;
  const revByGroupGross = new Map<string, number>();
  const revByPlanGross = new Map<string, number>();
  for (const p of payments) {
    const amt = Number(p.amount) || 0;
    if (p.currency) currency = p.currency;
    grossTotal += amt;
    if (p.paid_at && new Date(p.paid_at).getTime() >= monthStart) grossThisMonth += amt;
    const g = p.subscriptions?.groups?.name ?? "Autre";
    revByGroupGross.set(g, (revByGroupGross.get(g) ?? 0) + amt);
    const pl = p.subscriptions?.plan_id;
    if (pl) revByPlanGross.set(pl, (revByPlanGross.get(pl) ?? 0) + amt);
  }
  const commission = commissionOn(grossTotal);
  const totalRevenue = grossTotal;
  const netRevenue = grossTotal - commission;
  const revenueThisMonth = Math.round(grossThisMonth * 0.9);
  const salesCount = payments.length;

  // Membres = personnes UNIQUES (par abonné), jamais nombre d'abonnements.
  const activeSubs = subs.filter((s) => s.status === "active" && s.subscriber_id);
  const activeMembers = new Set(activeSubs.map((s) => s.subscriber_id)).size;
  const totalMembers = subscribers.length;
  const newMembersThisMonth = subscribers.filter(
    (s) => s.created_at && new Date(s.created_at).getTime() >= monthStart,
  ).length;

  // Membres actifs UNIQUES par groupe.
  const planById = new Map(plans.map((p) => [p.id, p]));
  const memSetByGroup = new Map<string, Set<string>>();
  for (const s of activeSubs) {
    const g = planById.get(s.plan_id)?.groups?.name ?? "Autre";
    if (!memSetByGroup.has(g)) memSetByGroup.set(g, new Set());
    memSetByGroup.get(g)!.add(s.subscriber_id);
  }
  const memByGroup = new Map<string, number>();
  for (const [g, set] of memSetByGroup) memByGroup.set(g, set.size);

  // Revenu NET par groupe (pour le graphe).
  const netRevByGroup = new Map<string, number>();
  for (const [g, v] of revByGroupGross) netRevByGroup.set(g, Math.round(v * 0.9));

  const offers: OfferStat[] = plans
    .map((pl) => {
      const active = new Set(
        subs
          .filter((s) => s.plan_id === pl.id && s.status === "active" && s.subscriber_id)
          .map((s) => s.subscriber_id),
      ).size;
      const revenue = Math.round((revByPlanGross.get(pl.id) ?? 0) * 0.9);
      return {
        id: pl.id,
        name: pl.name,
        groupName: pl.groups?.name ?? "—",
        price: Number(pl.price) || 0,
        intervalDays: pl.interval_days,
        active,
        revenue,
        share: netRevenue ? Math.round((revenue / netRevenue) * 100) : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  return {
    currency,
    totalRevenue,
    netRevenue,
    commission,
    revenueThisMonth,
    salesCount,
    activeMembers,
    totalMembers,
    newMembersThisMonth,
    membersByGroup: toBars(memByGroup),
    revenueByGroup: toBars(netRevByGroup),
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
