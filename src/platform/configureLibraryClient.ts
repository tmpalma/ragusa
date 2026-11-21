import { getAuthMode } from "./authMode";
import { configureLibraryClient } from "./libraryClient";
import { createMemoryLibraryClient } from "./memoryLibraryClient";
import { createSupabaseLibraryClient } from "./supabaseLibraryClient";

/**
 * Uses the Supabase library Edge Function when the Vite Supabase env is present (auth mode `supabase`);
 * otherwise the in-memory stub (auth mode `local`).
 */
export function setupLibraryClient(): void {
  configureLibraryClient(() => {
    if (getAuthMode() === "supabase") {
      return createSupabaseLibraryClient();
    }
    return createMemoryLibraryClient();
  });
}
