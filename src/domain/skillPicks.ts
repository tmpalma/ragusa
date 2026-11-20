import { SKILLS } from "../data/skills";
import type { SkillId } from "../data/types";

export type SkillProficiencyState = "none" | "proficient" | "expert";

export function emptySkillProficiencies(): Record<SkillId, "none"> {
  return Object.fromEntries(SKILLS.map((skill) => [skill.id, "none"])) as Record<SkillId, "none">;
}

export function mergeSkillProficiencies(
  backgroundSkills: readonly SkillId[],
  classPicks: readonly (SkillId | null)[],
  featPicks: readonly (SkillId | null)[] = [],
  expertisePicks: readonly (SkillId | null)[] = [],
  speciesPicks: readonly (SkillId | null)[] = [],
  subclassPicks: readonly (SkillId | null)[] = [],
  classFeaturePicks: readonly (SkillId | null)[] = [],
  subclassFixedSkills: readonly SkillId[] = [],
): Record<SkillId, SkillProficiencyState> {
  const skills: Record<SkillId, SkillProficiencyState> = { ...emptySkillProficiencies() };
  for (const id of backgroundSkills) {
    skills[id] = "proficient";
  }
  for (const id of classPicks) {
    if (id) skills[id] = "proficient";
  }
  for (const id of featPicks) {
    if (id) skills[id] = "proficient";
  }
  for (const id of speciesPicks) {
    if (id) skills[id] = "proficient";
  }
  for (const id of subclassFixedSkills) {
    skills[id] = "proficient";
  }
  for (const id of subclassPicks) {
    if (id) skills[id] = "proficient";
  }
  for (const id of classFeaturePicks) {
    if (id) skills[id] = "proficient";
  }
  for (const id of expertisePicks) {
    if (id && skills[id] === "proficient") skills[id] = "expert";
  }
  return skills;
}

export function proficientSkillIds(
  backgroundSkills: readonly SkillId[],
  classPicks: readonly (SkillId | null)[],
  featPicks: readonly (SkillId | null)[] = [],
  speciesPicks: readonly (SkillId | null)[] = [],
  subclassPicks: readonly (SkillId | null)[] = [],
  classFeaturePicks: readonly (SkillId | null)[] = [],
  subclassFixedSkills: readonly SkillId[] = [],
): SkillId[] {
  const skills = mergeSkillProficiencies(
    backgroundSkills,
    classPicks,
    featPicks,
    [],
    speciesPicks,
    subclassPicks,
    classFeaturePicks,
    subclassFixedSkills,
  );
  return (Object.entries(skills) as [SkillId, SkillProficiencyState][])
    .filter(([, state]) => state === "proficient" || state === "expert")
    .map(([id]) => id);
}

export function expertSkillIds(
  backgroundSkills: readonly SkillId[],
  classPicks: readonly (SkillId | null)[],
  featPicks: readonly (SkillId | null)[] = [],
  expertisePicks: readonly (SkillId | null)[] = [],
  speciesPicks: readonly (SkillId | null)[] = [],
  subclassPicks: readonly (SkillId | null)[] = [],
  classFeaturePicks: readonly (SkillId | null)[] = [],
  subclassFixedSkills: readonly SkillId[] = [],
): SkillId[] {
  const skills = mergeSkillProficiencies(
    backgroundSkills,
    classPicks,
    featPicks,
    expertisePicks,
    speciesPicks,
    subclassPicks,
    classFeaturePicks,
    subclassFixedSkills,
  );
  return (Object.entries(skills) as [SkillId, SkillProficiencyState][])
    .filter(([, state]) => state === "expert")
    .map(([id]) => id);
}

/** Collects skills already taken by other sources and sibling slots in the same picker. */
export function compactSkillPicks(picks: readonly (SkillId | null)[]): SkillId[] {
  return picks.filter((pick): pick is SkillId => pick != null);
}

export function flattenClassSkillPicksByClass(
  picksByClass: Readonly<Record<string, readonly (SkillId | null)[]>>,
): (SkillId | null)[] {
  return Object.values(picksByClass).flat();
}

export function mergedClassSkillPickSlots(
  classSkillPicks: readonly (SkillId | null)[],
  classSkillPicksByClass: Readonly<Record<string, readonly (SkillId | null)[]>>,
): (SkillId | null)[] {
  return [...classSkillPicks, ...flattenClassSkillPicksByClass(classSkillPicksByClass)];
}

export function firstEmptySkillPickSlot(picks: readonly (SkillId | null)[]): number {
  return picks.findIndex((pick) => pick === null);
}

export function skillPickSlotForId(picks: readonly (SkillId | null)[], skillId: SkillId): number {
  return picks.findIndex((pick) => pick === skillId);
}

export function collectTakenSkills(
  otherSourceSkills: readonly SkillId[],
  currentPicks: readonly (SkillId | null)[],
  slotIndex: number,
): SkillId[] {
  const taken = new Set<SkillId>(otherSourceSkills);
  currentPicks.forEach((pick, index) => {
    if (pick && index !== slotIndex) taken.add(pick);
  });
  return [...taken];
}

