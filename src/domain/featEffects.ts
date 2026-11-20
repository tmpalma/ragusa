import { ABILITIES, SKILLS } from "../data/skills";
import { TOOL_IDS, toolsInCategories, type ToolCategory, type ToolId } from "../data/toolStats";
import type {
  AbilityId,
  ArmorCategory,
  ArmorData,
  FeatData,
  LanguageId,
  SkillId,
  ActionTiming,
} from "../data/types";
import {
  featCantripPickSlotCount,
  featGrantedSpellKeysForFreeCast,
  featSpellPickSlotCount,
  featSpellUseStorageKey,
  resolveFeatSpellcastingAbility,
  type GrantSpellsEffect,
} from "./featGrantSpells.js";
import { EXTRA_FEAT_DEFINITIONS } from "./extraFeatDefinitions";
import { BACKGROUND_FEAT_DEFINITIONS } from "./backgroundFeatDefinitions";
import { POST2024_FEAT_DEFINITIONS } from "./post2024FeatDefinitions.js";
import { applyPost2024FeatMechanics } from "./post2024FeatMechanics.js";
import { abilityModifier } from "./modifiers";
import { PROFICIENCY_BONUS } from "./proficiency";
import { computeSpellcasting, type SpellcastingSummary } from "./spellcasting";
import { weaponHasProperty } from "./weaponAttack";
import {
  featDescriptionReference,
  FEAT_COMBAT_REFERENCE_INTRO_DEFAULT,
  parseFeatReferenceTable,
} from "./featDescription.js";

export { FEAT_COMBAT_REFERENCE_INTRO_DEFAULT };

export type FeatProficiencyPick =
  | { kind: "skill"; id: SkillId }
  | { kind: "tool"; id: ToolId };

export type FeatPrerequisite =
  | { type: "level"; min: number }
  | { type: "fighting_style_feature" }
  | { type: "spellcasting_feature" }
  | { type: "ability"; abilities: AbilityId[]; min: number }
  | { type: "feat"; featKeys: string[] }
  | { type: "feat_category"; category: string }
  | { type: "martial_weapon_proficiency" }
  | { type: "armor_category_training"; category: ArmorCategory };

export type FeatEffect =
  | { type: "initiative_add_proficiency" }
  | { type: "ac_bonus_in_armor"; amount: number }
  | { type: "ranged_attack_bonus"; amount: number }
  | {
      type: "grant_skill_proficiencies";
      count: number;
      allowSkills?: boolean;
      skillIds?: SkillId[];
      toolIds?: ToolId[];
      toolCategories?: ToolCategory[];
      fixedToolIds?: ToolId[];
    }
  | {
      type: "ability_score_increase";
      points: number;
      maxScore: number;
      allowedAbilities?: AbilityId[];
      /** When true, grants saving throw proficiency for each ability that receives an increase (e.g. Resilient). */
      grantSaveProficiency?: boolean;
    }
  | { type: "hp_per_level"; amount: number }
  | GrantSpellsEffect
  | {
      type: "grant_armor_categories";
      categories: ArmorCategory[];
      shieldProficiency?: boolean;
    }
  | { type: "grant_weapon_proficiency"; proficiency: "simple" | "martial" }
  | { type: "walk_speed_bonus"; feet: number }
  | {
      type: "weapon_damage_bonus";
      amount?: number;
      amountFormula?: "proficiency_bonus";
      filter: "oneHandedMelee" | "thrown" | "heavyAttack";
    }
  | { type: "medium_armor_dex_cap"; cap: number }
  | {
      type: "damage_reduction_while_wearing";
      amountFormula: "proficiency_bonus";
      armorCategory: ArmorCategory;
      damageTypes: ("bludgeoning" | "piercing" | "slashing")[];
    }
  | {
      type: "grant_expertise";
      count: number;
      skillIds?: SkillId[];
      proficiencyOrExpertise?: boolean;
    }
  | {
      type: "resistance";
      damageTypes: string[];
      chooseDamageType?: boolean;
    }
  | { type: "damage_die_floor"; minimum: number }
  | { type: "light_extra_attack_add_ability_mod" }
  | { type: "unarmed_damage_die"; die: string }
  | {
      type: "limited_uses";
      formula:
        | "proficiency_bonus"
        | { kind: "fixed"; uses: number }
        | { kind: "abilityMod"; ability: AbilityId; plus?: number };
      restRecovery: "long" | "short";
      /** When set, tracker renders on Spells tab instead of Combat. */
      uiSurface?: "spells" | "combat";
      /** Optional combat locale key for the use tracker label. */
      trackerLabelKey?: string;
    }
  | { type: "grant_languages"; languages: LanguageId[] }
  | {
      type: "combat_reference_options";
      /** Short intro on the combat card. Defaults to "You gain the following benefits." */
      intro?: string;
      options: FeatCombatReferenceOption[];
    }
  | { type: "narrative" };

export interface FeatCombatReferenceTable {
  headers: string[];
  rows: string[][];
}

export interface FeatCombatReferenceOption {
  key: string;
  name: string;
  desc: string;
  /** Pipe-delimited table embedded under this named section (magic item spell lists, etc.). */
  table?: FeatCombatReferenceTable;
  /** When set, also emits an action-economy card for this benefit. */
  actionTiming?: ActionTiming;
}

export interface FeatDefinition {
  featKey: string;
  prerequisites: FeatPrerequisite[];
  effects: FeatEffect[];
  /** When true, the same feat key may be taken from multiple slots (e.g. ASI at L4 and L8). */
  repeatable?: boolean;
  combatSurface?: boolean;
  actionTiming?: ActionTiming;
  /** When set, emits one combat card per timing (e.g. Polearm Master bonus + reaction). */
  actionTimings?: ActionTiming[];
}

export interface FeatChoices {
  proficiencyPicks: (FeatProficiencyPick | null)[];
  abilityIncreases: Partial<Record<AbilityId, number>>;
  spellcastingAbility: AbilityId | null;
  cantripPicks: (string | null)[];
  spellPicks: (string | null)[];
  damageTypePick: string | null;
  weaponMasteryPick: string | null;
}

export type WeaponDamageBonusFilter = "oneHandedMelee" | "thrown" | "heavyAttack";

export interface FeatContributions {
  abilityScoreBonuses: Partial<Record<AbilityId, number>>;
  savingThrowProficiencies: AbilityId[];
  initiativeAddProficiency: boolean;
  acBonus: number;
  rangedAttackBonus: number;
  hpPerLevel: number;
  lightExtraAttackAddsAbilityMod: boolean;
  unarmedDamageDie: string | null;
  walkSpeedBonusFeet: number;
  armorCategoryGrants: ArmorCategory[];
  shieldProficiencyGrant: boolean;
  weaponProficiencyGrants: ("simple" | "martial")[];
  weaponDamageBonusRules: { amount: number; filter: WeaponDamageBonusFilter }[];
  mediumArmorDexCap: number | null;
  resistances: string[];
  expertiseSkillIds: SkillId[];
}

export interface FeatSpecialFeatureCard {
  id: string;
  featKey: string;
  name: string;
  description: string;
  meta?: string;
  referenceOptions?: FeatCombatReferenceOption[];
  referenceTrailing?: string;
  referenceTableTitle?: string;
  referenceTable?: FeatCombatReferenceOption[];
  useTrackerFeatKey?: string;
}

