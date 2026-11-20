import { configureLibraryClient } from "./libraryClient";
import { createMemoryLibraryClient } from "./memoryLibraryClient";
import { createSupabaseLibraryClient } from "./supabaseLibraryClient";
import { getSupabaseClient } from "./supabaseClient";

/**
 * Uses the Supabase library Edge Function when Vite env is present; otherwise the in-memory stub.
 */
export function setupLibraryClient(): void {
  configureLibraryClient(() => {
    if (getSupabaseClient()) {
      return createSupabaseLibraryClient();
    }
    return createMemoryLibraryClient();
  });
}