export function retainValidClassSkillPicks(
  picks: readonly (SkillId | null)[],
  count: number,
  options: readonly SkillId[],
  takenSkills: readonly SkillId[],
): (SkillId | null)[] {
  const takenSet = new Set(takenSkills);
  const optionSet = new Set(options);
  const kept: SkillId[] = [];
  const seen = new Set<SkillId>();
  for (const pick of picks) {
    if (pick && optionSet.has(pick) && !takenSet.has(pick) && !seen.has(pick)) {
      kept.push(pick);
      seen.add(pick);
    }
  }
  return Array.from({ length: count }, (_, index) => kept[index] ?? null);
}

export function applyClassSkillPick(
  picks: readonly (SkillId | null)[],
  index: number,
  skill: SkillId | null,
  options: readonly SkillId[],
  takenSkills: readonly SkillId[],
): (SkillId | null)[] | null {
  if (index < 0 || index >= picks.length) return null;
  if (skill === null) {
    if (picks[index] === null) return null;
    const next = [...picks];
    next[index] = null;
    return next;
  }
  if (!options.includes(skill)) return null;
  if (takenSkills.includes(skill)) return null;
  if (picks.some((pick, pickIndex) => pickIndex !== index && pick === skill)) return null;
  if (picks[index] === skill) return null;
  const next = [...picks];
  next[index] = skill;
  return next;
}

export function availableClassSkillOptions(
  options: readonly SkillId[],
  picks: readonly (SkillId | null)[],
  takenSkills: readonly SkillId[],
  slotIndex: number,
): SkillId[] {
  const currentPick = picks[slotIndex];
  const taken = new Set<SkillId>(takenSkills.filter((id) => id !== currentPick));
  picks.forEach((pick, index) => {
    if (pick && index !== slotIndex) taken.add(pick);
  });
  return options.filter((id) => !taken.has(id));
}

export function retainValidExpertiseSkillPicks(
  picks: readonly (SkillId | null)[],
  count: number,
  proficientSkills: readonly SkillId[],
  expertSkills: readonly SkillId[] = [],
): (SkillId | null)[] {
  const proficientSet = new Set(proficientSkills);
  const expertSet = new Set(expertSkills);
  const kept: SkillId[] = [];
  const seen = new Set<SkillId>();
  for (const pick of picks) {
    if (pick && proficientSet.has(pick) && !expertSet.has(pick) && !seen.has(pick)) {
      kept.push(pick);
      seen.add(pick);
    }
  }
  return Array.from({ length: count }, (_, index) => kept[index] ?? null);
}

export function applyExpertiseSkillPick(
  picks: readonly (SkillId | null)[],
  index: number,
  skill: SkillId | null,
  proficientSkills: readonly SkillId[],
  expertSkills: readonly SkillId[] = [],
): (SkillId | null)[] | null {
  if (index < 0 || index >= picks.length) return null;
  if (skill === null) {
    if (picks[index] === null) return null;
    const next = [...picks];
    next[index] = null;
    return next;
  }
  if (!proficientSkills.includes(skill)) return null;
  if (expertSkills.includes(skill)) return null;
  if (picks.some((pick, pickIndex) => pickIndex !== index && pick === skill)) return null;
  if (picks[index] === skill) return null;
  const next = [...picks];
  next[index] = skill;
  return next;
}

export function availableExpertiseSkillOptions(
  proficientSkills: readonly SkillId[],
  picks: readonly (SkillId | null)[],
  slotIndex: number,
  expertSkills: readonly SkillId[] = [],
): SkillId[] {
  const taken = new Set<SkillId>(expertSkills);
  picks.forEach((pick, index) => {
    if (pick && index !== slotIndex) taken.add(pick);
  });
  return proficientSkills.filter((id) => !taken.has(id));
}

export function retainValidSubclassSkillPicks(
  picks: readonly (SkillId | null)[],
  count: number,
  takenSkills: readonly SkillId[],
): (SkillId | null)[] {
  const takenSet = new Set(takenSkills);
  const kept: SkillId[] = [];
  const seen = new Set<SkillId>();
  for (const pick of picks) {
    if (pick && !takenSet.has(pick) && !seen.has(pick)) {
      kept.push(pick);
      seen.add(pick);
    }
  }
  return Array.from({ length: count }, (_, index) => kept[index] ?? null);
}

export function applySubclassSkillPick(
  picks: readonly (SkillId | null)[],
  index: number,
  skill: SkillId | null,
  takenSkills: readonly SkillId[],
): (SkillId | null)[] | null {
  if (index < 0 || index >= picks.length) return null;
  if (skill === null) {
    if (picks[index] === null) return null;
    const next = [...picks];
    next[index] = null;
    return next;
  }
  if (takenSkills.includes(skill)) return null;
  if (picks.some((pick, pickIndex) => pickIndex !== index && pick === skill)) return null;
  if (picks[index] === skill) return null;
  const next = [...picks];
  next[index] = skill;
  return next;
}