export const FEAT_EMBEDDED_USE_TRACKER_KEYS = new Set([
  "genie-magic",
  "lordly-resolve",
  "love-bites",
  "lucky",
  "mage-slayer",
  "mythal-touched",
  "rebuke",
  "divination-adept",
  "spell-resistant",
]);

export const FEAT_COMBAT_DAMAGE_TYPE_PICK_KEYS = new Set(["spell-resistant", "otherworldly-familiar"]);
export const FEAT_SPELLS_TAB_TOUCHED_KEYS = new Set(["fey-touched", "shadow-touched", "vampire-touched"]);

export const FEAT_SPELLS_TAB_MAGIC_INITIATE_KEYS = new Set([
  "magic-initiate-wizard",
  "magic-initiate-cleric",
  "magic-initiate-druid",
]);

export const FEAT_SPELLS_TAB_MAGIC_CONNOISSEUR_KEYS = new Set(["magic-connoisseur"]);

export const FEAT_SPELLS_TAB_PICK_KEYS = new Set([
  ...FEAT_SPELLS_TAB_TOUCHED_KEYS,
  ...FEAT_SPELLS_TAB_MAGIC_INITIATE_KEYS,
  ...FEAT_SPELLS_TAB_MAGIC_CONNOISSEUR_KEYS,
]);
export const FEAT_COMBAT_WEAPON_MASTERY_PICK_KEYS = new Set(["weapon-master"]);

export function featCombatReferenceEffect(
  definition: FeatDefinition | null | undefined,
): Extract<FeatEffect, { type: "combat_reference_options" }> | null {
  if (!definition) return null;
  return (
    definition.effects.find(
      (effect): effect is Extract<FeatEffect, { type: "combat_reference_options" }> =>
        effect.type === "combat_reference_options",
    ) ?? null
  );
}

export function featCombatReferenceIntro(
  effect: Extract<FeatEffect, { type: "combat_reference_options" }>,
): string {
  return effect.intro ?? FEAT_COMBAT_REFERENCE_INTRO_DEFAULT;
}

export const EMPTY_FEAT_CHOICES: FeatChoices = {
  proficiencyPicks: [],
  abilityIncreases: {},
  spellcastingAbility: null,
  cantripPicks: [],
  spellPicks: [],
  damageTypePick: null,
  weaponMasteryPick: null,
};

export { featSpellUseStorageKey, readFeatSpellUseCount } from "./featGrantSpells.js";

export const MAGIC_INITIATE_FEAT_KEYS = [
  "magic-initiate-wizard",
  "magic-initiate-cleric",
  "magic-initiate-druid",
] as const;

export type MagicInitiateFeatKey = (typeof MAGIC_INITIATE_FEAT_KEYS)[number];

export function isMagicInitiateFeatKey(featKey: string): featKey is MagicInitiateFeatKey {
  return (MAGIC_INITIATE_FEAT_KEYS as readonly string[]).includes(featKey);
}

export function spellListForMagicInitiateFeat(featKey: string): "wizard" | "cleric" | "druid" | null {
  switch (featKey) {
    case "magic-initiate-wizard":
      return "wizard";
    case "magic-initiate-cleric":
      return "cleric";
    case "magic-initiate-druid":
      return "druid";
    default:
      return null;
  }
}

export const HUMAN_VERSATILE_FEAT_KEY = "skilled";

export function originFeats(feats: FeatData[]): FeatData[] {
  return feats.filter((feat) => feat.category === "Origin");
}

export function dragonmarkFeats(feats: FeatData[]): FeatData[] {
  return feats.filter((feat) => feat.category === "Dragonmark");
}

/** Origin feats eligible for the primary background feat picker. */
export function backgroundFeatOptions(feats: FeatData[]): FeatData[] {
  return feats.filter((feat) => feat.category === "Origin");
}

/** Feat keys whose limited uses or free spell casts recover on a Short Rest. */
export function featKeysRecoveringOnShortRest(activeFeatKeys: string[]): Set<string> {
  const keys = new Set<string>();
  for (const featKey of activeFeatKeys) {
    const definition = findFeatDefinition(featKey);
    if (!definition) continue;
    for (const effect of definition.effects) {
      if (effect.type === "limited_uses" && effect.restRecovery === "short") {
        keys.add(featKey);
      }
      if (effect.type === "grant_spells" && effect.restRecovery === "short" && (effect.spellLevel ?? 0) >= 1) {
        keys.add(featKey);
      }
    }
  }
  return keys;
}

export function fightingStyleFeats(feats: FeatData[]): FeatData[] {
  return feats.filter((feat) => feat.category === "Fighting Style");
}

export interface FeatSkillPickCharacter {
  featKey: string | null;
  featChoices: FeatChoices;
  fightingStyleFeatKey: string | null;
  fightingStyleFeatChoices: FeatChoices;
  extraFeats: string[];
  extraFeatChoices: FeatChoices[];
  classGrantedFeats: Record<number, string>;
  classGrantedFeatChoices: Record<number, FeatChoices>;
}

function proficiencySkillPicksFromFeatChoices(featKey: string, choices: FeatChoices): (SkillId | null)[] {
  const picks: (SkillId | null)[] = [];
  for (let index = 0; index < choices.proficiencyPicks.length; index += 1) {
    if (featProficiencySlotKind(featKey, index) === "expertise") continue;
    const pick = choices.proficiencyPicks[index];
    picks.push(pick?.kind === "skill" ? pick.id : null);
  }
  return picks;
}

export function allFeatSkillPicksForCharacter(character: FeatSkillPickCharacter): (SkillId | null)[] {
  const picks: (SkillId | null)[] = [];
  if (character.featKey) {
    picks.push(...proficiencySkillPicksFromFeatChoices(character.featKey, character.featChoices));
  }
  if (character.fightingStyleFeatKey) {
    picks.push(
      ...proficiencySkillPicksFromFeatChoices(
        character.fightingStyleFeatKey,
        character.fightingStyleFeatChoices,
      ),
    );
  }
  character.extraFeats.forEach((featKey, index) => {
    if (!featKey) return;
    picks.push(
      ...proficiencySkillPicksFromFeatChoices(
        featKey,
        character.extraFeatChoices[index] ?? EMPTY_FEAT_CHOICES,
      ),
    );
  });
  for (const [levelText, featKey] of Object.entries(character.classGrantedFeats)) {
    if (!featKey) continue;
    picks.push(
      ...proficiencySkillPicksFromFeatChoices(
        featKey,
        character.classGrantedFeatChoices[Number(levelText)] ?? EMPTY_FEAT_CHOICES,
      ),
    );
  }
  return picks;
}

export function featFixedToolIdsFromDefinition(featKey: string | null): ToolId[] {
  if (!featKey) return [];
  return featFixedToolIds([featKey]);
}

export function featFixedToolIds(activeFeatKeys: string[]): ToolId[] {
  const toolIds: ToolId[] = [];
  const seen = new Set<ToolId>();
  for (const featKey of activeFeatKeys) {
    const definition = findFeatDefinition(featKey);
    if (!definition) continue;
    for (const effect of definition.effects) {
      if (effect.type !== "grant_skill_proficiencies" || !effect.fixedToolIds) continue;
      for (const toolId of effect.fixedToolIds) {
        if (!seen.has(toolId)) {
          seen.add(toolId);
          toolIds.push(toolId);
        }
      }
    }
  }
  return toolIds;
}

