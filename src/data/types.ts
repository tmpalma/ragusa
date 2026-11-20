export type AbilityId = "str" | "dex" | "con" | "int" | "wis" | "cha";

export type RulesetId = "2014" | "2024";

export interface BookData {
  /** 5etools source id (e.g. XPHB, PHB, EFA). */
  key: string;
  name: string;
  ruleset: RulesetId;
  /** True for SRD 5.1 / SRD 5.2 publications, not for PHB/XPHB. */
  srdPublication?: boolean;
}

export interface CatalogSource {
  /** True iff the entity is in the SRD of its ruleset (SRD 5.2 today). */
  srd: boolean;
  /** Primary print source; key into the books catalog. */
  book: string;
}

export type SkillId =
  | "acrobatics"
  | "animalHandling"
  | "arcana"
  | "athletics"
  | "deception"
  | "history"
  | "insight"
  | "intimidation"
  | "investigation"
  | "medicine"
  | "nature"
  | "perception"
  | "performance"
  | "persuasion"
  | "religion"
  | "sleightOfHand"
  | "stealth"
  | "survival";

export type CasterType = "NONE" | "HALF" | "FULL" | "PACT";

export interface EquipmentOption {
  label: string;
  items: string[];
  gold: number;
}

export interface SpellSlotTable {
  /** Spell slots by character level. Each row is indexed by spell level 1-9 (array index 0 = 1st level). */
  byCharacterLevel: Partial<Record<number, number[]>>;
}

export type ActionTiming = "action" | "bonus" | "reaction";

export type LimitedUsesFormula =
  | { kind: "fixed"; uses: number }
  | { kind: "abilityMod"; ability: AbilityId; plus?: number }
  | { kind: "levelTimes"; multiplier: number }
  | { kind: "proficiencyBonus" }
  | { kind: "byLevel"; usesByLevel: Partial<Record<number, number>> };

/** How a limited-use feature recovers on Short Rest vs Long Rest. Defaults to "long". */
export type RestRecovery = "long" | "short" | "shortOne";

export type ArmorCategory = "light" | "medium" | "heavy";

/** Timed or attack card shown when a choose_feature_option pick is selected (Armor Model). */
export interface FeatureOptionCombatCard {
  key: string;
  name: string;
  desc: string;
  /** Timed column when this is a bonus/reaction/action, not an attack. */
  actionTiming?: ActionTiming;
  limitedUses?: LimitedUsesFormula;
  restRecovery?: RestRecovery;
  /** When set, the card appears in Combat Attacks with INT/STR/DEX attack math. */
  attack?: {
    damageDice: string;
    damageType: string;
    ability: AbilityId;
  };
}

/** Option payload for choose_feature_option (subclass and base-class features). */
export interface FeatureOptionData {
  key: string;
  name: string;
  desc: string;
  spellNames?: string[];
  weaponProficiencies?: WeaponProficiencyGrant[];
  armorCategories?: ArmorCategory[];
  extraCantripCount?: number;
  skillCheckBonus?: { skills: SkillId[]; ability: AbilityId; minimum?: number; choiceKey?: string };
  /** Minimum Warlock (or class) level to select this option. */
  minLevel?: number;
  /** When true, the same option key may appear in multiple pick slots. */
  repeatable?: boolean;
  /** When set, player picks a target cantrip; stored in classFeatureChoices under `${cantripChoiceKey}-${slotIndex}`. */
  cantripChoiceKey?: string;
  /** When set, show a timed combat action card for this option (e.g. Pact of the Blade). */
  actionTiming?: ActionTiming;
  /** Extra Combat cards while this option is selected (Armor Model weapons and bonus actions). */
  combatCards?: FeatureOptionCombatCard[];
}