export function availableSubclassSkillOptions(
  picks: readonly (SkillId | null)[],
  takenSkills: readonly SkillId[],
  slotIndex: number,
  options: readonly SkillId[],
): SkillId[] {
  const currentPick = picks[slotIndex];
  const taken = new Set<SkillId>(takenSkills.filter((id) => id !== currentPick));
  picks.forEach((pick, index) => {
    if (pick && index !== slotIndex) taken.add(pick);
  });
  return options.filter((id) => !taken.has(id));
}

export type SkillPickSources = {
  backgroundSkills: readonly SkillId[];
  classSkillPicks: readonly (SkillId | null)[];
  featSkillPicks: readonly (SkillId | null)[];
  speciesSkillPicks: readonly (SkillId | null)[];
  subclassSkillPicks: readonly (SkillId | null)[];
  classFeatureSkillPicks: readonly (SkillId | null)[];
};

function otherProficientSkillsFrom(
  sources: SkillPickSources,
  exclude: Partial<Record<keyof SkillPickSources, boolean>> = {},
): SkillId[] {
  return proficientSkillIds(
    exclude.backgroundSkills ? [] : sources.backgroundSkills,
    exclude.classSkillPicks ? [] : sources.classSkillPicks,
    exclude.featSkillPicks ? [] : sources.featSkillPicks,
    exclude.speciesSkillPicks ? [] : sources.speciesSkillPicks,
    exclude.subclassSkillPicks ? [] : sources.subclassSkillPicks,
    exclude.classFeatureSkillPicks ? [] : sources.classFeatureSkillPicks,
  );
}

export function skillPickSourcesFromCharacter(state: {
  backgroundSkills: readonly SkillId[];
  classSkillPicks: readonly (SkillId | null)[];
  featSkillPicks: readonly (SkillId | null)[];
  speciesSkillPicks: readonly (SkillId | null)[];
  subclassSkillPicks: readonly (SkillId | null)[];
  classFeatureSkillPicks: readonly (SkillId | null)[];
}): SkillPickSources {
  return {
    backgroundSkills: state.backgroundSkills,
    classSkillPicks: state.classSkillPicks,
    featSkillPicks: state.featSkillPicks,
    speciesSkillPicks: state.speciesSkillPicks,
    subclassSkillPicks: state.subclassSkillPicks,
    classFeatureSkillPicks: state.classFeatureSkillPicks,
  };
}

export function takenSkillsForClassPicker(sources: SkillPickSources, slotIndex: number): SkillId[] {
  return collectTakenSkills(otherProficientSkillsFrom(sources, { classSkillPicks: true }), sources.classSkillPicks, slotIndex);
}

export function takenSkillsForBackgroundPicker(
  sources: SkillPickSources,
  backgroundSkillPicks: readonly (SkillId | null)[],
  slotIndex: number,
): SkillId[] {
  const backgroundSkills = otherProficientSkillsFrom(sources, { backgroundSkills: true });
  return collectTakenSkills(backgroundSkills, backgroundSkillPicks, slotIndex);
}

export function takenSkillsForSpeciesPicker(sources: SkillPickSources, slotIndex: number): SkillId[] {
  return collectTakenSkills(otherProficientSkillsFrom(sources, { speciesSkillPicks: true }), sources.speciesSkillPicks, slotIndex);
}

export function takenSkillsForFeatPicker(
  sources: SkillPickSources,
  featSkillPicksFromChoices: readonly (SkillId | null)[],
  slotIndex: number,
): SkillId[] {
  const taken = otherProficientSkillsFrom(sources, { featSkillPicks: true });
  featSkillPicksFromChoices.forEach((pick, index) => {
    if (pick && index !== slotIndex && !taken.includes(pick)) taken.push(pick);
  });
  return taken;
}

export function takenSkillsForSubclassPicker(sources: SkillPickSources, slotIndex: number): SkillId[] {
  return collectTakenSkills(otherProficientSkillsFrom(sources, { subclassSkillPicks: true }), sources.subclassSkillPicks, slotIndex);
}

export function takenSkillsForClassFeaturePicker(
  sources: SkillPickSources,
  featureKey: string,
  featurePicks: readonly (SkillId | null)[],
  allClassFeaturePicks: Record<string, (SkillId | null)[]>,
  slotIndex: number,
): SkillId[] {
  const withoutFeature: SkillPickSources = {
    ...sources,
    classFeatureSkillPicks: Object.entries(allClassFeaturePicks)
      .filter(([key]) => key !== featureKey)
      .flatMap(([, picks]) => picks),
  };
  return collectTakenSkills(otherProficientSkillsFrom(withoutFeature), featurePicks, slotIndex);
}

export function takenExpertSkillsForExpertisePicker(
  expertisePicks: readonly (SkillId | null)[],
  slotIndex: number,
): SkillId[] {
  const taken: SkillId[] = [];
  expertisePicks.forEach((pick, index) => {
    if (pick && index !== slotIndex && !taken.includes(pick)) taken.push(pick);
  });
  return taken;
}
