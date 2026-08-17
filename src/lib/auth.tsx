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
  useEffect(() => {
    if (!session) {
      setIsAdmin(false);
      setAdminChecked(true);
      return;
    }
    let alive = true;
    setAdminChecked(false);
    adminWhoami()
      .then((w) => alive && (setIsAdmin(!!w.isAdmin), setAdminChecked(true)))
      .catch(() => alive && (setIsAdmin(false), setAdminChecked(true)));
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