export type ClassFeatureEffect =
  | { type: "sneak_attack"; diceByLevel: Partial<Record<number, string>> }
  | { type: "martial_arts"; diceByLevel: Partial<Record<number, string>> }
  | { type: "weapon_mastery"; count: number; countByLevel?: Partial<Record<number, number>>; meleeOnly?: boolean }
  | { type: "grant_feat" }
  | { type: "expertise"; count: number }
  | { type: "second_wind"; uses?: number; healDice: string }
  | { type: "fighting_style_feature" }
  | { type: "unarmored_defense"; abilities: AbilityId[]; disallowShield?: boolean }
  | { type: "hit_points_per_class_level"; amount: number }
  | { type: "jack_of_all_trades" }
  | { type: "unarmored_movement"; bonusFeet: number }
  | { type: "saving_throw_bonus"; ability: AbilityId; minimum?: number }
  | { type: "roving" }
  | { type: "darkvision"; feet: number; increaseExisting?: boolean }
  | { type: "grant_skill_proficiencies"; count: number; options?: SkillId[]; fixedSkills?: SkillId[] }
  | { type: "grant_languages"; languages: LanguageId[] }
  | { type: "grant_language_picks"; count: number }
  | { type: "always_prepared_spells"; spellNames: string[] }
  | {
      type: "choose_feature_option";
      choiceKey: string;
      options: FeatureOptionData[];
      /** When > 1, use classFeatureOptionPicks instead of classFeatureChoices. Defaults to 1. */
      count?: number;
      /** Pick count by character level (highest entry at or below level wins). */
      countByLevel?: Partial<Record<number, number>>;
      /** Where multi-pick UI renders. Defaults to "character". Use "reference" for combat-time options listed on the Class Features card without a stored pick. */
      uiSurface?: "character" | "spells" | "combat" | "reference";
    }
  | { type: "grant_spellbook_picks"; count: number; school: string; maxSpellLevel: number }
  | { type: "grant_weapon_proficiencies"; grants: WeaponProficiencyGrant[] }
  | { type: "grant_armor_categories"; categories: ArmorCategory[] }
  | {
      type: "grant_tool_proficiencies";
      fixedTools: string[];
      /** Independent choose slots (e.g. Student of War artisan tool). */
      choose?: { count: number; categories: ToolCategory[] };
      /** One choose slot per fixed tool the character already knows (Artificer Tools of the Trade). */
      replacementChoose?: { categories: ToolCategory[] };
    }
  | {
      type: "grant_spellcasting";
      ability: AbilityId;
      /** Class spell list key (e.g. wizard for Eldritch Knight). */
      listClassKey: string;
      gainedAtLevel: number;
      listMode: SpellListMode;
      /** Spell slots by character level; row is indexed 0 = 1st level. */
      slotsByLevel: Partial<Record<number, number[]>>;
      cantripsKnownByLevel: Partial<Record<number, number>>;
      spellsPrepared?: PreparedSpellCount;
      spellsKnownByLevel?: Partial<Record<number, number>>;
    }
  | {
      type: "hit_point_pool";
      formula: { kind: "twiceLevelPlusAbility"; ability: AbilityId };
    }
  | { type: "narrative" };

export interface SubclassData extends CatalogSource {
  key: string;
  classKey: string;
  name: string;
  desc: string;
  features: ClassFeatureData[];
}

export interface ClassFeatureData {
  key: string;
  name: string;
  desc: string;
  grantedAtLevel: number;
  combatSurface: boolean;
  /** When set, the feature also appears in the matching Combat tab action column. */
  actionTiming?: ActionTiming;
  /** When set, Combat tab shows a remaining-uses tracker for this feature. */
  limitedUses?: LimitedUsesFormula;
  /** When limitedUses is set, controls Short/Long Rest recovery. Defaults to "long". */
  restRecovery?: RestRecovery;
  /** When true, show a description card in Combat Class Features even without limitedUses (e.g. Land's Aid). */
  classFeatureCard?: boolean;
  /** Parent class feature name for flattened Combat description children (e.g. Tools of the Trade). */
  combatParentName?: string;
  /** Where limited-use tracker renders. Defaults to "combat". */
  trackerSurface?: "combat" | "spells";
  effects: ClassFeatureEffect[];
}

export type WeaponProficiencyGrant =
  | { kind: "simple" }
  | { kind: "martial" }
  | { kind: "martialWithAnyProperty"; properties: string[] };

export type ToolCategory = "artisan" | "gamingSet" | "musicalInstrument" | "other";

