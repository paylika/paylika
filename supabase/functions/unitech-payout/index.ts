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
    const country = String(body?.country ?? "SN");
    const method = String(body?.method ?? "wave");
    const destination = String(body?.destination ?? "").replace(/\s/g, "");
    if (amount <= 0) return json({ error: "Montant invalide." }, 400);
    if (destination.replace(/\D/g, "").length < 6)
      return json({ error: "Numéro de réception invalide." }, 400);

    // 3) Débit ATOMIQUE : la fonction Postgres recalcule le solde ET insère le
    //    payout dans la MÊME transaction (verrou par propriétaire) → pas de
    //    course possible entre deux retraits simultanés.
    const { data: payoutId, error: rpcErr } = await admin.rpc("create_payout", {
      p_owner: owner,
      p_amount: amount,
      p_method: method,
      p_destination: destination,
      p_country: country,
    });
    if (rpcErr) {
      const m = rpcErr.message || "";
      if (m.includes("INSUFFICIENT_BALANCE")) {
        const avail = Number(m.split("INSUFFICIENT_BALANCE:")[1]?.trim() ?? "0") || 0;
        return json({ error: `Solde insuffisant. Disponible : ${avail} XOF.`, available: avail }, 400);
      }
      if (m.includes("INVALID_AMOUNT")) return json({ error: "Montant invalide." }, 400);
      console.error("create_payout:", m);
      return json({ error: "Enregistrement impossible (fonction create_payout absente ?)." }, 500);
    }
    const payoutId2 = String(payoutId);

    // 4) Exécuter le décaissement chez UniTech.
    let data: any = null;
    let networkError = false;
    try {
      const res = await fetch(`${API}?action=withdraw_funds`, {
        method: "POST",
        headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          // UniTech débite le brut et le destinataire reçoit brut - frais.
          // On envoie donc un brut « majoré » pour qu'il reçoive `amount` net.
          amount: Math.ceil(amount / (1 - PAYOUT_FEE_RATE)),
          method: PAYOUT_METHOD[method] ?? method,
          account: destination,
          reference: payoutId2, // clé d'idempotence (si UniTech la respecte)
          // Hors Sénégal : on transmet le pays (retrait international).
          ...(country !== "SN" ? { country } : {}),
        }),
      });
      data = await res.json().catch(() => null);
    } catch {
      networkError = true;
    }

    if (data?.success === true) {
      await admin.from("payouts").update({ status: "completed" }).eq("id", payoutId2);
      return json({ ok: true, amount });
    }

    // Réponse AMBIGUË (réseau coupé / JSON illisible) : UniTech a peut-être QUAND
    // MÊME envoyé l'argent. On NE restaure PAS le solde (le payout reste 'pending',
    // donc compté) → évite le double décaissement si l'utilisateur réessaie.
    if (networkError || data == null) {
      return json(
        { error: "Transfert envoyé, confirmation incertaine. On vérifie — ne relancez pas.", pending: true },
        202,
      );
    }

    // Échec EXPLICITE de l'opérateur : l'argent n'est pas parti → on restaure le solde.
    await admin.from("payouts").update({ status: "failed" }).eq("id", payoutId2);
    return json({ error: "Le transfert a échoué chez l'opérateur. Solde intact, réessayez.", detail: data }, 502);
  } catch (e) {
    return json({ error: "Erreur serveur.", detail: String(e) }, 500);
  }
});
