import { CLASSES, findByKey, SPECIES, SUBCLASSES, AMMUNITION_STATS, ARMOR, WEAPONS, type AmmoType } from "../data";
import { SKILLS } from "../data/skills";
import type { ToolId } from "../data/toolStats";
import type { AbilityId, ClassFeatureSpellPickSet, ItemCost, LanguageId, SkillId } from "../data/types";
import {
  applyFeatProficiencyPick,
  derivedAbilityScores,
  EMPTY_FEAT_CHOICES,
  allFeatProficiencyPicksForCharacter,
  featFixedToolIds,
  allFeatSkillPicksForCharacter,
  featExpertiseSkillIds,
  type FeatProficiencyOptionContext,
  availableFeatSpellOptions,
  buildFeatSpellUseTrackers,
  buildFeatUseTrackers,
  featAbilityIncreaseEffect,
  featChoicesForKey,
  featGrantSpellPickContext,
  featGrantSpellsEffect,
  featGrantedSpellKeysFromChoices,
  featNeedsWeaponMasteryPick,
  featDamageTypeOptions,
  isValidFeatDamageTypePick,
  HUMAN_VERSATILE_FEAT_KEY,
  initialFeatChoicesForFeat,
  padFeatChoicesForFeat,
  collectFeatContributions,
  validateAbilityIncreases,
  type FeatChoices,
  type FeatProficiencyPick,
} from "../domain/featEffects";
import { featSpellPickOptionsForEffect } from "../domain/featGrantSpells";
import { classFeatGrantLevels } from "../domain/classGrantedFeats";
import {
  activeFeatKeysFromSlots,
  activeFeatSlots,
  featChoicesForSlot,
  type FeatSource,
} from "../domain/featSlots";
import {
  effectiveLevelPath,
  levelPathFromClassKeyAndLevel,
  resolvedClassLevels,
  syncCharacterLevelAliases,
} from "../domain/classLevels";
import { evaluateMulticlassAction, primaryAbilityFromCatalog } from "../domain/multiclass";
import { mergedClassSkillChoiceGrants, mergedWeaponProficiencyGrants } from "../domain/training";
import { computeHitPoints, hitDiceMaxByDieFromLevelPath } from "../domain/hitPoints";
import { proficiencyBonusForLevel } from "../domain/proficiency";
import { RAW_TABLE_RULES, type TableRules } from "../domain/tableRules";
import {
  applyWeaponMasteryPick,
  buildClassFeaturePoolTrackers,
  buildClassFeatureUseTrackers,
  classFeatureChoiceOptions,
  classFeatureChoicesAfterParentChange,
  classFeatureOptionPickCount,
  classFeatureSkillGrants,
  clearInvocationCantripChoicesAtIndex,
  collectClassFeatureContributions,
  effectiveSpellSlotCount,
  effectiveSpellSlotsByLevel,
  ELDRITCH_INVOCATIONS_CHOICE_KEY,
  fontOfMagicSlotCost,
  FONT_OF_MAGIC_FEATURE_KEY,
  initialClassFeatureOptionPicks,
  initialClassFeatureSkillPicks,
  isFightingStyleFeatAllowedForClass,
  isValidClassFeatureChoice,
  isValidClassFeatureOptionPick,
  isValidInvocationCantripChoice,
  PACT_OF_THE_TOME_KEY,
  PACT_OF_THE_TOME_SPELL_PICKS_KEY,
  flattenWeaponMasteryPicks,
  syncWeaponMasteryPicksByClass,
  weaponMasteryPicksForClass,
  selectedClassFeatureOptionPicks,
  effectiveWeaponProficiencyGrants,
  isValidFeatWeaponMasteryPick,
} from "../domain/classFeatures";
import {
  applySpeciesSkillPick,
  buildSpeciesFeatureUseTrackers,
  collectSpeciesFeatureContributions,
  initialSpeciesSkillPicks,
  humanVersatileFeatCount,
  isValidSpeciesCantripChoice,
  retainValidSpeciesSkillPicks,
  resolveSpeciesCantripChoice,
  speciesCantripChoiceDefault,
  speciesCantripChoiceListClassKey,
  speciesSkillPickCount,
  speciesToolPickCount,
} from "../domain/speciesFeatures";
import {
  applyClassSkillPick,
  applyExpertiseSkillPick,
  applySubclassSkillPick,
  collectTakenSkills,
  mergeSkillProficiencies,
  proficientSkillIds,
  retainValidClassSkillPicks,
  retainValidExpertiseSkillPicks,
  retainValidSubclassSkillPicks,
  mergedClassSkillPickSlots,
} from "../domain/skillPicks";
import { resolveSkillPickConflicts } from "../domain/skillConflicts";
import { canAddLanguagePick, isValidLanguageKey } from "../domain/languagePicks";
import { retainValidLanguagePicks } from "../domain/languageGrants";
import {
  applyToolPick,
  ALL_TOOL_OPTIONS,
  backgroundToolOptions,
  backgroundToolSlotCount,
  classToolOptions,
  classToolSlotCount,
  initialToolPicks,
  mergeProficientTools,
  retainValidToolPicks,
  suggestedBackgroundTools,
  suggestedClassTools,
} from "../domain/toolPicks";
import {
  abilityScoresAfterIncreases,
  EMPTY_ABILITY_SCORE_INCREASES,
  sanitizeAbilityScoreIncreases,
} from "../domain/abilityScoreIncreases";
import { abilityModifier } from "../domain/modifiers";
import { clampPointBuyScores } from "../domain/pointBuy";
import {
  addCompactSpellPick,
  addUncappedCompactSpellPick,
  addUniqueCatalogSpellPick,
  allSpellbookKeys,
  applySpellPick,
  cantripPickOptionsForClass,
  cantripPicksForClass,
  classSpellListFor,
  characterConcentrationSpellKeys,
  characterOwnedSpellKeys,
  filterOwnedSpellPickOptions,
  initialPactOfTheTomeSpellPicks,
  preparedSpellPickOptions,
  removeCompactSpellPick,
  retainValidCompactSpellPicks,
  retainValidUncappedSpellPicks,
  spellbookListKeys,
  classFeatureChoicesForClass,
  isMulticlassCharacter,
  multiclassCantripSlotTotal,
  spellbookPicksForClass,
  spellPickLimitsByClass,
  spellPicksForClass,
  subclassKeyForClass,
  spellPickLimitsForClass,
  subclassSpellbookPickOptions,
  findSpellByKey,
  spellDurationToRounds,
  type SpellbookKeyBuckets,
} from "../domain/spellSelection";
import { characterSpellcastingSlots, pactMagicPoolFromClassLevels } from "../domain/spellProgression";
import { effectiveSpellListClassKey } from "../domain/spellcasting";
import { applyHitPointMaxBonus, clearHitPointMaxBonus } from "../domain/hitPointMaxBonus";
import {
  applyDamageToCharacter,
  applyTemporaryHitPointsGrant,
  clampTemporaryHitPointsRemaining,
  clearTemporaryHitPoints,
} from "../domain/temporaryHitPoints";
import {
  clampDeathSave,
  deathSavesClearedIfHealed,
} from "../domain/deathSaves";
import {
  addCondition,
  initialConditionState,
  removeCondition,
  setConditionRounds,
  setExhaustionLevel,
} from "../domain/conditions";
import { standardArrayForClass } from "../domain/standardArray";
import { applyRest } from "../domain/rest";
import {
  applyCompanionSummonPaymentRefund,
  buildCastSpellAvailabilityInputFromCharacter,
  type CompanionSummonPayment,
} from "../domain/castSpell";
import { featChoicesResolverForCharacter } from "../domain/featSlots";
import { computeDerivedStats } from "../domain/deriveCharacter";
import {
  buildCreatureSourceContext,
  companionSummonRequirementsMet,
  resolveTrackedCreatureStatBlock,
  trackedCreatureRegistry,
  type SpiritType,
  type TrackedCreatureInstance,
  updateTrackedCreatureHp,
  withSyncedTrackedCreatures,
} from "../domain/trackedCreatures";
import {
  canAddArtificerCreatedItem,
  canAddArtificerPlan,
  retainArtificerStateForLevel,
} from "../domain/artificerPlans";
import {
  canEnterWildShape,
  clearWildShapeState,
  enterWildShapeState,
  exitWildShapeIfUnconscious,
  initialWildShapeKnownForms,
  WILD_SHAPE_FEATURE_KEY,
  WILD_SHAPE_KNOWN_FORM_COUNT,
  wildShapeEligibleBeasts,
} from "../domain/wildShape";
import { maxCharacterLevelFor } from "../domain/characterLevel";
import {
  armoryVariantAutoAttunes,
  armoryVariantCanAttune,
  hasFreeAttunementSlot,
} from "../domain/attunement";
import {
  armoryEquipmentActionKey,
  gearEquipmentActionKey,
  isEquipmentActionEligible,
  removeEquipmentActionKeys,
} from "../domain/equipmentActions";
import {
  findGenericVariant,
  variantMatchesArmor,
  variantMatchesWeapon,
} from "../domain/genericVariantMatcher";
import {
  armoryChargeMaxForStorageKey,
  armoryChargeStorageKeys,
} from "../domain/genericVariantResolve";
import {
  isEnspelledVariantKey,
  isValidEnspelledSpellPick,
  pruneEnspelledSpellPicks,
} from "../domain/enspelledVariants";
import {
  magicItemChargeMax,
  removeMagicItemChargeKey,
} from "../domain/magicItemCharges";
import {
  maxUsesForEquipmentRestStorageKey,
  removeArmoryEquipmentRestUses,
  removeGearEquipmentRestUses,
} from "../domain/equipmentRestUses";
import { addAttunedMagicItem, attunementEligibleCarriedKeys, removeAttunedMagicItem } from "../domain/magicItems";
import {
  addAdventuringGear,
  removeAdventuringGear,
  setAdventuringGearQuantity,
  type AdventuringGearEntry,
} from "../domain/adventuringGear";
import { setPackContentRemaining } from "../domain/gearPacks";
import {
  clearSubclassState,
  findSubclass,
  initialSubclassSkillPicks,
  initialSubclassToolPicks,
  isValidSubclassFeatureOptionPick,
  subclassFeatureChoiceKeys,
  subclassFeatureChoiceOptions,
  subclassFeatureOptionPickCount,
  subclassFeatureOptionPickGrants,
  subclassFixedTools,
  subclassFixedSkills,
  subclassSkillProficiencyCount,
  subclassSpellbookPickCount,
  subclassSpellbookPickGrants,
  subclassStateForSelection,
  subclassToolGrants,
  subclassToolChooseCount,
  subclassToolPickOptions,
  subclassToolPickOptionsForSlot,
  suggestedSubclassToolPicks,
} from "../domain/subclasses";
import {
  backgroundSkillIdsForCharacter,
  isCustomBackground,
  resolveBackgroundData,
} from "../domain/background";

export type AbilityScoreMethod = "custom" | "standardArray" | "pointBuy";

export type ProficiencyState = "none" | "proficient" | "expert";

export interface CharacterWeapon {
  id: string;
  key: string;
  /** Remaining pieces for thrown weapons; defaults to 1 when omitted. */
  quantity?: number;
  /** Generic magic variant key; omitted = mundane. */
  variantKey?: string;
  /** Meaningful when the variant requires attunement. */
  attuned?: boolean;
}

export interface MagicAmmunitionStack {
  id: string;
  ammoType: AmmoType;
  variantKey: string;
  remaining: number;
}

export interface CharacterArmor {
  id: string;
  key: string;
  worn: boolean;
  variantKey?: string;
  attuned?: boolean;
}

export type { CurrencyDenomination } from "../data/types";
import type { CurrencyDenomination } from "../data/types";

export interface Currency {
  pp: number;
  gp: number;
  ep: number;
  sp: number;
  cp: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  weightLb: number;
  cost: ItemCost;
}

export const EMPTY_CURRENCY: Currency = { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 };

export type SpeciesSizeChoice = "medium" | "small";

export interface Character {
  name: string;
  speciesKey: string | null;
  speciesLineageKey: string | null;
  speciesSpellcastingAbility: AbilityId | null;
  speciesSkillPicks: (SkillId | null)[];
  speciesToolPicks: (ToolId | null)[];
  speciesSize: SpeciesSizeChoice | null;
  /** Selected options for species feature choices (e.g. High Elf cantrip swap). */
  speciesFeatureChoices: Record<string, string>;
  /** choose_cantrip species features may swap once after each Long Rest. */
  speciesCantripSwapAvailable: Record<string, boolean>;
  backgroundKey: string | null;
  /** Player-authored name when backgroundKey is "custom". */
  customBackgroundName: string;
  /** Two skill picks for custom background; ignored for SRD backgrounds. */
  backgroundSkillPicks: (SkillId | null)[];
  classKey: string | null;
  alignmentKey: string | null;
  /** Catalog deity key for the character's faith or patron. */
  deityKey: string | null;
  alignmentDescription: string;
  /** Tracks whether the player has hand-edited the alignment description, so switching alignment doesn't clobber their edits. */
  alignmentDescriptionTouched: boolean;
  backstory: string;
  /** Player-chosen languages (up to three). */
  languagePicks: LanguageId[];
  abilityScores: Record<AbilityId, number>;
  /** Post-generation extra points (0–3 total) distributed among abilities. */
  abilityScoreIncreases: Record<AbilityId, number>;
  abilityScoreMethod: AbilityScoreMethod;
  /** Slot-based class skill choices; length matches the current class's skillChoice.count. */
  classSkillPicks: (SkillId | null)[];
  /** Slot-based background tool choices; length matches background tool slot count. */
  backgroundToolPicks: (ToolId | null)[];
  /** True once the player has picked a background tool themselves. */
  backgroundToolsTouched: boolean;
  /** Slot-based class tool choices; length matches class tool slot count. */
  classToolPicks: (ToolId | null)[];
  /** True once the player has picked a class tool themselves. */
  classToolsTouched: boolean;
  /** Merged proficient tools from background, class, and feat picks. */
  proficientTools: ToolId[];
  /** Skills auto-cleared after a cross-source conflict; consumed by the UI toast. */
  skillConflictNotice: SkillId[] | null;
  skills: Record<SkillId, ProficiencyState>;
  weapons: CharacterWeapon[];
  armor: CharacterArmor[];
  /** Origin feat chosen by the player. Background selection suggests a default. */
  featKey: string | null;
  /** True once the player has picked a feat themselves, so a later background change won't overwrite it. */
  featTouched: boolean;
  extraFeats: string[];
  extraFeatChoices: FeatChoices[];
  /** Fighting Style feat from a class feature (Fighter L1, Paladin/Ranger L2). */
  fightingStyleFeatKey: string | null;
  fightingStyleFeatChoices: FeatChoices;
  /** Class-granted feat keys by the class level that granted the slot (e.g. ASI at 4). */
  classGrantedFeats: Record<number, string>;
  classGrantedFeatChoices: Record<number, FeatChoices>;
  featChoices: FeatChoices;
  /** Weapon keys chosen for Weapon Mastery; flattened union of per-class picks (legacy + combat). */
  weaponMasteryPicks: string[];
  /** Per-class Weapon Mastery picks (multiclass; keyed by classKey). */
  weaponMasteryPicksByClass: Record<string, string[]>;
  /** Skill ids chosen for Expertise; length matches the class's expertise count. */
  expertiseSkillPicks: (SkillId | null)[];
  /** null means current HP follows the derived maximum. */
  currentHitPoints: number | null;
  /** Bonus to max HP from effects like Aid; 0 when inactive. */
  hitPointMaxBonus: number;
  /** null means remaining hit dice follow the derived maximum. */
  currentHitDice: number | null;
  /** Remaining uses for class features; missing key means at maximum. */
  classFeatureUses: Record<string, number>;
  /** Remaining HP for hit_point_pool features (e.g. Arcane Ward); missing key means 0. */
  classFeaturePoolRemaining: Record<string, number>;
  /** Remaining uses for species features; missing key means at maximum. */
  speciesFeatureUses: Record<string, number>;
  currency: Currency;
  /** Remaining ammunition pieces by type; missing key means 0. */
  ammunitionRemaining: Partial<Record<AmmoType, number>>;
  /** Magic ammunition stacks (variant + ammo type + remaining count). */
  magicAmmunition: MagicAmmunitionStack[];
  /** Per ammo type: magic stack id to spend in combat; null/omitted = mundane. */
  preferredAmmoSource: Partial<Record<AmmoType, string | null>>;
  inventoryItems: InventoryItem[];
  level: number;
  /** Current experience points (informational; does not gate LEVEL_UP). */
  experiencePoints: number;
  /** Chosen cantrip keys (up to class cantrip count). */
  cantripPicks: string[];
  /** Known or prepared leveled spell keys (up to class spell count). */
  spellPicks: string[];
  /** Wizard spellbook keys (up to spellbook size). */
  spellbookPicks: string[];
  /** Wizard spellbook keys copied from scrolls or other spellbooks (uncapped). */
  spellbookExtraPicks: string[];
  /** Extra spellbook keys from subclass grant_spellbook_picks effects. */
  subclassSpellbookPicks: string[];
  /** Player-chosen always-prepared spells (any catalog spell; uncapped). */
  alwaysPreparedSpellPicks: string[];
  /** Remaining spell slots by spell level; missing key means at maximum. */
  spellSlotRemaining: Record<number, number>;
  /** Leveled spell key the character is concentrating on; null when none. */
  concentrationSpellKey: string | null;
  /** Remaining concentration rounds; null means full duration for the current spell. */
  concentrationRoundsRemaining: number | null;
  /** Extra spell slot maxima from Font of Magic; cleared on Long Rest. */
  createdSpellSlots: Record<number, number>;
  /** Remaining free casts for Magic Initiate 1st-level spells; missing key means at maximum. */
  featSpellUses: Record<string, number>;
  /** Remaining charges for magic items keyed by catalog key; missing key means at maximum. */
  magicItemChargeRemaining: Record<string, number>;
  /** Remaining rest-limited item ability uses; missing key means at maximum. */
  equipmentRestUsesRemaining: Record<string, number>;
  /** Armory instance id → bound spell key for Enspelled weapon/armor variants. */
  enspelledSpellPicks: Record<string, string>;
  /** Selected subclass at level 3+; null until explicitly chosen. */
  subclassKey: string | null;
  /** Skill picks from subclass grant_skill_proficiencies effects. */
  subclassSkillPicks: (SkillId | null)[];
  /** Selected options for subclass choose_feature_option effects. */
  subclassFeatureChoices: Record<string, string>;
  /** Multi-pick options for subclass choose_feature_option effects (e.g. Experimental Elixir). */
  subclassFeatureOptionPicks: Record<string, (string | null)[]>;
  /** Replacement artisan tool picks from subclass grant_tool_proficiencies effects. */
  subclassToolPicks: Record<string, (ToolId | null)[]>;
  /** Skill picks from class feature grant_skill_proficiencies effects (keyed by feature key). */
  classFeatureSkillPicks: Record<string, (SkillId | null)[]>;
  /** Selected options for base-class choose_feature_option effects (e.g. Divine Order). */
  classFeatureChoices: Record<string, string>;
  /** Multi-pick options for choose_feature_option with count > 1 (e.g. Metamagic). */
  classFeatureOptionPicks: Record<string, (string | null)[]>;
  /** Spell picks from class features (e.g. Pact of the Tome). */
  classFeatureSpellPicks: Record<string, ClassFeatureSpellPickSet>;
  /** null means no temporary hit points. */
  temporaryHitPointsMax: number | null;
  /** null means temp HP at maximum. */
  temporaryHitPointsRemaining: number | null;
  /** Death saving throw successes while at 0 HP (0–3). */
  deathSaveSuccesses: number;
  /** Death saving throw failures while at 0 HP (0–3). */
  deathSaveFailures: number;
  /** Active condition catalog keys on the Combat tab. */
  conditionKeys: string[];
  /** Remaining rounds per active condition (missing key means 0). */
  conditionRoundsRemaining: Record<string, number>;
  /** Exhaustion level while the Exhaustion condition is active (0 = none). */
  exhaustionLevel: number;
  /** Remaining Heroic Inspiration uses (0–1). */
  heroicInspiration: number;
  /** Known Wild Shape beast form keys (up to four at Druid level 2+). */
  wildShapeKnownForms: string[];
  /** Active Wild Shape form key while shape-shifted. */
  wildShapeActiveFormKey: string | null;
  /** Tracked companion and summon creatures on the Companions tab. */
  trackedCreatures: TrackedCreatureInstance[];
  /** Known Replicate Magic Item plans (Artificer level 2+). */
  artificerPlanKeys: string[];
  /** Magic items created from known plans (subset of artificerPlanKeys). */
  artificerCreatedItemKeys: string[];
  /** Attuned magic item catalog keys (up to three). */
  attunedMagicItemKeys: string[];
  /** Equipment description pins shown on the Actions tab (`gear:` / `armory:` keys). */
  equipmentActionKeys: string[];
  /** Catalog adventuring gear with per-item quantity. */
  adventuringGear: AdventuringGearEntry[];
  /** Class taken at each character level (length matches level when set). */
  levelPath: string[];
  /** Subclass per class key; replaces single subclassKey for multiclass. */
  subclassByClass: Record<string, string | null>;
  /** Remaining Pact Magic slots (Warlock); separate from spellSlotRemaining. */
  pactSlotRemaining: { count: number; slotLevel: number } | null;
  /** Remaining hit dice keyed by die size (e.g. 6, 8, 10). null value = at max for that die. */
  hitDiceRemaining: Partial<Record<number, number | null>>;
  /** Player-selected AC formula when multiple unarmored-defense options exist. */
  armorClassFormulaKey: string | null;
  /** Per-class skill picks (multiclass; keyed by classKey). */
  classSkillPicksByClass: Record<string, (SkillId | null)[]>;
  /** Per-class tool picks (multiclass; keyed by classKey). */
  classToolPicksByClass: Record<string, (ToolId | null)[]>;
  /** Per-class cantrip picks (multiclass; keyed by classKey). */
  cantripPicksByClass: Record<string, string[]>;
  /** Per-class spell picks (multiclass; keyed by classKey). */
  spellPicksByClass: Record<string, string[]>;
  /** Per-class spellbook picks (multiclass; keyed by classKey). */
  spellbookPicksByClass: Record<string, string[]>;
  /** Per-class Fighting Style feat (multiclass; keyed by classKey). */
  fightingStyleFeatKeyByClass: Record<string, string | null>;
  /** Per-class feature option choices (multiclass; keyed by classKey). */
  classFeatureChoicesByClass: Record<string, Record<string, string>>;
  /** Per-class class-granted feats by grant level (multiclass; keyed by classKey). */
  classGrantedFeatsByClass: Record<string, Record<number, string>>;
  classLevels?: { classKey: string; level: number }[];
}

export const INITIAL_CHARACTER: Character = {
  name: "",
  speciesKey: null,
  speciesLineageKey: null,
  speciesSpellcastingAbility: null,
  speciesSkillPicks: [],
  speciesToolPicks: [],
  speciesSize: null,
  speciesFeatureChoices: {},
  speciesCantripSwapAvailable: {},
  backgroundKey: null,
  customBackgroundName: "",
  backgroundSkillPicks: [],
  classKey: null,
  alignmentKey: null,
  deityKey: null,
  alignmentDescription: "",
  alignmentDescriptionTouched: false,
  backstory: "",
  languagePicks: [],
  abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  abilityScoreIncreases: { ...EMPTY_ABILITY_SCORE_INCREASES },
  abilityScoreMethod: "custom",
  classSkillPicks: [],
  backgroundToolPicks: [],
  backgroundToolsTouched: false,
  classToolPicks: [],
  classToolsTouched: false,
  proficientTools: [],
  skillConflictNotice: null,
  skills: mergeSkillProficiencies([], []),
  weapons: [],
  armor: [],
  featKey: null,
  featTouched: false,
  extraFeats: [],
  extraFeatChoices: [],
  fightingStyleFeatKey: null,
  fightingStyleFeatChoices: { ...EMPTY_FEAT_CHOICES },
  classGrantedFeats: {},
  classGrantedFeatChoices: {},
  featChoices: { ...EMPTY_FEAT_CHOICES },
  weaponMasteryPicks: [],
  weaponMasteryPicksByClass: {},
  expertiseSkillPicks: [],
  currentHitPoints: null,
  hitPointMaxBonus: 0,
  currentHitDice: null,
  classFeatureUses: {},
  classFeaturePoolRemaining: {},
  speciesFeatureUses: {},
  currency: { ...EMPTY_CURRENCY },
  ammunitionRemaining: {},
  magicAmmunition: [],
  preferredAmmoSource: {},
  inventoryItems: [],
  level: 1,
  experiencePoints: 0,
  cantripPicks: [],
  spellPicks: [],
  spellbookPicks: [],
  spellbookExtraPicks: [],
  subclassSpellbookPicks: [],
  alwaysPreparedSpellPicks: [],
  spellSlotRemaining: {},
  concentrationSpellKey: null,
  concentrationRoundsRemaining: null,
  createdSpellSlots: {},
  featSpellUses: {},
  magicItemChargeRemaining: {},
  equipmentRestUsesRemaining: {},
  enspelledSpellPicks: {},
  subclassKey: null,
  subclassSkillPicks: [],
  subclassFeatureChoices: {},
  subclassFeatureOptionPicks: {},
  subclassToolPicks: {},
  classFeatureSkillPicks: {},
  classFeatureChoices: {},
  classFeatureOptionPicks: {},
  classFeatureSpellPicks: {},
  temporaryHitPointsMax: null,
  temporaryHitPointsRemaining: null,
  deathSaveSuccesses: 0,
  deathSaveFailures: 0,
  ...initialConditionState(),
  heroicInspiration: 0,
  wildShapeKnownForms: initialWildShapeKnownForms(),
  wildShapeActiveFormKey: null,
  trackedCreatures: [],
  artificerPlanKeys: [],
  artificerCreatedItemKeys: [],
  attunedMagicItemKeys: [],
  equipmentActionKeys: [],
  adventuringGear: [],
  levelPath: [],
  subclassByClass: {},
  pactSlotRemaining: null,
  hitDiceRemaining: {},
  armorClassFormulaKey: null,
  classSkillPicksByClass: {},
  classToolPicksByClass: {},
  cantripPicksByClass: {},
  spellPicksByClass: {},
  spellbookPicksByClass: {},
  fightingStyleFeatKeyByClass: {},
  classFeatureChoicesByClass: {},
  classGrantedFeatsByClass: {},
};