export type ToolProficiencyGrant =
  | { kind: "fixed"; toolId: string }
  | { kind: "choose"; count: number; categories: ToolCategory[] };

export type SpellListMode = "prepared" | "known" | "spellbook";

export type PreparedSpellCount =
  | { kind: "abilityModPlusLevel"; ability: AbilityId; minimum?: number }
  | { kind: "fixed"; count: number };

export interface SpellProgressionRow {
  cantripsKnown: number;
  /** Sorcerer and Warlock. */
  spellsKnown?: number;
  /** Bard, Cleric, Druid, Paladin, Ranger, and Wizard (from spellbook). */
  spellsPrepared?: PreparedSpellCount;
  /** Wizard spellbook size at this class level. */
  spellbookSize?: number;
}

/** Spell pick counts transcribed from the srd-2024 class tables. */
export interface SpellProgression {
  listMode: SpellListMode | null;
  byCharacterLevel: Partial<Record<number, SpellProgressionRow>>;
}

export interface ClassSpellList {
  cantrips: string[];
  level1: string[];
  level2: string[];
  level3?: string[];
}

/**
 * Multiclass ability-score prerequisites (minimum 13+ under RAW).
 * Each inner array is an AND-clause: every ability listed must meet the minimum.
 * The outer array is OR: satisfying any one clause is enough (Fighter: STR or DEX).
 */
export type PrimaryAbility = AbilityId[][];

/** Proficiencies gained when multiclassing into this class (2024 multiclassing table). */
export interface MulticlassProficiencies {
  weaponProficiencies: WeaponProficiencyGrant[];
  armorCategories: ArmorCategory[];
  shieldProficiency: boolean;
  /** Skill pick on multiclass dip; null when the class grants no MC skills. */
  skillChoice: { count: number; options: SkillId[] } | null;
  toolProficiencies: ToolProficiencyGrant[];
}

export interface ClassData extends CatalogSource {
  key: string;
  name: string;
  hitDie: number;
  savingThrows: AbilityId[];
  skillChoice: { count: number; options: SkillId[] };
  casterType: CasterType;
  spellcastingAbility: AbilityId | null;
  /** Character level at which this class first gains spellcasting (1 for all base srd-2024 classes with casterType != NONE). */
  spellcastingGainedAtLevel: number | null;
  spellSlots: SpellSlotTable | null;
  /** Cantrip/known/prepared counts and selection model by character level. Null for non-casters. */
  spellProgression: SpellProgression | null;
  startingEquipment: EquipmentOption[];
  /** Weapon proficiency grants from Core Class Traits (srd-2024). */
  weaponProficiencies: WeaponProficiencyGrant[];
  /** Armor category training from Core Class Traits (srd-2024). */
  armorCategories: ArmorCategory[];
  /** Shield training from Core Class Traits (srd-2024). */
  shieldProficiency: boolean;
  /** Tool proficiency grants from Core Class Traits (srd-2024). */
  toolProficiencies: ToolProficiencyGrant[];
  /** Minimum ability scores for multiclass prerequisites (see TableRules). */
  primaryAbility: PrimaryAbility;
  /** Training granted when taking this class as a multiclass dip (not the first class). */
  multiclassProficiencies: MulticlassProficiencies;
  features: ClassFeatureData[];
}

/** Spell picks granted by a class feature (e.g. Pact of the Tome cantrips and rituals). */
export interface ClassFeatureSpellPickSet {
  cantrips: (string | null)[];
  rituals: (string | null)[];
}

export interface SpellData extends CatalogSource {
  key: string;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  duration: string;
  ritual: boolean;
  concentration: boolean;
  components: string;
  desc: string;
  /** Optional enumerated effects shown below the intro (e.g. Prestidigitation). */
  effectOptions?: { key: string; name: string; desc: string }[];
}

