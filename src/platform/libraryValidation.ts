import type { HomebrewItemData } from "../domain/homebrewItems";
import { CURRENCY_DENOMINATIONS, HOMEBREW_ITEM_CATEGORIES } from "../domain/homebrewItems";
import { LibraryClientError } from "./libraryClient";

export function normalizeLibraryEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateHomebrewItemData(data: HomebrewItemData): void {
  const name = data.name.trim();
  if (!name) {
    throw new LibraryClientError("invalid_homebrew_item", "Item name is required.");
  }
  if (!Number.isFinite(data.weightLb) || data.weightLb < 0) {
    throw new LibraryClientError("invalid_homebrew_item", "Weight is invalid.");
  }
  if (!HOMEBREW_ITEM_CATEGORIES.includes(data.category)) {
    throw new LibraryClientError("invalid_homebrew_item", "Category is invalid.");
  }
  if (
    !data.cost ||
    !Number.isFinite(data.cost.amount) ||
    data.cost.amount < 0 ||
    !CURRENCY_DENOMINATIONS.includes(data.cost.denomination)
  ) {
    throw new LibraryClientError("invalid_homebrew_item", "Cost is invalid.");
  }
  if (data.range) {
    const { normalFeet, longFeet } = data.range;
    if (!Number.isFinite(normalFeet) || normalFeet < 0 || !Number.isFinite(longFeet) || longFeet < 0) {
      throw new LibraryClientError("invalid_homebrew_item", "Range is invalid.");
    }
  }
}

export function assertHomebrewCampaignIds(
  campaignIds: string[],
  ownedCampaignIds: ReadonlySet<string>,
): void {
  if (campaignIds.length === 0) {
    throw new LibraryClientError("invalid_homebrew_item", "Select at least one campaign.");
  }
  for (const campaignId of campaignIds) {
    if (!ownedCampaignIds.has(campaignId)) {
      throw new LibraryClientError("invalid_homebrew_item", "Campaign is not available.");
    }
  }
}
