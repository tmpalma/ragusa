import type { CatalogPayload } from "./types";
import { validateCatalogPayload } from "./installCatalog";

const FETCH_TIMEOUT_MS = 30_000;

function supabaseEnv(): { url: string; anonKey: string } | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (typeof url !== "string" || !url.trim()) return null;
  if (typeof anonKey !== "string" || !anonKey.trim()) return null;
  return { url: url.replace(/\/$/, ""), anonKey: anonKey.trim() };
}

export async function fetchCatalogFromSupabase(): Promise<CatalogPayload> {
  const env = supabaseEnv();
  if (!env) {
    throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${env.url}/rest/v1/rpc/get_catalog`, {
      method: "POST",
      headers: {
        apikey: env.anonKey,
        Authorization: `Bearer ${env.anonKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: "{}",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`get_catalog failed (${response.status})`);
    }

    const body: unknown = await response.json();
    if (!validateCatalogPayload(body)) {
      throw new Error("get_catalog returned an unexpected payload");
    }
    return body;
  } finally {
    clearTimeout(timeout);
  }
}
