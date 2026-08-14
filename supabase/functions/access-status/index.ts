// Paylika — Statut de livraison d'un paiement (page /access après paiement).
// Donne l'état du paiement et, UNIQUEMENT s'il est confirmé, la cible à livrer
// (lien WhatsApp / URL). La cible n'est JAMAIS renvoyée tant que non payé.
//
// Appel : GET .../access-status?ref=<reference>

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
  const ref = new URL(req.url).searchParams.get("ref");
  if (!ref) return json({ error: "ref manquant" }, 400);

  const { data: intent } = await admin
    .from("payment_intents")
    .select("status, plan_id")
    .eq("reference", ref)
    .maybeSingle();
  if (!intent) return json({ status: "unknown" });

  // Confirmé si l'intent est complété OU si un paiement existe pour cette réf.
  let paid = intent.status === "completed";
  if (!paid) {
    const { data: pay } = await admin
      .from("payments")
      .select("id")
      .eq("provider_ref", ref)
      .maybeSingle();
    paid = !!pay;
  }

  const { data: plan } = await admin
    .from("plans")
    .select("name, groups(name, delivery_type, delivery_target)")
    .eq("id", intent.plan_id)
    .maybeSingle();
  const g: any = (plan as any)?.groups ?? {};
  const deliveryType = g.delivery_type ?? "telegram";

  // Cible livrée UNIQUEMENT si payé. Un fichier (`storage:<chemin>`) devient une
  // URL signée temporaire ; sinon on renvoie l'URL telle quelle.
  let target: string | null = paid ? g.delivery_target ?? null : null;
  let isFile = false;
  if (target && target.startsWith("storage:")) {
    isFile = true;
    const objectPath = target.slice("storage:".length);
    const { data: signed } = await admin.storage.from("content").createSignedUrl(objectPath, 3600);
    target = signed?.signedUrl ?? null;
  }

  return json({
    status: paid ? "completed" : "pending",
    deliveryType,
    offerName: g.name ?? (plan as any)?.name ?? "Offre",
    target,
    isFile,
  });
});