export type SpeciesFeatureEffect =
  | { type: "walk_speed_set"; feet: number }
  | { type: "darkvision"; feet: number }
  | { type: "damage_resistance"; damageType: string }
  | { type: "hp_per_level"; amount: number }
  | { type: "grant_skill_proficiency"; count: number; options?: SkillId[] }
  | { type: "grant_tool_proficiency"; count: number }
  | { type: "ac_bonus"; amount: number }
  | { type: "grant_cantrip"; spellName: string }
  | { type: "grant_languages"; languages: LanguageId[] }
  | { type: "choose_cantrip"; choiceKey: string; defaultSpellKey: string; listClassKey: string }
  | { type: "always_prepared_spell"; spellName: string; minLevel?: number }
  | { type: "carrying_size_increase"; steps: number }
  | { type: "narrative" };

export interface SpeciesFeatureData {
  key: string;
  name: string;
  desc: string;
  grantedAtLevel: number;
  combatSurface: boolean;
  actionTiming?: ActionTiming;
  limitedUses?: LimitedUsesFormula;
  /** When limitedUses is set, controls Short/Long Rest recovery. Defaults to "long". */
  restRecovery?: RestRecovery;
  effects: SpeciesFeatureEffect[];
}

export interface SpeciesLineageOption {
  key: string;
  name: string;
  features: SpeciesFeatureData[];
}

export interface SpeciesChoice {
  /** Feature key of the parent choice trait (e.g. elven-lineage). */
  key: string;
  requiresSpellcastingAbility?: boolean;
  options: SpeciesLineageOption[];
}

export type CreatureSize = "small" | "medium";

export type BeastSize = "tiny" | "small" | "medium" | "large";

export interface BeastAttackData {
  name: string;
  toHit: number;
  damage: string;
  damageType: string;
  rider?: string;
}

export interface BeastTraitData {
  key?: string;
  name: string;
  desc: string;
}

export interface BeastFormData extends CatalogSource {
  key: string;
  name: string;
  size: BeastSize;
  cr: string;
  ac: number;
  abilities: Record<AbilityId, number>;
  speeds: { type: string; feet: number }[];
  skills?: Partial<Record<SkillId, number>>;
  saves?: Partial<Record<AbilityId, number>>;
  attacks: BeastAttackData[];
  traits?: BeastTraitData[];
  /** Fixed HP when the beast is not a Wild Shape option (companions, summons). */
  hitPoints?: number;
  /** When false, excluded from Wild Shape picks (companion templates). Defaults to true. */
  wildShape?: boolean;
}

export interface SpeciesData extends CatalogSource {
  key: string;
  name: string;
  speeds: { type: string; feet: number }[];
  traits: { name: string; desc: string }[];
  features: SpeciesFeatureData[];
  choice?: SpeciesChoice;
  /** Human and Tiefling can choose Medium or Small at character creation. */
  hasSizeChoice?: boolean;
  /** Default creature size when the species has no size choice. */
  size?: CreatureSize;
}

export interface BackgroundData extends CatalogSource {
  key: string;
  name: string;
  skillProficiencies: SkillId[];
  /** Tool proficiency grant from the background (srd-2024). */
  toolProficiency: ToolProficiencyGrant | null;
  featKey: string | null;
  startingEquipment: EquipmentOption[];
}

export interface FeatData extends CatalogSource {
  key: string;
  name: string;
  category: string;
  desc: string;
}

export interface ConditionData extends CatalogSource {
  key: string;
  name: string;
  desc: string;
}

export type WeaponMasteryProperty = "Cleave" | "Graze" | "Nick" | "Push" | "Sap" | "Slow" | "Topple" | "Vex";

export type CurrencyDenomination = "pp" | "gp" | "ep" | "sp" | "cp";

export interface ItemCost {
  amount: number;
  denomination: CurrencyDenomination;
}

export interface WeaponData extends CatalogSource {
  key: string;
  name: string;
  damageDice: string;
  damageType: string;
  isSimple: boolean;
  properties: string[];
  mastery: WeaponMasteryProperty | null;
  weightLb: number;
  cost: ItemCost;
}

export interface ArmorData extends CatalogSource {
  key: string;
  name: string;
  category: string;
  acBase: number;
  acAddDexMod: boolean;
  acCapDexMod: number | null;
  strengthScoreRequired: number | null;
  grantsStealthDisadvantage: boolean;
  weightLb: number;
  cost: ItemCost;
}

