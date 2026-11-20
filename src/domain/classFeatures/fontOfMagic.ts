import type { ClassData } from "../../data/types";
import { spellSlotsByLevel } from "../spellProgression";

export const FONT_OF_MAGIC_FEATURE_KEY = "font-of-magic";

export interface FontOfMagicSlotCost {
  spellLevel: number;
  sorceryPointCost: number;
  minSorcererLevel: number;
}

export const FONT_OF_MAGIC_SLOT_COSTS: FontOfMagicSlotCost[] = [
  { spellLevel: 1, sorceryPointCost: 2, minSorcererLevel: 2 },
  { spellLevel: 2, sorceryPointCost: 3, minSorcererLevel: 3 },
  { spellLevel: 3, sorceryPointCost: 5, minSorcererLevel: 5 },
  { spellLevel: 4, sorceryPointCost: 6, minSorcererLevel: 7 },
  { spellLevel: 5, sorceryPointCost: 7, minSorcererLevel: 9 },
];

export function fontOfMagicSlotCost(spellLevel: number): FontOfMagicSlotCost | null {
  return FONT_OF_MAGIC_SLOT_COSTS.find((row) => row.spellLevel === spellLevel) ?? null;
}

export function availableFontOfMagicSlotCosts(sorcererLevel: number): FontOfMagicSlotCost[] {
  return FONT_OF_MAGIC_SLOT_COSTS.filter((row) => sorcererLevel >= row.minSorcererLevel);
}

/** Spell-slot maxima including Font of Magic created slots. */
export function effectiveSpellSlotsByLevel(
  classData: ClassData | null,
  characterLevel: number,
  createdSpellSlots: Record<number, number> = {},
): Record<number, number> {
  const slots = { ...spellSlotsByLevel(classData, characterLevel) };
  for (const [levelKey, extra] of Object.entries(createdSpellSlots)) {
    const spellLevel = Number(levelKey);
    if (!Number.isInteger(spellLevel) || spellLevel < 1 || extra <= 0) continue;
    slots[spellLevel] = (slots[spellLevel] ?? 0) + extra;
  }
  return slots;
}

export function effectiveSpellSlotCount(
  classData: ClassData | null,
  characterLevel: number,
  spellLevel: number,
  createdSpellSlots: Record<number, number> = {},
): number {
  return effectiveSpellSlotsByLevel(classData, characterLevel, createdSpellSlots)[spellLevel] ?? 0;
}