export function allFeatProficiencyPicksForCharacter(character: FeatSkillPickCharacter): (FeatProficiencyPick | null)[] {
  const picks: (FeatProficiencyPick | null)[] = [...character.featChoices.proficiencyPicks];
  if (character.fightingStyleFeatKey) {
    picks.push(...character.fightingStyleFeatChoices.proficiencyPicks);
  }
  picks.push(...character.extraFeatChoices.flatMap((choices) => choices.proficiencyPicks));
  for (const [levelText, featKey] of Object.entries(character.classGrantedFeats)) {
    if (!featKey) continue;
    picks.push(...(character.classGrantedFeatChoices[Number(levelText)]?.proficiencyPicks ?? []));
  }
  return picks;
}

/** @deprecated Use allFeatSkillPicksForCharacter */
export function allFeatSkillPicks(
  featChoices: FeatChoices,
  extraFeatChoices: FeatChoices[] = [],
): (SkillId | null)[] {
  return [...featChoices.proficiencyPicks, ...extraFeatChoices.flatMap((choices) => choices.proficiencyPicks)].map(
    (pick) => (pick?.kind === "skill" ? pick.id : null),
  );
}

/** @deprecated Use allFeatProficiencyPicksForCharacter */
export function allFeatProficiencyPicks(
  featChoices: FeatChoices,
  extraFeatChoices: FeatChoices[] = [],
): (FeatProficiencyPick | null)[] {
  return [...featChoices.proficiencyPicks, ...extraFeatChoices.flatMap((choices) => choices.proficiencyPicks)];
}

export function featExpertiseSkillIds(
  activeFeatKeys: string[],
  featChoicesFor: (featKey: string, slotIndex?: number) => FeatChoices,
  baseAbilityScores: Record<AbilityId, number>,
): SkillId[] {
  return collectFeatContributions(activeFeatKeys, featChoicesFor, baseAbilityScores, []).expertiseSkillIds;
}

export function featChoicesForKey(
  featKey: string,
  primaryFeatKey: string | null,
  primaryFeatChoices: FeatChoices,
  extraFeats: string[],
  extraFeatChoices: FeatChoices[],
  fightingStyleFeatKey: string | null = null,
  fightingStyleFeatChoices: FeatChoices = EMPTY_FEAT_CHOICES,
  classGrantedFeats: Record<number, string> = {},
  classGrantedFeatChoices: Record<number, FeatChoices> = {},
  classGrantLevel?: number,
): FeatChoices {
  if (classGrantLevel != null && classGrantedFeats[classGrantLevel] === featKey) {
    return classGrantedFeatChoices[classGrantLevel] ?? EMPTY_FEAT_CHOICES;
  }
  if (featKey === primaryFeatKey) return primaryFeatChoices;
  if (featKey === fightingStyleFeatKey) return fightingStyleFeatChoices;
  const extraIndex = extraFeats.indexOf(featKey);
  if (extraIndex >= 0) return extraFeatChoices[extraIndex] ?? EMPTY_FEAT_CHOICES;
  for (const [levelText, key] of Object.entries(classGrantedFeats)) {
    if (key === featKey) return classGrantedFeatChoices[Number(levelText)] ?? EMPTY_FEAT_CHOICES;
  }
  return EMPTY_FEAT_CHOICES;
}

const EPIC_BOON_KEYS = [
  "boon-of-combat-prowess",
  "boon-of-dimensional-travel",
  "boon-of-fate",
  "boon-of-irresistible-offense",
  "boon-of-spell-recall",
  "boon-of-the-night-spirit",
  "boon-of-truesight",
] as const;

function epicBoonDefinition(featKey: string): FeatDefinition {
  const prerequisites: FeatPrerequisite[] = [{ type: "level", min: 19 }];
  if (featKey === "boon-of-spell-recall") {
    prerequisites.push({ type: "spellcasting_feature" });
  }
  return {
    featKey,
    prerequisites,
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 30 },
      { type: "narrative" },
    ],
  };
}

export const FEAT_DEFINITIONS: FeatDefinition[] = [
  {
    featKey: "ability-score-improvement",
    repeatable: true,
    prerequisites: [{ type: "level", min: 4 }],
    effects: [{ type: "ability_score_increase", points: 2, maxScore: 20 }],
  },
  {
    featKey: "alert",
    prerequisites: [],
    effects: [{ type: "initiative_add_proficiency" }, { type: "narrative" }],
  },
  {
    featKey: "archery",
    prerequisites: [{ type: "fighting_style_feature" }],
    effects: [{ type: "ranged_attack_bonus", amount: 2 }],
  },
  ...EPIC_BOON_KEYS.map((featKey) => epicBoonDefinition(featKey)),
  {
    featKey: "defense",
    prerequisites: [{ type: "fighting_style_feature" }],
    effects: [{ type: "ac_bonus_in_armor", amount: 1 }],
  },
  {
    featKey: "grappler",
    prerequisites: [
      { type: "level", min: 4 },
      { type: "ability", abilities: ["str", "dex"], min: 13 },
    ],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["str", "dex"] },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "great-weapon-fighting",
    prerequisites: [{ type: "fighting_style_feature" }],
    effects: [{ type: "damage_die_floor", minimum: 3 }, { type: "narrative" }],
    combatSurface: true,
  },
  {
    featKey: "magic-initiate-wizard",
    prerequisites: [],
    effects: [{ type: "grant_spells", spellList: "wizard", cantripCount: 2, spellLevel: 1 }, { type: "narrative" }],
  },
  {
    featKey: "magic-initiate-cleric",
    prerequisites: [],
    effects: [{ type: "grant_spells", spellList: "cleric", cantripCount: 2, spellLevel: 1 }, { type: "narrative" }],
  },
  {
    featKey: "magic-initiate-druid",
    prerequisites: [],
    effects: [{ type: "grant_spells", spellList: "druid", cantripCount: 2, spellLevel: 1 }, { type: "narrative" }],
  },
  {
    featKey: "savage-attacker",
    prerequisites: [],
    effects: [{ type: "narrative" }],
    combatSurface: true,
  },
  {
    featKey: "skilled",
    prerequisites: [],
    effects: [{ type: "grant_skill_proficiencies", count: 3 }],
  },
  {
    featKey: "two-weapon-fighting",
    prerequisites: [{ type: "fighting_style_feature" }],
    effects: [{ type: "light_extra_attack_add_ability_mod" }, { type: "narrative" }],
  },
  ...EXTRA_FEAT_DEFINITIONS,
  ...BACKGROUND_FEAT_DEFINITIONS,
  ...applyPost2024FeatMechanics(POST2024_FEAT_DEFINITIONS),
];

const FEAT_DEFINITION_BY_KEY = new Map(FEAT_DEFINITIONS.map((definition) => [definition.featKey, definition]));

export function findFeatDefinition(featKey: string): FeatDefinition | null {
  return FEAT_DEFINITION_BY_KEY.get(featKey) ?? null;
}

