import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { adminWhoami } from "./admin";

type AuthState = {
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  adminChecked: boolean;
};

// Emails admin connus côté client → routage INSTANTANÉ vers /admin, sans appeler
// le serveur (le contrôle d'accès réel reste vérifié serveur-à-serveur par
// admin-api ; ceci ne sert QU'À choisir l'écran). Optionnel : à définir dans
// EXPO_PUBLIC_ADMIN_EMAILS (séparés par des virgules) au build.
const ADMIN_EMAILS = (process.env.EXPO_PUBLIC_ADMIN_EMAILS ?? "")
  .split(",")
  .map((s: string) => s.trim().toLowerCase())
  .filter(Boolean);

/** Cache web du statut admin par utilisateur (évite le flash au retour). */
function cachedAdmin(userId: string | undefined): boolean | null {
  if (!userId || typeof window === "undefined" || !window.localStorage) return null;
  const v = window.localStorage.getItem("pk_admin_" + userId);
  return v === "1" ? true : v === "0" ? false : null;
}
function storeAdmin(userId: string | undefined, isAdmin: boolean): void {
  if (!userId || typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem("pk_admin_" + userId, isAdmin ? "1" : "0");
  } catch {
    /* quota / mode privé : tant pis, on revalide juste côté serveur */
  }
}

const AuthContext = createContext<AuthState>({
  session: null,
  loading: true,
  isAdmin: false,
  adminChecked: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Statut super-admin : vérifié côté serveur à chaque changement de session.
  // On garde un CACHE local (web) du dernier statut connu par utilisateur pour
  // router INSTANTANÉMENT à la reconnexion (fini le flash « app normale » avant
  // /admin). Le serveur reste la source de vérité : on revalide en arrière-plan.
  useEffect(() => {
    if (!session) {
      setIsAdmin(false);
      setAdminChecked(true);
      return;
    }
    const uid = session.user?.id;
    const email = session.user?.email?.toLowerCase();
    // Signal instantané : email admin déclaré (env) OU dernier statut en cache.
    const envKnown = ADMIN_EMAILS.length && email ? ADMIN_EMAILS.includes(email) : null;
    const instant = envKnown !== null ? envKnown : cachedAdmin(uid);
    if (instant !== null) {
      setIsAdmin(instant);
      setAdminChecked(true); // routage immédiat, aucune attente serveur
    } else {
      setAdminChecked(false); // 1re fois inconnue : on route en app (pas de blocage)
    }
    let alive = true;
    adminWhoami()
      .then((w) => {
        if (!alive) return;
        setIsAdmin(!!w.isAdmin);
        setAdminChecked(true);
        storeAdmin(uid, !!w.isAdmin);
      })
      .catch(() => {
        if (alive) setAdminChecked(true); // garde le cache si présent, sinon non-admin
      });
    return () => {
      alive = false;
    };
  }, [session]);

  return (
    <AuthContext.Provider value={{ session, loading, isAdmin, adminChecked }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export async function signInWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  meta?: { country?: string; whatsapp?: string },
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Pays + WhatsApp captés à l'inscription → visibles côté admin.
    options: meta ? { data: meta } : undefined,
  });
  if (error) throw error;
  // If email confirmation is enabled, session is null until confirmed.
  return { needsConfirmation: !data.session };
}

export async function signInWithGoogle() {
  const redirectTo =
    typeof window !== "undefined" ? window.location.origin : undefined;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
}

/** Ajoute / met à jour le pays + WhatsApp d'un compte existant (métadonnées). */
export async function updateWhatsApp(country: string, whatsapp: string) {
  const { error } = await supabase.auth.updateUser({ data: { country, whatsapp } });
  if (error) throw error;
}
