// Paylika — Retrait instantané. Le propriétaire confirme un retrait dans l'app
// et l'argent part TOUT DE SUITE via UniTech withdraw_funds.
//
// Sécurité : le solde disponible est recalculé CÔTÉ SERVEUR (jamais confiance à
// l'app), scopé au propriétaire identifié par son JWT. Impossible de retirer
// plus que ce qu'on a réellement gagné.
//
// Appel : POST { amount, method, destination }  + header Authorization: Bearer <jwt user>
// Secret : UNITECH_API_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const API = "https://api.unitech.sn/api";
const API_KEY = Deno.env.get("UNITECH_API_KEY") ?? "";
const COMMISSION_RATE = 0.1;
// Frais de retrait UniTech (~1.5 % Sénégal). Paylika l'ABSORBE : le proprio
// reçoit exactement le montant demandé (retrait « gratuit »), car tous les
// frais sont déjà pris à l'encaissement via la commission de 10 %.
const PAYOUT_FEE_RATE = 0.015;

// app method -> UniTech payout channel
const PAYOUT_METHOD: Record<string, string> = {
  wave: "wave",
  orange_money: "orange",
  free_money: "orange",
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "content-type": "application/json" } });

// service-role client (bypasse RLS ; on scope nous-mêmes par owner_id)
const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    // 1) Identifier le propriétaire via son JWT.
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "Non authentifié." }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData } = await userClient.auth.getUser();
    const owner = userData.user?.id;
    if (!owner) return json({ error: "Session invalide. Reconnectez-vous." }, 401);

    // 2) Valider l'entrée.
    const body = await req.json().catch(() => null);
    const amount = Math.floor(Number(body?.amount) || 0);
    const method = String(body?.method ?? "wave");
    const destination = String(body?.destination ?? "").replace(/\s/g, "");
    if (amount <= 0) return json({ error: "Montant invalide." }, 400);
    if (destination.replace(/\D/g, "").length < 6)
      return json({ error: "Numéro de réception invalide." }, 400);

    // 3) Recalculer le solde disponible CÔTÉ SERVEUR (scopé au propriétaire).
    const [{ data: pays }, { data: outs }] = await Promise.all([
      admin.from("payments").select("amount, status").eq("owner_id", owner),
      admin.from("payouts").select("amount, status").eq("owner_id", owner),
    ]);
    const revenue = (pays ?? [])
      .filter((p: any) => p.status !== "failed")
      .reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
    const netEarned = revenue - Math.round(revenue * COMMISSION_RATE);
    const alreadyOut = (outs ?? [])
      .filter((p: any) => p.status !== "failed")
      .reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
    const available = netEarned - alreadyOut;

    if (amount > available)
      return json({ error: `Solde insuffisant. Disponible : ${available} XOF.`, available }, 400);

    // 4) Enregistrer le retrait (pending) puis l'exécuter immédiatement.
    const { data: payout, error: insErr } = await admin
      .from("payouts")
      .insert({ owner_id: owner, amount, method, destination, status: "pending" })
      .select("id")
      .single();
    if (insErr || !payout) return json({ error: "Enregistrement impossible." }, 500);

    let data: any = null;
    try {
      const res = await fetch(`${API}?action=withdraw_funds`, {
        method: "POST",
        headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          // UniTech débite le brut et le destinataire reçoit brut - frais.
          // On envoie donc un brut « majoré » pour qu'il reçoive `amount` net.
          amount: Math.ceil(amount / (1 - PAYOUT_FEE_RATE)),
          method: PAYOUT_METHOD[method] ?? "wave",
          account: destination,
        }),
      });
      data = await res.json().catch(() => null);
    } catch {
      /* réseau */
    }

    const ok = data?.success === true;
    await admin
      .from("payouts")
      .update({ status: ok ? "completed" : "failed" })
      .eq("id", payout.id);

    if (!ok) {
      // Le retrait 'failed' ne compte pas dans le solde → l'argent reste dispo.
      return json({ error: "Le transfert a échoué chez l'opérateur. Solde intact, réessayez.", detail: data }, 502);
    }
    return json({ ok: true, amount, available: available - amount });
  } catch (e) {
    return json({ error: "Erreur serveur.", detail: String(e) }, 500);
  }
});
