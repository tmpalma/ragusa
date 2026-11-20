import { CLASSES, FEATS, SPECIES, SUBCLASSES, findByKey } from "../data";
import { resolveBackgroundData } from "./background";
import { ABILITIES } from "../data/skills";
import type { AbilityId, ArmorData, BackgroundData, ClassData, FeatData, SkillId, SpeciesData } from "../data/types";
import type { SavingThrowResult } from "./savingThrows";
import type { Character } from "../state/characterState";
import { abilityScoresAfterIncreases } from "./abilityScoreIncreases";
import {
  computeArmorClass,
  computeArmorClassVariants,
  computeMageArmorClassVariants,
  hasWornBodyArmor,
} from "./armorClass";
import { computeCarryingSummary, gearValueCp, type CarryingSummary } from "./carryingCapacity";
import { skillBonusesFromClassFeatureChoices } from "./classFeatures/featureChoices";
import {
  activeMulticlassClassFeatures,
  collectArmorClassFormulaOptions,
  collectClassFeatureContributions,
  collectMulticlassClassFeatureContributions,
  mergeDarkvisionFeet,
  needsArmorClassFormulaPick,
  resolveMulticlassExtraAttackCount,
  type ArmorClassFormulaOption,
} from "./classFeatures";
import { collectFeatContributions, derivedAbilityScores } from "./featEffects";
import { activeFeatKeysFromSlots, activeFeatSlots, featChoicesForSlot } from "./featSlots";
import { resolveEffectiveArmor } from "./genericVariantResolve";
import { mergeWornArmorWithAdventuringMagicArmor } from "./magicItemArmor";
import { applySetAbilityScores, collectMagicItemContributions } from "./magicItems";
import {
  computeHitPointsFromLevelPath,
  hitDiceMaxByDieFromLevelPath,
  multiclassClassHpBonus,
  resolveHitDicePools,
  type HitDicePoolEntry,
} from "./hitPoints";
import { computeInitiative } from "./initiative";
import { abilityModifier } from "./modifiers";
import { getSpeeds } from "./movement";
import {
  activeWildShapeForm,
  mergedSavingThrows,
  mergedSkillBonuses,
  overlayAbilityScores,
  wildShapeEffectiveAc,
} from "./wildShape";
import { proficiencyBonusForLevel } from "./proficiency";
import {
  activeSpeciesFeatures,
  collectSpeciesFeatureContributions,
  type SpeciesFeatureContributions,
} from "./speciesFeatures";
import {
  computeMulticlassSpellcasting,
  type PerClassSpellcasting,
  type SpellcastingSummary,
} from "./spellcasting";
import { effectiveLevelPath, resolvedClassLevels } from "./classLevels";
import { mergedClassSaveProficiencies } from "./training";
import type { PactMagicPool } from "./spellProgression";
import { RAW_TABLE_RULES, type TableRules } from "./tableRules";

export interface DerivedStats {
  classData: ClassData | null;
  speciesData: SpeciesData | null;
  backgroundData: BackgroundData | null;
  feats: FeatData[];
  abilityScores: Record<AbilityId, number>;
  abilityModifiers: Record<AbilityId, number>;
  savingThrows: Record<AbilityId, SavingThrowResult>;
  skillBonuses: Record<SkillId, number>;
  armorClass: number;
  armorClassWithoutShield: number;
  armorClassWithShield: number;
  armorClassWithMageArmor: number | null;
  armorClassWithMageArmorWithoutShield: number | null;
  isWearingBodyArmor: boolean;
  hitPoints: number | null;
  hitDiceMaxByDie: Record<number, number>;
  hitDicePools: HitDicePoolEntry[];
  initiative: number;
  spellcasting: SpellcastingSummary | null;
  perClassSpellcasting: PerClassSpellcasting[];
  pactMagic: PactMagicPool | null;
  extraAttackCount: number;
  armorClassFormulaOptions: ArmorClassFormulaOption[];
  needsArmorClassFormulaPick: boolean;
  speeds: { type: string; feet: number }[];
  darkvisionFeet: number;
  featContributions: ReturnType<typeof collectFeatContributions>;
  magicItemContributions: ReturnType<typeof collectMagicItemContributions>;
  classFeatureContributions: ReturnType<typeof collectMulticlassClassFeatureContributions>;
  speciesFeatureContributions: SpeciesFeatureContributions;
  activeClassFeatures: ReturnType<typeof activeMulticlassClassFeatures>;
  proficiencyBonus: number;
  activeSpeciesFeatures: ReturnType<typeof activeSpeciesFeatures>;
  wildShapeForm: ReturnType<typeof activeWildShapeForm>;
  carrying: CarryingSummary;
  gearValueCp: number;
}

