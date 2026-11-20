import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function supabaseEnv(): { url: string; anonKey: string } | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (typeof url !== "string" || !url.trim()) return null;
  if (typeof anonKey !== "string" || !anonKey.trim()) return null;
  return { url: url.replace(/\/$/, ""), anonKey: anonKey.trim() };
}

export function getSupabaseClient(): SupabaseClient | null {
  if (client) return client;
  const env = supabaseEnv();
  if (!env) return null;
  client = createClient(env.url, env.anonKey, {
    auth: {
      flowType: "pkce",
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return client;
}

export function loginRedirectUrl(): string {
  if (typeof window === "undefined") return "/login";
  return `${window.location.origin}/login`;
}
