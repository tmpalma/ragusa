import { MAGIC_ITEMS, findByKey } from "../data";
import type { Character } from "../state/characterState";
import { findArtificerPlan } from "./artificerPlans";
import { findGenericVariant } from "./genericVariantMatcher";

export function listArtificerCreatedItemKeys(character: Character): readonly string[] {
  if (character.classKey !== "artificer" || character.level < 2) return [];
  return character.artificerCreatedItemKeys;
}

export interface ArtificerCreatedItemNameFns {
  magicItemName: (key: string) => string;
  variantName: (key: string) => string;
  planName: (key: string) => string;
}

export function artificerCreatedItemLabel(key: string, names: ArtificerCreatedItemNameFns): string {
  if (findByKey(MAGIC_ITEMS, key)) return names.magicItemName(key);
  const variant = findGenericVariant(key);
  if (variant) return names.variantName(key);
  return names.planName(key);
}

export function artificerCreatedItemLabels(
  character: Character,
  names: ArtificerCreatedItemNameFns,
): string[] {
  return listArtificerCreatedItemKeys(character).map((key) => artificerCreatedItemLabel(key, names));
}

export function defaultArtificerCreatedItemPlanName(key: string): string {
  return findArtificerPlan(key)?.name ?? key;
}