function mapAbilities<T>(fn: (ability: AbilityId) => T): Record<AbilityId, T> {
  return Object.fromEntries(ABILITIES.map(({ id }) => [id, fn(id)])) as Record<AbilityId, T>;
}

function resolveSubclassByClass(character: Character): Record<string, string | null> {
  const subclassByClass = { ...character.subclassByClass };
  if (character.classKey && character.subclassKey && subclassByClass[character.classKey] === undefined) {
    subclassByClass[character.classKey] = character.subclassKey;
  }
  return subclassByClass;
}

function resolveClassFeatureChoicesByClass(character: Character): Record<string, Record<string, string>> {
  const byClass = { ...character.classFeatureChoicesByClass };
  if (character.classKey && Object.keys(character.classFeatureChoices).length > 0) {
    byClass[character.classKey] = {
      ...(byClass[character.classKey] ?? {}),
      ...character.classFeatureChoices,
    };
  }
  return byClass;
}

function mergedSkillBonusesFromClassFeatureChoices(
  classLevels: ReturnType<typeof resolvedClassLevels>,
  classFeatureChoicesByClass: Record<string, Record<string, string>>,
  abilityModifiers: Record<AbilityId, number>,
): Partial<Record<SkillId, number>> {
  const merged: Partial<Record<SkillId, number>> = {};
  for (const { classKey, classLevel } of classLevels) {
    const classData = findByKey(CLASSES, classKey);
    const choices = classFeatureChoicesByClass[classKey] ?? {};
    const bonuses = skillBonusesFromClassFeatureChoices(classData, classLevel, choices, abilityModifiers);
    for (const [skill, bonus] of Object.entries(bonuses) as [SkillId, number][]) {
      merged[skill] = (merged[skill] ?? 0) + bonus;
    }
  }
  return merged;
}

