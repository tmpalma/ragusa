import { SKILLS } from "../../data/skills";
import type { ClassData, SkillId } from "../../data/types";

const ALL_SKILL_IDS = SKILLS.map((skill) => skill.id);

export interface ClassFeatureSkillGrant {
  featureKey: string;
  count: number;
  options: SkillId[];
}

export function classFeatureSkillGrants(classData: ClassData | null, level: number): ClassFeatureSkillGrant[] {
  if (!classData) return [];
  const grants: ClassFeatureSkillGrant[] = [];
  for (const feature of classData.features) {
    if (feature.grantedAtLevel > level) continue;
    for (const effect of feature.effects) {
      if (effect.type === "grant_skill_proficiencies") {
        grants.push({
          featureKey: feature.key,
          count: effect.count,
          options: effect.options ?? ALL_SKILL_IDS,
        });
      }
    }
  }
  return grants;
}

export function classFeatureSkillGrantsAtLevel(classData: ClassData | null, level: number): ClassFeatureSkillGrant[] {
  if (!classData) return [];
  const grants: ClassFeatureSkillGrant[] = [];
  for (const feature of classData.features) {
    if (feature.grantedAtLevel !== level) continue;
    for (const effect of feature.effects) {
      if (effect.type === "grant_skill_proficiencies") {
        grants.push({
          featureKey: feature.key,
          count: effect.count,
          options: effect.options ?? ALL_SKILL_IDS,
        });
      }
    }
  }
  return grants;
}

export function initialClassFeatureSkillPicks(
  classData: ClassData | null,
  level: number,
): Record<string, (SkillId | null)[]> {
  const picks: Record<string, (SkillId | null)[]> = {};
  for (const grant of classFeatureSkillGrants(classData, level)) {
    picks[grant.featureKey] = Array.from({ length: grant.count }, () => null);
  }
  return picks;
}
