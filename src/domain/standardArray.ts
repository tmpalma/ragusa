import type { AbilityId } from "../data/types";

const CLASS_STANDARD_ARRAYS: Record<string, Record<AbilityId, number>> = {
  barbarian: { str: 15, dex: 13, con: 14, int: 10, wis: 12, cha: 8 },
  bard: { str: 8, dex: 14, con: 12, int: 13, wis: 10, cha: 15 },
  cleric: { str: 14, dex: 8, con: 13, int: 10, wis: 15, cha: 12 },
  druid: { str: 8, dex: 12, con: 14, int: 13, wis: 15, cha: 10 },
  fighter: { str: 15, dex: 14, con: 13, int: 8, wis: 10, cha: 12 },
  monk: { str: 12, dex: 15, con: 13, int: 10, wis: 14, cha: 8 },
  artificer: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 },
  paladin: { str: 15, dex: 10, con: 13, int: 8, wis: 12, cha: 14 },
  ranger: { str: 12, dex: 15, con: 13, int: 8, wis: 14, cha: 10 },
  rogue: { str: 12, dex: 15, con: 13, int: 14, wis: 10, cha: 8 },
  sorcerer: { str: 10, dex: 13, con: 14, int: 8, wis: 12, cha: 15 },
  warlock: { str: 8, dex: 14, con: 13, int: 12, wis: 10, cha: 15 },
  wizard: { str: 8, dex: 12, con: 13, int: 15, wis: 14, cha: 10 },
};

export function standardArrayForClass(classKey: string | null): Record<AbilityId, number> | null {
  if (!classKey) return null;
  const scores = CLASS_STANDARD_ARRAYS[classKey];
  return scores ? { ...scores } : null;
}
