import { CLASSES, findByKey } from "../../data";
import type { Character } from "../../state/characterState";
import { activeClassFeatures } from "../classFeatures";
import { effectiveLevelPath, resolvedClassLevels } from "../classLevels";
import { selectedClassFeatureOptionPicks } from "../classFeatures/optionPicks";
import { subclassKeyForClass } from "../spellSelection";
import type { CreatureSourceContext } from "./types";

export const FIND_FAMILIAR_SOURCE_KEY = "find-familiar";
export const FIND_STEED_SOURCE_KEY = "find-steed";
export const PRIMAL_COMPANION_SOURCE_KEY = "primal-companion";
export const STEEL_DEFENDER_SOURCE_KEY = "steel-defender";

export function classLevelFor(ctx: CreatureSourceContext, classKey: string): number {
  return ctx.classLevels.find((entry) => entry.classKey === classKey)?.classLevel ?? 0;
}

export function characterHasOwnedSpell(ctx: CreatureSourceContext, spellKey: string): boolean {
  return ctx.ownedSpellKeys.has(spellKey);
}

export function characterHasFeat(ctx: CreatureSourceContext, featKey: string): boolean {
  return ctx.activeFeatKeys.includes(featKey);
}

export function warlockHasPactOfTheChain(character: Character): boolean {
  const warlock = findByKey(CLASSES, "warlock");
  if (!warlock) return false;
  const warlockLevel = resolvedClassLevels(effectiveLevelPath(character)).find(
    (entry) => entry.classKey === "warlock",
  )?.classLevel;
  if (!warlockLevel) return false;
  const picks = selectedClassFeatureOptionPicks(
    warlock,
    "eldritch-invocations",
    warlockLevel,
    character.classFeatureOptionPicks,
  );
  return picks.some((option) => option.key === "pact-of-the-chain");
}

export function druidHasWildCompanion(ctx: CreatureSourceContext): boolean {
  const level = classLevelFor(ctx, "druid");
  if (level < 2) return false;
  const druid = findByKey(CLASSES, "druid");
  if (!druid) return false;
  return activeClassFeatures(druid, level, null).some((feature) => feature.key === "wild-companion");
}

export function paladinHasFaithfulSteed(ctx: CreatureSourceContext): boolean {
  const level = classLevelFor(ctx, "paladin");
  if (level < 5) return false;
  const paladin = findByKey(CLASSES, "paladin");
  if (!paladin) return false;
  return activeClassFeatures(paladin, level, null).some((feature) => feature.key === "faithful-steed");
}

export function rangerPrimalCompanion(ctx: CreatureSourceContext): boolean {
  const level = classLevelFor(ctx, "ranger");
  if (level < 3) return false;
  return subclassKeyForClass(ctx.character, "ranger") === "beast-master";
}

export function artificerSteelDefender(ctx: CreatureSourceContext): boolean {
  const level = classLevelFor(ctx, "artificer");
  if (level < 3) return false;
  return subclassKeyForClass(ctx.character, "artificer") === "battle-smith";
}

export function highestSpellSlotLevel(slotsByLevel: Record<number, number>): number {
  let highest = 0;
  for (const [levelKey, count] of Object.entries(slotsByLevel)) {
    const level = Number(levelKey);
    if (count > 0 && level > highest) highest = level;
  }
  return highest;
}

export function clampCreatureHpWhenMaxChanges(
  previousMax: number,
  nextMax: number,
  current: number | null,
): number | null {
  if (nextMax <= 0) return null;
  const effective = current ?? previousMax;
  if (effective >= previousMax) return null;
  return Math.min(effective, nextMax);
}