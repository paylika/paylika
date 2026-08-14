import "react-native-url-polyfill/auto";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client for Paylika.
 * Credentials come from EXPO_PUBLIC_* env vars when set (local .env); otherwise
 * they fall back to the public project values below so hosted builds (Cloudflare)
 * work without extra config. The anon key is a PUBLIC client key — access is
 * gated server-side by Row Level Security, never by hiding this key.
 */
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  "https://xkdiodbppotyiyldlwbg.supabase.co";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrZGlvZGJwcG90eWl5bGRsd2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NDU5OTEsImV4cCI6MjEwMjEyMTk5MX0.k0IAo04J5fJo_c6V7VHFUoFiKd26Eej5bfG-aavHFbQ";

// Storage per platform. On WEB we deliberately let supabase-js use its own
// default (browser localStorage + the `navigator.locks` mutex): forcing
// AsyncStorage on web bypasses that lock, so two tabs / concurrent refreshes
// race, rotate each other's refresh token and get a 400 — which silently kills
// the session and makes every RLS write fail ("works at first, then stops").
// On native there is no localStorage, so we use AsyncStorage.
const authStorage = Platform.OS === "web" ? undefined : AsyncStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...(authStorage ? { storage: authStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    // We don't use email-link redirects in a native app.
    detectSessionInUrl: false,
  },
});
