import { CLASSES, FEATS, findByKey } from "../../data";
import { fightingStyleFeats } from "../featEffects";

const STANDARD_FIGHTING_STYLE_KEYS = fightingStyleFeats(FEATS)
  .map((feat) => feat.key)
  .filter((key) => key !== "blessed-warrior" && key !== "druidic-warrior");

const FIGHTING_STYLE_FEAT_KEYS_BY_CLASS: Record<string, readonly string[]> = {
  fighter: STANDARD_FIGHTING_STYLE_KEYS,
  paladin: [...STANDARD_FIGHTING_STYLE_KEYS, "blessed-warrior"],
  ranger: [...STANDARD_FIGHTING_STYLE_KEYS, "druidic-warrior"],
};

export function fightingStyleFeatOptionsForClass(classKey: string | null): readonly string[] {
  if (!classKey) return [];
  return FIGHTING_STYLE_FEAT_KEYS_BY_CLASS[classKey] ?? [];
}

export function isFightingStyleFeatAllowedForClass(classKey: string | null, featKey: string): boolean {
  return fightingStyleFeatOptionsForClass(classKey).includes(featKey);
}

export function fightingStyleGrantedAtLevel(classKey: string | null): number | null {
  if (!classKey) return null;
  const classData = findByKey(CLASSES, classKey);
  if (!classData) return null;
  const feature = classData.features.find((entry) =>
    entry.effects.some((effect) => effect.type === "fighting_style_feature"),
  );
  return feature?.grantedAtLevel ?? null;
}