export function initialFeatChoicesForFeat(featKey: string | null): FeatChoices {
  if (!featKey) {
    return {
      ...EMPTY_FEAT_CHOICES,
      proficiencyPicks: [],
      abilityIncreases: {},
      spellcastingAbility: null,
      cantripPicks: [],
      spellPicks: [],
    };
  }

  const definition = findFeatDefinition(featKey);
  if (!definition) return { ...EMPTY_FEAT_CHOICES };

  const skillCount = definition.effects
    .filter((effect): effect is Extract<FeatEffect, { type: "grant_skill_proficiencies" }> => effect.type === "grant_skill_proficiencies")
    .reduce((sum, effect) => sum + effect.count, 0);

  const grantSpellsEffects = definition.effects.filter(
    (effect): effect is GrantSpellsEffect => effect.type === "grant_spells",
  );
  const grantSpells = grantSpellsEffects[0];

  const expertiseCount = definition.effects
    .filter((effect): effect is Extract<FeatEffect, { type: "grant_expertise" }> => effect.type === "grant_expertise")
    .reduce((sum, effect) => sum + effect.count, 0);

  const abilityIncrease = definition.effects.find(
    (effect): effect is Extract<FeatEffect, { type: "ability_score_increase" }> =>
      effect.type === "ability_score_increase",
  );

  const needsDamageTypePick = definition.effects.some(
    (effect) => effect.type === "resistance" && effect.chooseDamageType,
  );

  const needsWeaponMasteryPick = definition.featKey === "weapon-master";

  return {
    proficiencyPicks: Array.from({ length: skillCount + expertiseCount }, () => null),
    abilityIncreases: defaultAbilityIncreasesForEffect(abilityIncrease),
    spellcastingAbility: grantSpells?.fixedSpellcastingAbility ?? null,
    cantripPicks: Array.from(
      {
        length: grantSpellsEffects.reduce((sum, effect) => sum + featCantripPickSlotCount(effect), 0),
      },
      () => null,
    ),
    spellPicks: Array.from(
      {
        length: grantSpellsEffects.reduce(
          (sum, effect) => sum + featSpellPickSlotCount(effect, PROFICIENCY_BONUS),
          0,
        ),
      },
      () => null,
    ),
    damageTypePick: needsDamageTypePick ? null : null,
    weaponMasteryPick: needsWeaponMasteryPick ? null : null,
  };
}

function defaultAbilityIncreasesForEffect(
  effect: Extract<FeatEffect, { type: "ability_score_increase" }> | undefined,
): Partial<Record<AbilityId, number>> {
  if (!effect?.allowedAbilities || effect.allowedAbilities.length !== 1) return {};
  return { [effect.allowedAbilities[0]]: effect.points };
}

export function featGrantSpellsEffects(featKey: string | null): GrantSpellsEffect[] {
  if (!featKey) return [];
  const definition = findFeatDefinition(featKey);
  if (!definition) return [];
  return definition.effects.filter((effect): effect is GrantSpellsEffect => effect.type === "grant_spells");
}

export function featGrantSpellsEffect(featKey: string | null): GrantSpellsEffect | null {
  return featGrantSpellsEffects(featKey)[0] ?? null;
}

export function featGrantSpellPickContext(
  featKey: string,
  pickKind: "cantrip" | "spell",
  pickIndex: number,
  proficiencyBonus: number = PROFICIENCY_BONUS,
): { effect: GrantSpellsEffect; pickLevel: number } | null {
  let offset = 0;
  for (const effect of featGrantSpellsEffects(featKey)) {
    const slots =
      pickKind === "cantrip"
        ? featCantripPickSlotCount(effect)
        : featSpellPickSlotCount(effect, proficiencyBonus);
    if (pickIndex < offset + slots) {
      return {
        effect,
        pickLevel: pickKind === "cantrip" ? 0 : (effect.spellLevel ?? 1),
      };
    }
    offset += slots;
  }
  return null;
}

export function featResistanceEffect(
  featKey: string,
): Extract<FeatEffect, { type: "resistance" }> | null {
  const definition = findFeatDefinition(featKey);
  if (!definition) return null;
  return (
    definition.effects.find(
      (effect): effect is Extract<FeatEffect, { type: "resistance" }> =>
        effect.type === "resistance" && effect.chooseDamageType === true,
    ) ?? null
  );
}

export function featCombatDamageTypeLabelKey(featKey: string): string {
  if (featKey === "spell-resistant") return "character.featMagicalResilienceDamageType";
  if (featKey === "otherworldly-familiar") return "character.featEnergyResistanceDamageType";
  return "character.featDamageType";
}

export function featDamageTypeOptions(featKey: string): string[] {
  return featResistanceEffect(featKey)?.damageTypes ?? [];
}

export function featNeedsDamageTypePick(featKey: string): boolean {
  return featDamageTypeOptions(featKey).length > 0;
}

export function featNeedsWeaponMasteryPick(featKey: string): boolean {
  return featKey === "weapon-master";
}

export function isValidFeatDamageTypePick(featKey: string, damageType: string | null): boolean {
  if (damageType === null) return true;
  return featDamageTypeOptions(featKey).includes(damageType);
}

export function featShouldHideDescriptionTrailing(featKey: string): boolean {
  if (featKey.endsWith("-adept")) return true;
  return featGrantSpellsEffects(featKey).some((effect) => (effect.fixedSpellGrants?.length ?? 0) > 0);
}

function hasBodyArmor(wornArmor: ArmorData[]): boolean {
  return wornArmor.some((armor) => armor.key !== "shield" && ["light", "medium", "heavy"].includes(armor.category));
}

function capAbilityIncrease(
  baseScore: number,
  requestedIncrease: number,
  maxScore: number,
): number {
  const remaining = Math.max(0, maxScore - baseScore);
  return Math.min(requestedIncrease, remaining);
}

function applyAbilityScoreIncrease(
  effect: Extract<FeatEffect, { type: "ability_score_increase" }>,
  baseScores: Record<AbilityId, number>,
  abilityIncreases: Partial<Record<AbilityId, number>>,
  bonuses: Partial<Record<AbilityId, number>>,
): void {
  const allowed = effect.allowedAbilities ?? ABILITIES.map(({ id }) => id);
  let pointsSpent = 0;

  for (const ability of allowed) {
    const increase = abilityIncreases[ability] ?? 0;
    if (increase <= 0) continue;
    const capped = capAbilityIncrease(baseScores[ability] + (bonuses[ability] ?? 0), increase, effect.maxScore);
    if (capped <= 0) continue;
    bonuses[ability] = (bonuses[ability] ?? 0) + capped;
    pointsSpent += capped;
    if (pointsSpent >= effect.points) break;
  }
}

