import type { CurrencyDenomination, ItemCost } from "../data/types";

export const HOMEBREW_GEAR_KEY_PREFIX = "homebrew:";

export type HomebrewItemCategory = "ring" | "weapon" | "wondrous" | "other";

export interface HomebrewItemRange {
  normalFeet: number;
  longFeet: number;
  normalMeters?: number;
  longMeters?: number;
}

export interface HomebrewItemData {
  name: string;
  description: string;
  category: HomebrewItemCategory;
  weightLb: number;
  /** Present when the DM entered mass in metric (book scale display). */
  weightKg?: number;
  cost: ItemCost;
  range?: HomebrewItemRange;
}

export interface HomebrewItemRecord {
  id: string;
  ownerEmail: string;
  campaignIds: string[];
  data: HomebrewItemData;
  updatedAt: string;
}

export function homebrewGearKey(id: string): string {
  return `${HOMEBREW_GEAR_KEY_PREFIX}${id}`;
}

export function parseHomebrewGearKey(key: string): string | null {
  if (!key.startsWith(HOMEBREW_GEAR_KEY_PREFIX)) return null;
  const id = key.slice(HOMEBREW_GEAR_KEY_PREFIX.length);
  return id.length > 0 ? id : null;
}

export function isHomebrewGearKey(key: string): boolean {
  return parseHomebrewGearKey(key) !== null;
}

export const HOMEBREW_ITEM_CATEGORIES: HomebrewItemCategory[] = ["ring", "weapon", "wondrous", "other"];

export const CURRENCY_DENOMINATIONS: CurrencyDenomination[] = ["pp", "gp", "ep", "sp", "cp"];
