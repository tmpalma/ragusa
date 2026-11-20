import type { GenericVariantData, MagicItemRarity } from "../data/types";

export type VariantNameAffixes = {
  namePrefix: string;
  nameSuffix: string;
};

export type EntityNameTranslate = (
  catalogPrefix: string,
  entityKey: string,
  field: string,
  fallback?: string,
) => string;

/** Resolved prefix/suffix for display (catalog override with JSON fallback). */
export function variantAffixesForDisplay(
  variant: GenericVariantData,
  tEntity: EntityNameTranslate,
): VariantNameAffixes {
  return {
    namePrefix: tEntity(
      "catalog.genericVariants",
      variant.key,
      "namePrefix",
      variant.namePrefix ?? "",
    ),
    nameSuffix: tEntity(
      "catalog.genericVariants",
      variant.key,
      "nameSuffix",
      variant.nameSuffix ?? "",
    ),
  };
}

/** Prefix/suffix display name; pass `affixes` from `variantAffixesForDisplay` for localized titles. */
export function variantDisplayName(
  baseName: string,
  variant: GenericVariantData | null | undefined,
  affixes?: VariantNameAffixes,
): string {
  if (!variant) return baseName;
  const prefix = affixes ? affixes.namePrefix : (variant.namePrefix ?? "");
  const suffix = affixes ? affixes.nameSuffix : (variant.nameSuffix ?? "");
  return `${prefix}${baseName}${suffix}`;
}

export function localizedVariantDisplayName(
  baseName: string,
  variant: GenericVariantData | null | undefined,
  tEntity: EntityNameTranslate,
): string {
  if (!variant) return baseName;
  return variantDisplayName(baseName, variant, variantAffixesForDisplay(variant, tEntity));
}

/** Locale key under equipment.rarity.* for a catalog rarity label. */
export function variantRarityLocaleKey(rarity: MagicItemRarity): string {
  return `equipment.rarity.${rarity}`;
}