export function collectFeatContributions(
  activeFeatKeys: string[],
  featChoicesFor: (featKey: string, slotIndex?: number) => FeatChoices,
  baseAbilityScores: Record<AbilityId, number>,
  wornArmor: ArmorData[],
): FeatContributions {
  const contributions: FeatContributions = {
    abilityScoreBonuses: {},
    savingThrowProficiencies: [],
    initiativeAddProficiency: false,
    acBonus: 0,
    rangedAttackBonus: 0,
    hpPerLevel: 0,
    lightExtraAttackAddsAbilityMod: false,
    unarmedDamageDie: null,
    walkSpeedBonusFeet: 0,
    armorCategoryGrants: [],
    shieldProficiencyGrant: false,
    weaponProficiencyGrants: [],
    weaponDamageBonusRules: [],
    mediumArmorDexCap: null,
    resistances: [],
    expertiseSkillIds: [],
  };

  activeFeatKeys.forEach((featKey, slotIndex) => {
    const definition = findFeatDefinition(featKey);
    if (!definition) return;
    const featChoices = featChoicesFor(featKey, slotIndex);

    for (const effect of definition.effects) {
      switch (effect.type) {
        case "initiative_add_proficiency":
          contributions.initiativeAddProficiency = true;
          break;
        case "ac_bonus_in_armor":
          if (hasBodyArmor(wornArmor)) {
            contributions.acBonus += effect.amount;
          }
          break;
        case "ranged_attack_bonus":
          contributions.rangedAttackBonus += effect.amount;
          break;
        case "light_extra_attack_add_ability_mod":
          contributions.lightExtraAttackAddsAbilityMod = true;
          break;
        case "hp_per_level":
          contributions.hpPerLevel += effect.amount;
          break;
        case "unarmed_damage_die":
          contributions.unarmedDamageDie = effect.die;
          break;
        case "walk_speed_bonus":
          contributions.walkSpeedBonusFeet += effect.feet;
          break;
        case "grant_armor_categories":
          contributions.armorCategoryGrants.push(...effect.categories);
          if (effect.shieldProficiency) {
            contributions.shieldProficiencyGrant = true;
          }
          break;
        case "grant_weapon_proficiency":
          contributions.weaponProficiencyGrants.push(effect.proficiency);
          break;
        case "weapon_damage_bonus": {
          const amount =
            effect.amountFormula === "proficiency_bonus" ? PROFICIENCY_BONUS : (effect.amount ?? 0);
          contributions.weaponDamageBonusRules.push({ amount, filter: effect.filter });
          break;
        }
        case "medium_armor_dex_cap":
          contributions.mediumArmorDexCap = effect.cap;
          break;
        case "resistance": {
          const chosen = effect.chooseDamageType ? featChoices.damageTypePick : null;
          if (chosen) {
            contributions.resistances.push(chosen);
          } else if (!effect.chooseDamageType) {
            contributions.resistances.push(...effect.damageTypes);
          }
          break;
        }
        case "grant_expertise": {
          const { skillSlots } = featProficiencySlotCount(featKey);
          let pickIndex = 0;
          for (let slotIndex = skillSlots; slotIndex < featChoices.proficiencyPicks.length; slotIndex += 1) {
            const pick = featChoices.proficiencyPicks[slotIndex];
            if (pick?.kind !== "skill") continue;
            if (effect.skillIds && !effect.skillIds.includes(pick.id)) continue;
            if (pickIndex < effect.count) {
              contributions.expertiseSkillIds.push(pick.id);
              pickIndex += 1;
            }
          }
          break;
        }
        case "ability_score_increase": {
          applyAbilityScoreIncrease(
            effect,
            baseAbilityScores,
            featChoices.abilityIncreases,
            contributions.abilityScoreBonuses,
          );
          if (effect.grantSaveProficiency) {
            const allowed = effect.allowedAbilities ?? ABILITIES.map(({ id }) => id);
            for (const ability of allowed) {
              const increase = featChoices.abilityIncreases[ability] ?? 0;
              if (increase > 0) {
                contributions.savingThrowProficiencies.push(ability);
              }
            }
          }
          break;
        }
        default:
          break;
      }
    }
  });

  return contributions;
}

export function inspiringLeaderTempHp(
  featChoices: FeatChoices,
  level: number,
  abilityModifiers: Record<AbilityId, number>,
): number | null {
  const asiAbility = ABILITIES.map(({ id }) => id).find((ability) => (featChoices.abilityIncreases[ability] ?? 0) > 0);
  if (!asiAbility) return null;
  return level + (abilityModifiers[asiAbility] ?? 0);
}

export function buildFeatSpecialFeatureCards(input: {
  feats: FeatData[];
  level?: number;
  abilityModifiers?: Record<AbilityId, number>;
  featChoicesFor?: (featKey: string) => FeatChoices;
}): FeatSpecialFeatureCard[] {
  const cards: FeatSpecialFeatureCard[] = [];
  const abilityModifiers = input.abilityModifiers ?? ({} as Record<AbilityId, number>);

  for (const feat of input.feats) {
    const definition = findFeatDefinition(feat.key);
    if (!definition?.combatSurface || definition.actionTiming || definition.actionTimings?.length) continue;

    const referenceEffect = featCombatReferenceEffect(definition);
    if (
      referenceEffect &&
      referenceEffect.options.length > 0 &&
      referenceEffect.options.every((option) => option.actionTiming)
    ) {
      continue;
    }

    const untimedReferenceEffect = referenceEffect
      ? {
          ...referenceEffect,
          options: referenceEffect.options.filter((option) => !option.actionTiming),
        }
      : null;

    const reference = featDescriptionReference(
      feat.desc,
      untimedReferenceEffect && untimedReferenceEffect.options.length > 0
        ? { intro: featCombatReferenceIntro(untimedReferenceEffect), options: untimedReferenceEffect.options }
        : null,
    );
    if (reference) {
      const referenceTable = reference.trailing ? parseFeatReferenceTable(reference.trailing) : null;
      const inspiringTempHp =
        feat.key === "inspiring-leader" && input.level != null && input.featChoicesFor
          ? inspiringLeaderTempHp(input.featChoicesFor(feat.key), input.level, abilityModifiers)
          : null;
      cards.push({
        id: `feat-special-${feat.key}`,
        featKey: feat.key,
        name: feat.name,
        description: reference.intro,
        ...(inspiringTempHp != null ? { meta: String(inspiringTempHp) } : {}),
        referenceOptions: reference.options,
        referenceTrailing:
          featShouldHideDescriptionTrailing(feat.key) || referenceTable ? undefined : reference.trailing,
        ...(referenceTable
          ? {
              referenceTableTitle: referenceTable.title,
              referenceTable: referenceTable.options,
            }
          : {}),
        ...(FEAT_EMBEDDED_USE_TRACKER_KEYS.has(feat.key) ? { useTrackerFeatKey: feat.key } : {}),
      });
      continue;
    }

    if (referenceEffect && referenceEffect.options.some((option) => option.actionTiming)) {
      continue;
    }

    const inspiringTempHp =
      feat.key === "inspiring-leader" && input.level != null && input.featChoicesFor
        ? inspiringLeaderTempHp(input.featChoicesFor(feat.key), input.level, abilityModifiers)
        : null;

    cards.push({
      id: `feat-special-${feat.key}`,
      featKey: feat.key,
      name: feat.name,
      description: feat.desc,
      ...(inspiringTempHp != null ? { meta: String(inspiringTempHp) } : {}),
      ...(FEAT_EMBEDDED_USE_TRACKER_KEYS.has(feat.key) ? { useTrackerFeatKey: feat.key } : {}),
    });
  }

  return cards;
}

export function derivedAbilityScores(
  baseScores: Record<AbilityId, number>,
  bonuses: Partial<Record<AbilityId, number>>,
): Record<AbilityId, number> {
  return Object.fromEntries(
    ABILITIES.map(({ id }) => [id, baseScores[id] + (bonuses[id] ?? 0)]),
  ) as Record<AbilityId, number>;
}

export function hitPointBonusFromFeats(activeFeatKeys: string[], level: number): number {
  const contributions = collectFeatContributions(
    activeFeatKeys,
    () => EMPTY_FEAT_CHOICES,
    {} as Record<AbilityId, number>,
    [],
  );
  return contributions.hpPerLevel * level;
}

