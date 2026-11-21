import type { LibraryClient } from "../libraryClient";
import { createCampaignLibrary } from "./campaigns";
import { createCharacterLibrary } from "./characters";
import { createHomebrewLibrary } from "./homebrew";
import { createPlayerLibrary } from "./players";
import { createMemoryLibraryStore } from "./store";

/**
 * In-memory stand-in for the library edge function.
 * A character can have at most one membership. Import always inserts a new row.
 * Each domain factory shares one store; add a domain by spreading its factory here.
 */
export function createMemoryLibraryClient(): LibraryClient {
  const store = createMemoryLibraryStore();
  return {
    ...createPlayerLibrary(store),
    ...createCharacterLibrary(store),
    ...createCampaignLibrary(store),
    ...createHomebrewLibrary(store),
  };
}
