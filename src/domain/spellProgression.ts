import type { ClassData, SpellProgression, SpellProgressionRow, SpellSlotTable } from "../data/types";
import {
  resolveSpellcastingSlots,
  type MulticlassCasterContext,
  type ResolvedClassLevel,
} from "./multiclassCasterLevel";

export interface PactMagicPool {
  count: number;
  slotLevel: number;
}

export function spellSlotRow(table: SpellSlotTable | null | undefined, level: number): number[] {
  if (!table) return [];
  return table.byCharacterLevel[level] ?? [];
}

export function spellSlotCount(classData: ClassData | null, characterLevel: number, spellLevel: number): number {
  if (!Number.isInteger(spellLevel) || spellLevel < 1 || spellLevel > 9) return 0;
  if (!classData?.spellSlots) return 0;
  if (classData.spellcastingGainedAtLevel != null && characterLevel < classData.spellcastingGainedAtLevel) {
    return 0;
  }
  return spellSlotRow(classData.spellSlots, characterLevel)[spellLevel - 1] ?? 0;
}

/** Spell-slot maxima keyed by spell level (1–9), omitting levels with 0 slots. */
export function spellSlotsByLevel(classData: ClassData | null, characterLevel: number): Record<number, number> {
  const slots: Record<number, number> = {};
  for (let spellLevel = 1; spellLevel <= 9; spellLevel += 1) {
    const count = spellSlotCount(classData, characterLevel, spellLevel);
    if (count > 0) slots[spellLevel] = count;
  }
  return slots;
}

/** Pact Magic slot level (all slots share this level). Returns null when no slots. */
export function pactMagicSlotLevel(classData: ClassData | null, characterLevel: number): number | null {
  const slots = spellSlotsByLevel(classData, characterLevel);
  const levels = Object.keys(slots).map(Number);
  if (levels.length === 0) return null;
  return Math.max(...levels);
}

export function firstLevelSpellSlotCount(classData: ClassData | null, level: number): number {
  return spellSlotCount(classData, level, 1);
}

export function spellProgressionRow(
  progression: SpellProgression | null | undefined,
  level: number,
): SpellProgressionRow | null {
  if (!progression) return null;
  return progression.byCharacterLevel[level] ?? null;
}

/** Exact progression row, or the highest row at or below `level` when the cap row is missing. */
export function spellProgressionRowForLevel(
  progression: SpellProgression | null | undefined,
  level: number,
): SpellProgressionRow | null {
  if (!progression) return null;
  const exact = progression.byCharacterLevel[level];
  if (exact) return exact;
  for (let entryLevel = level - 1; entryLevel >= 1; entryLevel -= 1) {
    const row = progression.byCharacterLevel[entryLevel];
    if (row) return row;
  }
  return null;
}

export function spellSlotRowForLevel(table: SpellSlotTable | null | undefined, level: number): number[] {
  if (!table) return [];
  const exact = table.byCharacterLevel[level];
  if (exact?.length) return exact;
  for (let entryLevel = level - 1; entryLevel >= 1; entryLevel -= 1) {
    const row = table.byCharacterLevel[entryLevel];
    if (row?.length) return row;
  }
  return [];
}

/** Spellcasting slot maxima for a multiclass character (Spellcasting table only; excludes Pact Magic). */
export function characterSpellcastingSlots(
  classLevels: ResolvedClassLevel[],
  ctx: MulticlassCasterContext,
  createdSpellSlots: Record<number, number> = {},
): Record<number, number> {
  const slots = { ...resolveSpellcastingSlots(classLevels, ctx) };
  for (const [levelKey, extra] of Object.entries(createdSpellSlots)) {
    const spellLevel = Number(levelKey);
    if (!Number.isInteger(spellLevel) || spellLevel < 1 || extra <= 0) continue;
    slots[spellLevel] = (slots[spellLevel] ?? 0) + extra;
  }
  return slots;
}

/** Pact Magic pool for a Warlock at the given class level (not character level). */
export function pactMagicPool(classData: ClassData | null, warlockClassLevel: number): PactMagicPool | null {
  if (!classData || classData.casterType !== "PACT") return null;
  const slotLevel = pactMagicSlotLevel(classData, warlockClassLevel);
  if (slotLevel == null) return null;
  const count = spellSlotCount(classData, warlockClassLevel, slotLevel);
  if (count <= 0) return null;
  return { count, slotLevel };
}

/** Pact Magic pool from resolved class levels (uses Warlock class level). */
export function pactMagicPoolFromClassLevels(
  classLevels: ResolvedClassLevel[],
  getClassData: (classKey: string) => ClassData | null | undefined,
): PactMagicPool | null {
  const warlock = classLevels.find((entry) => entry.classKey === "warlock");
  if (!warlock) return null;
  const classData = getClassData("warlock");
  return pactMagicPool(classData ?? null, warlock.classLevel);
}