export type CharacterAction =
  | { type: "LOAD_CHARACTER"; character: Character }
  | { type: "NEW_CHARACTER" }
  | { type: "CLEAR_SKILL_CONFLICT_NOTICE" }
  | { type: "SET_NAME"; value: string }
  | { type: "SET_SPECIES"; key: string | null }
  | { type: "SET_SPECIES_LINEAGE"; key: string | null }
  | { type: "SET_SPECIES_SPELLCASTING_ABILITY"; ability: AbilityId | null }
  | { type: "SET_SPECIES_SKILL_PICK"; index: number; skill: SkillId | null }
  | { type: "SET_SPECIES_TOOL_PICK"; index: number; tool: ToolId | null }
  | { type: "SET_SPECIES_SIZE"; size: SpeciesSizeChoice | null }
  | { type: "SET_SPECIES_FEATURE_CHOICE"; choiceKey: string; spellKey: string | null }
  | { type: "SET_SPECIES_FEATURE_USES"; featureKey: string; value: number }
  | { type: "SET_BACKGROUND"; key: string | null }
  | { type: "SET_CUSTOM_BACKGROUND_NAME"; value: string }
  | { type: "SET_BACKGROUND_SKILL_PICK"; index: number; skill: SkillId | null }
  | { type: "SET_FEAT"; key: string | null }
  | { type: "SET_EXTRA_FEAT"; key: string | null }
  | { type: "SET_EXTRA_FEAT_PROFICIENCY_PICK"; featIndex: number; pickIndex: number; pick: FeatProficiencyPick | null }
  | { type: "SET_EXTRA_FEAT_ABILITY_INCREASES"; featIndex: number; abilityIncreases: Partial<Record<AbilityId, number>> }
  | { type: "SET_FEAT_PROFICIENCY_PICK"; index: number; pick: FeatProficiencyPick | null }
  | { type: "SET_FEAT_ABILITY_INCREASES"; abilityIncreases: Partial<Record<AbilityId, number>> }
  | { type: "SET_FEAT_SPELLCASTING_ABILITY"; ability: AbilityId | null }
  | { type: "SET_FEAT_CANTRIP_PICK"; index: number; spellKey: string | null }
  | { type: "SET_FEAT_SPELL_PICK"; index: number; spellKey: string | null }
  | { type: "SET_FEAT_DAMAGE_TYPE"; damageType: string | null }
  | { type: "SET_FEAT_WEAPON_MASTERY_PICK"; weaponKey: string | null }
  | { type: "SET_EXTRA_FEAT_SPELLCASTING_ABILITY"; featIndex: number; ability: AbilityId | null }
  | { type: "SET_EXTRA_FEAT_CANTRIP_PICK"; featIndex: number; pickIndex: number; spellKey: string | null }
  | { type: "SET_EXTRA_FEAT_SPELL_PICK"; featIndex: number; pickIndex: number; spellKey: string | null }
  | { type: "SET_EXTRA_FEAT_DAMAGE_TYPE"; featIndex: number; damageType: string | null }
  | { type: "SET_EXTRA_FEAT_WEAPON_MASTERY_PICK"; featIndex: number; weaponKey: string | null }
  | { type: "SET_FEAT_SPELL_USES"; featKey: string; value: number }
  | { type: "SET_FIGHTING_STYLE_FEAT"; key: string | null }
  | { type: "SET_FIGHTING_STYLE_FEAT_SPELLCASTING_ABILITY"; ability: AbilityId | null }
  | { type: "SET_FIGHTING_STYLE_FEAT_CANTRIP_PICK"; index: number; spellKey: string | null }
  | { type: "SET_FIGHTING_STYLE_FEAT_DAMAGE_TYPE"; damageType: string | null }
  | { type: "SET_FIGHTING_STYLE_FEAT_WEAPON_MASTERY_PICK"; weaponKey: string | null }
  | { type: "SET_CLASS_GRANTED_FEAT"; level: number; key: string | null }
  | {
      type: "SET_CLASS_GRANTED_FEAT_PROFICIENCY_PICK";
      level: number;
      pickIndex: number;
      pick: FeatProficiencyPick | null;
    }
  | {
      type: "SET_CLASS_GRANTED_FEAT_ABILITY_INCREASES";
      level: number;
      abilityIncreases: Partial<Record<AbilityId, number>>;
    }
  | { type: "SET_CLASS_GRANTED_FEAT_SPELLCASTING_ABILITY"; level: number; ability: AbilityId | null }
  | { type: "SET_CLASS_GRANTED_FEAT_CANTRIP_PICK"; level: number; pickIndex: number; spellKey: string | null }
  | { type: "SET_CLASS_GRANTED_FEAT_SPELL_PICK"; level: number; pickIndex: number; spellKey: string | null }
  | { type: "SET_CLASS_GRANTED_FEAT_DAMAGE_TYPE"; level: number; damageType: string | null }
  | { type: "SET_CLASS_GRANTED_FEAT_WEAPON_MASTERY_PICK"; level: number; weaponKey: string | null }
  | { type: "SET_CLASS"; key: string | null }
  | { type: "LEVEL_UP" }
  | { type: "LEVEL_UP_CLASS"; classKey: string }
  | { type: "CHANGE_LAST_LEVEL_CLASS"; classKey: string }
  | { type: "REVERT_LAST_LEVEL" }
  | { type: "SET_EXPERIENCE_POINTS"; value: number }
  | { type: "SET_SUBCLASS"; key: string | null; classKey?: string }
  | { type: "SET_SUBCLASS_SKILL_PICK"; index: number; skill: SkillId | null }
  | { type: "SET_SUBCLASS_FEATURE_CHOICE"; choiceKey: string; optionKey: string | null }
  | { type: "SET_SUBCLASS_FEATURE_OPTION_PICK"; choiceKey: string; index: number; optionKey: string | null }
  | { type: "SET_SUBCLASS_TOOL_PICK"; featureKey: string; index: number; tool: ToolId | null }
  | { type: "SET_CLASS_FEATURE_SKILL_PICK"; featureKey: string; index: number; skill: SkillId | null }
  | { type: "SET_CLASS_FEATURE_CHOICE"; choiceKey: string; optionKey: string | null }
  | { type: "SET_CLASS_FEATURE_OPTION_PICK"; choiceKey: string; index: number; optionKey: string | null }
  | {
      type: "SET_CLASS_FEATURE_SPELL_PICK";
      featureKey: string;
      kind: "cantrip" | "ritual";
      index: number;
      spellKey: string | null;
    }
  | { type: "SET_TEMPORARY_HIT_POINTS"; max: number | null; remaining?: number | null }
  | { type: "APPLY_TEMPORARY_HIT_POINTS_GRANT"; amount: number }
  | { type: "APPLY_HIT_POINT_MAX_BONUS"; amount: number }
  | { type: "CLEAR_HIT_POINT_MAX_BONUS" }
  | { type: "APPLY_DAMAGE"; amount: number }
  | { type: "SET_BACKGROUND_TOOL_PICK"; index: number; tool: ToolId | null }
  | { type: "SET_CLASS_TOOL_PICK"; index: number; tool: ToolId | null }
  | { type: "SET_WEAPON_MASTERY_PICK"; classKey: string; index: number; weaponKey: string | null }
  | { type: "SET_EXPERTISE_SKILL_PICK"; index: number; skill: SkillId | null }
  | { type: "SET_BACKSTORY"; value: string }
  | { type: "ADD_LANGUAGE_PICK"; languageKey: string }
  | { type: "REMOVE_LANGUAGE_PICK"; languageKey: string }
  | { type: "SET_ALIGNMENT"; key: string | null; defaultDescription: string }
  | { type: "SET_DEITY"; key: string | null }
  | { type: "SET_ALIGNMENT_DESCRIPTION"; value: string }
  | { type: "SET_ABILITY_SCORE"; ability: AbilityId; value: number }
  | { type: "SET_ABILITY_SCORE_INCREASES"; abilityScoreIncreases: Partial<Record<AbilityId, number>> }
  | { type: "SET_ABILITY_SCORE_METHOD"; method: AbilityScoreMethod }
  | { type: "SET_CLASS_SKILL_PICK"; index: number; skill: SkillId | null }
  | { type: "SET_CLASS_SKILL_PICK_BY_CLASS"; classKey: string; index: number; skill: SkillId | null }
  | { type: "ADD_WEAPON"; key: string; id: string; quantity?: number; variantKey?: string }
  | { type: "REMOVE_WEAPON"; id: string }
  | { type: "SET_WEAPON_ATTUNED"; id: string; attuned: boolean }
  | { type: "SET_WEAPON_QUANTITY"; id: string; value: number }
  | { type: "ADD_AMMUNITION_PACK"; ammoType: AmmoType }
  | { type: "SET_AMMUNITION_REMAINING"; ammoType: AmmoType; value: number }
  | { type: "ADD_MAGIC_AMMUNITION_PACK"; id: string; ammoType: AmmoType; variantKey: string }
  | { type: "REMOVE_MAGIC_AMMUNITION"; id: string }
  | { type: "SET_MAGIC_AMMUNITION_REMAINING"; id: string; value: number }
  | { type: "SET_PREFERRED_AMMO_SOURCE"; ammoType: AmmoType; magicStackId: string | null }
  | { type: "ADD_ARMOR"; key: string; id: string; variantKey?: string }
  | { type: "REMOVE_ARMOR"; id: string }
  | { type: "SET_ARMOR_ATTUNED"; id: string; attuned: boolean }
  | { type: "SET_ENSPELLED_SPELL"; instanceId: string; spellKey: string | null }
  | { type: "SET_ARMOR_WORN"; id: string; worn: boolean }
  | { type: "SET_CURRENT_HIT_POINTS"; value: number }
  | { type: "SET_DEATH_SAVES"; successes?: number; failures?: number }
  | { type: "ADD_CONDITION"; conditionKey: string }
  | { type: "REMOVE_CONDITION"; conditionKey: string }
  | { type: "SET_CONDITION_ROUNDS"; conditionKey: string; value: number }
  | { type: "SET_EXHAUSTION_LEVEL"; value: number }
  | { type: "SET_HEROIC_INSPIRATION"; value: number }
  | { type: "SET_CURRENT_HIT_DICE"; value: number }
  | { type: "SET_HIT_DICE_REMAINING"; die: number; value: number }
  | { type: "ADD_CANTRIP_PICK"; spellKey: string }
  | { type: "REMOVE_CANTRIP_PICK"; spellKey: string }
  | { type: "ADD_SPELL_PICK"; spellKey: string }
  | { type: "REMOVE_SPELL_PICK"; spellKey: string }
  | { type: "ADD_SPELLBOOK_PICK"; spellKey: string }
  | { type: "REMOVE_SPELLBOOK_PICK"; spellKey: string }
  | { type: "ADD_SPELLBOOK_EXTRA_PICK"; spellKey: string }
  | { type: "REMOVE_SPELLBOOK_EXTRA_PICK"; spellKey: string }
  | { type: "ADD_ALWAYS_PREPARED_SPELL_PICK"; spellKey: string }
  | { type: "REMOVE_ALWAYS_PREPARED_SPELL_PICK"; spellKey: string }
  | { type: "ADD_SUBCLASS_SPELLBOOK_PICK"; spellKey: string }
  | { type: "REMOVE_SUBCLASS_SPELLBOOK_PICK"; spellKey: string }
  | { type: "SET_SPELL_SLOT_REMAINING"; spellLevel: number; value: number }
  | { type: "SET_CONCENTRATION_SPELL"; spellKey: string | null }
  | { type: "SET_CONCENTRATION_ROUNDS"; value: number }
  | { type: "SET_PACT_SLOT_REMAINING"; count: number; slotLevel: number }
  | { type: "ADD_CLASS_SPELL_PICK"; classKey: string; spellKey: string }
  | { type: "REMOVE_CLASS_SPELL_PICK"; classKey: string; spellKey: string }
  | { type: "ADD_CLASS_CANTRIP_PICK"; classKey: string; spellKey: string }
  | { type: "REMOVE_CLASS_CANTRIP_PICK"; classKey: string; spellKey: string }
  | { type: "ADD_CLASS_SPELLBOOK_PICK"; classKey: string; spellKey: string }
  | { type: "REMOVE_CLASS_SPELLBOOK_PICK"; classKey: string; spellKey: string }
  | { type: "CREATE_SPELL_SLOT_FROM_SORCERY"; spellLevel: number }
  | { type: "CONVERT_SPELL_SLOT_TO_SORCERY"; spellLevel: number }
  | { type: "SET_CLASS_FEATURE_USES"; featureKey: string; value: number }
  | { type: "SET_CLASS_FEATURE_POOL_REMAINING"; featureKey: string; value: number }
  | { type: "ADD_WILD_SHAPE_KNOWN_FORM"; formKey: string }
  | { type: "REMOVE_WILD_SHAPE_KNOWN_FORM"; formKey: string }
  | { type: "ADD_ARTIFICER_PLAN"; planKey: string }
  | { type: "REMOVE_ARTIFICER_PLAN"; planKey: string }
  | { type: "ADD_ARTIFICER_CREATED_ITEM"; planKey: string }
  | { type: "REMOVE_ARTIFICER_CREATED_ITEM"; planKey: string }
  | { type: "ADD_ATTUNED_MAGIC_ITEM"; itemKey: string }
  | { type: "REMOVE_ATTUNED_MAGIC_ITEM"; itemKey: string }
  | { type: "ADD_ADVENTURING_GEAR"; itemKey: string }
  | { type: "REMOVE_ADVENTURING_GEAR"; itemKey: string }
  | { type: "SET_ADVENTURING_GEAR_QUANTITY"; itemKey: string; value: number }
  | { type: "SET_MAGIC_ITEM_CHARGE_REMAINING"; itemKey: string; value: number }
  | { type: "SET_EQUIPMENT_REST_USES"; storageKey: string; value: number }
  | { type: "SET_PACK_CONTENT_REMAINING"; packKey: string; itemKey: string; value: number }
  | { type: "ENTER_WILD_SHAPE"; formKey: string }
  | { type: "EXIT_WILD_SHAPE" }
  | { type: "SET_TRACKED_CREATURE_FORM"; id: string; formKey: string | null }
  | { type: "SET_TRACKED_CREATURE_SPIRIT_TYPE"; id: string; spiritType: SpiritType }
  | { type: "SET_TRACKED_CREATURE_CAST_SLOT_LEVEL"; id: string; castSlotLevel: number }
  | { type: "SET_TRACKED_CREATURE_CURRENT_HP"; id: string; value: number }
  | { type: "SET_TRACKED_CREATURE_TEMP_HP"; id: string; max: number | null; remaining?: number | null }
  | { type: "SET_TRACKED_CREATURE_FEATURE_USE"; id: string; useKey: string; value: number }
  | { type: "DISMISS_TRACKED_CREATURE"; id: string }
  | { type: "RECALL_TRACKED_CREATURE"; id: string }
  | { type: "SET_TRACKED_CREATURE_SUMMONED"; id: string; summoned: boolean; payment?: CompanionSummonPayment }
  | { type: "APPLY_REST"; kind: "short" | "long" }
  | { type: "SET_CURRENCY"; denomination: CurrencyDenomination; value: number }
  | { type: "ADD_INVENTORY_ITEM"; id: string; name: string; weightLb: number; cost: ItemCost }
  | { type: "REMOVE_INVENTORY_ITEM"; id: string }
  | { type: "ADD_EQUIPMENT_ACTION"; actionKey: string }
  | { type: "REMOVE_EQUIPMENT_ACTION"; actionKey: string };

function isShield(key: string): boolean {
  return key === "shield";
}

function optionalVariantKey(variantKey: string | undefined): { variantKey?: string } {
  return variantKey ? { variantKey } : {};
}

function optionalAttuned(attuned: boolean): { attuned?: boolean } {
  return attuned ? { attuned: true } : {};
}

function variantPairRejected(
  kind: "weapon" | "armor",
  itemKey: string,
  variantKey: string | undefined,
): boolean {
  if (!variantKey) return false;
  const variant = findGenericVariant(variantKey);
  if (!variant) return false;
  if (kind === "weapon") {
    const weapon = findByKey(WEAPONS, itemKey);
    if (!weapon) return false;
    return !variantMatchesWeapon(variant, weapon);
  }
  const armor = findByKey(ARMOR, itemKey);
  if (!armor) return false;
  return !variantMatchesArmor(variant, armor);
}

function stripAttuned<T extends { attuned?: boolean }>(piece: T): T {
  const { attuned: _attuned, ...rest } = piece;
  return rest as T;
}

function normalizeWeaponQuantity(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 1;
}

function weaponQuantityValue(weapon: CharacterWeapon): number {
  return normalizeWeaponQuantity(weapon.quantity ?? 1);
}

