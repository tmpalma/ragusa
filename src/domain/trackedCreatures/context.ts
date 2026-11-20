import { SPECIES, findByKey } from "../../data";
import type { Character } from "../../state/characterState";
import { effectiveLevelPath, resolvedClassLevels } from "../classLevels";
import { computeDerivedStats } from "../deriveCharacter";
import { featChoicesResolverForCharacter } from "../featSlots";
import { activeFeatKeysFromSlots, activeFeatSlots } from "../featSlots";
import { characterOwnedSpellKeys } from "../spellSelection";
import { collectSpeciesFeatureContributions } from "../speciesFeatures";
import type { CreatureSourceContext } from "./types";

export function buildCreatureSourceContext(character: Character): CreatureSourceContext {
  const derived = computeDerivedStats(character);
  const classLevels = resolvedClassLevels(effectiveLevelPath(character));
  const speciesContributions = collectSpeciesFeatureContributions(
    findByKey(SPECIES, character.speciesKey),
    character.speciesLineageKey,
    character.level,
    character.speciesFeatureChoices,
  );
  const activeFeatKeys = activeFeatKeysFromSlots(activeFeatSlots(character));
  const slotsByLevel = derived.spellcasting?.slotsByLevel ?? {};

  const spellAttackBonusByClass: Record<string, number> = {};
  for (const entry of derived.perClassSpellcasting) {
    if (entry.summary) spellAttackBonusByClass[entry.classKey] = entry.summary.attackBonus;
  }

  const ownedSpellKeys = characterOwnedSpellKeys({
    character,
    classLevels,
    speciesCantrips: speciesContributions.cantrips,
    speciesPreparedSpells: speciesContributions.preparedSpells,
    activeFeatKeys,
    featChoicesFor: featChoicesResolverForCharacter(character),
    spellSlots: slotsByLevel,
  });

  return {
    character,
    classLevels,
    abilityModifiers: derived.abilityModifiers,
    proficiencyBonus: derived.proficiencyBonus,
    ownedSpellKeys,
    activeFeatKeys,
    featChoicesFor: featChoicesResolverForCharacter(character),
    slotsByLevel,
    spellAttackBonusByClass,
  };
}

export function classSpellAttackBonus(ctx: CreatureSourceContext, classKey: string): number {
  return ctx.spellAttackBonusByClass[classKey] ?? ctx.proficiencyBonus + (ctx.abilityModifiers.int ?? 0);
}

export function scaledAttackToHit(
  templateToHit: number,
  spellAttackBonus: number,
  abilityMod: number,
  proficiency: number,
): number {
  const templateAbilityPart = templateToHit;
  return spellAttackBonus + (templateAbilityPart - (abilityMod + proficiency));
}