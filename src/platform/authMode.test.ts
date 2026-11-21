import { describe, expect, it } from "vitest";
import { authModeFromEnv, parseSupabaseEnv } from "./authMode";

describe("auth mode", () => {
  it("uses Supabase when both env vars are set", () => {
    const env = { VITE_SUPABASE_URL: "https://x.supabase.co/", VITE_SUPABASE_ANON_KEY: " key " };
    expect(authModeFromEnv(env)).toBe("supabase");
    expect(parseSupabaseEnv(env)).toEqual({ url: "https://x.supabase.co", anonKey: "key" });
  });

  it("falls back to local mode when either env var is missing or blank", () => {
    expect(authModeFromEnv({})).toBe("local");
    expect(authModeFromEnv({ VITE_SUPABASE_URL: "https://x.supabase.co" })).toBe("local");
    expect(authModeFromEnv({ VITE_SUPABASE_URL: "  ", VITE_SUPABASE_ANON_KEY: "key" })).toBe("local");
    expect(authModeFromEnv({ VITE_SUPABASE_URL: "https://x.supabase.co", VITE_SUPABASE_ANON_KEY: 1 })).toBe("local");
  });
});