export function computeDerivedStats(
  character: Character,
  tableRules: TableRules = RAW_TABLE_RULES,
): DerivedStats {
  const levelPath = effectiveLevelPath(character);
  const classLevels = resolvedClassLevels(levelPath);
  const subclassByClass = resolveSubclassByClass(character);
  const classFeatureChoicesByClass = resolveClassFeatureChoicesByClass(character);
  const proficiencyBonus = proficiencyBonusForLevel(character.level);

  const classData = findByKey(CLASSES, character.classKey);
  const speciesData = findByKey(SPECIES, character.speciesKey);
  const backgroundData = resolveBackgroundData(character);

  const featSlots = activeFeatSlots(character);
  const feats = featSlots
    .map((slot) => findByKey(FEATS, slot.featKey))
    .filter((f): f is FeatData => f !== null);
  const activeFeatKeys = activeFeatKeysFromSlots(featSlots);

  const armoryWornArmor = character.armor
    .filter((armor) => armor.worn)
    .map((armor) => resolveEffectiveArmor(armor))
    .filter((armor): armor is ArmorData => armor !== null);
  const wornArmor = mergeWornArmorWithAdventuringMagicArmor(armoryWornArmor, character.adventuringGear);

  const scoresBeforeFeats = abilityScoresAfterIncreases(character.abilityScores, character.abilityScoreIncreases);

  const featContributions = collectFeatContributions(
    activeFeatKeys,
    (_featKey, slotIndex) =>
      featChoicesForSlot(character, featSlots[slotIndex!]!.source),
    scoresBeforeFeats,
    wornArmor,
  );

  const classFeatureContributions = collectMulticlassClassFeatureContributions({
    classLevels,
    subclassByClass,
    armorClassFormulaKey: character.armorClassFormulaKey,
  });
  const armorClassFormulaOptions = collectArmorClassFormulaOptions(classLevels, subclassByClass);
  const classFeatures = activeMulticlassClassFeatures(classLevels, subclassByClass);

  const speciesFeatureContributions = collectSpeciesFeatureContributions(
    speciesData,
    character.speciesLineageKey,
    character.level,
    character.speciesFeatureChoices,
  );
  const speciesFeatures = activeSpeciesFeatures(speciesData, character.speciesLineageKey, character.level);

  const magicItemContributions = collectMagicItemContributions(character.attunedMagicItemKeys);
  const abilityScores = applySetAbilityScores(
    derivedAbilityScores(scoresBeforeFeats, featContributions.abilityScoreBonuses),
    magicItemContributions.setAbilityScores,
  );
  const wildShapeForm = activeWildShapeForm(character);
  const effectiveAbilityScores = wildShapeForm ? overlayAbilityScores(abilityScores, wildShapeForm) : abilityScores;
  const abilityModifiers = mapAbilities((ability) => abilityModifier(effectiveAbilityScores[ability]));

  const unarmoredDefense = classFeatureContributions.unarmoredDefenseAbilities;
  const unarmoredDefenseDisallowShield = classFeatureContributions.unarmoredDefenseDisallowShield;
  const wildShapeAc = wildShapeForm
    ? wildShapeEffectiveAc(wildShapeForm, abilityModifiers.wis, character.subclassKey)
    : null;
  const mediumArmorDexCapOverride = featContributions.mediumArmorDexCap;
  const armorClass = wildShapeAc ?? computeArmorClass(
        abilityModifiers.dex,
        wornArmor,
        featContributions.acBonus + speciesFeatureContributions.acBonus + magicItemContributions.acBonus,
        unarmoredDefense,
        abilityModifiers,
        unarmoredDefenseDisallowShield,
        mediumArmorDexCapOverride,
      );
  const { withoutShield: armorClassWithoutShield, withShield: armorClassWithShield } = wildShapeAc != null
    ? { withoutShield: wildShapeAc, withShield: wildShapeAc }
    : computeArmorClassVariants(
        abilityModifiers.dex,
        wornArmor,
        featContributions.acBonus + speciesFeatureContributions.acBonus + magicItemContributions.acBonus,
        unarmoredDefense,
        abilityModifiers,
        unarmoredDefenseDisallowShield,
        mediumArmorDexCapOverride,
      );
  const isWearingBodyArmor = hasWornBodyArmor(wornArmor);
  const mageArmorClassVariants =
    wildShapeForm || isWearingBodyArmor
      ? null
      : computeMageArmorClassVariants(abilityModifiers.dex, wornArmor);
  const armorClassWithMageArmor = mageArmorClassVariants?.withShield ?? null;
  const armorClassWithMageArmorWithoutShield = mageArmorClassVariants?.withoutShield ?? null;

  const classSaveProficiencies = mergedClassSaveProficiencies(
    tableRules,
    levelPath,
    (classKey) => findByKey(CLASSES, classKey),
  );
  const savingThrows = mergedSavingThrows(
    abilityModifiers,
    [...classSaveProficiencies, ...featContributions.savingThrowProficiencies],
    wildShapeForm,
    proficiencyBonus,
  );
  if (magicItemContributions.saveBonus !== 0) {
    for (const ability of ABILITIES) {
      savingThrows[ability.id] = {
        ...savingThrows[ability.id],
        modifier: savingThrows[ability.id].modifier + magicItemContributions.saveBonus,
      };
    }
  }
  const auraBonus = classFeatureContributions.savingThrowAbilityBonus;
  if (auraBonus) {
    const bonus = Math.max(
      auraBonus.minimum,
      abilityModifiers[auraBonus.ability],
    );
    if (bonus !== 0) {
      for (const ability of ABILITIES) {
        savingThrows[ability.id] = {
          ...savingThrows[ability.id],
          modifier: savingThrows[ability.id].modifier + bonus,
        };
      }
    }
  }

  const skillBonuses = mergedSkillBonuses(
    character.skills,
    abilityModifiers,
    classFeatureContributions.jackOfAllTrades,
    mergedSkillBonusesFromClassFeatureChoices(classLevels, classFeatureChoicesByClass, abilityModifiers),
    wildShapeForm,
    proficiencyBonus,
  );
  if (magicItemContributions.abilityCheckBonus !== 0) {
    for (const skill of Object.keys(skillBonuses) as SkillId[]) {
      skillBonuses[skill] += magicItemContributions.abilityCheckBonus;
    }
  }

  const resolveHitDie = (classKey: string) => findByKey(CLASSES, classKey)?.hitDie ?? 0;
  const classHpBonus = multiclassClassHpBonus(classLevels, (classKey, classLevel) =>
    collectClassFeatureContributions(classKey, classLevel, subclassByClass[classKey] ?? null).hpPerClassLevel,
  );

  const baseHitPoints =
    levelPath.length > 0
      ? computeHitPointsFromLevelPath(
          levelPath,
          resolveHitDie,
          abilityModifier(abilityScores.con),
          activeFeatKeys,
          speciesFeatureContributions.hpPerLevel,
          classHpBonus,
        )
      : null;
  const hitPoints =
    baseHitPoints != null
      ? baseHitPoints + Math.max(0, Math.floor(character.hitPointMaxBonus ?? 0))
      : null;

  const hitDiceMaxByDie = hitDiceMaxByDieFromLevelPath(levelPath, resolveHitDie);
  const hitDicePools = resolveHitDicePools({
    maxByDie: hitDiceMaxByDie,
    hitDiceRemaining: character.hitDiceRemaining,
    legacyCurrentHitDice: character.currentHitDice,
  });

  const multiclassSpellcasting = computeMulticlassSpellcasting(classLevels, {
    subclassByClass,
    getClassData: (classKey) => findByKey(CLASSES, classKey) ?? null,
    getSubclassData: (subclassKey) => findByKey(SUBCLASSES, subclassKey) ?? null,
    abilityModifiers,
    proficiencyBonus,
    createdSpellSlots: character.createdSpellSlots,
    classFeatureChoicesByClass,
    extraAttackBonus: magicItemContributions.spellAttackBonus,
    extraSaveDc: magicItemContributions.spellSaveDcBonus,
  });

  const primarySpellcasting = multiclassSpellcasting.perClass.find((entry) => entry.summary)?.summary ?? null;
  const spellcasting =
    primarySpellcasting != null
      ? {
          ...primarySpellcasting,
          slotsByLevel: multiclassSpellcasting.spellcastingSlots,
          level1Slots: multiclassSpellcasting.spellcastingSlots[1] ?? 0,
        }
      : null;

  const extraAttackCount = resolveMulticlassExtraAttackCount(
    classLevels,
    tableRules,
    subclassByClass,
    character.classFeatureOptionPicks,
  );

  const wearingHeavyBodyArmor = armoryWornArmor.some(
    (armor) => armor.key !== "shield" && armor.category === "heavy",
  );
  let speeds = wildShapeForm
    ? wildShapeForm.speeds
    : getSpeeds(speciesData, speciesFeatureContributions.walkSpeedFeet).map((speed) => {
        let feet = speed.feet;
        if (speed.type === "walk" && classFeatureContributions.unarmoredMovementBonusFeet > 0) {
          feet += classFeatureContributions.unarmoredMovementBonusFeet;
        }
        if (
          speed.type === "walk" &&
          classFeatureContributions.roving &&
          !wearingHeavyBodyArmor
        ) {
          feet += 10;
        }
        if (speed.type === "walk" && magicItemContributions.walkSpeedFloor != null) {
          feet = Math.max(feet, magicItemContributions.walkSpeedFloor);
        }
        if (speed.type === "walk") {
          feet += featContributions.walkSpeedBonusFeet;
        }
        return { ...speed, feet };
      });
  if (!wildShapeForm && classFeatureContributions.roving && !wearingHeavyBodyArmor) {
    const walkFeet = speeds.find((speed) => speed.type === "walk")?.feet ?? 0;
    const withRovingMobility: { type: string; feet: number }[] = speeds.map((speed) => {
      if (speed.type === "climb" || speed.type === "swim") {
        return { ...speed, feet: Math.max(speed.feet, walkFeet) };
      }
      return speed;
    });
    const mobilityTypes = new Set(withRovingMobility.map((speed) => speed.type));
    speeds = [
      ...withRovingMobility,
      ...(mobilityTypes.has("climb") ? [] : [{ type: "climb", feet: walkFeet }]),
      ...(mobilityTypes.has("swim") ? [] : [{ type: "swim", feet: walkFeet }]),
    ];
  }
  const darkvisionFeet = mergeDarkvisionFeet(
    speciesFeatureContributions.darkvisionFeet,
    classFeatureContributions.darkvisionFeet,
    classFeatureContributions.darkvisionGrantOrIncreaseFeet,
  );
  const initiative = computeInitiative(
    abilityModifiers.dex,
    featContributions.initiativeAddProficiency,
    proficiencyBonus,
    magicItemContributions.abilityCheckBonus,
  );

  const carrying = computeCarryingSummary(
    character,
    effectiveAbilityScores.str,
    speciesFeatureContributions.carryingSizeIncrease,
  );
  const gearValue = gearValueCp(character);

  return {
    classData,
    speciesData,
    backgroundData,
    feats,
    abilityScores: effectiveAbilityScores,
    abilityModifiers,
    savingThrows,
    skillBonuses,
    armorClass,
    armorClassWithoutShield,
    armorClassWithShield,
    armorClassWithMageArmor,
    armorClassWithMageArmorWithoutShield,
    isWearingBodyArmor,
    hitPoints,
    hitDiceMaxByDie,
    hitDicePools,
    initiative,
    spellcasting,
    perClassSpellcasting: multiclassSpellcasting.perClass,
    pactMagic: multiclassSpellcasting.pactMagic,
    extraAttackCount,
    armorClassFormulaOptions,
    needsArmorClassFormulaPick: needsArmorClassFormulaPick(armorClassFormulaOptions),
    speeds,
    darkvisionFeet,
    featContributions,
    magicItemContributions,
    classFeatureContributions,
    speciesFeatureContributions,
    activeClassFeatures: classFeatures,
    activeSpeciesFeatures: speciesFeatures,
    proficiencyBonus,
    wildShapeForm,
    carrying,
    gearValueCp: gearValue,
  };
}
