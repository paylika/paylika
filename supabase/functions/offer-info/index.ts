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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return json({ error: "id manquant" }, 400);

  const { data } = await admin
    .from("plans")
    .select("id, name, price, compare_price, currency, interval_days, groups(name)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return json({ error: "Offre introuvable" }, 404);

  const p: any = data;
  return json({
    id: p.id,
    name: p.name,
    price: Number(p.price) || 0,
    comparePrice: p.compare_price != null ? Number(p.compare_price) : null,
    currency: p.currency,
    intervalDays: p.interval_days,
    groupName: p.groups?.name ?? "—",
  });
});
