import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client for Paylika.
 * Credentials come from EXPO_PUBLIC_* env vars (see .env) so they stay out of
 * source. The anon key is a public client key — access is gated server-side by
 * Row Level Security policies, never by hiding this key.
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase: variables manquantes. Renseignez EXPO_PUBLIC_SUPABASE_URL et " +
      "EXPO_PUBLIC_SUPABASE_ANON_KEY dans le fichier .env, puis redémarrez Expo."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // We don't use email-link redirects in a native app.
    detectSessionInUrl: false,
  },
});
