import type { SkillId } from "../data/types";
import type { FeatChoices } from "./featEffects";
import { backgroundSkillIdsForCharacter, isCustomBackground } from "./background";
import { findSubclass, subclassFixedSkills } from "./subclasses";

type SkillClaimSource =
  | "catalogBackground"
  | "subclassFixed"
  | "customBackground"
  | "class"
  | "subclass"
  | "classFeature"
  | "species"
  | "feat";

interface SkillClaim {
  source: SkillClaimSource;
  skill: SkillId;
  index?: number;
  featureKey?: string;
  featIndex?: number;
}

const KEEP_PRIORITY: Record<SkillClaimSource, number> = {
  catalogBackground: 100,
  subclassFixed: 90,
  customBackground: 50,
  class: 40,
  subclass: 35,
  classFeature: 30,
  species: 20,
  feat: 10,
};

export interface SkillPickConflictInput {
  backgroundKey: string | null;
  backgroundSkillPicks: readonly (SkillId | null)[];
  classKey: string | null;
  subclassKey: string | null;
  level: number;
  classSkillPicks: readonly (SkillId | null)[];
  featChoices: FeatChoices;
  extraFeatChoices: readonly FeatChoices[];
  speciesSkillPicks: readonly (SkillId | null)[];
  subclassSkillPicks: readonly (SkillId | null)[];
  classFeatureSkillPicks: Readonly<Record<string, readonly (SkillId | null)[]>>;
}

export interface SkillPickConflictResult {
  backgroundSkillPicks: (SkillId | null)[];
  classSkillPicks: (SkillId | null)[];
  featChoices: FeatChoices;
  extraFeatChoices: FeatChoices[];
  speciesSkillPicks: (SkillId | null)[];
  subclassSkillPicks: (SkillId | null)[];
  classFeatureSkillPicks: Record<string, (SkillId | null)[]>;
  removedSkills: SkillId[];
}

function collectSkillClaims(input: SkillPickConflictInput): SkillClaim[] {
  const claims: SkillClaim[] = [];

  if (isCustomBackground(input.backgroundKey)) {
    input.backgroundSkillPicks.forEach((skill, index) => {
      if (skill) claims.push({ source: "customBackground", skill, index });
    });
  } else {
    for (const skill of backgroundSkillIdsForCharacter({
      backgroundKey: input.backgroundKey,
      backgroundSkillPicks: [...input.backgroundSkillPicks],
    })) {
      claims.push({ source: "catalogBackground", skill });
    }
  }

  if (input.level >= 3 && input.classKey && input.subclassKey) {
    for (const skill of subclassFixedSkills(findSubclass(input.classKey, input.subclassKey))) {
      claims.push({ source: "subclassFixed", skill });
    }
  }

  input.classSkillPicks.forEach((skill, index) => {
    if (skill) claims.push({ source: "class", skill, index });
  });

  input.subclassSkillPicks.forEach((skill, index) => {
    if (skill) claims.push({ source: "subclass", skill, index });
  });

  for (const [featureKey, picks] of Object.entries(input.classFeatureSkillPicks)) {
    picks.forEach((skill, index) => {
      if (skill) claims.push({ source: "classFeature", skill, index, featureKey });
    });
  }

  input.speciesSkillPicks.forEach((skill, index) => {
    if (skill) claims.push({ source: "species", skill, index });
  });

  input.featChoices.proficiencyPicks.forEach((pick, index) => {
    if (pick?.kind === "skill") claims.push({ source: "feat", skill: pick.id, index, featIndex: -1 });
  });

  input.extraFeatChoices.forEach((choices, featIndex) => {
    choices.proficiencyPicks.forEach((pick, index) => {
      if (pick?.kind === "skill") claims.push({ source: "feat", skill: pick.id, index, featIndex });
    });
  });

  return claims;
}

function clearFeatSkillPick(choices: FeatChoices, skill: SkillId, pickIndex: number): FeatChoices {
  const current = choices.proficiencyPicks[pickIndex];
  if (!current || current.kind !== "skill" || current.id !== skill) return choices;
  const proficiencyPicks = [...choices.proficiencyPicks];
  proficiencyPicks[pickIndex] = null;
  return { ...choices, proficiencyPicks };
}