function normalizeAmmunitionRemaining(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function ammunitionRemainingValue(
  remaining: Partial<Record<AmmoType, number>> | undefined,
  type: AmmoType,
): number {
  return normalizeAmmunitionRemaining(remaining?.[type] ?? 0);
}

function normalizeMagicAmmoRemaining(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function clearPreferredAmmoSourceForStack(
  preferred: Partial<Record<AmmoType, string | null>>,
  stackId: string,
): Partial<Record<AmmoType, string | null>> {
  const next = { ...preferred };
  for (const [type, preferredId] of Object.entries(next) as [AmmoType, string | null | undefined][]) {
    if (preferredId === stackId) delete next[type];
  }
  return next;
}

function ammunitionPackSize(type: AmmoType): number {
  return AMMUNITION_STATS[type].packSize;
}

function backgroundSkillIds(
  character: Pick<Character, "backgroundKey" | "backgroundSkillPicks">,
): SkillId[] {
  return backgroundSkillIdsForCharacter(character);
}

function otherProficientSkillIds(
  state: Character,
  exclude: {
    classPicks?: boolean;
    excludeMulticlassClassKey?: string;
    backgroundSkillPicks?: boolean;
    speciesPicks?: boolean;
    featPicks?: boolean;
    subclassPicks?: boolean;
    classFeaturePicks?: boolean;
    classFeatureKey?: string;
  } = {},
): SkillId[] {
  const backgroundSkills = exclude.backgroundSkillPicks
    ? backgroundSkillIds({ ...state, backgroundSkillPicks: [] })
    : backgroundSkillIds(state);
  const classPicks = exclude.classPicks
    ? mergedClassSkillPickSlots(
        [],
        exclude.excludeMulticlassClassKey
          ? Object.fromEntries(
              Object.entries(state.classSkillPicksByClass).filter(
                ([classKey]) => classKey !== exclude.excludeMulticlassClassKey,
              ),
            )
          : state.classSkillPicksByClass,
      )
    : mergedClassSkillPickSlots(state.classSkillPicks, state.classSkillPicksByClass);
  const featPicks = exclude.featPicks ? [] : allFeatSkillPicksForCharacter(state);
  const speciesPicks = exclude.speciesPicks ? [] : state.speciesSkillPicks;
  const subclassPicks = exclude.subclassPicks ? [] : state.subclassSkillPicks;
  let classFeaturePicks: (SkillId | null)[];
  if (exclude.classFeatureKey) {
    classFeaturePicks = Object.entries(state.classFeatureSkillPicks)
      .filter(([key]) => key !== exclude.classFeatureKey)
      .flatMap(([, picks]) => picks);
  } else if (exclude.classFeaturePicks) {
    classFeaturePicks = [];
  } else {
    classFeaturePicks = flattenClassFeatureSkillPicks(state.classFeatureSkillPicks);
  }
  return proficientSkillIds(backgroundSkills, classPicks, featPicks, speciesPicks, subclassPicks, classFeaturePicks);
}

function takenSkillsForMulticlassClassPicks(
  state: Character,
  classKey: string,
  slotIndex: number,
): SkillId[] {
  const picks = state.classSkillPicksByClass[classKey] ?? [];
  return collectTakenSkills(
    otherProficientSkillIds(state, { classPicks: true, excludeMulticlassClassKey: classKey }),
    picks,
    slotIndex,
  );
}

function takenSkillsForClassPicks(state: Character, slotIndex: number): SkillId[] {
  return collectTakenSkills(otherProficientSkillIds(state, { classPicks: true }), state.classSkillPicks, slotIndex);
}

function takenSkillsForClassRetain(state: Character): SkillId[] {
  return otherProficientSkillIds(state, { classPicks: true });
}

function takenSkillsForBackgroundPicks(state: Character, slotIndex: number): SkillId[] {
  return collectTakenSkills(
    otherProficientSkillIds(state, { backgroundSkillPicks: true }),
    state.backgroundSkillPicks,
    slotIndex,
  );
}

function takenSkillsForSpeciesPicks(state: Character, slotIndex: number): SkillId[] {
  return collectTakenSkills(otherProficientSkillIds(state, { speciesPicks: true }), state.speciesSkillPicks, slotIndex);
}

function takenSkillsForSpeciesRetain(state: Character): SkillId[] {
  return otherProficientSkillIds(state, { speciesPicks: true });
}

function takenSkillsForFeatProficiencyPicks(
  state: Character,
  proficiencyPicks: readonly (FeatProficiencyPick | null)[],
  slotIndex: number,
): SkillId[] {
  const taken = otherProficientSkillIds(state, { featPicks: true });
  proficiencyPicks.forEach((pick, index) => {
    if (pick?.kind === "skill" && index !== slotIndex && !taken.includes(pick.id)) {
      taken.push(pick.id);
    }
  });
  return taken;
}

function takenToolsForFeatProficiencyPicks(
  proficiencyPicks: readonly (FeatProficiencyPick | null)[],
  slotIndex: number,
): ToolId[] {
  const taken: ToolId[] = [];
  proficiencyPicks.forEach((pick, index) => {
    if (pick?.kind === "tool" && index !== slotIndex) taken.push(pick.id);
  });
  return taken;
}

function featProficiencyOptionContext(state: Character, featKey: string): FeatProficiencyOptionContext {
  const proficientSkills = (Object.entries(state.skills) as [SkillId, "none" | "proficient" | "expert"][])
    .filter(([, skillState]) => skillState === "proficient" || skillState === "expert")
    .map(([skillId]) => skillId);
  const expertSkills = (Object.entries(state.skills) as [SkillId, "none" | "proficient" | "expert"][])
    .filter(([, skillState]) => skillState === "expert")
    .map(([skillId]) => skillId);
  return { featKey, proficientSkills, expertSkills };
}

function takenExpertSkillsForExpertisePicks(state: Character, slotIndex: number): SkillId[] {
  const taken: SkillId[] = [];
  state.expertiseSkillPicks.forEach((pick, index) => {
    if (pick && index !== slotIndex && !taken.includes(pick)) taken.push(pick);
  });
  return taken;
}

function backgroundDataFor(character: Pick<Character, "backgroundKey" | "customBackgroundName" | "backgroundSkillPicks">) {
  return resolveBackgroundData(character);
}

function classDataFor(key: string | null) {
  return findByKey(CLASSES, key);
}

function allFeatProficiencyPickValues(state: Character): (FeatProficiencyPick | null)[] {
  return allFeatProficiencyPicksForCharacter(state);
}

function featExpertisePicksForState(state: Character): (SkillId | null)[] {
  return [
    ...state.expertiseSkillPicks,
    ...featExpertiseSkillIds(
      activeFeatKeys(state),
      featChoicesResolver(state),
      derivedAbilityScores(state.abilityScores, state.abilityScoreIncreases),
    ),
  ];
}

function mergedProficientToolsFor(
  backgroundToolPicks: readonly (ToolId | null)[],
  classToolPicks: readonly (ToolId | null)[],
  featProficiencyPicks: readonly (FeatProficiencyPick | null)[],
  speciesToolPicks: readonly (ToolId | null)[] = [],
  subclassFixedTools: readonly ToolId[] = [],
  subclassToolPicks: readonly (ToolId | null)[] = [],
  featFixedTools: readonly ToolId[] = [],
): ToolId[] {
  return mergeProficientTools(
    backgroundToolPicks,
    classToolPicks,
    featProficiencyPicks,
    speciesToolPicks,
    subclassFixedTools,
    subclassToolPicks,
    featFixedTools,
  );
}

function toolsBeforeSubclassGrants(state: Character): ToolId[] {
  return mergeProficientTools(
    state.backgroundToolPicks,
    state.classToolPicks,
    allFeatProficiencyPickValues(state),
    state.speciesToolPicks,
  );
}

function flattenSubclassToolPicks(subclassToolPicks: Record<string, (ToolId | null)[]>): (ToolId | null)[] {
  return Object.values(subclassToolPicks).flat();
}

function otherSubclassGrantToolPicks(
  subclassToolPicks: Record<string, (ToolId | null)[]>,
  exceptFeatureKey: string,
): ToolId[] {
  return Object.entries(subclassToolPicks)
    .filter(([featureKey]) => featureKey !== exceptFeatureKey)
    .flatMap(([, picks]) => picks)
    .filter((pick): pick is ToolId => pick != null);
}

function subclassToolPicksForState(state: Character): Record<string, (ToolId | null)[]> {
  const subclass = findSubclass(state.classKey, state.subclassKey);
  if (!subclass || state.level < 3) return {};
  const beforeSubclass = toolsBeforeSubclassGrants(state);
  const next: Record<string, (ToolId | null)[]> = {};
  for (const grant of subclassToolGrants(subclass)) {
    const count = subclassToolChooseCount(grant, beforeSubclass);
    if (count <= 0) continue;
    const options = subclassToolPickOptions(grant);
    const taken = [...beforeSubclass, ...otherSubclassGrantToolPicks(state.subclassToolPicks, grant.featureKey)];
    next[grant.featureKey] = retainValidToolPicks(
      state.subclassToolPicks[grant.featureKey] ??
        initialSubclassToolPicks(subclass, beforeSubclass)[grant.featureKey] ??
        [],
      count,
      options,
      taken,
    );
  }
  return next;
}

function mergedProficientToolsForCharacter(state: Character): ToolId[] {
  const subclass = findSubclass(state.classKey, state.subclassKey);
  return mergedProficientToolsFor(
    state.backgroundToolPicks,
    state.classToolPicks,
    allFeatProficiencyPickValues(state),
    state.speciesToolPicks,
    state.level >= 3 ? subclassFixedTools(subclass) : [],
    state.level >= 3 ? flattenSubclassToolPicks(subclassToolPicksForState(state)) : [],
    featFixedToolIds(activeFeatKeys(state)),
  );
}

function otherTakenToolsInSource(
  picks: readonly (ToolId | null)[],
  slotIndex: number,
  featProficiencyPicks: readonly (FeatProficiencyPick | null)[],
): ToolId[] {
  const taken: ToolId[] = [];
  picks.forEach((pick, index) => {
    if (pick && index !== slotIndex) taken.push(pick);
  });
  for (const pick of featProficiencyPicks) {
    if (pick?.kind === "tool") taken.push(pick.id);
  }
  return taken;
}

function retainBackgroundToolPicksForBackground(
  state: Character,
  backgroundKey: string | null,
): (ToolId | null)[] {
  const background = resolveBackgroundData({ ...state, backgroundKey });
  const count = backgroundToolSlotCount(background);
  if (count === 0) return [];
  if (isCustomBackground(backgroundKey)) {
    if (state.backgroundToolsTouched) {
      const taken = [
        ...state.classToolPicks.filter((pick): pick is ToolId => pick != null),
        ...allFeatProficiencyPickValues(state)
          .filter((pick): pick is Extract<FeatProficiencyPick, { kind: "tool" }> => pick?.kind === "tool")
          .map((pick) => pick.id),
      ];
      return retainValidToolPicks(state.backgroundToolPicks, count, ALL_TOOL_OPTIONS, taken);
    }
    return initialToolPicks(count);
  }
  if (!state.backgroundToolsTouched) return suggestedBackgroundTools(background);
  const taken = [
    ...state.classToolPicks.filter((pick): pick is ToolId => pick != null),
    ...allFeatProficiencyPickValues(state)
      .filter((pick): pick is Extract<FeatProficiencyPick, { kind: "tool" }> => pick?.kind === "tool")
      .map((pick) => pick.id),
  ];
  return retainValidToolPicks(state.backgroundToolPicks, count, backgroundToolOptions(background), taken);
}

function retainClassToolPicksForClass(
  state: Character,
  classKey: string | null,
): (ToolId | null)[] {
  const classData = classDataFor(classKey);
  const count = classToolSlotCount(classData);
  if (count === 0) return [];
  if (!state.classToolsTouched) return suggestedClassTools(classData);
  const taken = [
    ...state.backgroundToolPicks.filter((pick): pick is ToolId => pick != null),
    ...allFeatProficiencyPickValues(state)
      .filter((pick): pick is Extract<FeatProficiencyPick, { kind: "tool" }> => pick?.kind === "tool")
      .map((pick) => pick.id),
  ];
  return retainValidToolPicks(state.classToolPicks, count, classToolOptions(classData), taken);
}

function withClassStandardArray(state: Character): Character {
  if (state.abilityScoreMethod !== "standardArray") return state;
  const abilityScores = standardArrayForClass(state.classKey);
  if (!abilityScores) return state;
  return { ...state, abilityScores };
}

function withPointBuyScores(state: Character): Character {
  if (state.abilityScoreMethod !== "pointBuy") return state;
  return { ...state, abilityScores: clampPointBuyScores(state.abilityScores) };
}

function withAbilityScoreMethod(state: Character): Character {
  return withPointBuyScores(withClassStandardArray(state));
}

function suggestedFeatKey(
  character: Pick<Character, "backgroundKey" | "customBackgroundName" | "backgroundSkillPicks">,
): string | null {
  return resolveBackgroundData(character)?.featKey ?? null;
}

function activeFeatKeys(state: Character): string[] {
  return activeFeatKeysFromSlots(activeFeatSlots(state));
}

export function activeFeatKeysFromCharacter(state: Character): string[] {
  return activeFeatKeys(state);
}

function retainClassGrantedFeatsForLevel(
  state: Character,
  level: number,
): Pick<Character, "classGrantedFeats" | "classGrantedFeatChoices"> {
  const classData = findByKey(CLASSES, state.classKey);
  const grantLevels = classFeatGrantLevels(classData, level);
  const classGrantedFeats: Record<number, string> = {};
  const classGrantedFeatChoices: Record<number, FeatChoices> = {};
  for (const grantLevel of grantLevels) {
    const featKey = state.classGrantedFeats[grantLevel];
    if (!featKey) continue;
    classGrantedFeats[grantLevel] = featKey;
    classGrantedFeatChoices[grantLevel] =
      state.classGrantedFeatChoices[grantLevel] ?? initialFeatChoicesForFeat(featKey);
  }
  return { classGrantedFeats, classGrantedFeatChoices };
}

function flattenClassFeatureSkillPicks(picks: Record<string, (SkillId | null)[]>): (SkillId | null)[] {
  return Object.values(picks).flat();
}

function subclassFixedSkillsFor(state: Character): SkillId[] {
  if (state.level < 3) return [];
  return subclassFixedSkills(findSubclass(state.classKey, state.subclassKey));
}

function proficientSkillsFor(state: Character): SkillId[] {
  return proficientSkillIds(
    backgroundSkillIds(state),
    mergedClassSkillPickSlots(state.classSkillPicks, state.classSkillPicksByClass),
    allFeatSkillPicksForCharacter(state),
    state.speciesSkillPicks,
    state.subclassSkillPicks,
    flattenClassFeatureSkillPicks(state.classFeatureSkillPicks),
    subclassFixedSkillsFor(state),
  );
}

function takenSkillsForSubclassPicks(state: Character, slotIndex: number): SkillId[] {
  const taken: SkillId[] = [...proficientSkillsFor(state)];
  state.subclassSkillPicks.forEach((pick, index) => {
    if (pick && index !== slotIndex && !taken.includes(pick)) taken.push(pick);
  });
  return taken;
}

function retainClassFeatureSkillPicksForLevel(state: Character, level: number): Record<string, (SkillId | null)[]> {
  if (level < 3) return {};
  const classData = findByKey(CLASSES, state.classKey);
  if (!classData) return {};
  const grants = classFeatureSkillGrants(classData, level);
  if (grants.length === 0) return {};

  const takenWithoutClassFeaturePicks = proficientSkillIds(
    backgroundSkillIds(state),
    mergedClassSkillPickSlots(state.classSkillPicks, state.classSkillPicksByClass),
    allFeatSkillPicksForCharacter(state),
    state.speciesSkillPicks,
    state.subclassSkillPicks,
  );

  const next: Record<string, (SkillId | null)[]> = {};
  for (const grant of grants) {
    const current =
      state.classFeatureSkillPicks[grant.featureKey]?.length === grant.count
        ? state.classFeatureSkillPicks[grant.featureKey]
        : initialClassFeatureSkillPicks(classData, level)[grant.featureKey] ?? Array.from({ length: grant.count }, () => null);
    next[grant.featureKey] = retainValidSubclassSkillPicks(current, grant.count, takenWithoutClassFeaturePicks);
  }
  return next;
}

function retainClassFeatureOptionPicksForLevel(
  state: Character,
  level: number,
): Record<string, (string | null)[]> {
  const classData = findByKey(CLASSES, state.classKey);
  if (!classData) return {};
  const initial = initialClassFeatureOptionPicks(classData, level);
  if (Object.keys(initial).length === 0) return {};

  const next: Record<string, (string | null)[]> = {};
  for (const [choiceKey, slots] of Object.entries(initial)) {
    const current = state.classFeatureOptionPicks[choiceKey] ?? [];
    const normalized = Array.from({ length: slots.length }, (_, index) => current[index] ?? null);
    next[choiceKey] = normalized.map((pick, index) =>
      isValidClassFeatureOptionPick(classData, choiceKey, level, normalized, index, pick) ? pick : null,
    );
  }
  return next;
}

function hasPactOfTheTomeSelected(state: Character): boolean {
  const classData = findByKey(CLASSES, state.classKey);
  if (!classData) return false;
  return selectedClassFeatureOptionPicks(
    classData,
    "eldritch-invocations",
    state.level,
    state.classFeatureOptionPicks,
  ).some((option) => option.key === PACT_OF_THE_TOME_KEY);
}

function retainClassFeatureSpellPicks(state: Character): Record<string, ClassFeatureSpellPickSet> {
  if (!hasPactOfTheTomeSelected(state)) return {};
  const current = state.classFeatureSpellPicks[PACT_OF_THE_TOME_SPELL_PICKS_KEY] ?? initialPactOfTheTomeSpellPicks();
  return { [PACT_OF_THE_TOME_SPELL_PICKS_KEY]: current };
}

function takenSkillsForClassFeaturePicks(state: Character, featureKey: string, slotIndex: number): SkillId[] {
  const withoutFeature: Character = {
    ...state,
    classFeatureSkillPicks: {
      ...state.classFeatureSkillPicks,
      [featureKey]: [],
    },
  };
  const taken: SkillId[] = [...proficientSkillsFor(withoutFeature)];
  const picks = state.classFeatureSkillPicks[featureKey] ?? [];
  picks.forEach((pick, index) => {
    if (pick && index !== slotIndex && !taken.includes(pick)) taken.push(pick);
  });
  return taken;
}

function retainSubclassStateForLevel(
  state: Character,
  level: number,
): Pick<
  Character,
  | "subclassKey"
  | "subclassSkillPicks"
  | "subclassFeatureChoices"
  | "subclassFeatureOptionPicks"
  | "subclassToolPicks"
  | "subclassSpellbookPicks"
> {
  if (level < 3) return clearSubclassState();
  const subclass = findSubclass(state.classKey, state.subclassKey);
  if (!subclass) {
    return {
      subclassKey: state.subclassKey,
      subclassSkillPicks: [],
      subclassFeatureChoices: {},
      subclassFeatureOptionPicks: {},
      subclassToolPicks: {},
      subclassSpellbookPicks: [],
    };
  }
  const skillCount = subclassSkillProficiencyCount(subclass);
  const choiceKeys = subclassFeatureChoiceKeys(subclass);
  const subclassFeatureChoices = Object.fromEntries(
    choiceKeys
      .filter((key) => state.subclassFeatureChoices[key] != null)
      .map((key) => [key, state.subclassFeatureChoices[key]!]),
  );
  const optionPickKeys = subclassFeatureOptionPickGrants(subclass, level).map((grant) => grant.choiceKey);
  const subclassFeatureOptionPicks = Object.fromEntries(
    optionPickKeys.map((choiceKey) => {
      const count = subclassFeatureOptionPickCount(subclass, choiceKey, level);
      const current =
        state.subclassFeatureOptionPicks[choiceKey]?.length === count
          ? state.subclassFeatureOptionPicks[choiceKey]!
          : Array.from({ length: count }, () => null);
      return [choiceKey, current];
    }),
  );
  const pickCount = subclassSpellbookPickCount(subclass, level);
  const subclassSpellbookPicks = retainValidCompactSpellPicks(
    state.subclassSpellbookPicks,
    pickCount,
    subclassSpellbookPickOptionsForState(state, subclass),
  );
  return {
    subclassKey: state.subclassKey,
    subclassSkillPicks: retainValidSubclassSkillPicks(state.subclassSkillPicks, skillCount, proficientSkillsFor({
      ...state,
      subclassSkillPicks: [],
    })),
    subclassFeatureChoices,
    subclassFeatureOptionPicks,
    subclassToolPicks: subclassToolPicksForState({ ...state, level }),
    subclassSpellbookPicks,
  };
}

function subclassSpellbookPickOptionsForState(state: Character, subclass: ReturnType<typeof findSubclass>): string[] {
  if (!subclass || !state.classKey) return [];
  const grants = subclassSpellbookPickGrants(subclass, state.level);
  if (grants.length === 0) return [];
  const allowed = new Set<string>();
  for (const grant of grants) {
    for (const key of subclassSpellbookPickOptions(
      state.classKey,
      grant.school,
      grant.maxSpellLevel,
      state.level,
    )) {
      allowed.add(key);
    }
  }
  return [...allowed];
}

function featChoicesResolver(state: Character): (featKey: string, slotIndex?: number) => FeatChoices {
  const slots = activeFeatSlots(state);
  return (featKey, slotIndex) => {
    if (slotIndex != null && slots[slotIndex]?.featKey === featKey) {
      return featChoicesForSlot(state, slots[slotIndex]!.source);
    }
    return featChoicesForKey(
      featKey,
      state.featKey,
      state.featChoices,
      state.extraFeats,
      state.extraFeatChoices,
      state.fightingStyleFeatKey,
      state.fightingStyleFeatChoices,
      state.classGrantedFeats,
      state.classGrantedFeatChoices,
    );
  };
}

function maxFeatUsesForStorageKey(state: Character, storageKey: string): number | null {
  const spellTrackers = buildFeatSpellUseTrackers({
    activeFeatKeys: activeFeatKeys(state),
    featChoicesFor: featChoicesResolver(state),
  });
  const spellTracker = spellTrackers.find((entry) => entry.storageKey === storageKey);
  if (spellTracker) return spellTracker.maxUses;

  const useTrackers = buildFeatUseTrackers({
    activeFeatKeys: activeFeatKeys(state),
    proficiencyBonus: proficiencyBonusForLevel(state.level),
    abilityModifiers: derivedAbilityModifiers(state),
  });
  const useTracker = useTrackers.find((entry) => entry.featKey === storageKey);
  if (useTracker) return useTracker.maxUses;
  return armoryChargeMaxForStorageKey(storageKey, state.weapons, state.armor);
}

function pruneFeatSpellUses(state: Character): Record<string, number> {
  const spellTrackers = buildFeatSpellUseTrackers({
    activeFeatKeys: activeFeatKeys(state),
    featChoicesFor: featChoicesResolver(state),
  });
  const useTrackers = buildFeatUseTrackers({ activeFeatKeys: activeFeatKeys(state) });
  const validKeys = new Set([
    ...spellTrackers.map((tracker) => tracker.storageKey),
    ...useTrackers.map((tracker) => tracker.featKey),
    ...armoryChargeStorageKeys(state.weapons, state.armor),
  ]);

  const next: Record<string, number> = {};
  let changed = false;

  for (const key of validKeys) {
    if (key in state.featSpellUses) {
      next[key] = state.featSpellUses[key];
      continue;
    }
    const legacyFeatKey = key.includes(":") ? key.split(":")[0] : null;
    if (legacyFeatKey && legacyFeatKey in state.featSpellUses && spellTrackers.some((t) => t.storageKey === key)) {
      next[key] = state.featSpellUses[legacyFeatKey];
      changed = true;
    }
  }

  if (Object.keys(next).length !== Object.keys(state.featSpellUses).length) {
    changed = true;
  } else {
    for (const [key, value] of Object.entries(state.featSpellUses)) {
      if (!(key in next) || next[key] !== value) {
        changed = true;
        break;
      }
    }
  }

  return changed ? next : state.featSpellUses;
}

function withValidLanguagePicks(state: Character): Character {
  const languagePicks = retainValidLanguagePicks(state);
  return languagePicks === state.languagePicks ? state : { ...state, languagePicks };
}

function withPrunedFeatSpellUses(state: Character): Character {
  const featSpellUses = pruneFeatSpellUses(state);
  const next = featSpellUses === state.featSpellUses ? state : { ...state, featSpellUses };
  return withValidLanguagePicks(next);
}

function featChoicesForSpellPickSource(state: Character, featKey: string, source?: FeatSource) {
  const choices = source ? featChoicesForSlot(state, source) : featChoicesResolver(state)(featKey);
  return padFeatChoicesForFeat(choices, featKey);
}

function allowedFeatCantripOptions(
  state: Character,
  featKey: string,
  index: number,
  source?: FeatSource,
): string[] {
  const ctx = featGrantSpellPickContext(featKey, "cantrip", index);
  if (!ctx) return [];
  const list = featSpellPickOptionsForEffect(ctx.effect, ctx.pickLevel, {
    activeFeatKeys: activeFeatKeys(state),
  });
  const choices = featChoicesForSpellPickSource(state, featKey, source);
  const takenFromOtherFeats = featGrantedSpellKeysFromChoices(activeFeatKeys(state), featChoicesResolver(state), featKey);
  return availableFeatSpellOptions(list, choices.cantripPicks, index, takenFromOtherFeats, ownedSpellKeysForState(state));
}

function allowedFeatLevel1Options(
  state: Character,
  featKey: string,
  index: number,
  source?: FeatSource,
): string[] {
  const ctx = featGrantSpellPickContext(featKey, "spell", index);
  if (!ctx) return [];
  const list = featSpellPickOptionsForEffect(ctx.effect, ctx.pickLevel, {
    activeFeatKeys: activeFeatKeys(state),
  });
  const choices = featChoicesForSpellPickSource(state, featKey, source);
  const takenFromOtherFeats = featGrantedSpellKeysFromChoices(activeFeatKeys(state), featChoicesResolver(state), featKey);
  return availableFeatSpellOptions(list, choices.spellPicks, index, takenFromOtherFeats, ownedSpellKeysForState(state));
}

function featWeaponProficiencyGrants(state: Character) {
  const classData = findByKey(CLASSES, state.classKey);
  const grants = effectiveWeaponProficiencyGrants(
    classData,
    state.level,
    state.classFeatureChoices,
    state.subclassKey,
  );
  const contributions = collectFeatContributions(
    activeFeatKeys(state),
    featChoicesResolver(state),
    derivedAbilityScores(state.abilityScores, state.abilityScoreIncreases),
    [],
  );
  return [...grants, ...contributions.weaponProficiencyGrants.map((proficiency) => ({ kind: proficiency }))];
}

function weaponMasteryTrainingInput(
  state: Character,
  tableRules: TableRules,
  levelPath: string[],
) {
  return {
    rules: tableRules,
    levelPath,
    resolveClass: (classKey: string) => findByKey(CLASSES, classKey),
    classFeatureChoicesByClass: state.classFeatureChoicesByClass,
    subclassByClass: state.subclassByClass,
    legacyClassFeatureChoices: state.classFeatureChoices,
    legacySubclassKey: state.subclassKey,
  };
}

function mergedWeaponProficiencyGrantsForCharacter(
  state: Character,
  tableRules: TableRules,
  levelPath: string[],
) {
  const grants = mergedWeaponProficiencyGrants(weaponMasteryTrainingInput(state, tableRules, levelPath));
  const contributions = collectFeatContributions(
    activeFeatKeys(state),
    featChoicesResolver(state),
    derivedAbilityScores(state.abilityScores, state.abilityScoreIncreases),
    [],
  );
  return [
    ...grants,
    ...contributions.weaponProficiencyGrants.map((proficiency) => ({ kind: proficiency })),
  ];
}

function withSyncedWeaponMasteryPicks(
  state: Character,
  tableRules: TableRules,
  levelPath: string[],
  picksByClassOverride?: Record<string, string[]>,
): Pick<Character, "weaponMasteryPicksByClass" | "weaponMasteryPicks"> {
  const picksByClass = syncWeaponMasteryPicksByClass({
    levelPath,
    picksByClass: picksByClassOverride ?? state.weaponMasteryPicksByClass,
    legacyPrimaryPicks: state.weaponMasteryPicks,
    trainingInput: weaponMasteryTrainingInput(state, tableRules, levelPath),
    extraWeaponProficiencies: mergedWeaponProficiencyGrantsForCharacter(state, tableRules, levelPath),
  });
  return {
    weaponMasteryPicksByClass: picksByClass,
    weaponMasteryPicks: flattenWeaponMasteryPicks(levelPath, picksByClass),
  };
}

function humanVersatileFeatState(
  speciesKey: string | null,
  previousSpeciesKey: string | null,
  previousExtraFeats: string[],
  previousExtraFeatChoices: FeatChoices[],
): Pick<Character, "extraFeats" | "extraFeatChoices"> {
  if (humanVersatileFeatCount(speciesKey, 1) === 0) {
    return { extraFeats: [], extraFeatChoices: [] };
  }
  if (previousSpeciesKey === "human" && previousExtraFeats.length > 0) {
    return { extraFeats: previousExtraFeats, extraFeatChoices: previousExtraFeatChoices };
  }
  return {
    extraFeats: [HUMAN_VERSATILE_FEAT_KEY],
    extraFeatChoices: [initialFeatChoicesForFeat(HUMAN_VERSATILE_FEAT_KEY)],
  };
}

function abilityScoresBeforeFeats(state: Character): Record<AbilityId, number> {
  return abilityScoresAfterIncreases(state.abilityScores, state.abilityScoreIncreases);
}

function derivedAbilityModifiers(state: Character): Record<AbilityId, number> {
  const scoresBeforeFeats = abilityScoresBeforeFeats(state);
  const contributions = collectFeatContributions(
    activeFeatKeys(state),
    featChoicesResolver(state),
    scoresBeforeFeats,
    [],
  );
  const scores = derivedAbilityScores(scoresBeforeFeats, contributions.abilityScoreBonuses);
  return {
    str: abilityModifier(scores.str),
    dex: abilityModifier(scores.dex),
    con: abilityModifier(scores.con),
    int: abilityModifier(scores.int),
    wis: abilityModifier(scores.wis),
    cha: abilityModifier(scores.cha),
  };
}

function derivedConModifier(state: Character): number {
  return derivedAbilityModifiers(state).con;
}

function clampSpellSlotRemaining(value: number, max: number): number {
  return Math.min(Math.max(value, 0), max);
}

function withClampedSpellSlotRemaining(state: Character): Character {
  const classData = findByKey(CLASSES, state.classKey);
  const maxByLevel = effectiveSpellSlotsByLevel(classData, state.level, state.createdSpellSlots);
  const next: Record<number, number> = {};

  for (const [key, remaining] of Object.entries(state.spellSlotRemaining)) {
    const spellLevel = Number(key);
    const max = maxByLevel[spellLevel] ?? 0;
    if (max <= 0) continue;
    const clamped = clampSpellSlotRemaining(remaining, max);
    if (clamped < max) next[spellLevel] = clamped;
  }

  const currentEntries = Object.entries(state.spellSlotRemaining);
  const nextEntries = Object.entries(next);
  if (
    currentEntries.length === nextEntries.length &&
    currentEntries.every(([key, value]) => next[Number(key)] === value)
  ) {
    return state;
  }
  return { ...state, spellSlotRemaining: next };
}

function ownedSpellKeysForState(state: Character): Set<string> {
  const classLevels = resolvedClassLevels(effectiveLevelPath(state));
  const speciesContributions = collectSpeciesFeatureContributions(
    findByKey(SPECIES, state.speciesKey),
    state.speciesLineageKey,
    state.level,
    state.speciesFeatureChoices,
  );
  return characterOwnedSpellKeys({
    character: state,
    classLevels,
    speciesCantrips: speciesContributions.cantrips,
    speciesPreparedSpells: speciesContributions.preparedSpells,
    activeFeatKeys: activeFeatKeys(state),
    featChoicesFor: featChoicesResolver(state),
    spellSlots: spellcastingSlotsMaxForState(state),
  });
}

function spellbookBuckets(state: Character): SpellbookKeyBuckets {
  return {
    spellbookPicks: state.spellbookPicks,
    spellbookExtraPicks: state.spellbookExtraPicks,
    subclassSpellbookPicks: state.subclassSpellbookPicks,
  };
}

function preparedSpellOptions(state: Character): string[] {
  const owned = ownedSpellKeysForState(state);
  const classData = findByKey(CLASSES, state.classKey);
  if (classData?.spellProgression?.listMode === "spellbook") {
    const bookKeys = allSpellbookKeys(spellbookBuckets(state));
    return filterOwnedSpellPickOptions(bookKeys, owned, [...state.spellPicks, ...bookKeys]);
  }
  return filterOwnedSpellPickOptions(
    preparedSpellPickOptions(state.classKey, state.level, state.subclassKey),
    owned,
    state.spellPicks,
  );
}

function spellPickLimits(state: Character) {
  const classLevels = resolvedClassLevels(effectiveLevelPath(state));
  if (isMulticlassCharacter(state)) {
    const limitsByClass = spellPickLimitsByClass(classLevels, multiclassSpellPickContext(state));
    const cantripSlots = multiclassCantripSlotTotal(limitsByClass);
    const primary = classLevels[0];
    const primaryLimits = primary ? limitsByClass[primary.classKey] : null;
    return {
      cantripSlots,
      spellSlots: primaryLimits?.spellSlots ?? 0,
      spellbookSlots: primaryLimits?.spellbookSlots ?? 0,
      listMode: primaryLimits?.listMode ?? null,
    };
  }
  const classData = findByKey(CLASSES, state.classKey);
  const subclass = findSubclass(state.classKey, state.subclassKey);
  return spellPickLimitsForClass(
    classData,
    derivedAbilityModifiers(state),
    state.level,
    state.classFeatureChoices,
    subclass,
  );
}

function multiclassSpellPickContext(state: Character) {
  return {
    abilityModifiers: derivedAbilityModifiers(state),
    getClassData: (classKey: string) => findByKey(CLASSES, classKey) ?? null,
    subclassByClass: state.subclassByClass,
    classFeatureChoicesByClass: state.classFeatureChoicesByClass,
    getSubclassData: (subclassKey: string) => findByKey(SUBCLASSES, subclassKey) ?? null,
  };
}

function spellcastingSlotsMaxForState(state: Character): Record<number, number> {
  const classLevels = resolvedClassLevels(effectiveLevelPath(state));
  if (classLevels.length === 0) {
    const classData = findByKey(CLASSES, state.classKey);
    return effectiveSpellSlotsByLevel(classData, state.level, state.createdSpellSlots);
  }
  return characterSpellcastingSlots(
    classLevels,
    {
      subclassByClass: state.subclassByClass,
      getClassData: (classKey) => findByKey(CLASSES, classKey) ?? null,
      getSubclassData: (subclassKey) => findByKey(SUBCLASSES, subclassKey) ?? null,
    },
    state.createdSpellSlots,
  );
}

function preparedSpellOptionsForClass(state: Character, classKey: string, classLevel: number): string[] {
  const owned = ownedSpellKeysForState(state);
  const classData = findByKey(CLASSES, classKey);
  const subclassKey = subclassKeyForClass(state, classKey);
  const currentPicks = spellPicksForClass(state, classKey);
  if (classData?.spellProgression?.listMode === "spellbook") {
    const spellbookPicks = isMulticlassCharacter(state)
      ? spellbookPicksForClass(state, classKey)
      : state.spellbookPicks;
    return filterOwnedSpellPickOptions(spellbookPicks, owned, [...currentPicks, ...spellbookPicks]);
  }
  return filterOwnedSpellPickOptions(
    preparedSpellPickOptions(classKey, classLevel, subclassKey),
    owned,
    currentPicks,
  );
}

function wizardSpellbookSet(state: Character): Set<string> {
  return new Set(allSpellbookKeys(spellbookBuckets(state)));
}

function filterPreparedToSpellbook(state: Character, spellPicks: string[]): string[] {
  const classData = findByKey(CLASSES, state.classKey);
  if (classData?.spellProgression?.listMode !== "spellbook") return spellPicks;
  const bookSet = wizardSpellbookSet(state);
  return spellPicks.filter((pick) => bookSet.has(pick));
}

function retainSpellPicksForClass(
  state: Character,
  classKey: string | null,
): Pick<
  Character,
  "cantripPicks" | "spellPicks" | "spellbookPicks" | "spellbookExtraPicks" | "subclassSpellbookPicks"
> {
  const classData = findByKey(CLASSES, classKey);
  const subclass = findSubclass(classKey, state.subclassKey);
  const limits = spellPickLimitsForClass(
    classData,
    derivedAbilityModifiers(state),
    state.level,
    state.classFeatureChoices,
    subclass,
  );
  const listClassKey = effectiveSpellListClassKey(classData, subclass, state.level);
  const list = classSpellListFor(classKey, listClassKey);
  const owned = ownedSpellKeysForState(state);
  const cantripOptions = filterOwnedSpellPickOptions(list.cantrips, owned, state.cantripPicks);
  const cantripPicks = retainValidCompactSpellPicks(state.cantripPicks, limits.cantripSlots, cantripOptions);
  const spellbookBase = spellbookListKeys(classData, state.level, subclass);
  const spellbookAllowed = filterOwnedSpellPickOptions(spellbookBase, owned, [
    ...state.spellbookPicks,
    ...state.spellbookExtraPicks,
    ...state.subclassSpellbookPicks,
  ]);
  const spellbookPicks = retainValidCompactSpellPicks(state.spellbookPicks, limits.spellbookSlots, spellbookAllowed);
  const spellbookExtraPicks = retainValidUncappedSpellPicks(state.spellbookExtraPicks, spellbookAllowed);
  const subclassSpellbookPicks = retainValidCompactSpellPicks(
    state.subclassSpellbookPicks,
    subclassSpellbookPickCount(subclass, state.level),
    subclass ? subclassSpellbookPickOptionsForState(state, subclass) : [],
  );
  const preparedOptions =
    classData?.spellProgression?.listMode === "spellbook"
      ? filterOwnedSpellPickOptions(
          allSpellbookKeys({ spellbookPicks, spellbookExtraPicks, subclassSpellbookPicks }),
          owned,
          state.spellPicks,
        )
      : filterOwnedSpellPickOptions(
          preparedSpellPickOptions(classKey, state.level, state.subclassKey),
          owned,
          state.spellPicks,
        );
  let spellPicks = retainValidCompactSpellPicks(state.spellPicks, limits.spellSlots, preparedOptions);
  if (classData?.spellProgression?.listMode === "spellbook") {
    const bookSet = new Set(allSpellbookKeys({ spellbookPicks, spellbookExtraPicks, subclassSpellbookPicks }));
    spellPicks = spellPicks.filter((pick) => bookSet.has(pick));
  }
  return { cantripPicks, spellPicks, spellbookPicks, spellbookExtraPicks, subclassSpellbookPicks };
}

function retainMulticlassSpellPicks(state: Character): Pick<
  Character,
  "cantripPicksByClass" | "spellPicksByClass" | "spellbookPicksByClass"
> {
  const classLevels = resolvedClassLevels(effectiveLevelPath(state));
  const limitsByClass = spellPickLimitsByClass(classLevels, multiclassSpellPickContext(state));
  const owned = ownedSpellKeysForState(state);
  const cantripPicksByClass = { ...state.cantripPicksByClass };
  const spellPicksByClass = { ...state.spellPicksByClass };
  const spellbookPicksByClass = { ...state.spellbookPicksByClass };
  for (const { classKey, classLevel } of classLevels) {
    const limits = limitsByClass[classKey];
    if (!limits) continue;
    const currentCantrips = cantripPicksForClass(state, classKey);
    cantripPicksByClass[classKey] = retainValidCompactSpellPicks(
      currentCantrips,
      limits.cantripSlots,
      filterOwnedSpellPickOptions(
        cantripPickOptionsForClass(classKey, classLevel, state),
        owned,
        currentCantrips,
      ),
    );
    const classData = findByKey(CLASSES, classKey);
    const subclassKey = subclassKeyForClass(state, classKey);
    const subclass = findSubclass(classKey, subclassKey);
    spellPicksByClass[classKey] = retainValidCompactSpellPicks(
      spellPicksForClass(state, classKey),
      limits.spellSlots,
      preparedSpellOptionsForClass(state, classKey, classLevel),
    );
    if (classData?.spellProgression?.listMode === "spellbook") {
      const currentSpellbook = spellbookPicksForClass(state, classKey);
      const spellbookAllowed = filterOwnedSpellPickOptions(
        spellbookListKeys(classData, classLevel, subclass),
        owned,
        currentSpellbook,
      );
      spellbookPicksByClass[classKey] = retainValidCompactSpellPicks(
        currentSpellbook,
        limits.spellbookSlots,
        spellbookAllowed,
      );
      const bookSet = new Set(spellbookPicksByClass[classKey]);
      spellPicksByClass[classKey] = spellPicksByClass[classKey]!.filter((pick) => bookSet.has(pick));
    }
  }
  return { cantripPicksByClass, spellPicksByClass, spellbookPicksByClass };
}

function preparedConcentrationOptionsForState(state: Character): string[] {
  const classLevels = resolvedClassLevels(effectiveLevelPath(state));
  const speciesContributions = collectSpeciesFeatureContributions(
    findByKey(SPECIES, state.speciesKey),
    state.speciesLineageKey,
    state.level,
    state.speciesFeatureChoices,
  );
  return characterConcentrationSpellKeys({
    character: state,
    classLevels,
    speciesCantrips: speciesContributions.cantrips,
    speciesPreparedSpells: speciesContributions.preparedSpells,
    activeFeatKeys: activeFeatKeys(state),
    featChoicesFor: featChoicesResolver(state),
    spellSlots: spellcastingSlotsMaxForState(state),
  });
}

function withValidConcentrationSpell(state: Character): Character {
  if (state.concentrationSpellKey == null) return state;
  if (!preparedConcentrationOptionsForState(state).includes(state.concentrationSpellKey)) {
    return { ...state, concentrationSpellKey: null, concentrationRoundsRemaining: null };
  }
  return state;
}

function withClampedSpellPicks(state: Character): Character {
  if (isMulticlassCharacter(state)) {
    const next = retainMulticlassSpellPicks(state);
    if (
      recordsOfStringArraysEqual(state.cantripPicksByClass, next.cantripPicksByClass) &&
      recordsOfStringArraysEqual(state.spellPicksByClass, next.spellPicksByClass) &&
      recordsOfStringArraysEqual(state.spellbookPicksByClass, next.spellbookPicksByClass)
    ) {
      return state;
    }
    return { ...state, ...next };
  }
  const next = retainSpellPicksForClass(state, state.classKey);
  if (
    arraysEqual(state.cantripPicks, next.cantripPicks) &&
    arraysEqual(state.spellPicks, next.spellPicks) &&
    arraysEqual(state.spellbookPicks, next.spellbookPicks) &&
    arraysEqual(state.spellbookExtraPicks, next.spellbookExtraPicks) &&
    arraysEqual(state.subclassSpellbookPicks, next.subclassSpellbookPicks)
  ) {
    return state;
  }
  return { ...state, ...next };
}

function recordsOfStringArraysEqual(
  left: Record<string, string[]>,
  right: Record<string, string[]>,
): boolean {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    if (!arraysEqual(left[key] ?? [], right[key] ?? [])) return false;
  }
  return true;
}

function retainFightingStyleFeatKey(state: Character, level: number): string | null {
  if (!collectClassFeatureContributions(state.classKey, level).hasFightingStyleFeature) return null;
  if (!state.fightingStyleFeatKey) return null;
  if (!isFightingStyleFeatAllowedForClass(state.classKey, state.fightingStyleFeatKey)) return null;
  return state.fightingStyleFeatKey;
}

function withCharacterLevel(state: Character, level: number): Character {
  const contributions = collectClassFeatureContributions(state.classKey, level, level >= 3 ? state.subclassKey : null);
  const expertiseSkillPicks = retainValidExpertiseSkillPicks(
    state.expertiseSkillPicks,
    contributions.expertiseCount,
    proficientSkillsFor(state),
  );
  const classFeatureOptionPicks = retainClassFeatureOptionPicksForLevel(state, level);
  let next: Character = {
    ...state,
    level,
    expertiseSkillPicks,
    fightingStyleFeatKey: retainFightingStyleFeatKey(state, level),
    classFeatureUses: level < state.level ? {} : state.classFeatureUses,
    createdSpellSlots: level >= 2 ? state.createdSpellSlots : {},
    ...(level < 2 ? clearWildShapeState() : {}),
    ...(level < 3 ? { classFeaturePoolRemaining: {} } : {}),
    ...retainArtificerStateForLevel(state, level),
    ...retainSubclassStateForLevel(state, level),
    ...retainClassGrantedFeatsForLevel(state, level),
    classFeatureSkillPicks: retainClassFeatureSkillPicksForLevel(state, level),
    classFeatureOptionPicks,
    classFeatureSpellPicks: retainClassFeatureSpellPicks({ ...state, level, classFeatureOptionPicks }),
  };
  next = withClampedSpellPicks(next);
  next = withClampedSpellSlotRemaining(next);
  next = withUpdatedSkills(next, {}, { expertiseSkillPicks });
  next = withClampedCurrentHitPoints(next);
  next = withClampedCurrentHitDice(next);
  return next;
}

function arraysEqual(a: (string | null)[], b: (string | null)[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function baseMaxHitPoints(state: Character): number | null {
  const classData = findByKey(CLASSES, state.classKey);
  if (!classData) return null;
  const speciesContributions = collectSpeciesFeatureContributions(
    findByKey(SPECIES, state.speciesKey),
    state.speciesLineageKey,
    state.level,
    state.speciesFeatureChoices,
  );
  return computeHitPoints(
    classData.hitDie,
    derivedConModifier(state),
    state.level,
    activeFeatKeys(state),
    speciesContributions.hpPerLevel,
    collectClassFeatureContributions(state.classKey, state.level, state.subclassKey).hpPerClassLevel,
  );
}

function maxHitPoints(state: Character): number | null {
  const base = baseMaxHitPoints(state);
  if (base == null) return null;
  return base + Math.max(0, Math.floor(state.hitPointMaxBonus ?? 0));
}

function clampCurrentHitPoints(value: number, max: number): number {
  return Math.min(Math.max(value, 0), max);
}

function maxHitDice(state: Character): number | null {
  if (!state.classKey) return null;
  return state.level;
}

function hitDiceMaxForState(state: Character): Record<number, number> {
  const levelPath = effectiveLevelPath(state);
  if (levelPath.length === 0) return {};
  return hitDiceMaxByDieFromLevelPath(levelPath, (classKey) => findByKey(CLASSES, classKey)?.hitDie ?? 0);
}

function clampCurrentHitDice(value: number, max: number): number {
  return Math.min(Math.max(value, 0), max);
}

function withClampedCurrentHitPoints(state: Character): Character {
  if (state.currentHitPoints == null) return state;
  const max = maxHitPoints(state);
  if (max == null) return state;
  const clamped = clampCurrentHitPoints(state.currentHitPoints, max);
  if (clamped === max) return { ...state, currentHitPoints: null };
  if (clamped === state.currentHitPoints) return state;
  return { ...state, currentHitPoints: clamped };
}

function mapTrackedCreature(
  state: Character,
  id: string,
  update: (instance: TrackedCreatureInstance) => TrackedCreatureInstance | null,
): Character {
  let changed = false;
  const trackedCreatures = state.trackedCreatures.map((instance) => {
    if (instance.id !== id) return instance;
    const next = update(instance);
    if (next == null || next === instance) return instance;
    changed = true;
    return next;
  });
  return changed ? { ...state, trackedCreatures } : state;
}

function withClampedCurrentHitDice(state: Character): Character {
  if (state.currentHitDice == null) return state;
  const max = maxHitDice(state);
  if (max == null) return state;
  const clamped = clampCurrentHitDice(state.currentHitDice, max);
  if (clamped === max) return { ...state, currentHitDice: null };
  if (clamped === state.currentHitDice) return state;
  return { ...state, currentHitDice: clamped };
}

function resolveMulticlassClass(classKey: string, minimum: number) {
  const classData = findByKey(CLASSES, classKey);
  if (!classData) return null;
  return {
    key: classData.key,
    primaryAbility: primaryAbilityFromCatalog(classData.primaryAbility, minimum),
  };
}

function syncClassSkillPicksByClass(
  state: Character,
  levelPath: string[],
  tableRules: TableRules,
): Record<string, (SkillId | null)[]> {
  const grants = mergedClassSkillChoiceGrants(tableRules, levelPath, (classKey) => findByKey(CLASSES, classKey));
  const primaryClassKey = levelPath[0] ?? state.classKey;
  const next: Record<string, (SkillId | null)[]> = {};

  for (const grant of grants) {
    if (grant.classKey === primaryClassKey) continue;
    const existing = state.classSkillPicksByClass[grant.classKey];
    const taken = otherProficientSkillIds(
      { ...state, classSkillPicksByClass: next },
      { classPicks: true, excludeMulticlassClassKey: grant.classKey },
    );
    next[grant.classKey] =
      existing?.length === grant.count
        ? retainValidClassSkillPicks(existing, grant.count, grant.options, taken)
        : Array.from({ length: grant.count }, () => null);
  }

  return next;
}

function applyLevelFromPath(state: Character, levelPath: string[], tableRules: TableRules): Character {
  const level = levelPath.length > 0 ? levelPath.length : 1;
  const classKey = levelPath[0] ?? state.classKey;
  const classSkillPicksByClass = syncClassSkillPicksByClass(state, levelPath, tableRules);
  const synced = syncCharacterLevelAliases({
    ...state,
    levelPath,
    level,
    classKey,
    classSkillPicksByClass,
  });
  const weaponMastery = withSyncedWeaponMasteryPicks(synced, tableRules, levelPath);
  const oldMax = maxHitPoints(state);
  let next = withCharacterLevel({ ...synced, ...weaponMastery }, synced.level);
  const newMax = maxHitPoints(next);
  if (oldMax != null && newMax != null && next.currentHitPoints != null && synced.level > state.level) {
    next = { ...next, currentHitPoints: next.currentHitPoints + (newMax - oldMax) };
  }
  next = withClampedCurrentHitPoints(next);
  return withMergedSkills(next, { classSkillPicksByClass });
}

function withDeathSavesClearedWhenHealed(
  state: Character,
  currentHitPoints: number | null,
  max: number,
): Character {
  const cleared = deathSavesClearedIfHealed(state, currentHitPoints, max);
  if (cleared == null) return state;
  return { ...state, ...cleared };
}

function speciesDataFor(state: Character) {
  return findByKey(SPECIES, state.speciesKey);
}

function speciesContributionsFor(state: Character) {
  return collectSpeciesFeatureContributions(
    speciesDataFor(state),
    state.speciesLineageKey,
    state.level,
    state.speciesFeatureChoices,
  );
}

function retainSpeciesSkillPicksForSpecies(
  state: Character,
  speciesKey: string | null,
  lineageKey: string | null,
): (SkillId | null)[] {
  const speciesData = findByKey(SPECIES, speciesKey);
  const contributions = collectSpeciesFeatureContributions(speciesData, lineageKey, state.level, state.speciesFeatureChoices);
  const count = speciesSkillPickCount(contributions);
  const takenSkills = takenSkillsForSpeciesRetain(state);
  return retainValidSpeciesSkillPicks(
    state.speciesSkillPicks,
    count,
    contributions.skillPickOptions,
    takenSkills,
  );
}

function clearSpeciesFields(): Pick<
  Character,
  | "speciesLineageKey"
  | "speciesSpellcastingAbility"
  | "speciesSkillPicks"
  | "speciesToolPicks"
  | "speciesSize"
  | "speciesFeatureChoices"
  | "speciesFeatureUses"
  | "speciesCantripSwapAvailable"
> {
  return {
    speciesLineageKey: null,
    speciesSpellcastingAbility: null,
    speciesSkillPicks: [],
    speciesToolPicks: [],
    speciesSize: null,
    speciesFeatureChoices: {},
    speciesFeatureUses: {},
    speciesCantripSwapAvailable: {},
  };
}

function withClampedSpeciesFeatureUses(state: Character): Character {
  if (Object.keys(state.speciesFeatureUses).length === 0) return state;

  const speciesData = speciesDataFor(state);
  if (!speciesData) {
    if (Object.keys(state.speciesFeatureUses).length === 0) return state;
    return { ...state, speciesFeatureUses: {} };
  }

  const trackers = buildSpeciesFeatureUseTrackers(
    speciesData,
    state.speciesLineageKey,
    state.level,
    derivedAbilityModifiers(state),
  );
  const maxByKey = new Map(trackers.map((tracker) => [tracker.featureKey, tracker.maxUses]));

  let changed = false;
  const nextUses: Record<string, number> = {};
  for (const [featureKey, current] of Object.entries(state.speciesFeatureUses)) {
    const max = maxByKey.get(featureKey);
    if (max == null) {
      changed = true;
      continue;
    }
    const clamped = clampClassFeatureUses(current, max);
    if (clamped === max) {
      changed = true;
      continue;
    }
    if (clamped !== current) changed = true;
    nextUses[featureKey] = clamped;
  }

  if (!changed) return state;
  return { ...state, speciesFeatureUses: nextUses };
}

function clampClassFeatureUses(value: number, max: number): number {
  return Math.min(Math.max(value, 0), max);
}

function classFeatureUseTrackersForState(
  state: Character,
  surface?: "combat" | "spells",
) {
  const classData = findByKey(CLASSES, state.classKey);
  if (!classData) return [];
  return buildClassFeatureUseTrackers(
    classData,
    state.level,
    derivedAbilityModifiers(state),
    findSubclass(state.classKey, state.subclassKey),
    surface,
    state.subclassFeatureChoices,
  );
}

function classFeaturePoolTrackersForState(state: Character) {
  const classData = findByKey(CLASSES, state.classKey);
  if (!classData) return [];
  return buildClassFeaturePoolTrackers(
    classData,
    state.level,
    derivedAbilityModifiers(state),
    findSubclass(state.classKey, state.subclassKey),
  );
}

function withClampedClassFeatureUses(state: Character): Character {
  if (Object.keys(state.classFeatureUses).length === 0) return state;

  const classData = findByKey(CLASSES, state.classKey);
  if (!classData) {
    if (Object.keys(state.classFeatureUses).length === 0) return state;
    return { ...state, classFeatureUses: {} };
  }

  const trackers = classFeatureUseTrackersForState(state);
  const maxByKey = new Map(trackers.map((tracker) => [tracker.featureKey, tracker.maxUses]));

  let changed = false;
  const nextUses: Record<string, number> = {};
  for (const [featureKey, current] of Object.entries(state.classFeatureUses)) {
    const max = maxByKey.get(featureKey);
    if (max == null) {
      changed = true;
      continue;
    }
    const clamped = clampClassFeatureUses(current, max);
    if (clamped === max) {
      changed = true;
      continue;
    }
    if (clamped !== current) changed = true;
    nextUses[featureKey] = clamped;
  }

  if (!changed) return state;
  return { ...state, classFeatureUses: nextUses };
}

function expertiseCountForClass(classKey: string | null, level: number): number {
  return collectClassFeatureContributions(classKey, level).expertiseCount;
}

function retainExpertiseForProficiencies(
  state: Character,
  patch: Partial<
    Pick<
      Character,
      | "backgroundKey"
      | "backgroundSkillPicks"
      | "classKey"
      | "classSkillPicks"
      | "classSkillPicksByClass"
      | "featChoices"
      | "extraFeatChoices"
      | "speciesSkillPicks"
      | "subclassSkillPicks"
      | "classFeatureSkillPicks"
    >
  >,
): (SkillId | null)[] {
  const backgroundKey = patch.backgroundKey !== undefined ? patch.backgroundKey : state.backgroundKey;
  const backgroundSkillPicks =
    patch.backgroundSkillPicks !== undefined ? patch.backgroundSkillPicks : state.backgroundSkillPicks;
  const classSkillPicks = patch.classSkillPicks !== undefined ? patch.classSkillPicks : state.classSkillPicks;
  const classSkillPicksByClass =
    patch.classSkillPicksByClass !== undefined ? patch.classSkillPicksByClass : state.classSkillPicksByClass;
  const featChoices = patch.featChoices !== undefined ? patch.featChoices : state.featChoices;
  const extraFeatChoices = patch.extraFeatChoices !== undefined ? patch.extraFeatChoices : state.extraFeatChoices;
  const speciesSkillPicks = patch.speciesSkillPicks !== undefined ? patch.speciesSkillPicks : state.speciesSkillPicks;
  const subclassSkillPicks = patch.subclassSkillPicks !== undefined ? patch.subclassSkillPicks : state.subclassSkillPicks;
  const classFeatureSkillPicks =
    patch.classFeatureSkillPicks !== undefined ? patch.classFeatureSkillPicks : state.classFeatureSkillPicks;
  const classKey = patch.classKey !== undefined ? patch.classKey : state.classKey;
  const count = expertiseCountForClass(classKey, state.level);
  const mergedForFeats = {
    ...state,
    backgroundKey,
    backgroundSkillPicks,
    classKey,
    classSkillPicks,
    featChoices,
    extraFeatChoices,
    speciesSkillPicks,
    subclassSkillPicks,
    classFeatureSkillPicks,
  };
  const proficientSkills = proficientSkillIds(
    backgroundSkillIds({ backgroundKey, backgroundSkillPicks }),
    mergedClassSkillPickSlots(classSkillPicks, classSkillPicksByClass),
    allFeatSkillPicksForCharacter(mergedForFeats),
    speciesSkillPicks,
    subclassSkillPicks,
    flattenClassFeatureSkillPicks(classFeatureSkillPicks),
    subclassFixedSkillsFor({ ...state, classKey, subclassSkillPicks, classFeatureSkillPicks }),
  );
  return retainValidExpertiseSkillPicks(state.expertiseSkillPicks, count, proficientSkills);
}

function withMergedSkills(
  state: Character,
  patch: Partial<
    Pick<
      Character,
      | "backgroundKey"
      | "backgroundSkillPicks"
      | "classKey"
      | "classSkillPicks"
      | "classSkillPicksByClass"
      | "backgroundToolPicks"
      | "classToolPicks"
      | "featChoices"
      | "extraFeatChoices"
      | "expertiseSkillPicks"
      | "speciesSkillPicks"
      | "speciesToolPicks"
      | "subclassSkillPicks"
      | "classFeatureSkillPicks"
    >
  >,
): Character {
  const backgroundKey = patch.backgroundKey !== undefined ? patch.backgroundKey : state.backgroundKey;
  const backgroundSkillPicks =
    patch.backgroundSkillPicks !== undefined ? patch.backgroundSkillPicks : state.backgroundSkillPicks;
  const classKey = patch.classKey !== undefined ? patch.classKey : state.classKey;
  const classSkillPicks = patch.classSkillPicks !== undefined ? patch.classSkillPicks : state.classSkillPicks;
  const classSkillPicksByClass =
    patch.classSkillPicksByClass !== undefined ? patch.classSkillPicksByClass : state.classSkillPicksByClass;
  const backgroundToolPicks =
    patch.backgroundToolPicks !== undefined ? patch.backgroundToolPicks : state.backgroundToolPicks;
  const classToolPicks = patch.classToolPicks !== undefined ? patch.classToolPicks : state.classToolPicks;
  const featChoices = patch.featChoices !== undefined ? patch.featChoices : state.featChoices;
  const extraFeatChoices = patch.extraFeatChoices !== undefined ? patch.extraFeatChoices : state.extraFeatChoices;
  const expertiseSkillPicks =
    patch.expertiseSkillPicks !== undefined ? patch.expertiseSkillPicks : state.expertiseSkillPicks;
  const speciesSkillPicks = patch.speciesSkillPicks !== undefined ? patch.speciesSkillPicks : state.speciesSkillPicks;
  const speciesToolPicks = patch.speciesToolPicks !== undefined ? patch.speciesToolPicks : state.speciesToolPicks;
  const subclassSkillPicks =
    patch.subclassSkillPicks !== undefined ? patch.subclassSkillPicks : state.subclassSkillPicks;
  const classFeatureSkillPicks =
    patch.classFeatureSkillPicks !== undefined ? patch.classFeatureSkillPicks : state.classFeatureSkillPicks;
  const resolved = resolveSkillPickConflicts({
    backgroundKey,
    backgroundSkillPicks,
    classKey,
    subclassKey: state.subclassKey,
    level: state.level,
    classSkillPicks,
    featChoices,
    extraFeatChoices,
    speciesSkillPicks,
    subclassSkillPicks,
    classFeatureSkillPicks,
  });
  const nextBackgroundSkillPicks = resolved.backgroundSkillPicks;
  const nextClassSkillPicks = resolved.classSkillPicks;
  const nextFeatChoices = resolved.featChoices;
  const nextExtraFeatChoices = resolved.extraFeatChoices;
  const nextSpeciesSkillPicks = resolved.speciesSkillPicks;
  const nextSubclassSkillPicks = resolved.subclassSkillPicks;
  const nextClassFeatureSkillPicks = resolved.classFeatureSkillPicks;
  return {
    ...state,
    backgroundKey,
    backgroundSkillPicks: nextBackgroundSkillPicks,
    classKey,
    classSkillPicks: nextClassSkillPicks,
    classSkillPicksByClass,
    backgroundToolPicks,
    classToolPicks,
    featChoices: nextFeatChoices,
    extraFeatChoices: nextExtraFeatChoices,
    expertiseSkillPicks,
    speciesSkillPicks: nextSpeciesSkillPicks,
    speciesToolPicks,
    subclassSkillPicks: nextSubclassSkillPicks,
    classFeatureSkillPicks: nextClassFeatureSkillPicks,
    skillConflictNotice: resolved.removedSkills.length > 0 ? resolved.removedSkills : null,
    skills: (() => {
      const mergedForFeats = {
        ...state,
        backgroundKey,
        backgroundSkillPicks: nextBackgroundSkillPicks,
        classKey,
        classSkillPicks: nextClassSkillPicks,
        featChoices: nextFeatChoices,
        extraFeatChoices: nextExtraFeatChoices,
        expertiseSkillPicks,
        speciesSkillPicks: nextSpeciesSkillPicks,
        subclassSkillPicks: nextSubclassSkillPicks,
        classFeatureSkillPicks: nextClassFeatureSkillPicks,
      };
      return mergeSkillProficiencies(
        backgroundSkillIds({ backgroundKey, backgroundSkillPicks: nextBackgroundSkillPicks }),
        mergedClassSkillPickSlots(nextClassSkillPicks, classSkillPicksByClass),
        allFeatSkillPicksForCharacter(mergedForFeats),
        featExpertisePicksForState(mergedForFeats),
        nextSpeciesSkillPicks,
        nextSubclassSkillPicks,
        flattenClassFeatureSkillPicks(nextClassFeatureSkillPicks),
        subclassFixedSkillsFor({
          ...state,
          classKey,
          subclassSkillPicks: nextSubclassSkillPicks,
          classFeatureSkillPicks: nextClassFeatureSkillPicks,
        }),
      );
    })(),
    proficientTools: mergedProficientToolsForCharacter({
      ...state,
      backgroundKey,
      backgroundSkillPicks: nextBackgroundSkillPicks,
      classKey,
      classSkillPicks: nextClassSkillPicks,
      backgroundToolPicks,
      classToolPicks,
      featChoices: nextFeatChoices,
      extraFeatChoices: nextExtraFeatChoices,
      expertiseSkillPicks,
      speciesSkillPicks: nextSpeciesSkillPicks,
      speciesToolPicks,
      subclassSkillPicks: nextSubclassSkillPicks,
      classFeatureSkillPicks: nextClassFeatureSkillPicks,
    }),
  };
}

function withUpdatedSkills(
  state: Character,
  patch: Partial<
    Pick<
      Character,
      | "backgroundKey"
      | "backgroundSkillPicks"
      | "classKey"
      | "classSkillPicks"
      | "backgroundToolPicks"
      | "classToolPicks"
      | "featChoices"
      | "extraFeatChoices"
      | "speciesSkillPicks"
      | "speciesToolPicks"
    >
  >,
  opts: {
    expertiseSkillPicks?: (SkillId | null)[];
    extra?: Partial<Character>;
  } = {},
): Character {
  const expertiseSkillPicks =
    opts.expertiseSkillPicks ?? retainExpertiseForProficiencies(state, patch);
  return withMergedSkills({ ...state, ...opts.extra }, { ...patch, expertiseSkillPicks });
}

function reduceCharacter(state: Character, action: CharacterAction, tableRules: TableRules): Character {
  switch (action.type) {
    case "LOAD_CHARACTER":
      return syncCharacterLevelAliases({
        ...action.character,
        speciesCantripSwapAvailable: action.character.speciesCantripSwapAvailable ?? {},
        skillConflictNotice: null,
        enspelledSpellPicks: pruneEnspelledSpellPicks(
          action.character.enspelledSpellPicks ?? {},
          action.character.weapons,
          action.character.armor,
        ),
      });
    case "NEW_CHARACTER":
      return reduceCharacter(
        state,
        { type: "LOAD_CHARACTER", character: structuredClone(INITIAL_CHARACTER) },
        tableRules,
      );
    case "CLEAR_SKILL_CONFLICT_NOTICE":
      return state.skillConflictNotice == null ? state : { ...state, skillConflictNotice: null };
    case "SET_NAME":
      return { ...state, name: action.value };
    case "SET_SPECIES": {
      const contributions = collectSpeciesFeatureContributions(
        findByKey(SPECIES, action.key),
        null,
        state.level,
        {},
      );
      const speciesSkillPicks = initialSpeciesSkillPicks(speciesSkillPickCount(contributions));
      const speciesToolPicks = initialToolPicks(speciesToolPickCount(contributions));
      const versatileFeat = humanVersatileFeatState(
        action.key,
        state.speciesKey,
        state.extraFeats,
        state.extraFeatChoices,
      );
      return withMergedSkills(
        {
          ...state,
          speciesKey: action.key,
          ...clearSpeciesFields(),
          speciesSkillPicks,
          speciesToolPicks,
          ...versatileFeat,
        },
        { speciesSkillPicks, speciesToolPicks },
      );
    }
    case "SET_SPECIES_LINEAGE": {
      const speciesSkillPicks = retainSpeciesSkillPicksForSpecies(state, state.speciesKey, action.key);
      return withMergedSkills(
        {
          ...state,
          speciesLineageKey: action.key,
          speciesFeatureUses: {},
          speciesFeatureChoices: {},
          speciesCantripSwapAvailable: {},
          speciesSkillPicks,
        },
        { speciesSkillPicks },
      );
    }
    case "SET_SPECIES_SPELLCASTING_ABILITY":
      return { ...state, speciesSpellcastingAbility: action.ability };
    case "SET_SPECIES_SIZE":
      return { ...state, speciesSize: action.size };
    case "SET_SPECIES_FEATURE_CHOICE": {
      const speciesData = speciesDataFor(state);
      const listClassKey = speciesCantripChoiceListClassKey(
        speciesData,
        state.speciesLineageKey,
        action.choiceKey,
      );
      if (!listClassKey) return state;
      const defaultSpellKey = speciesCantripChoiceDefault(
        speciesData,
        state.speciesLineageKey,
        action.choiceKey,
      );
      if (!defaultSpellKey) return state;
      const effectiveCurrent = resolveSpeciesCantripChoice(
        state.speciesFeatureChoices,
        action.choiceKey,
        defaultSpellKey,
      );
      const speciesFeatureChoices = { ...state.speciesFeatureChoices };
      let speciesCantripSwapAvailable = state.speciesCantripSwapAvailable;
      if (action.spellKey == null) {
        if (action.choiceKey in speciesFeatureChoices && !speciesCantripSwapAvailable[action.choiceKey]) {
          return state;
        }
        delete speciesFeatureChoices[action.choiceKey];
      } else if (isValidSpeciesCantripChoice(listClassKey, action.spellKey)) {
        if (action.spellKey !== effectiveCurrent && !speciesCantripSwapAvailable[action.choiceKey]) {
          return state;
        }
        speciesFeatureChoices[action.choiceKey] = action.spellKey;
        if (action.spellKey !== effectiveCurrent) {
          speciesCantripSwapAvailable = {
            ...speciesCantripSwapAvailable,
            [action.choiceKey]: false,
          };
        }
      } else {
        return state;
      }
      return { ...state, speciesFeatureChoices, speciesCantripSwapAvailable };
    }
    case "SET_SPECIES_SKILL_PICK": {
      const contributions = speciesContributionsFor(state);
      const count = speciesSkillPickCount(contributions);
      if (action.index < 0 || action.index >= count) return state;
      const speciesSkillPicks = applySpeciesSkillPick(
        state.speciesSkillPicks.length === count
          ? state.speciesSkillPicks
          : initialSpeciesSkillPicks(count),
        action.index,
        action.skill,
        contributions.skillPickOptions,
        takenSkillsForSpeciesPicks(state, action.index),
      );
      if (!speciesSkillPicks) return state;
      return withUpdatedSkills(state, { speciesSkillPicks });
    }
    case "SET_SPECIES_TOOL_PICK": {
      const contributions = speciesContributionsFor(state);
      const count = speciesToolPickCount(contributions);
      if (action.index < 0 || action.index >= count) return state;
      const takenTools = mergedProficientToolsFor(
        state.backgroundToolPicks,
        state.classToolPicks,
        allFeatProficiencyPicksForCharacter(state),
        state.speciesToolPicks,
      );
      const speciesToolPicks = applyToolPick(
        state.speciesToolPicks.length === count ? state.speciesToolPicks : initialToolPicks(count),
        action.index,
        action.tool,
        ALL_TOOL_OPTIONS,
        takenTools,
      );
      if (!speciesToolPicks) return state;
      return withUpdatedSkills(state, { speciesToolPicks });
    }
    case "SET_SPECIES_FEATURE_USES": {
      const speciesData = speciesDataFor(state);
      if (!speciesData) return state;
      const trackers = buildSpeciesFeatureUseTrackers(
        speciesData,
        state.speciesLineageKey,
        state.level,
        derivedAbilityModifiers(state),
      );
      const tracker = trackers.find((entry) => entry.featureKey === action.featureKey);
      if (!tracker) return state;
      const value = clampClassFeatureUses(Math.round(action.value), tracker.maxUses);
      if (value === tracker.maxUses) {
        if (!(action.featureKey in state.speciesFeatureUses)) return state;
        const { [action.featureKey]: _removed, ...rest } = state.speciesFeatureUses;
        return { ...state, speciesFeatureUses: rest };
      }
      if (state.speciesFeatureUses[action.featureKey] === value) return state;
      return {
        ...state,
        speciesFeatureUses: { ...state.speciesFeatureUses, [action.featureKey]: value },
      };
    }
    case "SET_BACKGROUND": {
      const selectingCustom = isCustomBackground(action.key);
      const backgroundSkillPicks = selectingCustom
        ? state.backgroundSkillPicks.length === 2
          ? state.backgroundSkillPicks
          : [null, null]
        : state.backgroundSkillPicks;
      const nextBackground = {
        backgroundKey: action.key,
        backgroundSkillPicks,
        customBackgroundName: state.customBackgroundName,
      };
      const backgroundChanging = action.key !== state.backgroundKey;
      const stateForTools = backgroundChanging
        ? { ...state, ...nextBackground, backgroundToolsTouched: false }
        : { ...state, ...nextBackground };
      const backgroundToolPicks = retainBackgroundToolPicksForBackground(stateForTools, action.key);
      const classToolPicks = retainClassToolPicksForClass(
        { ...stateForTools, backgroundToolPicks },
        state.classKey,
      );
      const patch = {
        backgroundKey: action.key,
        backgroundSkillPicks,
        backgroundToolPicks,
        classToolPicks,
      };
      const toolExtra = backgroundChanging ? { backgroundToolsTouched: false } : {};
      if (state.featTouched) return withValidLanguagePicks(withUpdatedSkills(state, patch, { extra: toolExtra }));
      const featKey = suggestedFeatKey(nextBackground);
      if (state.featKey === featKey) return withValidLanguagePicks(withUpdatedSkills(state, patch, { extra: toolExtra }));
      const featChoices = initialFeatChoicesForFeat(featKey);
      return withValidLanguagePicks(
        withUpdatedSkills(state, { ...patch, featChoices }, { extra: { featKey, featChoices, ...toolExtra } }),
      );
    }
    case "SET_CUSTOM_BACKGROUND_NAME":
      return { ...state, customBackgroundName: action.value };
    case "SET_BACKGROUND_SKILL_PICK": {
      if (!isCustomBackground(state.backgroundKey)) return state;
      if (action.index < 0 || action.index >= 2) return state;
      const allSkillIds = SKILLS.map((skill) => skill.id);
      const backgroundSkillPicks = applyClassSkillPick(
        state.backgroundSkillPicks.length === 2 ? state.backgroundSkillPicks : [null, null],
        action.index,
        action.skill,
        allSkillIds,
        takenSkillsForBackgroundPicks(state, action.index),
      );
      if (!backgroundSkillPicks) return state;
      return withUpdatedSkills(state, { backgroundSkillPicks });
    }
    case "SET_FEAT": {
      if (state.featKey === action.key && state.featTouched) return state;
      const featChoices = initialFeatChoicesForFeat(action.key);
      const next = withUpdatedSkills(state, { featChoices }, { extra: { featKey: action.key, featTouched: true, featChoices } });
      return withPrunedFeatSpellUses(next);
    }
    case "SET_EXTRA_FEAT": {
      if (humanVersatileFeatCount(state.speciesKey, state.level) === 0) return state;
      const extraFeats = action.key ? [action.key] : [];
      const extraFeatChoices = action.key ? [initialFeatChoicesForFeat(action.key)] : [];
      if (
        state.extraFeats.length === extraFeats.length &&
        state.extraFeats.every((key, index) => key === extraFeats[index])
      ) {
        return state;
      }
      const next = withUpdatedSkills(state, {}, { extra: { extraFeats, extraFeatChoices } });
      return withPrunedFeatSpellUses(next);
    }
    case "SET_EXTRA_FEAT_PROFICIENCY_PICK": {
      if (action.featIndex < 0 || action.featIndex >= state.extraFeats.length) return state;
      const currentChoices = state.extraFeatChoices[action.featIndex] ?? EMPTY_FEAT_CHOICES;
      const featKey = state.extraFeats[action.featIndex]!;
      const proficiencyPicks = applyFeatProficiencyPick(
        currentChoices.proficiencyPicks,
        action.pickIndex,
        action.pick,
        takenSkillsForFeatProficiencyPicks(state, currentChoices.proficiencyPicks, action.pickIndex),
        takenToolsForFeatProficiencyPicks(currentChoices.proficiencyPicks, action.pickIndex),
        featProficiencyOptionContext(state, featKey),
      );
      if (!proficiencyPicks) return state;
      const extraFeatChoices = [...state.extraFeatChoices];
      extraFeatChoices[action.featIndex] = { ...currentChoices, proficiencyPicks };
      return withUpdatedSkills(state, {}, { extra: { extraFeatChoices } });
    }
    case "SET_EXTRA_FEAT_ABILITY_INCREASES": {
      if (action.featIndex < 0 || action.featIndex >= state.extraFeats.length) return state;
      const featKey = state.extraFeats[action.featIndex];
      const effect = featAbilityIncreaseEffect(featKey);
      if (!effect) return state;
      const abilityIncreases = validateAbilityIncreases(
        effect,
        abilityScoresBeforeFeats(state),
        action.abilityIncreases,
      );
      if (!abilityIncreases) return state;
      const extraFeatChoices = [...state.extraFeatChoices];
      const currentChoices = extraFeatChoices[action.featIndex] ?? EMPTY_FEAT_CHOICES;
      extraFeatChoices[action.featIndex] = { ...currentChoices, abilityIncreases };
      return { ...state, extraFeatChoices };
    }
    case "SET_FEAT_PROFICIENCY_PICK": {
      const featKey = state.featKey ?? "";
      const proficiencyPicks = applyFeatProficiencyPick(
        state.featChoices.proficiencyPicks,
        action.index,
        action.pick,
        takenSkillsForFeatProficiencyPicks(state, state.featChoices.proficiencyPicks, action.index),
        takenToolsForFeatProficiencyPicks(state.featChoices.proficiencyPicks, action.index),
        state.featKey ? featProficiencyOptionContext(state, featKey) : {},
      );
      if (!proficiencyPicks) return state;
      const featChoices = { ...state.featChoices, proficiencyPicks };
      return withUpdatedSkills(state, { featChoices });
    }
    case "SET_FEAT_ABILITY_INCREASES": {
      const effect = featAbilityIncreaseEffect(state.featKey);
      if (!effect) return state;
      const abilityIncreases = validateAbilityIncreases(
        effect,
        abilityScoresBeforeFeats(state),
        action.abilityIncreases,
      );
      if (!abilityIncreases) return state;
      return { ...state, featChoices: { ...state.featChoices, abilityIncreases } };
    }
    case "SET_FEAT_SPELLCASTING_ABILITY": {
      if (!state.featKey || !featGrantSpellsEffect(state.featKey)) return state;
      const allowed: AbilityId[] = ["int", "wis", "cha"];
      if (action.ability != null && !allowed.includes(action.ability)) return state;
      if (state.featChoices.spellcastingAbility === action.ability) return state;
      return { ...state, featChoices: { ...state.featChoices, spellcastingAbility: action.ability } };
    }
    case "SET_FEAT_CANTRIP_PICK": {
      if (!state.featKey) return state;
      const paddedChoices = padFeatChoicesForFeat(state.featChoices, state.featKey);
      const allowed = allowedFeatCantripOptions(state, state.featKey, action.index, { kind: "origin" });
      const cantripPicks = applySpellPick(paddedChoices.cantripPicks, action.index, action.spellKey, allowed);
      if (!cantripPicks) return state;
      const next = { ...state, featChoices: { ...paddedChoices, cantripPicks } };
      return withPrunedFeatSpellUses(next);
    }
    case "SET_FEAT_SPELL_PICK": {
      if (!state.featKey) return state;
      const paddedChoices = padFeatChoicesForFeat(state.featChoices, state.featKey);
      const allowed = allowedFeatLevel1Options(state, state.featKey, action.index, { kind: "origin" });
      const spellPicks = applySpellPick(paddedChoices.spellPicks, action.index, action.spellKey, allowed);
      if (!spellPicks) return state;
      const next = { ...state, featChoices: { ...paddedChoices, spellPicks } };
      return withPrunedFeatSpellUses(next);
    }
    case "SET_FEAT_DAMAGE_TYPE": {
      if (!state.featKey || featDamageTypeOptions(state.featKey).length === 0) return state;
      if (!isValidFeatDamageTypePick(state.featKey, action.damageType)) return state;
      if (state.featChoices.damageTypePick === action.damageType) return state;
      return { ...state, featChoices: { ...state.featChoices, damageTypePick: action.damageType } };
    }
    case "SET_FEAT_WEAPON_MASTERY_PICK": {
      if (!state.featKey || !featNeedsWeaponMasteryPick(state.featKey)) return state;
      const classData = findByKey(CLASSES, state.classKey);
      if (!isValidFeatWeaponMasteryPick(action.weaponKey, classData, featWeaponProficiencyGrants(state))) return state;
      if (state.featChoices.weaponMasteryPick === action.weaponKey) return state;
      return { ...state, featChoices: { ...state.featChoices, weaponMasteryPick: action.weaponKey } };
    }
    case "SET_EXTRA_FEAT_SPELLCASTING_ABILITY": {
      if (action.featIndex < 0 || action.featIndex >= state.extraFeats.length) return state;
      const featKey = state.extraFeats[action.featIndex];
      if (!featGrantSpellsEffect(featKey)) return state;
      const allowed: AbilityId[] = ["int", "wis", "cha"];
      if (action.ability != null && !allowed.includes(action.ability)) return state;
      const currentChoices = state.extraFeatChoices[action.featIndex] ?? EMPTY_FEAT_CHOICES;
      if (currentChoices.spellcastingAbility === action.ability) return state;
      const extraFeatChoices = [...state.extraFeatChoices];
      extraFeatChoices[action.featIndex] = { ...currentChoices, spellcastingAbility: action.ability };
      return { ...state, extraFeatChoices };
    }
    case "SET_EXTRA_FEAT_CANTRIP_PICK": {
      if (action.featIndex < 0 || action.featIndex >= state.extraFeats.length) return state;
      const featKey = state.extraFeats[action.featIndex];
      const currentChoices = padFeatChoicesForFeat(
        state.extraFeatChoices[action.featIndex] ?? EMPTY_FEAT_CHOICES,
        featKey,
      );
      const allowed = allowedFeatCantripOptions(state, featKey, action.pickIndex, {
        kind: "versatile",
        index: action.featIndex,
      });
      const cantripPicks = applySpellPick(currentChoices.cantripPicks, action.pickIndex, action.spellKey, allowed);
      if (!cantripPicks) return state;
      const extraFeatChoices = [...state.extraFeatChoices];
      extraFeatChoices[action.featIndex] = { ...currentChoices, cantripPicks };
      const next = { ...state, extraFeatChoices };
      return withPrunedFeatSpellUses(next);
    }
    case "SET_EXTRA_FEAT_SPELL_PICK": {
      if (action.featIndex < 0 || action.featIndex >= state.extraFeats.length) return state;
      const featKey = state.extraFeats[action.featIndex];
      const currentChoices = padFeatChoicesForFeat(
        state.extraFeatChoices[action.featIndex] ?? EMPTY_FEAT_CHOICES,
        featKey,
      );
      const allowed = allowedFeatLevel1Options(state, featKey, action.pickIndex, {
        kind: "versatile",
        index: action.featIndex,
      });
      const spellPicks = applySpellPick(currentChoices.spellPicks, action.pickIndex, action.spellKey, allowed);
      if (!spellPicks) return state;
      const extraFeatChoices = [...state.extraFeatChoices];
      extraFeatChoices[action.featIndex] = { ...currentChoices, spellPicks };
      const next = { ...state, extraFeatChoices };
      return withPrunedFeatSpellUses(next);
    }
    case "SET_EXTRA_FEAT_DAMAGE_TYPE": {
      if (action.featIndex < 0 || action.featIndex >= state.extraFeats.length) return state;
      const featKey = state.extraFeats[action.featIndex];
      if (featDamageTypeOptions(featKey).length === 0) return state;
      if (!isValidFeatDamageTypePick(featKey, action.damageType)) return state;
      const currentChoices = state.extraFeatChoices[action.featIndex] ?? EMPTY_FEAT_CHOICES;
      if (currentChoices.damageTypePick === action.damageType) return state;
      const extraFeatChoices = [...state.extraFeatChoices];
      extraFeatChoices[action.featIndex] = { ...currentChoices, damageTypePick: action.damageType };
      return { ...state, extraFeatChoices };
    }
    case "SET_EXTRA_FEAT_WEAPON_MASTERY_PICK": {
      if (action.featIndex < 0 || action.featIndex >= state.extraFeats.length) return state;
      const featKey = state.extraFeats[action.featIndex];
      if (!featNeedsWeaponMasteryPick(featKey)) return state;
      const classData = findByKey(CLASSES, state.classKey);
      if (!isValidFeatWeaponMasteryPick(action.weaponKey, classData, featWeaponProficiencyGrants(state))) return state;
      const currentChoices = state.extraFeatChoices[action.featIndex] ?? EMPTY_FEAT_CHOICES;
      if (currentChoices.weaponMasteryPick === action.weaponKey) return state;
      const extraFeatChoices = [...state.extraFeatChoices];
      extraFeatChoices[action.featIndex] = { ...currentChoices, weaponMasteryPick: action.weaponKey };
      return { ...state, extraFeatChoices };
    }
    case "SET_FEAT_SPELL_USES": {
      const storageKey = action.featKey;
      const maxUses = maxFeatUsesForStorageKey(state, storageKey);
      if (maxUses == null) return state;
      const value = clampClassFeatureUses(Math.round(action.value), maxUses);
      if (value === maxUses) {
        if (!(storageKey in state.featSpellUses)) return state;
        const { [storageKey]: _removed, ...rest } = state.featSpellUses;
        return { ...state, featSpellUses: rest };
      }
      if (state.featSpellUses[storageKey] === value) return state;
      return { ...state, featSpellUses: { ...state.featSpellUses, [storageKey]: value } };
    }
    case "SET_MAGIC_ITEM_CHARGE_REMAINING": {
      const max = magicItemChargeMax(action.itemKey);
      if (max == null) return state;
      const value = clampClassFeatureUses(Math.round(action.value), max);
      if (value === max) {
        if (!(action.itemKey in state.magicItemChargeRemaining)) return state;
        return {
          ...state,
          magicItemChargeRemaining: removeMagicItemChargeKey(
            state.magicItemChargeRemaining,
            action.itemKey,
          ),
        };
      }
      if (state.magicItemChargeRemaining[action.itemKey] === value) return state;
      return {
        ...state,
        magicItemChargeRemaining: {
          ...state.magicItemChargeRemaining,
          [action.itemKey]: value,
        },
      };
    }
    case "SET_EQUIPMENT_REST_USES": {
      const max = maxUsesForEquipmentRestStorageKey(state, action.storageKey);
      if (max == null) return state;
      const value = clampClassFeatureUses(Math.round(action.value), max);
      if (value === max) {
        if (!(action.storageKey in state.equipmentRestUsesRemaining)) return state;
        const { [action.storageKey]: _removed, ...rest } = state.equipmentRestUsesRemaining;
        return { ...state, equipmentRestUsesRemaining: rest };
      }
      if (state.equipmentRestUsesRemaining[action.storageKey] === value) return state;
      return {
        ...state,
        equipmentRestUsesRemaining: {
          ...state.equipmentRestUsesRemaining,
          [action.storageKey]: value,
        },
      };
    }
    case "SET_FIGHTING_STYLE_FEAT": {
      if (!collectClassFeatureContributions(state.classKey, state.level).hasFightingStyleFeature) return state;
      if (action.key === state.fightingStyleFeatKey) return state;
      if (action.key != null && !isFightingStyleFeatAllowedForClass(state.classKey, action.key)) return state;
      const fightingStyleFeatChoices = initialFeatChoicesForFeat(action.key);
      return withPrunedFeatSpellUses({ ...state, fightingStyleFeatKey: action.key, fightingStyleFeatChoices });
    }
    case "SET_FIGHTING_STYLE_FEAT_SPELLCASTING_ABILITY": {
      if (!state.fightingStyleFeatKey) return state;
      if (state.fightingStyleFeatChoices.spellcastingAbility === action.ability) return state;
      return {
        ...state,
        fightingStyleFeatChoices: { ...state.fightingStyleFeatChoices, spellcastingAbility: action.ability },
      };
    }
    case "SET_FIGHTING_STYLE_FEAT_CANTRIP_PICK": {
      if (!state.fightingStyleFeatKey) return state;
      const allowed = allowedFeatCantripOptions(state, state.fightingStyleFeatKey, action.index);
      const cantripPicks = applySpellPick(state.fightingStyleFeatChoices.cantripPicks, action.index, action.spellKey, allowed);
      if (!cantripPicks) return state;
      const next = { ...state, fightingStyleFeatChoices: { ...state.fightingStyleFeatChoices, cantripPicks } };
      return withPrunedFeatSpellUses(next);
    }
    case "SET_FIGHTING_STYLE_FEAT_DAMAGE_TYPE": {
      if (!state.fightingStyleFeatKey || featDamageTypeOptions(state.fightingStyleFeatKey).length === 0) return state;
      if (!isValidFeatDamageTypePick(state.fightingStyleFeatKey, action.damageType)) return state;
      if (state.fightingStyleFeatChoices.damageTypePick === action.damageType) return state;
      return {
        ...state,
        fightingStyleFeatChoices: { ...state.fightingStyleFeatChoices, damageTypePick: action.damageType },
      };
    }
    case "SET_FIGHTING_STYLE_FEAT_WEAPON_MASTERY_PICK": {
      if (!state.fightingStyleFeatKey || !featNeedsWeaponMasteryPick(state.fightingStyleFeatKey)) return state;
      const classData = findByKey(CLASSES, state.classKey);
      if (!isValidFeatWeaponMasteryPick(action.weaponKey, classData, featWeaponProficiencyGrants(state))) return state;
      if (state.fightingStyleFeatChoices.weaponMasteryPick === action.weaponKey) return state;
      return {
        ...state,
        fightingStyleFeatChoices: { ...state.fightingStyleFeatChoices, weaponMasteryPick: action.weaponKey },
      };
    }
    case "SET_CLASS_GRANTED_FEAT": {
      const classData = findByKey(CLASSES, state.classKey);
      if (!classFeatGrantLevels(classData, state.level).includes(action.level)) return state;
      if (action.key === state.classGrantedFeats[action.level]) return state;
      const classGrantedFeats = { ...state.classGrantedFeats };
      const classGrantedFeatChoices = { ...state.classGrantedFeatChoices };
      if (action.key) {
        classGrantedFeats[action.level] = action.key;
        classGrantedFeatChoices[action.level] = initialFeatChoicesForFeat(action.key);
      } else {
        delete classGrantedFeats[action.level];
        delete classGrantedFeatChoices[action.level];
      }
      const next = withUpdatedSkills(state, {}, { extra: { classGrantedFeats, classGrantedFeatChoices } });
      return withPrunedFeatSpellUses(next);
    }
    case "SET_CLASS_GRANTED_FEAT_PROFICIENCY_PICK": {
      const featKey = state.classGrantedFeats[action.level];
      if (!featKey) return state;
      const currentChoices = state.classGrantedFeatChoices[action.level] ?? EMPTY_FEAT_CHOICES;
      const proficiencyPicks = applyFeatProficiencyPick(
        currentChoices.proficiencyPicks,
        action.pickIndex,
        action.pick,
        takenSkillsForFeatProficiencyPicks(state, currentChoices.proficiencyPicks, action.pickIndex),
        takenToolsForFeatProficiencyPicks(currentChoices.proficiencyPicks, action.pickIndex),
        featProficiencyOptionContext(state, featKey),
      );
      if (!proficiencyPicks) return state;
      const classGrantedFeatChoices = {
        ...state.classGrantedFeatChoices,
        [action.level]: { ...currentChoices, proficiencyPicks },
      };
      return withUpdatedSkills(state, {}, { extra: { classGrantedFeatChoices } });
    }
    case "SET_CLASS_GRANTED_FEAT_ABILITY_INCREASES": {
      const featKey = state.classGrantedFeats[action.level];
      const effect = featAbilityIncreaseEffect(featKey);
      if (!effect) return state;
      const abilityIncreases = validateAbilityIncreases(
        effect,
        abilityScoresBeforeFeats(state),
        action.abilityIncreases,
      );
      if (!abilityIncreases) return state;
      const currentChoices = state.classGrantedFeatChoices[action.level] ?? EMPTY_FEAT_CHOICES;
      const classGrantedFeatChoices = {
        ...state.classGrantedFeatChoices,
        [action.level]: { ...currentChoices, abilityIncreases },
      };
      return { ...state, classGrantedFeatChoices };
    }
    case "SET_CLASS_GRANTED_FEAT_SPELLCASTING_ABILITY": {
      const featKey = state.classGrantedFeats[action.level];
      if (!featKey || !featGrantSpellsEffect(featKey)) return state;
      const allowed: AbilityId[] = ["int", "wis", "cha"];
      if (action.ability != null && !allowed.includes(action.ability)) return state;
      const currentChoices = state.classGrantedFeatChoices[action.level] ?? EMPTY_FEAT_CHOICES;
      if (currentChoices.spellcastingAbility === action.ability) return state;
      const classGrantedFeatChoices = {
        ...state.classGrantedFeatChoices,
        [action.level]: { ...currentChoices, spellcastingAbility: action.ability },
      };
      return { ...state, classGrantedFeatChoices };
    }
    case "SET_CLASS_GRANTED_FEAT_CANTRIP_PICK": {
      const featKey = state.classGrantedFeats[action.level];
      if (!featKey) return state;
      const currentChoices = padFeatChoicesForFeat(
        state.classGrantedFeatChoices[action.level] ?? EMPTY_FEAT_CHOICES,
        featKey,
      );
      const allowed = allowedFeatCantripOptions(state, featKey, action.pickIndex, {
        kind: "classGrant",
        level: action.level,
      });
      const cantripPicks = applySpellPick(currentChoices.cantripPicks, action.pickIndex, action.spellKey, allowed);
      if (!cantripPicks) return state;
      const classGrantedFeatChoices = {
        ...state.classGrantedFeatChoices,
        [action.level]: { ...currentChoices, cantripPicks },
      };
      const next = { ...state, classGrantedFeatChoices };
      return withPrunedFeatSpellUses(next);
    }
    case "SET_CLASS_GRANTED_FEAT_SPELL_PICK": {
      const featKey = state.classGrantedFeats[action.level];
      if (!featKey) return state;
      const currentChoices = padFeatChoicesForFeat(
        state.classGrantedFeatChoices[action.level] ?? EMPTY_FEAT_CHOICES,
        featKey,
      );
      const allowed = allowedFeatLevel1Options(state, featKey, action.pickIndex, {
        kind: "classGrant",
        level: action.level,
      });
      const spellPicks = applySpellPick(currentChoices.spellPicks, action.pickIndex, action.spellKey, allowed);
      if (!spellPicks) return state;
      const classGrantedFeatChoices = {
        ...state.classGrantedFeatChoices,
        [action.level]: { ...currentChoices, spellPicks },
      };
      const next = { ...state, classGrantedFeatChoices };
      return withPrunedFeatSpellUses(next);
    }
    case "SET_CLASS_GRANTED_FEAT_DAMAGE_TYPE": {
      const featKey = state.classGrantedFeats[action.level];
      if (!featKey || featDamageTypeOptions(featKey).length === 0) return state;
      if (!isValidFeatDamageTypePick(featKey, action.damageType)) return state;
      const currentChoices = state.classGrantedFeatChoices[action.level] ?? EMPTY_FEAT_CHOICES;
      if (currentChoices.damageTypePick === action.damageType) return state;
      const classGrantedFeatChoices = {
        ...state.classGrantedFeatChoices,
        [action.level]: { ...currentChoices, damageTypePick: action.damageType },
      };
      return { ...state, classGrantedFeatChoices };
    }
    case "SET_CLASS_GRANTED_FEAT_WEAPON_MASTERY_PICK": {
      const featKey = state.classGrantedFeats[action.level];
      if (!featKey || !featNeedsWeaponMasteryPick(featKey)) return state;
      const classData = findByKey(CLASSES, state.classKey);
      if (!isValidFeatWeaponMasteryPick(action.weaponKey, classData, featWeaponProficiencyGrants(state))) return state;
      const currentChoices = state.classGrantedFeatChoices[action.level] ?? EMPTY_FEAT_CHOICES;
      if (currentChoices.weaponMasteryPick === action.weaponKey) return state;
      const classGrantedFeatChoices = {
        ...state.classGrantedFeatChoices,
        [action.level]: { ...currentChoices, weaponMasteryPick: action.weaponKey },
      };
      return { ...state, classGrantedFeatChoices };
    }
    case "SET_CLASS": {
      const newLevel = state.level > 1 ? 1 : state.level;
      const newLevelPath = action.key ? [action.key] : [];
      const skillChoice = findByKey(CLASSES, action.key)?.skillChoice;
      const takenSkills = takenSkillsForClassRetain(state);
      const classSkillPicks = skillChoice
        ? retainValidClassSkillPicks(state.classSkillPicks, skillChoice.count, skillChoice.options, takenSkills)
        : [];
      const classToolPicks = retainClassToolPicksForClass(
        { ...state, classKey: action.key, classToolsTouched: false },
        action.key,
      );
      const backgroundToolPicks = retainBackgroundToolPicksForBackground(
        { ...state, classKey: action.key, classToolPicks },
        state.backgroundKey,
      );
      const contributions = collectClassFeatureContributions(action.key, newLevel);
      const expertiseSkillPicks = retainValidExpertiseSkillPicks(
        state.expertiseSkillPicks,
        contributions.expertiseCount,
        proficientSkillIds(
          backgroundSkillIds(state),
          classSkillPicks,
          allFeatSkillPicksForCharacter(state),
          state.speciesSkillPicks,
        ),
      );
      const synced = syncCharacterLevelAliases(
        withValidLanguagePicks(
          withClassStandardArray(
            withMergedSkills(
              {
                ...state,
                level: newLevel,
                levelPath: newLevelPath,
                subclassByClass: {},
                pactSlotRemaining: null,
                hitDiceRemaining: {},
                armorClassFormulaKey: null,
                classSkillPicksByClass: {},
                classToolPicksByClass: {},
                cantripPicksByClass: {},
                spellPicksByClass: {},
                spellbookPicksByClass: {},
                fightingStyleFeatKeyByClass: {},
                classFeatureChoicesByClass: {},
                classGrantedFeatsByClass: {},
                weaponMasteryPicks: [],
                weaponMasteryPicksByClass: {},
                classFeatureUses: {},
                classFeaturePoolRemaining: {},
                spellSlotRemaining: {},
                createdSpellSlots: {},
                classToolsTouched: false,
                ...clearSubclassState(),
                classFeatureSkillPicks: {},
                classFeatureChoices: {},
                classFeatureOptionPicks: {},
                classFeatureSpellPicks: {},
                temporaryHitPointsMax: null,
                temporaryHitPointsRemaining: null,
                fightingStyleFeatKey: null,
                fightingStyleFeatChoices: { ...EMPTY_FEAT_CHOICES },
                classGrantedFeats: {},
                classGrantedFeatChoices: {},
                ...clearWildShapeState(),
                ...retainArtificerStateForLevel({ ...state, classKey: action.key }, newLevel),
                ...retainSpellPicksForClass(
                  {
                    ...state,
                    level: newLevel,
                    cantripPicks: [],
                    spellPicks: [],
                    spellbookPicks: [],
                    spellbookExtraPicks: [],
                  },
                  action.key,
                ),
                classKey: action.key,
                classSkillPicks,
                classToolPicks,
                backgroundToolPicks,
                expertiseSkillPicks,
              },
              { classKey: action.key, classSkillPicks, classToolPicks, backgroundToolPicks, expertiseSkillPicks, subclassSkillPicks: [], classFeatureSkillPicks: {} },
            ),
          ),
        ),
      );
      const levelPath = effectiveLevelPath(synced);
      return { ...synced, ...withSyncedWeaponMasteryPicks(synced, tableRules, levelPath) };
    }
    case "LEVEL_UP": {
      const currentLevelPath = effectiveLevelPath(state);
      if (!state.classKey || currentLevelPath.length === 0) return state;
      if (state.level >= maxCharacterLevelFor(state.classKey)) return state;
      const lastClassKey = currentLevelPath[currentLevelPath.length - 1]!;
      const levelPath = [...currentLevelPath, lastClassKey];
      return applyLevelFromPath(state, levelPath, tableRules);
    }
    case "LEVEL_UP_CLASS": {
      const currentLevelPath = effectiveLevelPath(state);
      const result = evaluateMulticlassAction(tableRules, {
        targetClassKey: action.classKey,
        currentLevelPath,
        abilityScores: derivedAbilityScores(state.abilityScores, state.abilityScoreIncreases),
        resolveClass: (classKey) =>
          resolveMulticlassClass(classKey, tableRules.abilityPrerequisite.minimum),
      });
      if (!result.ok) return state;
      const levelPath = [...currentLevelPath, action.classKey];
      return applyLevelFromPath(state, levelPath, tableRules);
    }
    case "CHANGE_LAST_LEVEL_CLASS": {
      const currentLevelPath = effectiveLevelPath(state);
      if (currentLevelPath.length === 0) return state;
      const pathBefore = currentLevelPath.slice(0, -1);
      const result = evaluateMulticlassAction(tableRules, {
        targetClassKey: action.classKey,
        currentLevelPath: pathBefore,
        abilityScores: derivedAbilityScores(state.abilityScores, state.abilityScoreIncreases),
        resolveClass: (classKey) =>
          resolveMulticlassClass(classKey, tableRules.abilityPrerequisite.minimum),
      });
      if (!result.ok) return state;
      const levelPath = [...pathBefore, action.classKey];
      return applyLevelFromPath(state, levelPath, tableRules);
    }
    case "REVERT_LAST_LEVEL": {
      if (state.level <= 1) return state;
      const currentPath = effectiveLevelPath(state);
      const nextPath =
        currentPath.length > 1
          ? currentPath.slice(0, -1)
          : levelPathFromClassKeyAndLevel(state.classKey, state.level - 1);
      return applyLevelFromPath(state, nextPath, tableRules);
    }
    case "SET_EXPERIENCE_POINTS": {
      if (!Number.isInteger(action.value) || action.value < 0) return state;
      return { ...state, experiencePoints: action.value };
    }
    case "SET_SUBCLASS": {
      const targetClassKey = action.classKey ?? state.classKey;
      if (!targetClassKey) return state;
      const targetClassLevel =
        resolvedClassLevels(effectiveLevelPath(state)).find((entry) => entry.classKey === targetClassKey)
          ?.classLevel ?? 0;
      if (targetClassLevel < 3) return state;
      const existingSubclassKey = state.subclassByClass[targetClassKey] ?? null;
      if (existingSubclassKey != null) {
        return state;
      }
      if (action.key == null) {
        const subclassByClass = { ...state.subclassByClass };
        delete subclassByClass[targetClassKey];
        if (targetClassKey === state.classKey) {
          return withMergedSkills(
            {
              ...state,
              ...clearSubclassState(),
              subclassByClass,
              subclassKey: null,
              classFeaturePoolRemaining: {},
            },
            { subclassSkillPicks: [] },
          );
        }
        return { ...state, subclassByClass };
      }
      const subclass = findSubclass(targetClassKey, action.key);
      if (!subclass) return state;
      const subclassByClass = { ...state.subclassByClass, [targetClassKey]: action.key };
      if (targetClassKey === state.classKey) {
        const nextState = {
          ...state,
          subclassByClass,
          classFeaturePoolRemaining: {},
          ...subclassStateForSelection(subclass, state.level, toolsBeforeSubclassGrants(state)),
        };
        return withValidLanguagePicks(
          withMergedSkills(withClampedSpellPicks(nextState), { subclassSkillPicks: nextState.subclassSkillPicks }),
        );
      }
      return { ...state, subclassByClass };
    }
    case "SET_SUBCLASS_SKILL_PICK": {
      const subclass = findSubclass(state.classKey, state.subclassKey);
      const count = subclassSkillProficiencyCount(subclass);
      if (!subclass || action.index < 0 || action.index >= count) return state;
      const takenSkills = takenSkillsForSubclassPicks(state, action.index);
      const subclassSkillPicks = applySubclassSkillPick(
        state.subclassSkillPicks.length === count ? state.subclassSkillPicks : initialSubclassSkillPicks(subclass),
        action.index,
        action.skill,
        takenSkills,
      );
      if (!subclassSkillPicks) return state;
      return withMergedSkills(state, { subclassSkillPicks });
    }
    case "SET_SUBCLASS_FEATURE_CHOICE": {
      const subclass = findSubclass(state.classKey, state.subclassKey);
      if (!subclass) return state;
      const options = subclassFeatureChoiceOptions(subclass, action.choiceKey);
      if (action.optionKey != null && !options.some((option) => option.key === action.optionKey)) return state;
      const subclassFeatureChoices = { ...state.subclassFeatureChoices };
      if (action.optionKey == null) {
        delete subclassFeatureChoices[action.choiceKey];
      } else {
        subclassFeatureChoices[action.choiceKey] = action.optionKey;
      }
      return withClampedClassFeatureUses({ ...state, subclassFeatureChoices });
    }
    case "SET_SUBCLASS_FEATURE_OPTION_PICK": {
      const subclass = findSubclass(state.classKey, state.subclassKey);
      if (!subclass || state.level < 3) return state;
      const count = subclassFeatureOptionPickCount(subclass, action.choiceKey, state.level);
      if (count < 1 || action.index < 0 || action.index >= count) return state;
      const current =
        state.subclassFeatureOptionPicks[action.choiceKey]?.length === count
          ? state.subclassFeatureOptionPicks[action.choiceKey]!
          : Array.from({ length: count }, () => null);
      if (
        !isValidSubclassFeatureOptionPick(
          subclass,
          action.choiceKey,
          state.level,
          current,
          action.index,
          action.optionKey,
        )
      ) {
        return state;
      }
      const nextPicks = [...current];
      nextPicks[action.index] = action.optionKey;
      return {
        ...state,
        subclassFeatureOptionPicks: {
          ...state.subclassFeatureOptionPicks,
          [action.choiceKey]: nextPicks,
        },
      };
    }
    case "SET_SUBCLASS_TOOL_PICK": {
      const subclass = findSubclass(state.classKey, state.subclassKey);
      if (!subclass || state.level < 3) return state;
      const grant = subclassToolGrants(subclass).find((entry) => entry.featureKey === action.featureKey);
      if (!grant) return state;
      const beforeSubclass = toolsBeforeSubclassGrants(state);
      const count = subclassToolChooseCount(grant, beforeSubclass);
      if (count <= 0 || action.index < 0 || action.index >= count) return state;
      const current =
        state.subclassToolPicks[action.featureKey]?.length === count
          ? state.subclassToolPicks[action.featureKey]!
          : initialSubclassToolPicks(subclass, beforeSubclass)[action.featureKey] ??
            suggestedSubclassToolPicks(subclass, grant, count, beforeSubclass);
      const takenTools = [
        ...beforeSubclass,
        ...otherSubclassGrantToolPicks(state.subclassToolPicks, action.featureKey),
      ];
      const slotOptions = subclassToolPickOptionsForSlot(grant, action.index, beforeSubclass);
      const nextPicks = applyToolPick(current, action.index, action.tool, slotOptions, takenTools);
      if (!nextPicks) return state;
      const nextState = {
        ...state,
        subclassToolPicks: {
          ...state.subclassToolPicks,
          [action.featureKey]: nextPicks,
        },
      };
      return withMergedSkills(nextState, {});
    }
    case "SET_CLASS_FEATURE_CHOICE": {
      if (!state.classKey) return state;
      const classData = findByKey(CLASSES, state.classKey);
      if (!classData) return state;
      const validChoice =
        isValidInvocationCantripChoice(
          classData,
          state.level,
          state.classFeatureOptionPicks,
          state.cantripPicks,
          action.choiceKey,
          action.optionKey,
        ) ||
        isValidClassFeatureChoice(classData, state.classFeatureChoices, action.choiceKey, action.optionKey);
      if (!validChoice) {
        return state;
      }
      const classFeatureChoices = { ...state.classFeatureChoices };
      if (action.optionKey == null) {
        delete classFeatureChoices[action.choiceKey];
      } else {
        classFeatureChoices[action.choiceKey] = action.optionKey;
      }
      const nextChoices =
        classFeatureChoiceOptions(classData, action.choiceKey).length > 0
          ? classFeatureChoicesAfterParentChange(
              classData,
              action.choiceKey,
              action.optionKey ?? null,
              classFeatureChoices,
            )
          : classFeatureChoices;
      return withClampedSpellPicks({ ...state, classFeatureChoices: nextChoices });
    }
    case "SET_CLASS_FEATURE_OPTION_PICK": {
      if (!state.classKey) return state;
      const classData = findByKey(CLASSES, state.classKey);
      if (!classData) return state;
      const count = classFeatureOptionPickCount(classData, action.choiceKey, state.level);
      if (count < 1 || action.index < 0 || action.index >= count) return state;
      const current =
        state.classFeatureOptionPicks[action.choiceKey]?.length === count
          ? state.classFeatureOptionPicks[action.choiceKey]
          : Array.from({ length: count }, (_, index) => state.classFeatureOptionPicks[action.choiceKey]?.[index] ?? null);
      if (
        !isValidClassFeatureOptionPick(
          classData,
          action.choiceKey,
          state.level,
          current,
          action.index,
          action.optionKey,
        )
      ) {
        return state;
      }
      const previousPick = current[action.index];
      const nextPicks = [...current];
      nextPicks[action.index] = action.optionKey;
      let classFeatureSpellPicks = state.classFeatureSpellPicks;
      const hadTome = hasPactOfTheTomeSelected(state);
      const classFeatureChoices =
        action.choiceKey === ELDRITCH_INVOCATIONS_CHOICE_KEY && previousPick !== action.optionKey
          ? clearInvocationCantripChoicesAtIndex(classData, action.index, state.classFeatureChoices)
          : state.classFeatureChoices;
      const nextState = {
        ...state,
        classFeatureChoices,
        classFeatureOptionPicks: { ...state.classFeatureOptionPicks, [action.choiceKey]: nextPicks },
      };
      const hasTome = hasPactOfTheTomeSelected(nextState);
      if (hadTome && !hasTome) {
        classFeatureSpellPicks = { ...classFeatureSpellPicks };
        delete classFeatureSpellPicks[PACT_OF_THE_TOME_SPELL_PICKS_KEY];
      } else if (hasTome && !classFeatureSpellPicks[PACT_OF_THE_TOME_SPELL_PICKS_KEY]) {
        classFeatureSpellPicks = {
          ...classFeatureSpellPicks,
          [PACT_OF_THE_TOME_SPELL_PICKS_KEY]: initialPactOfTheTomeSpellPicks(),
        };
      }
      return withClampedSpellPicks({ ...nextState, classFeatureSpellPicks });
    }
    case "SET_CLASS_FEATURE_SPELL_PICK": {
      if (action.featureKey !== PACT_OF_THE_TOME_SPELL_PICKS_KEY) return state;
      if (!hasPactOfTheTomeSelected(state)) return state;
      const current = state.classFeatureSpellPicks[PACT_OF_THE_TOME_SPELL_PICKS_KEY] ?? initialPactOfTheTomeSpellPicks();
      const picks = action.kind === "cantrip" ? [...current.cantrips] : [...current.rituals];
      if (action.index < 0 || action.index >= picks.length) return state;
      picks[action.index] = action.spellKey;
      return withClampedSpellPicks({
        ...state,
        classFeatureSpellPicks: {
          ...state.classFeatureSpellPicks,
          [PACT_OF_THE_TOME_SPELL_PICKS_KEY]: {
            ...current,
            [action.kind === "cantrip" ? "cantrips" : "rituals"]: picks,
          },
        },
      });
    }
    case "SET_CLASS_FEATURE_SKILL_PICK": {
      if (state.level < 3 || !state.classKey) return state;
      const classData = findByKey(CLASSES, state.classKey);
      if (!classData) return state;
      const grant = classFeatureSkillGrants(classData, state.level).find(
        (entry) => entry.featureKey === action.featureKey,
      );
      if (!grant || action.index < 0 || action.index >= grant.count) return state;
      const current =
        state.classFeatureSkillPicks[action.featureKey]?.length === grant.count
          ? state.classFeatureSkillPicks[action.featureKey]
          : Array.from({ length: grant.count }, () => null);
      const takenSkills = takenSkillsForClassFeaturePicks(state, action.featureKey, action.index);
      const nextPicks = applySubclassSkillPick(current, action.index, action.skill, takenSkills);
      if (!nextPicks) return state;
      const classFeatureSkillPicks = { ...state.classFeatureSkillPicks, [action.featureKey]: nextPicks };
      return withMergedSkills(state, { classFeatureSkillPicks });
    }
    case "SET_BACKGROUND_TOOL_PICK": {
      const background = backgroundDataFor(state);
      const count = backgroundToolSlotCount(background);
      if (action.index < 0 || action.index >= count) return state;
      const takenTools = otherTakenToolsInSource(
        state.backgroundToolPicks,
        action.index,
        allFeatProficiencyPickValues(state),
      );
      const backgroundOptions = isCustomBackground(state.backgroundKey)
        ? ALL_TOOL_OPTIONS
        : backgroundToolOptions(background);
      const backgroundToolPicks = applyToolPick(
        state.backgroundToolPicks.length === count
          ? state.backgroundToolPicks
          : initialToolPicks(count),
        action.index,
        action.tool,
        backgroundOptions,
        takenTools,
      );
      if (!backgroundToolPicks) return state;
      return withUpdatedSkills(state, { backgroundToolPicks }, { extra: { backgroundToolsTouched: true } });
    }
    case "SET_CLASS_TOOL_PICK": {
      const classData = classDataFor(state.classKey);
      const count = classToolSlotCount(classData);
      if (action.index < 0 || action.index >= count) return state;
      const takenTools = otherTakenToolsInSource(
        state.classToolPicks,
        action.index,
        allFeatProficiencyPickValues(state),
      );
      const classToolPicks = applyToolPick(
        state.classToolPicks.length === count ? state.classToolPicks : initialToolPicks(count),
        action.index,
        action.tool,
        classToolOptions(classData),
        takenTools,
      );
      if (!classToolPicks) return state;
      return withUpdatedSkills(state, { classToolPicks }, { extra: { classToolsTouched: true } });
    }
    case "SET_WEAPON_MASTERY_PICK": {
      const levelPath = effectiveLevelPath(state);
      const classLevel =
        resolvedClassLevels(levelPath).find((entry) => entry.classKey === action.classKey)?.classLevel ?? 0;
      if (classLevel <= 0) return state;
      const contributions = collectClassFeatureContributions(action.classKey, classLevel);
      const classData = findByKey(CLASSES, action.classKey);
      const currentPicks = weaponMasteryPicksForClass(
        state.weaponMasteryPicksByClass,
        action.classKey,
        action.classKey === state.classKey ? state.weaponMasteryPicks : [],
      );
      const updatedPicks = applyWeaponMasteryPick(
        currentPicks,
        action.index,
        action.weaponKey,
        classData,
        contributions.weaponMasteryMeleeOnly,
        contributions.weaponMasteryCount,
        mergedWeaponProficiencyGrantsForCharacter(state, tableRules, levelPath),
      );
      if (!updatedPicks) return state;
      const picksByClass = { ...state.weaponMasteryPicksByClass, [action.classKey]: updatedPicks };
      return {
        ...state,
        ...withSyncedWeaponMasteryPicks(state, tableRules, levelPath, picksByClass),
      };
    }
    case "SET_EXPERTISE_SKILL_PICK": {
      const contributions = collectClassFeatureContributions(state.classKey, state.level);
      if (contributions.expertiseCount <= 0) return state;
      const proficientSkills = proficientSkillsFor(state);
      const expertiseSkillPicks = applyExpertiseSkillPick(
        state.expertiseSkillPicks,
        action.index,
        action.skill,
        proficientSkills,
        takenExpertSkillsForExpertisePicks(state, action.index),
      );
      if (!expertiseSkillPicks) return state;
      return withMergedSkills(state, { expertiseSkillPicks });
    }
    case "SET_BACKSTORY":
      return { ...state, backstory: action.value };
    case "ADD_LANGUAGE_PICK": {
      if (!isValidLanguageKey(action.languageKey)) return state;
      if (!canAddLanguagePick(state, action.languageKey)) return state;
      return { ...state, languagePicks: [...state.languagePicks, action.languageKey] };
    }
    case "REMOVE_LANGUAGE_PICK": {
      if (!state.languagePicks.includes(action.languageKey as LanguageId)) return state;
      return {
        ...state,
        languagePicks: state.languagePicks.filter((key) => key !== action.languageKey),
      };
    }
    case "SET_ALIGNMENT":
      return {
        ...state,
        alignmentKey: action.key,
        alignmentDescription: state.alignmentDescriptionTouched
          ? state.alignmentDescription
          : action.defaultDescription,
      };
    case "SET_DEITY":
      return { ...state, deityKey: action.key };
    case "SET_ALIGNMENT_DESCRIPTION":
      return { ...state, alignmentDescription: action.value, alignmentDescriptionTouched: true };
    case "SET_ABILITY_SCORE":
      return {
        ...state,
        abilityScoreMethod: state.abilityScoreMethod === "standardArray" ? "custom" : state.abilityScoreMethod,
        abilityScores: { ...state.abilityScores, [action.ability]: action.value },
      };
    case "SET_ABILITY_SCORE_INCREASES": {
      const abilityScoreIncreases = sanitizeAbilityScoreIncreases(action.abilityScoreIncreases);
      if (!abilityScoreIncreases) return state;
      return { ...state, abilityScoreIncreases };
    }
    case "SET_ABILITY_SCORE_METHOD":
      return withAbilityScoreMethod({ ...state, abilityScoreMethod: action.method });
    case "SET_CLASS_SKILL_PICK": {
      const skillChoice = findByKey(CLASSES, state.classKey)?.skillChoice;
      if (!skillChoice) return state;
      const classSkillPicks = applyClassSkillPick(
        state.classSkillPicks,
        action.index,
        action.skill,
        skillChoice.options,
        takenSkillsForClassPicks(state, action.index),
      );
      if (!classSkillPicks) return state;
      return withUpdatedSkills(state, { classSkillPicks });
    }
    case "SET_CLASS_SKILL_PICK_BY_CLASS": {
      const levelPath = effectiveLevelPath(state);
      const grant = mergedClassSkillChoiceGrants(tableRules, levelPath, (classKey) =>
        findByKey(CLASSES, classKey),
      ).find((entry) => entry.classKey === action.classKey);
      if (!grant || grant.classKey === levelPath[0]) return state;

      const currentPicks = state.classSkillPicksByClass[action.classKey];
      const picks =
        currentPicks?.length === grant.count
          ? currentPicks
          : Array.from({ length: grant.count }, () => null);
      const nextPicks = applyClassSkillPick(
        picks,
        action.index,
        action.skill,
        grant.options,
        takenSkillsForMulticlassClassPicks(state, action.classKey, action.index),
      );
      if (!nextPicks) return state;

      const classSkillPicksByClass = { ...state.classSkillPicksByClass, [action.classKey]: nextPicks };
      return withMergedSkills(state, { classSkillPicksByClass });
    }
    case "ADD_WEAPON": {
      if (variantPairRejected("weapon", action.key, action.variantKey)) return state;
      const quantity = normalizeWeaponQuantity(action.quantity ?? 1);
      const attuned = armoryVariantAutoAttunes(action.variantKey) && hasFreeAttunementSlot(state);
      return {
        ...state,
        weapons: [
          ...state.weapons,
          {
            id: action.id,
            key: action.key,
            quantity,
            ...optionalVariantKey(action.variantKey),
            ...optionalAttuned(attuned),
          },
        ],
      };
    }
    case "REMOVE_WEAPON": {
      const { [action.id]: _removed, ...enspelledSpellPicks } = state.enspelledSpellPicks;
      return {
        ...state,
        weapons: state.weapons.filter((w) => w.id !== action.id),
        enspelledSpellPicks,
        equipmentActionKeys: removeEquipmentActionKeys(
          state.equipmentActionKeys,
          armoryEquipmentActionKey(action.id),
        ),
        equipmentRestUsesRemaining: removeArmoryEquipmentRestUses(
          state.equipmentRestUsesRemaining,
          action.id,
        ),
      };
    }
    case "SET_WEAPON_ATTUNED": {
      const weapon = state.weapons.find((entry) => entry.id === action.id);
      if (!weapon) return state;
      if (action.attuned) {
        if (weapon.attuned) return state;
        if (!armoryVariantCanAttune(weapon.variantKey)) return state;
        if (!hasFreeAttunementSlot(state)) return state;
        return {
          ...state,
          weapons: state.weapons.map((entry) =>
            entry.id === action.id ? { ...entry, attuned: true } : entry,
          ),
        };
      }
      if (!weapon.attuned) return state;
      return {
        ...state,
        weapons: state.weapons.map((entry) => (entry.id === action.id ? stripAttuned(entry) : entry)),
        equipmentActionKeys: removeEquipmentActionKeys(
          state.equipmentActionKeys,
          armoryEquipmentActionKey(action.id),
        ),
      };
    }
    case "SET_WEAPON_QUANTITY": {
      const weapon = state.weapons.find((entry) => entry.id === action.id);
      if (!weapon) return state;
      const quantity = normalizeWeaponQuantity(action.value);
      if (weaponQuantityValue(weapon) === quantity) return state;
      return {
        ...state,
        weapons: state.weapons.map((entry) =>
          entry.id === action.id ? { ...entry, quantity } : entry,
        ),
      };
    }
    case "ADD_AMMUNITION_PACK": {
      const packSize = ammunitionPackSize(action.ammoType);
      if (packSize <= 0) return state;
      const current = ammunitionRemainingValue(state.ammunitionRemaining, action.ammoType);
      return {
        ...state,
        ammunitionRemaining: {
          ...state.ammunitionRemaining,
          [action.ammoType]: current + packSize,
        },
      };
    }
    case "SET_AMMUNITION_REMAINING": {
      const value = normalizeAmmunitionRemaining(action.value);
      const current = ammunitionRemainingValue(state.ammunitionRemaining, action.ammoType);
      if (current === value) return state;
      if (value === 0) {
        if (!(action.ammoType in (state.ammunitionRemaining ?? {}))) return state;
        const { [action.ammoType]: _removed, ...rest } = state.ammunitionRemaining;
        return { ...state, ammunitionRemaining: rest };
      }
      return {
        ...state,
        ammunitionRemaining: { ...state.ammunitionRemaining, [action.ammoType]: value },
      };
    }
    case "ADD_MAGIC_AMMUNITION_PACK": {
      const packSize = ammunitionPackSize(action.ammoType);
      if (packSize <= 0) return state;
      const stack: MagicAmmunitionStack = {
        id: action.id,
        ammoType: action.ammoType,
        variantKey: action.variantKey,
        remaining: packSize,
      };
      return {
        ...state,
        magicAmmunition: [...state.magicAmmunition, stack],
      };
    }
    case "REMOVE_MAGIC_AMMUNITION": {
      const stack = state.magicAmmunition.find((entry) => entry.id === action.id);
      if (!stack) return state;
      return {
        ...state,
        magicAmmunition: state.magicAmmunition.filter((entry) => entry.id !== action.id),
        preferredAmmoSource: clearPreferredAmmoSourceForStack(state.preferredAmmoSource, action.id),
      };
    }
    case "SET_MAGIC_AMMUNITION_REMAINING": {
      const stack = state.magicAmmunition.find((entry) => entry.id === action.id);
      if (!stack) return state;
      const value = normalizeMagicAmmoRemaining(action.value);
      if (stack.remaining === value) return state;
      if (value === 0) {
        return {
          ...state,
          magicAmmunition: state.magicAmmunition.filter((entry) => entry.id !== action.id),
          preferredAmmoSource: clearPreferredAmmoSourceForStack(state.preferredAmmoSource, action.id),
        };
      }
      return {
        ...state,
        magicAmmunition: state.magicAmmunition.map((entry) =>
          entry.id === action.id ? { ...entry, remaining: value } : entry,
        ),
      };
    }
    case "SET_PREFERRED_AMMO_SOURCE": {
      const current = state.preferredAmmoSource[action.ammoType] ?? null;
      const nextId = action.magicStackId;
      if (current === nextId) return state;
      if (nextId) {
        const stack = state.magicAmmunition.find((entry) => entry.id === nextId && entry.ammoType === action.ammoType);
        if (!stack || stack.remaining <= 0) return state;
      }
      const preferredAmmoSource = { ...state.preferredAmmoSource };
      if (nextId) preferredAmmoSource[action.ammoType] = nextId;
      else delete preferredAmmoSource[action.ammoType];
      return { ...state, preferredAmmoSource };
    }
    case "ADD_ARMOR": {
      if (variantPairRejected("armor", action.key, action.variantKey)) return state;
      const attuned = armoryVariantAutoAttunes(action.variantKey) && hasFreeAttunementSlot(state);
      return {
        ...state,
        armor: [
          ...state.armor,
          {
            id: action.id,
            key: action.key,
            worn: !state.armor.some((armor) => armor.worn && isShield(armor.key) === isShield(action.key)),
            ...optionalVariantKey(action.variantKey),
            ...optionalAttuned(attuned),
          },
        ],
      };
    }
    case "REMOVE_ARMOR": {
      const { [action.id]: _removed, ...enspelledSpellPicks } = state.enspelledSpellPicks;
      return {
        ...state,
        armor: state.armor.filter((a) => a.id !== action.id),
        enspelledSpellPicks,
        equipmentActionKeys: removeEquipmentActionKeys(
          state.equipmentActionKeys,
          armoryEquipmentActionKey(action.id),
        ),
        equipmentRestUsesRemaining: removeArmoryEquipmentRestUses(
          state.equipmentRestUsesRemaining,
          action.id,
        ),
      };
    }
    case "SET_ENSPELLED_SPELL": {
      const piece =
        state.weapons.find((entry) => entry.id === action.instanceId) ??
        state.armor.find((entry) => entry.id === action.instanceId);
      if (!piece?.variantKey || !isEnspelledVariantKey(piece.variantKey)) return state;
      if (action.spellKey != null && !isValidEnspelledSpellPick(piece.variantKey, action.spellKey)) {
        return state;
      }
      const enspelledSpellPicks = { ...state.enspelledSpellPicks };
      if (action.spellKey == null) {
        delete enspelledSpellPicks[action.instanceId];
      } else {
        enspelledSpellPicks[action.instanceId] = action.spellKey;
      }
      return { ...state, enspelledSpellPicks };
    }
    case "SET_ARMOR_ATTUNED": {
      const selectedArmor = state.armor.find((entry) => entry.id === action.id);
      if (!selectedArmor) return state;
      if (action.attuned) {
        if (selectedArmor.attuned) return state;
        if (!armoryVariantCanAttune(selectedArmor.variantKey)) return state;
        if (!hasFreeAttunementSlot(state)) return state;
        return {
          ...state,
          armor: state.armor.map((entry) =>
            entry.id === action.id ? { ...entry, attuned: true } : entry,
          ),
        };
      }
      if (!selectedArmor.attuned) return state;
      return {
        ...state,
        armor: state.armor.map((entry) => (entry.id === action.id ? stripAttuned(entry) : entry)),
        equipmentActionKeys: removeEquipmentActionKeys(
          state.equipmentActionKeys,
          armoryEquipmentActionKey(action.id),
        ),
      };
    }
    case "SET_ARMOR_WORN": {
      const selectedArmor = state.armor.find((armor) => armor.id === action.id);
      if (!selectedArmor) return state;

      return {
        ...state,
        armor: state.armor.map((armor) => {
          if (armor.id === action.id) return { ...armor, worn: action.worn };
          if (action.worn && isShield(armor.key) === isShield(selectedArmor.key)) {
            return { ...armor, worn: false };
          }
          return armor;
        }),
      };
    }
    case "SET_CURRENT_HIT_POINTS": {
      const max = maxHitPoints(state);
      if (max == null) return state;
      const current = state.currentHitPoints ?? max;
      const value = clampCurrentHitPoints(Math.round(action.value), max);
      if (value < current) {
        const result = applyDamageToCharacter({
          maxHitPoints: max,
          currentHitPoints: state.currentHitPoints,
          temporaryHitPointsMax: state.temporaryHitPointsMax,
          temporaryHitPointsRemaining: state.temporaryHitPointsRemaining,
          damage: current - value,
        });
        return exitWildShapeIfUnconscious(
          withDeathSavesClearedWhenHealed(
            {
              ...state,
              currentHitPoints: result.currentHitPoints,
              temporaryHitPointsMax: result.temporaryHitPointsMax,
              temporaryHitPointsRemaining: result.temporaryHitPointsRemaining,
            },
            result.currentHitPoints,
            max,
          ),
          result.currentHitPoints,
          max,
        );
      }
      const nextHp = value === max ? null : value;
      return exitWildShapeIfUnconscious(
        withDeathSavesClearedWhenHealed({ ...state, currentHitPoints: nextHp }, nextHp, max),
        nextHp,
        max,
      );
    }
    case "SET_DEATH_SAVES": {
      const successes =
        action.successes != null ? clampDeathSave(action.successes) : state.deathSaveSuccesses;
      const failures =
        action.failures != null ? clampDeathSave(action.failures) : state.deathSaveFailures;
      if (successes === state.deathSaveSuccesses && failures === state.deathSaveFailures) {
        return state;
      }
      return { ...state, deathSaveSuccesses: successes, deathSaveFailures: failures };
    }
    case "ADD_CONDITION": {
      const next = addCondition(state, action.conditionKey);
      return next ? { ...state, ...next } : state;
    }
    case "REMOVE_CONDITION": {
      const next = removeCondition(state, action.conditionKey);
      return next ? { ...state, ...next } : state;
    }
    case "SET_CONDITION_ROUNDS": {
      const next = setConditionRounds(state, action.conditionKey, action.value);
      return next ? { ...state, ...next } : state;
    }
    case "SET_EXHAUSTION_LEVEL": {
      const next = setExhaustionLevel(state, action.value);
      return next ? { ...state, ...next } : state;
    }
    case "SET_HEROIC_INSPIRATION": {
      const value = Math.max(0, Math.min(1, Math.round(action.value)));
      if (value === state.heroicInspiration) return state;
      return { ...state, heroicInspiration: value };
    }
    case "APPLY_DAMAGE": {
      const max = maxHitPoints(state);
      if (max == null) return state;
      const damage = Math.max(0, Math.floor(action.amount));
      if (damage <= 0) return state;
      const result = applyDamageToCharacter({
        maxHitPoints: max,
        currentHitPoints: state.currentHitPoints,
        temporaryHitPointsMax: state.temporaryHitPointsMax,
        temporaryHitPointsRemaining: state.temporaryHitPointsRemaining,
        damage,
      });
      const nextHp = result.currentHitPoints;
      return exitWildShapeIfUnconscious(
        {
          ...state,
          currentHitPoints: nextHp,
          temporaryHitPointsMax: result.temporaryHitPointsMax,
          temporaryHitPointsRemaining: result.temporaryHitPointsRemaining,
        },
        nextHp,
        max,
      );
    }
    case "SET_TEMPORARY_HIT_POINTS": {
      if (action.max == null) {
        return { ...state, ...clearTemporaryHitPoints() };
      }
      const max = Math.floor(action.max);
      if (max <= 0) {
        return { ...state, ...clearTemporaryHitPoints() };
      }
      const remainingRaw = action.remaining ?? max;
      const remaining = clampTemporaryHitPointsRemaining(max, remainingRaw);
      if (remaining <= 0) {
        return { ...state, ...clearTemporaryHitPoints() };
      }
      return {
        ...state,
        temporaryHitPointsMax: max,
        temporaryHitPointsRemaining: remaining,
      };
    }
    case "APPLY_TEMPORARY_HIT_POINTS_GRANT": {
      const tempHp = applyTemporaryHitPointsGrant(
        {
          temporaryHitPointsMax: state.temporaryHitPointsMax,
          temporaryHitPointsRemaining: state.temporaryHitPointsRemaining,
        },
        action.amount,
      );
      return {
        ...state,
        temporaryHitPointsMax: tempHp.temporaryHitPointsMax,
        temporaryHitPointsRemaining: tempHp.temporaryHitPointsRemaining,
      };
    }
    case "APPLY_HIT_POINT_MAX_BONUS": {
      const base = baseMaxHitPoints(state);
      if (base == null) return state;
      const result = applyHitPointMaxBonus({
        baseMaxHitPoints: base,
        currentBonus: state.hitPointMaxBonus,
        newBonus: action.amount,
        currentHitPoints: state.currentHitPoints,
      });
      if (
        result.hitPointMaxBonus === state.hitPointMaxBonus &&
        result.currentHitPoints === state.currentHitPoints
      ) {
        return state;
      }
      return withDeathSavesClearedWhenHealed(
        {
          ...state,
          hitPointMaxBonus: result.hitPointMaxBonus,
          currentHitPoints: result.currentHitPoints,
        },
        result.currentHitPoints,
        base + result.hitPointMaxBonus,
      );
    }
    case "CLEAR_HIT_POINT_MAX_BONUS": {
      const base = baseMaxHitPoints(state);
      if (base == null || state.hitPointMaxBonus <= 0) return state;
      const result = clearHitPointMaxBonus({
        baseMaxHitPoints: base,
        currentBonus: state.hitPointMaxBonus,
        currentHitPoints: state.currentHitPoints,
      });
      return withDeathSavesClearedWhenHealed(
        {
          ...state,
          hitPointMaxBonus: result.hitPointMaxBonus,
          currentHitPoints: result.currentHitPoints,
        },
        result.currentHitPoints,
        base,
      );
    }
    case "SET_CURRENT_HIT_DICE": {
      const max = maxHitDice(state);
      if (max == null) return state;
      const value = clampCurrentHitDice(Math.round(action.value), max);
      const next: Character = { ...state, currentHitDice: value === max ? null : value };
      const maxByDie = hitDiceMaxForState(state);
      const dice = Object.keys(maxByDie).map(Number);
      if (dice.length === 1) {
        const die = dice[0]!;
        next.hitDiceRemaining = { ...state.hitDiceRemaining, [die]: value === max ? null : value };
      }
      return next;
    }
    case "SET_HIT_DICE_REMAINING": {
      const maxByDie = hitDiceMaxForState(state);
      const max = maxByDie[action.die];
      if (max == null) return state;
      const value = clampCurrentHitDice(Math.round(action.value), max);
      const hitDiceRemaining = {
        ...state.hitDiceRemaining,
        [action.die]: value === max ? null : value,
      };
      const next: Character = { ...state, hitDiceRemaining };
      const dice = Object.keys(maxByDie).map(Number);
      if (dice.length === 1 && dice[0] === action.die) {
        next.currentHitDice = value === max ? null : value;
      }
      return next;
    }
    case "ADD_CANTRIP_PICK": {
      if (isMulticlassCharacter(state)) return state;
      const limits = spellPickLimits(state);
      const classData = findByKey(CLASSES, state.classKey);
      const subclass = findSubclass(state.classKey, state.subclassKey);
      const listClassKey = effectiveSpellListClassKey(classData, subclass, state.level);
      const list = classSpellListFor(state.classKey, listClassKey);
      const allowed = filterOwnedSpellPickOptions(
        list.cantrips,
        ownedSpellKeysForState(state),
        state.cantripPicks,
      );
      const cantripPicks = addCompactSpellPick(state.cantripPicks, action.spellKey, limits.cantripSlots, allowed);
      if (!cantripPicks) return state;
      return { ...state, cantripPicks };
    }
    case "REMOVE_CANTRIP_PICK": {
      if (isMulticlassCharacter(state)) return state;
      if (!state.cantripPicks.includes(action.spellKey)) return state;
      return { ...state, cantripPicks: removeCompactSpellPick(state.cantripPicks, action.spellKey) };
    }
    case "ADD_SPELL_PICK": {
      const limits = spellPickLimits(state);
      const spellPicks = addCompactSpellPick(
        state.spellPicks,
        action.spellKey,
        limits.spellSlots,
        preparedSpellOptions(state),
      );
      if (!spellPicks) return state;
      return { ...state, spellPicks };
    }
    case "REMOVE_SPELL_PICK": {
      if (!state.spellPicks.includes(action.spellKey)) return state;
      return { ...state, spellPicks: removeCompactSpellPick(state.spellPicks, action.spellKey) };
    }
    case "ADD_ALWAYS_PREPARED_SPELL_PICK": {
      const alwaysPreparedSpellPicks = addUniqueCatalogSpellPick(
        state.alwaysPreparedSpellPicks,
        action.spellKey,
      );
      if (!alwaysPreparedSpellPicks) return state;
      return { ...state, alwaysPreparedSpellPicks };
    }
    case "REMOVE_ALWAYS_PREPARED_SPELL_PICK": {
      if (!state.alwaysPreparedSpellPicks.includes(action.spellKey)) return state;
      return {
        ...state,
        alwaysPreparedSpellPicks: removeCompactSpellPick(state.alwaysPreparedSpellPicks, action.spellKey),
      };
    }
    case "ADD_SPELLBOOK_PICK": {
      const classData = findByKey(CLASSES, state.classKey);
      const subclass = findSubclass(state.classKey, state.subclassKey);
      const limits = spellPickLimits(state);
      if (
        state.spellbookExtraPicks.includes(action.spellKey) ||
        state.subclassSpellbookPicks.includes(action.spellKey)
      ) {
        return state;
      }
      const allowed = filterOwnedSpellPickOptions(
        spellbookListKeys(classData, state.level, subclass),
        ownedSpellKeysForState(state),
        [...state.spellbookPicks, ...state.spellbookExtraPicks, ...state.subclassSpellbookPicks],
      );
      const spellbookPicks = addCompactSpellPick(
        state.spellbookPicks,
        action.spellKey,
        limits.spellbookSlots,
        allowed,
      );
      if (!spellbookPicks) return state;
      return { ...state, spellbookPicks };
    }
    case "REMOVE_SPELLBOOK_PICK": {
      if (!state.spellbookPicks.includes(action.spellKey)) return state;
      const spellbookPicks = removeCompactSpellPick(state.spellbookPicks, action.spellKey);
      const spellPicks = filterPreparedToSpellbook({ ...state, spellbookPicks }, state.spellPicks);
      return { ...state, spellbookPicks, spellPicks };
    }
    case "ADD_SPELLBOOK_EXTRA_PICK": {
      const classData = findByKey(CLASSES, state.classKey);
      const subclass = findSubclass(state.classKey, state.subclassKey);
      const allowed = filterOwnedSpellPickOptions(
        spellbookListKeys(classData, state.level, subclass),
        ownedSpellKeysForState(state),
        allSpellbookKeys(spellbookBuckets(state)),
      );
      const spellbookExtraPicks = addUncappedCompactSpellPick(
        state.spellbookExtraPicks,
        action.spellKey,
        allowed,
        spellbookBuckets(state),
      );
      if (!spellbookExtraPicks) return state;
      return { ...state, spellbookExtraPicks };
    }
    case "REMOVE_SPELLBOOK_EXTRA_PICK": {
      if (!state.spellbookExtraPicks.includes(action.spellKey)) return state;
      const spellbookExtraPicks = removeCompactSpellPick(state.spellbookExtraPicks, action.spellKey);
      const spellPicks = filterPreparedToSpellbook({ ...state, spellbookExtraPicks }, state.spellPicks);
      return { ...state, spellbookExtraPicks, spellPicks };
    }
    case "ADD_SUBCLASS_SPELLBOOK_PICK": {
      const subclass = findSubclass(state.classKey, state.subclassKey);
      if (!subclass) return state;
      const maxCount = subclassSpellbookPickCount(subclass, state.level);
      const allowed = subclassSpellbookPickOptionsForState(state, subclass);
      if (state.spellbookPicks.includes(action.spellKey) || state.spellbookExtraPicks.includes(action.spellKey)) {
        return state;
      }
      const subclassSpellbookPicks = addCompactSpellPick(
        state.subclassSpellbookPicks,
        action.spellKey,
        maxCount,
        allowed,
      );
      if (!subclassSpellbookPicks) return state;
      return { ...state, subclassSpellbookPicks };
    }
    case "REMOVE_SUBCLASS_SPELLBOOK_PICK": {
      if (!state.subclassSpellbookPicks.includes(action.spellKey)) return state;
      const subclassSpellbookPicks = removeCompactSpellPick(state.subclassSpellbookPicks, action.spellKey);
      const spellPicks = filterPreparedToSpellbook({ ...state, subclassSpellbookPicks }, state.spellPicks);
      return { ...state, subclassSpellbookPicks, spellPicks };
    }
    case "SET_CONCENTRATION_SPELL": {
      if (action.spellKey === state.concentrationSpellKey) return state;
      if (action.spellKey == null) {
        if (state.concentrationSpellKey == null) return state;
        return { ...state, concentrationSpellKey: null, concentrationRoundsRemaining: null };
      }
      if (!preparedConcentrationOptionsForState(state).includes(action.spellKey)) return state;
      return {
        ...state,
        concentrationSpellKey: action.spellKey,
        concentrationRoundsRemaining: null,
      };
    }
    case "SET_CONCENTRATION_ROUNDS": {
      const spellKey = state.concentrationSpellKey;
      if (spellKey == null) return state;
      const spell = findSpellByKey(spellKey);
      if (!spell) return state;
      const max = spellDurationToRounds(spell.duration);
      if (max == null) return state;
      const value = Math.max(0, Math.min(max, Math.round(action.value)));
      if (value === max) {
        if (state.concentrationRoundsRemaining == null) return state;
        return { ...state, concentrationRoundsRemaining: null };
      }
      if (state.concentrationRoundsRemaining === value) return state;
      return { ...state, concentrationRoundsRemaining: value };
    }
    case "SET_SPELL_SLOT_REMAINING": {
      const spellLevel = action.spellLevel;
      if (!Number.isInteger(spellLevel) || spellLevel < 1 || spellLevel > 9) return state;
      const max = spellcastingSlotsMaxForState(state)[spellLevel] ?? 0;
      if (max <= 0) return state;
      const value = clampSpellSlotRemaining(Math.round(action.value), max);
      if (value === max) {
        if (!(spellLevel in state.spellSlotRemaining)) return state;
        const { [spellLevel]: _removed, ...rest } = state.spellSlotRemaining;
        return { ...state, spellSlotRemaining: rest };
      }
      if (state.spellSlotRemaining[spellLevel] === value) return state;
      return { ...state, spellSlotRemaining: { ...state.spellSlotRemaining, [spellLevel]: value } };
    }
    case "SET_PACT_SLOT_REMAINING": {
      const classLevels = resolvedClassLevels(effectiveLevelPath(state));
      const pactMagic = pactMagicPoolFromClassLevels(classLevels, (classKey) => findByKey(CLASSES, classKey) ?? null);
      if (!pactMagic || pactMagic.slotLevel !== action.slotLevel) return state;
      const value = clampSpellSlotRemaining(Math.round(action.count), pactMagic.count);
      if (value === pactMagic.count) {
        if (state.pactSlotRemaining === null) return state;
        return { ...state, pactSlotRemaining: null };
      }
      if (
        state.pactSlotRemaining?.count === value &&
        state.pactSlotRemaining?.slotLevel === action.slotLevel
      ) {
        return state;
      }
      return { ...state, pactSlotRemaining: { count: value, slotLevel: action.slotLevel } };
    }
    case "ADD_CLASS_SPELL_PICK": {
      const classLevels = resolvedClassLevels(effectiveLevelPath(state));
      const entry = classLevels.find((level) => level.classKey === action.classKey);
      if (!entry) return state;
      const classData = findByKey(CLASSES, action.classKey);
      const subclassKey = subclassKeyForClass(state, action.classKey);
      const subclass = findSubclass(action.classKey, subclassKey);
      const limits = spellPickLimitsForClass(
        classData,
        derivedAbilityModifiers(state),
        entry.classLevel,
        classFeatureChoicesForClass(state, action.classKey),
        subclass,
      );
      const current = spellPicksForClass(state, action.classKey);
      const spellPicks = addCompactSpellPick(
        current,
        action.spellKey,
        limits.spellSlots,
        preparedSpellOptionsForClass(state, action.classKey, entry.classLevel),
      );
      if (!spellPicks) return state;
      return {
        ...state,
        spellPicksByClass: { ...state.spellPicksByClass, [action.classKey]: spellPicks },
      };
    }
    case "REMOVE_CLASS_SPELL_PICK": {
      const current = spellPicksForClass(state, action.classKey);
      if (!current.includes(action.spellKey)) return state;
      const spellPicks = removeCompactSpellPick(current, action.spellKey);
      return {
        ...state,
        spellPicksByClass: { ...state.spellPicksByClass, [action.classKey]: spellPicks },
      };
    }
    case "ADD_CLASS_CANTRIP_PICK": {
      const classLevels = resolvedClassLevels(effectiveLevelPath(state));
      const entry = classLevels.find((level) => level.classKey === action.classKey);
      if (!entry) return state;
      const classData = findByKey(CLASSES, action.classKey);
      const subclassKey = subclassKeyForClass(state, action.classKey);
      const subclass = findSubclass(action.classKey, subclassKey);
      const limits = spellPickLimitsForClass(
        classData,
        derivedAbilityModifiers(state),
        entry.classLevel,
        classFeatureChoicesForClass(state, action.classKey),
        subclass,
      );
      const current = cantripPicksForClass(state, action.classKey);
      const allowed = filterOwnedSpellPickOptions(
        cantripPickOptionsForClass(action.classKey, entry.classLevel, state),
        ownedSpellKeysForState(state),
        current,
      );
      const cantripPicks = addCompactSpellPick(current, action.spellKey, limits.cantripSlots, allowed);
      if (!cantripPicks) return state;
      return {
        ...state,
        cantripPicksByClass: { ...state.cantripPicksByClass, [action.classKey]: cantripPicks },
      };
    }
    case "REMOVE_CLASS_CANTRIP_PICK": {
      const current = cantripPicksForClass(state, action.classKey);
      if (!current.includes(action.spellKey)) return state;
      const cantripPicks = removeCompactSpellPick(current, action.spellKey);
      return {
        ...state,
        cantripPicksByClass: { ...state.cantripPicksByClass, [action.classKey]: cantripPicks },
      };
    }
    case "ADD_CLASS_SPELLBOOK_PICK": {
      const classLevels = resolvedClassLevels(effectiveLevelPath(state));
      const entry = classLevels.find((level) => level.classKey === action.classKey);
      if (!entry) return state;
      const classData = findByKey(CLASSES, action.classKey);
      const subclassKey = subclassKeyForClass(state, action.classKey);
      const subclass = findSubclass(action.classKey, subclassKey);
      const limits = spellPickLimitsForClass(
        classData,
        derivedAbilityModifiers(state),
        entry.classLevel,
        classFeatureChoicesForClass(state, action.classKey),
        subclass,
      );
      const current = spellbookPicksForClass(state, action.classKey);
      const allowed = filterOwnedSpellPickOptions(
        spellbookListKeys(classData, entry.classLevel, subclass),
        ownedSpellKeysForState(state),
        current,
      );
      const spellbookPicks = addCompactSpellPick(current, action.spellKey, limits.spellbookSlots, allowed);
      if (!spellbookPicks) return state;
      return {
        ...state,
        spellbookPicksByClass: { ...state.spellbookPicksByClass, [action.classKey]: spellbookPicks },
      };
    }
    case "REMOVE_CLASS_SPELLBOOK_PICK": {
      const current = spellbookPicksForClass(state, action.classKey);
      if (!current.includes(action.spellKey)) return state;
      const spellbookPicks = removeCompactSpellPick(current, action.spellKey);
      const spellPicks = removeCompactSpellPick(
        spellPicksForClass(state, action.classKey),
        action.spellKey,
      );
      return {
        ...state,
        spellbookPicksByClass: { ...state.spellbookPicksByClass, [action.classKey]: spellbookPicks },
        spellPicksByClass: { ...state.spellPicksByClass, [action.classKey]: spellPicks },
      };
    }
    case "CREATE_SPELL_SLOT_FROM_SORCERY": {
      const classData = findByKey(CLASSES, state.classKey);
      if (!classData || state.level < 2) return state;
      const spellLevel = action.spellLevel;
      if (!Number.isInteger(spellLevel) || spellLevel < 1 || spellLevel > 5) return state;
      const costRow = fontOfMagicSlotCost(spellLevel);
      if (!costRow || state.level < costRow.minSorcererLevel) return state;

      const tracker = classFeatureUseTrackersForState(state, "spells").find(
        (entry) => entry.featureKey === FONT_OF_MAGIC_FEATURE_KEY,
      );
      if (!tracker) return state;

      const currentSp = state.classFeatureUses[FONT_OF_MAGIC_FEATURE_KEY] ?? tracker.maxUses;
      if (currentSp < costRow.sorceryPointCost) return state;

      const newSp = currentSp - costRow.sorceryPointCost;
      const classFeatureUses = { ...state.classFeatureUses };
      if (newSp === tracker.maxUses) {
        delete classFeatureUses[FONT_OF_MAGIC_FEATURE_KEY];
      } else {
        classFeatureUses[FONT_OF_MAGIC_FEATURE_KEY] = newSp;
      }

      const createdSpellSlots = {
        ...state.createdSpellSlots,
        [spellLevel]: (state.createdSpellSlots[spellLevel] ?? 0) + 1,
      };
      const oldMax = effectiveSpellSlotCount(classData, state.level, spellLevel, state.createdSpellSlots);
      const newMax = effectiveSpellSlotCount(classData, state.level, spellLevel, createdSpellSlots);
      const oldRemaining = state.spellSlotRemaining[spellLevel] ?? oldMax;
      const newRemaining = oldRemaining + 1;
      const spellSlotRemaining = { ...state.spellSlotRemaining };
      if (newRemaining >= newMax) {
        delete spellSlotRemaining[spellLevel];
      } else {
        spellSlotRemaining[spellLevel] = newRemaining;
      }

      return { ...state, classFeatureUses, createdSpellSlots, spellSlotRemaining };
    }
    case "CONVERT_SPELL_SLOT_TO_SORCERY": {
      const classData = findByKey(CLASSES, state.classKey);
      if (!classData || state.level < 2) return state;
      const spellLevel = action.spellLevel;
      if (!Number.isInteger(spellLevel) || spellLevel < 1 || spellLevel > 9) return state;
      const maxSlots = effectiveSpellSlotCount(classData, state.level, spellLevel, state.createdSpellSlots);
      if (maxSlots <= 0) return state;

      const tracker = classFeatureUseTrackersForState(state, "spells").find(
        (entry) => entry.featureKey === FONT_OF_MAGIC_FEATURE_KEY,
      );
      if (!tracker) return state;

      const currentSp = state.classFeatureUses[FONT_OF_MAGIC_FEATURE_KEY] ?? tracker.maxUses;
      if (currentSp >= tracker.maxUses) return state;

      const remaining = state.spellSlotRemaining[spellLevel] ?? maxSlots;
      if (remaining <= 0) return state;

      const newSp = Math.min(tracker.maxUses, currentSp + spellLevel);
      const classFeatureUses = { ...state.classFeatureUses };
      if (newSp === tracker.maxUses) {
        delete classFeatureUses[FONT_OF_MAGIC_FEATURE_KEY];
      } else {
        classFeatureUses[FONT_OF_MAGIC_FEATURE_KEY] = newSp;
      }

      const newRemaining = remaining - 1;
      const spellSlotRemaining = { ...state.spellSlotRemaining };
      if (newRemaining >= maxSlots) {
        delete spellSlotRemaining[spellLevel];
      } else {
        spellSlotRemaining[spellLevel] = newRemaining;
      }

      return { ...state, classFeatureUses, spellSlotRemaining };
    }
    case "SET_CLASS_FEATURE_USES": {
      const classData = findByKey(CLASSES, state.classKey);
      if (!classData) return state;
      const trackers = classFeatureUseTrackersForState(state);
      const tracker = trackers.find((entry) => entry.featureKey === action.featureKey);
      if (!tracker) return state;
      const value = clampClassFeatureUses(Math.round(action.value), tracker.maxUses);
      if (value === tracker.maxUses) {
        if (!(action.featureKey in state.classFeatureUses)) return state;
        const { [action.featureKey]: _removed, ...rest } = state.classFeatureUses;
        return { ...state, classFeatureUses: rest };
      }
      if (state.classFeatureUses[action.featureKey] === value) return state;
      return {
        ...state,
        classFeatureUses: { ...state.classFeatureUses, [action.featureKey]: value },
      };
    }
    case "SET_CLASS_FEATURE_POOL_REMAINING": {
      const trackers = classFeaturePoolTrackersForState(state);
      const tracker = trackers.find((entry) => entry.featureKey === action.featureKey);
      if (!tracker) return state;
      const value = clampClassFeatureUses(Math.round(action.value), tracker.maxHp);
      if (value === 0) {
        if (!(action.featureKey in state.classFeaturePoolRemaining)) return state;
        const { [action.featureKey]: _removed, ...rest } = state.classFeaturePoolRemaining;
        return { ...state, classFeaturePoolRemaining: rest };
      }
      if (state.classFeaturePoolRemaining[action.featureKey] === value) return state;
      return {
        ...state,
        classFeaturePoolRemaining: {
          ...state.classFeaturePoolRemaining,
          [action.featureKey]: value,
        },
      };
    }
    case "ADD_WILD_SHAPE_KNOWN_FORM": {
      if (state.classKey !== "druid" || state.level < 2) return state;
      if (state.wildShapeKnownForms.length >= WILD_SHAPE_KNOWN_FORM_COUNT) return state;
      if (state.wildShapeKnownForms.includes(action.formKey)) return state;
      const eligibleKeys = new Set(
        wildShapeEligibleBeasts(state.level, state.subclassKey).map((beast) => beast.key),
      );
      if (!eligibleKeys.has(action.formKey)) return state;
      return { ...state, wildShapeKnownForms: [...state.wildShapeKnownForms, action.formKey] };
    }
    case "REMOVE_WILD_SHAPE_KNOWN_FORM": {
      if (state.classKey !== "druid" || state.level < 2) return state;
      if (!state.wildShapeKnownForms.includes(action.formKey)) return state;
      const wildShapeKnownForms = state.wildShapeKnownForms.filter((key) => key !== action.formKey);
      const wildShapeActiveFormKey =
        state.wildShapeActiveFormKey === action.formKey ? null : state.wildShapeActiveFormKey;
      return { ...state, wildShapeKnownForms, wildShapeActiveFormKey };
    }
    case "ADD_ARTIFICER_PLAN": {
      if (state.classKey !== "artificer" || state.level < 2) return state;
      if (!canAddArtificerPlan(state.artificerPlanKeys, action.planKey, state.level)) return state;
      return { ...state, artificerPlanKeys: [...state.artificerPlanKeys, action.planKey] };
    }
    case "REMOVE_ARTIFICER_PLAN": {
      if (state.classKey !== "artificer" || state.level < 2) return state;
      if (!state.artificerPlanKeys.includes(action.planKey)) return state;
      const artificerPlanKeys = state.artificerPlanKeys.filter((key) => key !== action.planKey);
      const artificerCreatedItemKeys = state.artificerCreatedItemKeys.filter((key) => key !== action.planKey);
      return { ...state, artificerPlanKeys, artificerCreatedItemKeys };
    }
    case "ADD_ARTIFICER_CREATED_ITEM": {
      if (state.classKey !== "artificer" || state.level < 2) return state;
      if (!canAddArtificerCreatedItem(state.artificerPlanKeys, state.artificerCreatedItemKeys, action.planKey, state.level)) {
        return state;
      }
      return { ...state, artificerCreatedItemKeys: [...state.artificerCreatedItemKeys, action.planKey] };
    }
    case "REMOVE_ARTIFICER_CREATED_ITEM": {
      if (state.classKey !== "artificer" || state.level < 2) return state;
      if (!state.artificerCreatedItemKeys.includes(action.planKey)) return state;
      return {
        ...state,
        artificerCreatedItemKeys: state.artificerCreatedItemKeys.filter((key) => key !== action.planKey),
      };
    }
    case "ADD_ATTUNED_MAGIC_ITEM": {
      if (!hasFreeAttunementSlot(state)) return state;
      if (!state.adventuringGear.some((entry) => entry.key === action.itemKey)) return state;
      const attunedMagicItemKeys = addAttunedMagicItem(
        state.attunedMagicItemKeys,
        action.itemKey,
        attunementEligibleCarriedKeys(state.adventuringGear),
      );
      if (!attunedMagicItemKeys) return state;
      return { ...state, attunedMagicItemKeys };
    }
    case "REMOVE_ATTUNED_MAGIC_ITEM": {
      if (!state.attunedMagicItemKeys.includes(action.itemKey)) return state;
      return {
        ...state,
        attunedMagicItemKeys: removeAttunedMagicItem(state.attunedMagicItemKeys, action.itemKey),
        equipmentActionKeys: removeEquipmentActionKeys(
          state.equipmentActionKeys,
          gearEquipmentActionKey(action.itemKey),
        ),
      };
    }
    case "ADD_ADVENTURING_GEAR": {
      const adventuringGear = addAdventuringGear(state.adventuringGear, action.itemKey);
      if (!adventuringGear) return state;
      return { ...state, adventuringGear };
    }
    case "REMOVE_ADVENTURING_GEAR": {
      if (!state.adventuringGear.some((entry) => entry.key === action.itemKey)) return state;
      const adventuringGear = removeAdventuringGear(state.adventuringGear, action.itemKey);
      const attunedMagicItemKeys = state.attunedMagicItemKeys.includes(action.itemKey)
        ? removeAttunedMagicItem(state.attunedMagicItemKeys, action.itemKey)
        : state.attunedMagicItemKeys;
      return {
        ...state,
        adventuringGear,
        attunedMagicItemKeys,
        equipmentActionKeys: removeEquipmentActionKeys(
          state.equipmentActionKeys,
          gearEquipmentActionKey(action.itemKey),
        ),
        magicItemChargeRemaining: removeMagicItemChargeKey(
          state.magicItemChargeRemaining,
          action.itemKey,
        ),
        equipmentRestUsesRemaining: removeGearEquipmentRestUses(
          state.equipmentRestUsesRemaining,
          action.itemKey,
        ),
      };
    }
    case "SET_ADVENTURING_GEAR_QUANTITY": {
      const adventuringGear = setAdventuringGearQuantity(state.adventuringGear, action.itemKey, action.value);
      if (!adventuringGear) return state;
      const attunedMagicItemKeys =
        action.value <= 0 && state.attunedMagicItemKeys.includes(action.itemKey)
          ? removeAttunedMagicItem(state.attunedMagicItemKeys, action.itemKey)
          : state.attunedMagicItemKeys;
      const equipmentActionKeys =
        action.value <= 0
          ? removeEquipmentActionKeys(state.equipmentActionKeys, gearEquipmentActionKey(action.itemKey))
          : state.equipmentActionKeys;
      const magicItemChargeRemaining =
        action.value <= 0
          ? removeMagicItemChargeKey(state.magicItemChargeRemaining, action.itemKey)
          : state.magicItemChargeRemaining;
      const equipmentRestUsesRemaining =
        action.value <= 0
          ? removeGearEquipmentRestUses(state.equipmentRestUsesRemaining, action.itemKey)
          : state.equipmentRestUsesRemaining;
      return {
        ...state,
        adventuringGear,
        attunedMagicItemKeys,
        equipmentActionKeys,
        magicItemChargeRemaining,
        equipmentRestUsesRemaining,
      };
    }
    case "SET_PACK_CONTENT_REMAINING": {
      const index = state.adventuringGear.findIndex((entry) => entry.key === action.packKey);
      if (index < 0) return state;
      const updated = setPackContentRemaining(state.adventuringGear[index], action.itemKey, action.value);
      if (!updated) return state;
      const adventuringGear = state.adventuringGear.map((entry, entryIndex) =>
        entryIndex === index ? updated : entry,
      );
      return { ...state, adventuringGear };
    }
    case "ADD_EQUIPMENT_ACTION": {
      if (state.equipmentActionKeys.includes(action.actionKey)) return state;
      if (!isEquipmentActionEligible(state, action.actionKey)) return state;
      return { ...state, equipmentActionKeys: [...state.equipmentActionKeys, action.actionKey] };
    }
    case "REMOVE_EQUIPMENT_ACTION": {
      if (!state.equipmentActionKeys.includes(action.actionKey)) return state;
      return {
        ...state,
        equipmentActionKeys: removeEquipmentActionKeys(state.equipmentActionKeys, action.actionKey),
      };
    }
    case "ENTER_WILD_SHAPE": {
      if (state.wildShapeActiveFormKey != null) return state;
      const classData = findByKey(CLASSES, state.classKey);
      if (!classData) return state;
      const trackers = classFeatureUseTrackersForState(state);
      const tracker = trackers.find((entry) => entry.featureKey === WILD_SHAPE_FEATURE_KEY);
      if (!tracker) return state;
      if (!canEnterWildShape(state, action.formKey, tracker.maxUses)) return state;
      return { ...state, ...enterWildShapeState(state, action.formKey, tracker.maxUses) };
    }
    case "EXIT_WILD_SHAPE": {
      if (state.wildShapeActiveFormKey == null) return state;
      return { ...state, wildShapeActiveFormKey: null };
    }
    case "SET_TRACKED_CREATURE_FORM":
      return mapTrackedCreature(state, action.id, (instance) =>
        instance.formKey === action.formKey ? instance : { ...instance, formKey: action.formKey },
      );
    case "SET_TRACKED_CREATURE_SPIRIT_TYPE":
      return mapTrackedCreature(state, action.id, (instance) =>
        instance.spiritType === action.spiritType ? instance : { ...instance, spiritType: action.spiritType },
      );
    case "SET_TRACKED_CREATURE_CAST_SLOT_LEVEL": {
      const level = Math.max(1, Math.floor(action.castSlotLevel));
      return mapTrackedCreature(state, action.id, (instance) =>
        instance.castSlotLevel === level ? instance : { ...instance, castSlotLevel: level },
      );
    }
    case "SET_TRACKED_CREATURE_CURRENT_HP": {
      return mapTrackedCreature(state, action.id, (instance) => {
        const block = resolveTrackedCreatureStatBlock(state, instance);
        if (!block) return instance;
        return updateTrackedCreatureHp(instance, block.maxHitPoints, Math.floor(action.value));
      });
    }
    case "SET_TRACKED_CREATURE_TEMP_HP": {
      if (action.max == null) {
        return mapTrackedCreature(state, action.id, (instance) =>
          instance.temporaryHitPointsMax == null && instance.temporaryHitPointsRemaining == null
            ? instance
            : { ...instance, temporaryHitPointsMax: null, temporaryHitPointsRemaining: null },
        );
      }
      const max = Math.floor(action.max);
      if (max <= 0) {
        return mapTrackedCreature(state, action.id, (instance) =>
          instance.temporaryHitPointsMax == null && instance.temporaryHitPointsRemaining == null
            ? instance
            : { ...instance, temporaryHitPointsMax: null, temporaryHitPointsRemaining: null },
        );
      }
      const remaining = clampTemporaryHitPointsRemaining(max, action.remaining ?? max);
      if (remaining <= 0) {
        return mapTrackedCreature(state, action.id, (instance) =>
          instance.temporaryHitPointsMax == null && instance.temporaryHitPointsRemaining == null
            ? instance
            : { ...instance, temporaryHitPointsMax: null, temporaryHitPointsRemaining: null },
        );
      }
      return mapTrackedCreature(state, action.id, (instance) => ({
        ...instance,
        temporaryHitPointsMax: max,
        temporaryHitPointsRemaining: remaining,
      }));
    }
    case "SET_TRACKED_CREATURE_FEATURE_USE": {
      const value = Math.max(0, Math.floor(action.value));
      return mapTrackedCreature(state, action.id, (instance) => {
        if ((instance.featureUses[action.useKey] ?? value) === value) return instance;
        return { ...instance, featureUses: { ...instance.featureUses, [action.useKey]: value } };
      });
    }
    case "DISMISS_TRACKED_CREATURE":
      return mapTrackedCreature(state, action.id, (instance) =>
        instance.dismissed ? instance : { ...instance, dismissed: true },
      );
    case "RECALL_TRACKED_CREATURE":
      return mapTrackedCreature(state, action.id, (instance) =>
        instance.dismissed ? { ...instance, dismissed: false } : instance,
      );
    case "SET_TRACKED_CREATURE_SUMMONED": {
      const ctx = buildCreatureSourceContext(state);
      const registry = trackedCreatureRegistry();
      const source = registry.get(
        state.trackedCreatures.find((row) => row.id === action.id)?.sourceKey ?? "",
      );

      if (!action.summoned) {
        let nextState = state;
        const target = state.trackedCreatures.find((row) => row.id === action.id);
        if (target?.summonPayment) {
          const derived = computeDerivedStats(state);
          const speciesData = state.speciesKey ? findByKey(SPECIES, state.speciesKey) : null;
          const refundInput = buildCastSpellAvailabilityInputFromCharacter(
            state,
            derived,
            target.summonPayment.spellKey,
            activeFeatKeysFromCharacter(state),
            featChoicesResolverForCharacter(state),
            speciesData,
          );
          const refunded = applyCompanionSummonPaymentRefund(state, target.summonPayment, refundInput);
          nextState = { ...state, ...refunded };
        }
        return mapTrackedCreature(nextState, action.id, (instance) => {
          if (instance.summoned !== true) return instance;
          return {
            ...instance,
            summoned: false,
            summonPayment: undefined,
            dismissed: undefined,
          };
        });
      }

      return mapTrackedCreature(state, action.id, (instance) => {
        if (!companionSummonRequirementsMet(ctx, registry, instance)) return instance;
        if (instance.summoned === true) return instance;
        if (source?.summonSpellKey && !action.payment) return instance;
        const castSlotLevel =
          action.payment?.slotLevel ?? instance.castSlotLevel ?? source?.defaultInstanceFields(ctx).castSlotLevel;
        return {
          ...instance,
          summoned: true,
          summonPayment: action.payment,
          castSlotLevel: castSlotLevel ?? instance.castSlotLevel,
          currentHitPoints: null,
          temporaryHitPointsMax: null,
          temporaryHitPointsRemaining: null,
        };
      });
    }
    case "APPLY_REST":
      return applyRest(state, action.kind);
    case "SET_CURRENCY": {
      const value = Number.isFinite(action.value) ? Math.max(0, Math.floor(action.value)) : 0;
      if (state.currency[action.denomination] === value) return state;
      return { ...state, currency: { ...state.currency, [action.denomination]: value } };
    }
    case "ADD_INVENTORY_ITEM": {
      const name = action.name.trim();
      if (!name) return state;
      if (!Number.isFinite(action.weightLb) || action.weightLb < 0) return state;
      if (!Number.isFinite(action.cost.amount) || action.cost.amount < 0) return state;
      return {
        ...state,
        inventoryItems: [
          ...state.inventoryItems,
          { id: action.id, name, weightLb: action.weightLb, cost: action.cost },
        ],
      };
    }
    case "REMOVE_INVENTORY_ITEM":
      return { ...state, inventoryItems: state.inventoryItems.filter((item) => item.id !== action.id) };
    default:
      return state;
  }
}

export function characterReducer(
  state: Character,
  action: CharacterAction,
  tableRules: TableRules = RAW_TABLE_RULES,
): Character {
  return withSyncedTrackedCreatures(
    withValidConcentrationSpell(
      withClampedSpellPicks(
        withClampedSpellSlotRemaining(
          withClampedSpeciesFeatureUses(
            withClampedClassFeatureUses(
              withClampedCurrentHitDice(withClampedCurrentHitPoints(reduceCharacter(state, action, tableRules))),
            ),
          ),
        ),
      ),
    ),
  );
}
