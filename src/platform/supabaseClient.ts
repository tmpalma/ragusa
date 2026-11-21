import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { createClient, type SupabaseClient, type SupportedStorage } from "@supabase/supabase-js";
import { parseSupabaseEnv, type SupabaseEnvInput } from "./authMode";

let client: SupabaseClient | null = null;

/**
 * Auth storage for Capacitor native. WebView localStorage can be evicted by the OS, so the Supabase
 * session (access + refresh token, PKCE verifier) lives in native Preferences instead.
 */
export const capacitorPreferencesAuthStorage: SupportedStorage = {
  async getItem(key) {
    const { value } = await Preferences.get({ key });
    return value;
  },
  async setItem(key, value) {
    await Preferences.set({ key, value });
  },
  async removeItem(key) {
    await Preferences.remove({ key });
  },
};

export function getSupabaseClient(): SupabaseClient | null {
  if (client) return client;
  const env = parseSupabaseEnv(import.meta.env as SupabaseEnvInput);
  if (!env) return null;
  const native = Capacitor.isNativePlatform();
  client = createClient(env.url, env.anonKey, {
    auth: {
      // PKCE: the magic link returns to `emailRedirectTo?code=…`. With `detectSessionInUrl`, supabase-js
      // exchanges the code during client init (getSession waits for it) and strips `code` from the URL.
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
      // Native has no browser URL to read; sign-in there uses the 6-digit code.
      detectSessionInUrl: !native,
      ...(native ? { storage: capacitorPreferencesAuthStorage } : {}),
    },
  });
  return client;
}

/** Where the magic link sends the browser back to. Native uses the code, so no redirect. */
export function authEmailRedirectTo(): string | undefined {
  if (Capacitor.isNativePlatform()) return undefined;
  if (typeof window === "undefined") return undefined;
  return window.location.origin;
}