export interface AlignmentData extends CatalogSource {
  key: string;
  name: string;
  description: string;
}

export interface DeityData extends CatalogSource {
  key: string;
  name: string;
  pantheon: string;
  title?: string;
  altNames?: string[];
  category?: string;
  alignmentKey?: string;
  domains?: string[];
  symbol?: string;
  portfolio?: string;
  worshipers?: string;
  plane?: string;
}

export type LanguageId =
  | "abyssal"
  | "celestial"
  | "common"
  | "common-sign-language"
  | "deep-speech"
  | "draconic"
  | "druidic"
  | "dwarvish"
  | "elvish"
  | "giant"
  | "gnomish"
  | "goblin"
  | "halfling"
  | "infernal"
  | "orc"
  | "primordial"
  | "sylvan"
  | "thieves-cant"
  | "undercommon";

export type LanguageCategory = "common" | "uncommon";

export interface LanguageData extends CatalogSource {
  key: LanguageId;
  name: string;
  category: LanguageCategory;
}

export type MagicItemRarity = "common" | "uncommon" | "rare" | "very rare" | "legendary" | "artifact";

export type MagicItemCategory =
  | "weapon"
  | "armor"
  | "wondrous"
  | "ring"
  | "wand"
  | "potion"
  | "scroll"
  | "staff"
  | "rod"
  | "other";

export type MagicItemEffect =
  | { type: "ac_bonus"; amount: number }
  | { type: "save_bonus"; amount: number }
  | { type: "spell_attack_bonus"; amount: number }
  | { type: "spell_save_dc_bonus"; amount: number }
  | { type: "ability_check_bonus"; amount: number }
  | { type: "set_ability_score"; ability: AbilityId; score: number }
  | { type: "walk_speed_floor"; feet: number }
  | { type: "weapon_damage_bonus"; amount: number; weaponKeys: string[] };

export interface MagicItemData extends CatalogSource {
  key: string;
  name: string;
  rarity: MagicItemRarity;
  category: MagicItemCategory;
  requiresAttunement: boolean;
  attuneNote?: string;
  weightLb: number;
  desc: string;
  effects: MagicItemEffect[];
}

/** One AND-clause from 5etools generic-variant `requires`. `GenericVariantData.requires` is an OR of these. */
export interface GenericVariantRequire {
  weapon?: boolean;
  weaponCategory?: string;
  type?: string | string[];
  property?: string | string[];
  name?: string;
  source?: string;
  sword?: boolean;
}

export interface GenericVariantExclude {
  name?: string | string[];
}

export type GenericVariantEffect =
  | { type: "bonusWeapon"; amount: number }
  | { type: "bonusAc"; amount: number }
  | { type: "grantsProficiency" }
  | { type: "charges"; amount: number; recharge: "dawn" }
  | { type: "ignoreLoading" }
  | { type: "ignoreAmmoConsumption" }
  | { type: "returningThrown" }
  | { type: "ignoreStrengthRequirement" }
  | { type: "ignoreStealthDisadvantage" };

/** Generic magic templates (+1 Weapon, Elven Chain, etc.). Not mixed into MAGIC_ITEMS. */
export interface GenericVariantData extends CatalogSource {
  key: string;
  name: string;
  rarity: MagicItemRarity;
  requiresAttunement: boolean;
  attuneNote?: string;
  namePrefix?: string;
  nameSuffix?: string;
  /** Inferred from `requires` when extracting from 5etools `magicvariants.json`. */
  appliesTo: "weapon" | "armor" | "ammunition";
  requires: GenericVariantRequire[];
  excludes?: GenericVariantExclude;
  desc: string;
  effects: GenericVariantEffect[];
}

export type AdventuringGearCategory =
  | "adventuring-gear"
  | "artisans-tools"
  | "instrument"
  | "tool"
  | "gaming-set"
  | "food-and-drink"
  | "spellcasting-focus"
  | "tack-and-harness"
  | "other";

export interface AdventuringGearData extends CatalogSource {
  key: string;
  name: string;
  category: AdventuringGearCategory;
  weightLb: number;
  cost: ItemCost;
  desc: string;
}