export function isRangedWeapon(weaponKey: string, properties: string[]): boolean {
  if (weaponKey === "dart") return true;
  return weaponHasProperty(
    {
      key: weaponKey,
      name: "",
      damageDice: "",
      damageType: "",
      isSimple: false,
      properties,
      mastery: null,
      weightLb: 0,
      cost: { amount: 0, denomination: "cp" },
      srd: true,
      book: "XPHB",
    },
    "Ammunition",
  );
}

export function featProficiencyGrantEffect(
  featKey: string | null,
): Extract<FeatEffect, { type: "grant_skill_proficiencies" }> | null {
  if (!featKey) return null;
  const definition = findFeatDefinition(featKey);
  if (!definition) return null;
  return definition.effects.find(
    (effect): effect is Extract<FeatEffect, { type: "grant_skill_proficiencies" }> =>
      effect.type === "grant_skill_proficiencies",
  ) ?? null;
}

export function featExpertiseGrantEffect(
  featKey: string | null,
): Extract<FeatEffect, { type: "grant_expertise" }> | null {
  if (!featKey) return null;
  const definition = findFeatDefinition(featKey);
  if (!definition) return null;
  return definition.effects.find(
    (effect): effect is Extract<FeatEffect, { type: "grant_expertise" }> => effect.type === "grant_expertise",
  ) ?? null;
}

export function featProficiencySlotCount(featKey: string): { skillSlots: number; expertiseSlots: number } {
  const definition = findFeatDefinition(featKey);
  if (!definition) return { skillSlots: 0, expertiseSlots: 0 };
  const skillSlots = definition.effects
    .filter((effect): effect is Extract<FeatEffect, { type: "grant_skill_proficiencies" }> => effect.type === "grant_skill_proficiencies")
    .reduce((sum, effect) => sum + effect.count, 0);
  const expertiseSlots = definition.effects
    .filter((effect): effect is Extract<FeatEffect, { type: "grant_expertise" }> => effect.type === "grant_expertise")
    .reduce((sum, effect) => sum + effect.count, 0);
  return { skillSlots, expertiseSlots };
}

export function featProficiencySlotKind(
  featKey: string,
  slotIndex: number,
): "proficiency" | "expertise" | "proficiencyOrExpertise" {
  const { skillSlots } = featProficiencySlotCount(featKey);
  if (slotIndex < skillSlots) return "proficiency";
  const expertiseEffect = featExpertiseGrantEffect(featKey);
  if (expertiseEffect?.proficiencyOrExpertise) return "proficiencyOrExpertise";
  return "expertise";
}

export function resolveFeatLimitedUsesMax(
  formula: Extract<FeatEffect, { type: "limited_uses" }>["formula"],
  context: { proficiencyBonus: number; abilityModifiers: Record<AbilityId, number> },
): number {
  if (formula === "proficiency_bonus") return context.proficiencyBonus;
  if (formula.kind === "fixed") return formula.uses;
  const mod = abilityModifier(context.abilityModifiers[formula.ability]);
  return Math.max(1, mod + (formula.plus ?? 0));
}

