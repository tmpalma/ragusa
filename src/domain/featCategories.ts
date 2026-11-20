import type { FeatData } from "../data/types";

export const FEAT_CATEGORY_ORDER = [
  "Origin",
  "General",
  "Fighting Style",
  "Dragonmark",
  "Dark Gift",
  "Epic Boon",
] as const;

export type FeatCategory = (typeof FEAT_CATEGORY_ORDER)[number];

const HIDDEN_FEAT_PICKER_CATEGORIES = new Set<FeatCategory>(["Dragonmark", "Dark Gift"]);

export function isHiddenFeatPickerCategory(category: string): boolean {
  return HIDDEN_FEAT_PICKER_CATEGORIES.has(category as FeatCategory);
}

export function excludeHiddenFeatPickerCategories(feats: FeatData[]): FeatData[] {
  return feats.filter((feat) => !isHiddenFeatPickerCategory(feat.category));
}

function featCategorySortIndex(category: string): number {
  const index = FEAT_CATEGORY_ORDER.indexOf(category as FeatCategory);
  return index >= 0 ? index : FEAT_CATEGORY_ORDER.length;
}

export function compareFeatsByCategoryThenName(a: FeatData, b: FeatData): number {
  const categoryDelta = featCategorySortIndex(a.category) - featCategorySortIndex(b.category);
  if (categoryDelta !== 0) return categoryDelta;
  return a.name.localeCompare(b.name);
}

export function availableFeatCategories(feats: FeatData[]): FeatCategory[] {
  const present = new Set(feats.map((feat) => feat.category));
  return FEAT_CATEGORY_ORDER.filter((category) => present.has(category));
}

export function filterFeatsByCategory(feats: FeatData[], category: string | null): FeatData[] {
  const filtered = category == null ? feats : feats.filter((feat) => feat.category === category);
  return [...filtered].sort(compareFeatsByCategoryThenName);
}
