import { CLASSES, findByKey } from "../data";
import type { ClassData } from "../data/types";
import { findFeatDefinition } from "./featEffects";

export function classFeatGrantLevels(
  classData: ClassData | null,
  characterLevel: number,
  classKey?: string | null,
): number[] {
  const data = classData ?? (classKey ? findByKey(CLASSES, classKey) : null);
  if (!data) return [];
  return data.features
    .filter(
      (feature) =>
        feature.grantedAtLevel <= characterLevel &&
        feature.effects.some((effect) => effect.type === "grant_feat"),
    )
    .map((feature) => feature.grantedAtLevel)
    .sort((a, b) => a - b);
}

export function isFeatRepeatable(featKey: string): boolean {
  return findFeatDefinition(featKey)?.repeatable ?? false;
}

export function classHasFeatGrantAtLevel(
  classData: ClassData | null,
  level: number,
): boolean {
  if (!classData) return false;
  return classData.features.some(
    (feature) =>
      feature.grantedAtLevel === level &&
      feature.effects.some((effect) => effect.type === "grant_feat"),
  );
}