export function featMechanicsSummary(
  featKey: string,
  t: (key: string, params?: Record<string, string | number>, fallback?: string) => string,
): string | null {
  const definition = findFeatDefinition(featKey);
  if (!definition) return null;

  const parts: string[] = [];
  for (const effect of definition.effects) {
    if (effect.type === "narrative" || effect.type === "combat_reference_options") continue;
    switch (effect.type) {
      case "ability_score_increase": {
        const abilityNames = effect.allowedAbilities
          ? effect.allowedAbilities.map((id) => t(`rules.ability.${id}`)).join(", ")
          : null;
        parts.push(
          abilityNames
            ? t("character.featMechanicsAbilityIncrease", { points: effect.points, abilities: abilityNames })
            : t("character.featMechanicsAbilityIncreaseAny", { points: effect.points }),
        );
        if (effect.grantSaveProficiency) {
          parts.push(t("character.featMechanicsSaveProficiency"));
        }
        break;
      }
      case "grant_skill_proficiencies":
        parts.push(t("character.featMechanicsSkillProficiencies", { count: effect.count }));
        break;
      case "grant_spells":
        parts.push(
          t("character.featMechanicsGrantSpells", {
            cantrips: effect.cantripCount ?? 0,
            level: effect.spellLevel ?? 0,
            list: effect.spellList ?? "any",
          }),
        );
        break;
      case "hp_per_level":
        parts.push(t("character.featMechanicsHpPerLevel", { amount: effect.amount }));
        break;
      case "initiative_add_proficiency":
        parts.push(t("character.featMechanicsInitiative"));
        break;
      case "limited_uses":
        parts.push(t("character.featMechanicsLimitedUses"));
        break;
      case "unarmed_damage_die":
        parts.push(t("character.featMechanicsUnarmedDamage", { die: effect.die }));
        break;
      default:
        break;
    }
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

export function featAbilityIncreaseEffect(featKey: string | null): Extract<FeatEffect, { type: "ability_score_increase" }> | null {
  if (!featKey) return null;
  const definition = findFeatDefinition(featKey);
  if (!definition) return null;
  return definition.effects.find((effect): effect is Extract<FeatEffect, { type: "ability_score_increase" }> => effect.type === "ability_score_increase") ?? null;
}

export function featSkillPickCount(featKey: string | null): number {
  if (!featKey) return 0;
  const definition = findFeatDefinition(featKey);
  if (!definition) return 0;
  const skillCount = definition.effects
    .filter((effect): effect is Extract<FeatEffect, { type: "grant_skill_proficiencies" }> => effect.type === "grant_skill_proficiencies")
    .reduce((sum, effect) => sum + effect.count, 0);
  const expertiseCount = definition.effects
    .filter((effect): effect is Extract<FeatEffect, { type: "grant_expertise" }> => effect.type === "grant_expertise")
    .reduce((sum, effect) => sum + effect.count, 0);
  return skillCount + expertiseCount;
}

export function featWeaponDamageBonusForWeapon(
  weapon: import("../data/types").WeaponData,
  rules: FeatContributions["weaponDamageBonusRules"],
): number {
  let bonus = 0;
  for (const rule of rules) {
    if (rule.filter === "oneHandedMelee") {
      if (!weaponHasProperty(weapon, "Two-Handed") && !weaponHasProperty(weapon, "Ammunition")) {
        bonus += rule.amount;
      }
    } else if (rule.filter === "thrown") {
      if (weaponHasProperty(weapon, "Thrown")) bonus += rule.amount;
    } else if (rule.filter === "heavyAttack") {
      if (weaponHasProperty(weapon, "Heavy")) bonus += rule.amount;
    }
  }
  return bonus;
}

export function validateAbilityIncreases(
  effect: Extract<FeatEffect, { type: "ability_score_increase" }>,
  baseScores: Record<AbilityId, number>,
  abilityIncreases: Partial<Record<AbilityId, number>>,
): Partial<Record<AbilityId, number>> | null {
  const allowed = new Set(effect.allowedAbilities ?? ABILITIES.map(({ id }) => id));
  const sanitized: Partial<Record<AbilityId, number>> = {};
  let pointsSpent = 0;

  for (const [ability, increase] of Object.entries(abilityIncreases) as [AbilityId, number][]) {
    if (!allowed.has(ability)) return null;
    if (!Number.isInteger(increase) || increase < 0) return null;
    const capped = capAbilityIncrease(baseScores[ability], increase, effect.maxScore);
    if (capped !== increase) return null;
    if (capped > 0) {
      sanitized[ability] = capped;
      pointsSpent += capped;
    }
  }

  if (pointsSpent > effect.points) return null;
  return sanitized;
}

export function encodeFeatProficiencyPick(pick: FeatProficiencyPick): string {
  return `${pick.kind}:${pick.id}`;
}

export function decodeFeatProficiencyPick(value: string): FeatProficiencyPick | null {
  const colon = value.indexOf(":");
  if (colon <= 0) return null;
  const kind = value.slice(0, colon);
  const id = value.slice(colon + 1);
  if (kind === "skill") return { kind: "skill", id: id as SkillId };
  if (kind === "tool") return { kind: "tool", id: id as ToolId };
  return null;
}

export function compactFeatProficiencyPicks(picks: readonly (FeatProficiencyPick | null)[]): string[] {
  return picks
    .filter((pick): pick is FeatProficiencyPick => pick != null)
    .map((pick) => encodeFeatProficiencyPick(pick));
}

export function featProficiencyPickSlotForEncoded(
  picks: readonly (FeatProficiencyPick | null)[],
  encoded: string,
): number {
  return picks.findIndex((pick) => pick != null && encodeFeatProficiencyPick(pick) === encoded);
}

export interface FeatProficiencyOptionContext {
  featKey?: string;
  proficientSkills?: readonly SkillId[];
  expertSkills?: readonly SkillId[];
}

export function applyFeatProficiencyPick(
  picks: readonly (FeatProficiencyPick | null)[],
  index: number,
  pick: FeatProficiencyPick | null,
  takenSkills: readonly SkillId[],
  takenTools: readonly ToolId[],
  context: FeatProficiencyOptionContext = {},
): (FeatProficiencyPick | null)[] | null {
  if (index < 0 || index >= picks.length) return null;
  if (pick === null) {
    if (picks[index] === null) return null;
    const next = [...picks];
    next[index] = null;
    return next;
  }

  const slotKind = context.featKey ? featProficiencySlotKind(context.featKey, index) : "proficiency";
  if (pick.kind === "skill") {
    const proficientSet = new Set(context.proficientSkills ?? []);
    picks.forEach((existing, pickIndex) => {
      if (pickIndex < index && existing?.kind === "skill") proficientSet.add(existing.id);
    });
    const expertSet = new Set(context.expertSkills ?? []);
    if (slotKind === "proficiency") {
      if (takenSkills.includes(pick.id)) return null;
    } else if (slotKind === "expertise") {
      if (!proficientSet.has(pick.id) || expertSet.has(pick.id)) return null;
    } else {
      if (expertSet.has(pick.id)) return null;
      if (proficientSet.has(pick.id) && expertSet.has(pick.id)) return null;
      if (proficientSet.has(pick.id) || takenSkills.includes(pick.id)) {
        // proficiencyOrExpertise: already proficient without expertise, or new proficiency
      } else if (takenSkills.includes(pick.id)) {
        return null;
      }
    }
  } else if (takenTools.includes(pick.id)) {
    return null;
  }

  const samePick = (a: FeatProficiencyPick | null, b: FeatProficiencyPick) =>
    a != null && a.kind === b.kind && a.id === b.id;
  const duplicateIndex = picks.findIndex((existing, pickIndex) => pickIndex !== index && samePick(existing, pick));
  if (duplicateIndex >= 0) {
    const allowSkillExpertProficiencyExpertisePair =
      context.featKey === "skill-expert" &&
      pick.kind === "skill" &&
      duplicateIndex === 0 &&
      index === 1 &&
      featProficiencySlotKind(context.featKey, 0) === "proficiency" &&
      featProficiencySlotKind(context.featKey, 1) === "expertise";
    if (!allowSkillExpertProficiencyExpertisePair) return null;
  }
  if (samePick(picks[index], pick)) return null;
  const next = [...picks];
  next[index] = pick;
  return next;
}

export function availableFeatProficiencyOptions(
  picks: readonly (FeatProficiencyPick | null)[],
  takenSkills: readonly SkillId[],
  takenTools: readonly ToolId[],
  slotIndex: number,
  grantEffect: Extract<FeatEffect, { type: "grant_skill_proficiencies" }> | null = null,
  context: FeatProficiencyOptionContext = {},
): FeatProficiencyPick[] {
  const takenSkillSet = new Set<SkillId>(takenSkills);
  const takenToolSet = new Set<ToolId>(takenTools);
  picks.forEach((pick, index) => {
    if (index === slotIndex || !pick) return;
    if (pick.kind === "skill") takenSkillSet.add(pick.id);
    else takenToolSet.add(pick.id);
  });

  const slotKind =
    context.featKey && slotIndex >= 0 ? featProficiencySlotKind(context.featKey, slotIndex) : "proficiency";
  const expertiseEffect = context.featKey ? featExpertiseGrantEffect(context.featKey) : null;
  const allowedSkills =
    slotKind === "expertise" && expertiseEffect?.skillIds
      ? new Set(expertiseEffect.skillIds)
      : grantEffect?.skillIds
        ? new Set(grantEffect.skillIds)
        : null;

  const proficientSet = new Set(context.proficientSkills ?? []);
  picks.forEach((pick, index) => {
    if (index < slotIndex && pick?.kind === "skill") proficientSet.add(pick.id);
  });
  const expertSet = new Set(context.expertSkills ?? []);

  const allowSkills =
    slotKind === "expertise" || slotKind === "proficiencyOrExpertise"
      ? true
      : (grantEffect?.allowSkills ?? true);
  const allowedToolIds = grantEffect?.toolIds
    ? new Set<ToolId>(grantEffect.toolIds)
    : grantEffect?.toolCategories
      ? new Set<ToolId>(grantEffect.toolCategories.flatMap((category) => toolsInCategories([category])))
      : null;

  const options: FeatProficiencyPick[] = [];
  if (allowSkills || slotKind !== "proficiency") {
    for (const skill of SKILLS) {
      if (allowedSkills && !allowedSkills.has(skill.id)) continue;
      if (slotKind === "proficiency") {
        if (takenSkillSet.has(skill.id)) continue;
      } else if (slotKind === "expertise") {
        if (!proficientSet.has(skill.id) || expertSet.has(skill.id)) continue;
      } else {
        if (expertSet.has(skill.id)) continue;
        if (proficientSet.has(skill.id)) {
          if (expertSet.has(skill.id)) continue;
        } else if (takenSkillSet.has(skill.id)) {
          continue;
        }
      }
      options.push({ kind: "skill", id: skill.id });
    }
    const currentPick = picks[slotIndex];
    if (currentPick?.kind === "skill" && !options.some((option) => option.kind === "skill" && option.id === currentPick.id)) {
      options.unshift(currentPick);
    }
  }
  if (allowedToolIds) {
    for (const toolId of TOOL_IDS) {
      if (!allowedToolIds.has(toolId)) continue;
      if (!takenToolSet.has(toolId)) options.push({ kind: "tool", id: toolId });
    }
  }
  return options;
}

export function featGrantedSpellKeysFromChoices(
  activeFeatKeys: string[],
  featChoicesFor: (featKey: string, slotIndex?: number) => FeatChoices,
  excludeFeatKey?: string,
): Set<string> {
  const keys = new Set<string>();
  for (const [index, featKey] of activeFeatKeys.entries()) {
    if (featKey === excludeFeatKey) continue;
    const choices = featChoicesFor(featKey, index);
    for (const pick of [...choices.cantripPicks, ...choices.spellPicks]) {
      if (pick) keys.add(pick);
    }
  }
  return keys;
}

export function padFeatChoicesForFeat(choices: FeatChoices, featKey: string): FeatChoices {
  const initial = initialFeatChoicesForFeat(featKey);
  const cantripPicks = [...choices.cantripPicks];
  const spellPicks = [...choices.spellPicks];
  while (cantripPicks.length < initial.cantripPicks.length) cantripPicks.push(null);
  while (spellPicks.length < initial.spellPicks.length) spellPicks.push(null);
  if (
    cantripPicks.length === choices.cantripPicks.length &&
    spellPicks.length === choices.spellPicks.length
  ) {
    return choices;
  }
  return { ...choices, cantripPicks, spellPicks };
}

export function availableFeatSpellOptions(
  list: string[],
  currentPicks: (string | null)[],
  index: number,
  takenFromOtherFeats: Set<string>,
  ownedSpellKeys: Set<string> = new Set(),
): string[] {
  const takenInFeat = new Set(
    currentPicks.filter((pick, pickIndex) => pick != null && pickIndex !== index),
  );
  const filtered = list.filter(
    (key) => !takenInFeat.has(key) && !takenFromOtherFeats.has(key) && !ownedSpellKeys.has(key),
  );
  const currentPick = currentPicks[index];
  if (currentPick != null && !filtered.includes(currentPick)) {
    return [currentPick, ...filtered];
  }
  return filtered;
}

export interface FeatUseTracker {
  id: string;
  featKey: string;
  maxUses: number;
  restRecovery: "long" | "short";
  labelKey?: string;
}

export function buildFeatUseTrackers(input: {
  activeFeatKeys: string[];
  proficiencyBonus?: number;
  abilityModifiers?: Record<AbilityId, number>;
  uiSurface?: "spells" | "combat";
  excludeEmbeddedOnCard?: boolean;
}): FeatUseTracker[] {
  const proficiencyBonus = input.proficiencyBonus ?? PROFICIENCY_BONUS;
  const abilityModifiers = input.abilityModifiers ?? ({} as Record<AbilityId, number>);
  const trackers: FeatUseTracker[] = [];

  for (const featKey of input.activeFeatKeys) {
    if (input.excludeEmbeddedOnCard && FEAT_EMBEDDED_USE_TRACKER_KEYS.has(featKey)) continue;
    const definition = findFeatDefinition(featKey);
    if (!definition) continue;
    const limitedUses = definition.effects.find(
      (effect): effect is Extract<FeatEffect, { type: "limited_uses" }> => effect.type === "limited_uses",
    );
    if (!limitedUses) continue;
    const surface = limitedUses.uiSurface ?? "combat";
    if (input.uiSurface && surface !== input.uiSurface) continue;
    const maxUses = resolveFeatLimitedUsesMax(limitedUses.formula, { proficiencyBonus, abilityModifiers });
    trackers.push({
      id: `feat-uses-${featKey}`,
      featKey,
      maxUses,
      restRecovery: limitedUses.restRecovery,
      labelKey: limitedUses.trackerLabelKey,
    });
  }

  return trackers;
}

export interface FeatSpellUseTracker {
  id: string;
  featKey: string;
  spellKey: string;
  storageKey: string;
  maxUses: number;
}

export function buildFeatSpellUseTrackers(input: {
  activeFeatKeys: string[];
  featChoicesFor: (featKey: string, slotIndex?: number) => FeatChoices;
}): FeatSpellUseTracker[] {
  const trackers: FeatSpellUseTracker[] = [];
  const proficiencyBonus = PROFICIENCY_BONUS;

  for (const [index, featKey] of input.activeFeatKeys.entries()) {
    const grantEffects = featGrantSpellsEffects(featKey);
    if (grantEffects.length === 0) continue;
    const choices = input.featChoicesFor(featKey, index);
    const spellKeys = new Set<string>();
    let spellOffset = 0;
    for (const grantEffect of grantEffects) {
      for (const key of featGrantedSpellKeysForFreeCast(grantEffect, choices, spellOffset, proficiencyBonus)) {
        spellKeys.add(key);
      }
      spellOffset += featSpellPickSlotCount(grantEffect, proficiencyBonus);
    }
    if (spellKeys.size === 0) continue;
    for (const spellKey of spellKeys) {
      const storageKey = featSpellUseStorageKey(featKey, spellKey);
      trackers.push({
        id: `feat-spell-${storageKey}`,
        featKey,
        spellKey,
        storageKey,
        maxUses: 1,
      });
    }
  }

  return trackers;
}

export interface FeatSpellcastingEntry {
  featKey: string;
  summary: SpellcastingSummary;
}

export function buildFeatSpellcastingEntries(input: {
  activeFeatKeys: string[];
  featChoicesFor: (featKey: string, slotIndex?: number) => FeatChoices;
  abilityModifiers: Record<AbilityId, number>;
  proficiencyBonus?: number;
}): FeatSpellcastingEntry[] {
  const proficiencyBonus = input.proficiencyBonus ?? PROFICIENCY_BONUS;
  const entries: FeatSpellcastingEntry[] = [];

  for (const [index, featKey] of input.activeFeatKeys.entries()) {
    const grantEffect = featGrantSpellsEffect(featKey);
    if (!grantEffect) continue;
    const choices = input.featChoicesFor(featKey, index);
    const ability = resolveFeatSpellcastingAbility(grantEffect, choices);
    if (!ability) continue;

    const summary = computeSpellcasting({
      spellcastingAbility: ability,
      spellcastingGainedAtLevel: 1,
      slotsByLevel: {},
      abilityModifierValue: input.abilityModifiers[ability],
      proficiencyBonus,
      characterLevel: 1,
    });
    if (!summary) continue;
    entries.push({ featKey, summary });
  }

  return entries;
}

/** @deprecated Use applyFeatProficiencyPick */
export function applyFeatSkillPick(
  picks: readonly (SkillId | null)[],
  index: number,
  skill: SkillId | null,
  takenSkills: readonly SkillId[],
): (SkillId | null)[] | null {
  const proficiencyPicks = picks as unknown as (FeatProficiencyPick | null)[];
  const pick = skill ? ({ kind: "skill", id: skill } as const) : null;
  const next = applyFeatProficiencyPick(proficiencyPicks, index, pick, takenSkills, []);
  if (!next) return null;
  return next.map((entry) => (entry?.kind === "skill" ? entry.id : null));
}

/** @deprecated Use availableFeatProficiencyOptions */
export function availableFeatSkillOptions(
  picks: readonly (SkillId | null)[],
  takenSkills: readonly SkillId[],
  slotIndex: number,
): SkillId[] {
  const proficiencyPicks = picks as unknown as (FeatProficiencyPick | null)[];
  return availableFeatProficiencyOptions(proficiencyPicks, takenSkills, [], slotIndex)
    .filter((option): option is Extract<FeatProficiencyPick, { kind: "skill" }> => option.kind === "skill")
    .map((option) => option.id);
}
