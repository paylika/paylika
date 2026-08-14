// Paylika — Suppression de compte. Le propriétaire supprime définitivement son
// compte : on efface toutes ses données puis l'utilisateur Auth lui-même.
//
// Appel : POST  + header Authorization: Bearer <jwt user>
// (aucun corps requis)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "content-type": "application/json" } });

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "Non authentifié." }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData } = await userClient.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return json({ error: "Session invalide. Reconnectez-vous." }, 401);

    // Effacer les données du propriétaire (ordre = respect des clés étrangères).
    const tables = [
      "payments",
      "payouts",
      "subscriptions",
      "telegram_connections",
      "subscribers",
      "plans",
      "groups",
    ];
    for (const t of tables) {
      await admin.from(t).delete().eq("owner_id", uid);
    }

    // Supprimer les avatars stockés (best-effort).
    try {
      const { data: files } = await admin.storage.from("avatars").list(uid);
      if (files?.length) {
        await admin.storage.from("avatars").remove(files.map((f) => `${uid}/${f.name}`));
      }
    } catch {
      /* pas bloquant */
    }

    // Supprimer l'utilisateur Auth (profiles disparaît en cascade).
    const { error } = await admin.auth.admin.deleteUser(uid);
    if (error) return json({ error: "Suppression du compte impossible.", detail: error.message }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ error: "Erreur serveur.", detail: String(e) }, 500);
  }
});
