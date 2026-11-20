import { clearHomebrewItemRegistry, setHomebrewItemRegistry } from "../domain/homebrewItemRegistry";
import { getLibraryClient } from "./libraryClient";

/** Loads homebrew picks for a library character seated in a campaign. */
export async function refreshHomebrewItemRegistryForCharacter(
  email: string,
  characterId: string,
): Promise<void> {
  clearHomebrewItemRegistry();
  const client = getLibraryClient();
  const summaries = await client.listCharacters(email);
  const summary = summaries.find((row) => row.id === characterId);
  if (!summary?.campaignId) return;
  const items = await client.listHomebrewItems(email, { campaignId: summary.campaignId });
  setHomebrewItemRegistry(items);
}

export async function refreshHomebrewItemRegistryForCampaign(email: string, campaignId: string): Promise<void> {
  const items = await getLibraryClient().listHomebrewItems(email, { campaignId });
  setHomebrewItemRegistry(items);
}

export function clearHomebrewItemRegistryForSession(): void {
  clearHomebrewItemRegistry();
}
