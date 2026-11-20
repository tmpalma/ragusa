import type { SkillId } from "../../data/types";

export function retainValidSpeciesSkillPicks(
  picks: readonly (SkillId | null)[],
  count: number,
  options: readonly SkillId[] | null,
  takenSkills: readonly SkillId[],
): (SkillId | null)[] {
  const optionSet = options ? new Set(options) : null;
  const takenSet = new Set(takenSkills);
  const kept: SkillId[] = [];
  const seen = new Set<SkillId>();

  for (const pick of picks) {
    if (!pick || takenSet.has(pick) || seen.has(pick)) continue;
    if (optionSet && !optionSet.has(pick)) continue;
    kept.push(pick);
    seen.add(pick);
  }

  return Array.from({ length: count }, (_, index) => kept[index] ?? null);
}

export function applySpeciesSkillPick(
  picks: readonly (SkillId | null)[],
  index: number,
  skill: SkillId | null,
  options: readonly SkillId[] | null,
  takenSkills: readonly SkillId[],
): (SkillId | null)[] | null {
  if (index < 0 || index >= picks.length) return null;
  if (skill === null) {
    if (picks[index] === null) return null;
    const next = [...picks];
    next[index] = null;
    return next;
  }
  if (options && !options.includes(skill)) return null;
  if (takenSkills.includes(skill)) return null;
  if (picks.some((pick, pickIndex) => pickIndex !== index && pick === skill)) return null;
  if (picks[index] === skill) return null;
  const next = [...picks];
  next[index] = skill;
  return next;
}

export function availableSpeciesSkillOptions(
  options: readonly SkillId[] | null,
  picks: readonly (SkillId | null)[],
  takenSkills: readonly SkillId[],
  slotIndex: number,
): SkillId[] {
  const taken = new Set(takenSkills);
  picks.forEach((pick, index) => {
    if (pick && index !== slotIndex) taken.add(pick);
  });
  const pool = options ?? [];
  return pool.filter((id) => !taken.has(id));
}

export function initialSpeciesSkillPicks(count: number): (SkillId | null)[] {
  return Array.from({ length: count }, () => null);
}