function applySkillClaimRemoval(
  input: SkillPickConflictInput,
  claim: SkillClaim,
): SkillPickConflictInput {
  switch (claim.source) {
    case "catalogBackground":
    case "subclassFixed":
      return input;
    case "customBackground": {
      const backgroundSkillPicks = [...input.backgroundSkillPicks];
      if (claim.index != null) backgroundSkillPicks[claim.index] = null;
      return { ...input, backgroundSkillPicks };
    }
    case "class": {
      const classSkillPicks = [...input.classSkillPicks];
      if (claim.index != null) classSkillPicks[claim.index] = null;
      return { ...input, classSkillPicks };
    }
    case "subclass": {
      const subclassSkillPicks = [...input.subclassSkillPicks];
      if (claim.index != null) subclassSkillPicks[claim.index] = null;
      return { ...input, subclassSkillPicks };
    }
    case "classFeature": {
      if (!claim.featureKey || claim.index == null) return input;
      const classFeatureSkillPicks = { ...input.classFeatureSkillPicks };
      const picks = [...(classFeatureSkillPicks[claim.featureKey] ?? [])];
      picks[claim.index] = null;
      classFeatureSkillPicks[claim.featureKey] = picks;
      return { ...input, classFeatureSkillPicks };
    }
    case "species": {
      const speciesSkillPicks = [...input.speciesSkillPicks];
      if (claim.index != null) speciesSkillPicks[claim.index] = null;
      return { ...input, speciesSkillPicks };
    }
    case "feat": {
      const pickIndex = claim.index;
      const featIndex = claim.featIndex;
      if (pickIndex == null || featIndex == null) return input;
      if (featIndex < 0) {
        return {
          ...input,
          featChoices: clearFeatSkillPick(input.featChoices, claim.skill, pickIndex),
        };
      }
      const extraFeatChoices = input.extraFeatChoices.map((choices, index) =>
        index === featIndex ? clearFeatSkillPick(choices, claim.skill, pickIndex) : choices,
      );
      return { ...input, extraFeatChoices };
    }
    default:
      return input;
  }
}

function isRemovableClaim(claim: SkillClaim): boolean {
  return claim.source !== "catalogBackground" && claim.source !== "subclassFixed";
}

export function resolveSkillPickConflicts(input: SkillPickConflictInput): SkillPickConflictResult {
  let working: SkillPickConflictInput = {
    ...input,
    backgroundSkillPicks: [...input.backgroundSkillPicks],
    classSkillPicks: [...input.classSkillPicks],
    featChoices: {
      ...input.featChoices,
      proficiencyPicks: [...input.featChoices.proficiencyPicks],
    },
    extraFeatChoices: input.extraFeatChoices.map((choices) => ({
      ...choices,
      proficiencyPicks: [...choices.proficiencyPicks],
    })),
    speciesSkillPicks: [...input.speciesSkillPicks],
    subclassSkillPicks: [...input.subclassSkillPicks],
    classFeatureSkillPicks: Object.fromEntries(
      Object.entries(input.classFeatureSkillPicks).map(([key, picks]) => [key, [...picks]]),
    ),
  };

  const removedSkills: SkillId[] = [];
  const claims = collectSkillClaims(working);
  const grouped = new Map<SkillId, SkillClaim[]>();

  for (const claim of claims) {
    const group = grouped.get(claim.skill) ?? [];
    group.push(claim);
    grouped.set(claim.skill, group);
  }

  for (const [skill, group] of grouped) {
    if (group.length <= 1) continue;

    const sorted = [...group].sort((a, b) => KEEP_PRIORITY[b.source] - KEEP_PRIORITY[a.source]);
    const keepPriority = KEEP_PRIORITY[sorted[0].source];

    for (const claim of sorted) {
      if (KEEP_PRIORITY[claim.source] < keepPriority && isRemovableClaim(claim)) {
        working = applySkillClaimRemoval(working, claim);
        if (!removedSkills.includes(skill)) removedSkills.push(skill);
      }
    }
  }

  return {
    backgroundSkillPicks: [...working.backgroundSkillPicks],
    classSkillPicks: [...working.classSkillPicks],
    featChoices: working.featChoices,
    extraFeatChoices: working.extraFeatChoices.map((choices) => ({
      ...choices,
      proficiencyPicks: [...choices.proficiencyPicks],
    })),
    speciesSkillPicks: [...working.speciesSkillPicks],
    subclassSkillPicks: [...working.subclassSkillPicks],
    classFeatureSkillPicks: Object.fromEntries(
      Object.entries(working.classFeatureSkillPicks).map(([key, picks]) => [key, [...picks]]),
    ),
    removedSkills,
  };
}
