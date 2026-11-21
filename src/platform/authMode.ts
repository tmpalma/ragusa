/**
 * How the app signs people in.
 * - `supabase`: Supabase Auth email OTP (link + 6-digit code). Used when the Vite Supabase env is set.
 * - `local`: offline/dev fallback with no verification. Entering an email signs in on this device and the
 *   library runs against the in-memory client.
 */
export type AuthMode = "supabase" | "local";

export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

export interface SupabaseEnvInput {
  VITE_SUPABASE_URL?: unknown;
  VITE_SUPABASE_ANON_KEY?: unknown;
}

export function parseSupabaseEnv(env: SupabaseEnvInput): SupabaseEnv | null {
  const url = env.VITE_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY;
  if (typeof url !== "string" || !url.trim()) return null;
  if (typeof anonKey !== "string" || !anonKey.trim()) return null;
  return { url: url.trim().replace(/\/$/, ""), anonKey: anonKey.trim() };
}

export function authModeFromEnv(env: SupabaseEnvInput): AuthMode {
  return parseSupabaseEnv(env) ? "supabase" : "local";
}

export function getAuthMode(): AuthMode {
  return authModeFromEnv(import.meta.env as SupabaseEnvInput);
}
