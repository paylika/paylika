// Paylika — info publique d'une offre (pour la page de paiement).
// Lecture service_role (les tables sont privées par propriétaire), expose
// uniquement les champs d'affichage nécessaires au checkout.
//
// Appel : GET .../offer-info?id=<planId>

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "content-type": "application/json" } });

const PERIODS: Record<number, string> = {
  1: "Journalier",
  7: "Hebdomadaire",
  30: "Mensuel",
  90: "Trimestriel",
  180: "Semestriel",
  365: "Annuel",
};
const periodLabel = (d: number) => (d <= 0 ? "Paiement unique" : PERIODS[d] ?? `${d} j`);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return json({ error: "id manquant" }, 400);

  const { data: base } = await admin
    .from("plans")
    .select("id, name, price, compare_price, currency, interval_days, group_id, groups(name, delivery_type, sales_page, owner_id)")
    .eq("id", id)
    .maybeSingle();
  if (!base) return json({ error: "Offre introuvable" }, 404);
  const b: any = base;

  // Meta Pixel du propriétaire (public côté client).
  let metaPixelId: string | null = null;
  const ownerId = b.groups?.owner_id;
  if (ownerId) {
    const { data: prof } = await admin
      .from("profiles")
      .select("meta_pixel_id")
      .eq("id", ownerId)
      .maybeSingle();
    metaPixelId = prof?.meta_pixel_id ?? null;
  }

  // Toutes les formules de la même offre (= même groupe), triées par durée.
  const { data: sibs } = await admin
    .from("plans")
    .select("id, price, compare_price, interval_days")
    .eq("group_id", b.group_id)
    .order("interval_days", { ascending: true });

  const list: any[] = sibs?.length ? sibs : [b];
  const tiers = list.map((p) => ({
    id: p.id,
    label: periodLabel(p.interval_days),
    intervalDays: p.interval_days,
    price: Number(p.price) || 0,
    comparePrice: p.compare_price != null ? Number(p.compare_price) : null,
  }));

  return json({
    id: b.id,
    offerName: b.groups?.name ?? b.name,
    groupName: b.groups?.name ?? "—",
    currency: b.currency,
    // Type de livraison public (sert au checkout) ; la CIBLE reste secrète.
    deliveryType: b.groups?.delivery_type ?? "telegram",
    salesPage: b.groups?.sales_page ?? null,
    metaPixelId,
    tiers,
  });
});
