import type {
  ArmorCategory,
  CatalogSource,
  ClassData,
  MulticlassProficiencies,
  PrimaryAbility,
  SkillId,
  SpellProgression,
  ToolProficiencyGrant,
  WeaponProficiencyGrant,
} from "../../src/data/types.js";
import { CLASS_FEATURE_CATALOG } from "./classFeatureCatalog.js";
import { NON_SRD_EFA, SRD_XPHB } from "./catalogSource.js";

const ALL_SKILLS: SkillId[] = [
  "acrobatics",
  "animalHandling",
  "arcana",
  "athletics",
  "deception",
  "history",
  "insight",
  "intimidation",
  "investigation",
  "medicine",
  "nature",
  "perception",
  "performance",
  "persuasion",
  "religion",
  "sleightOfHand",
  "stealth",
  "survival",
];

/** 2 first-level slots at character level 1 (full casters, and 2024 Paladin/Ranger). */
const SLOTS_L1_TWO = [2, 0, 0, 0, 0, 0, 0, 0, 0];
/** 3 first-level slots at character level 2 (full casters). */
const SLOTS_L2_THREE = [3, 0, 0, 0, 0, 0, 0, 0, 0];
/** Bard level 3: 4 first-level and 2 second-level slots. */
const SLOTS_L3_BARD = [4, 2, 0, 0, 0, 0, 0, 0, 0];
/** Full casters at level 4: 4 first-level and 3 second-level slots. */
const SLOTS_L4_FULL = [4, 3, 0, 0, 0, 0, 0, 0, 0];
/** Full casters at level 5: 4 first-, 3 second-, and 2 third-level slots. */
const SLOTS_L5_FULL = [4, 3, 2, 0, 0, 0, 0, 0, 0];
/** Half casters at level 5: 4 first- and 2 second-level slots. */
const SLOTS_L5_HALF = [4, 2, 0, 0, 0, 0, 0, 0, 0];
/** Half casters at level 3: 3 first-level slots. */
const SLOTS_L3_HALF = [3, 0, 0, 0, 0, 0, 0, 0, 0];
/** Pact Magic: 1 slot at Warlock level 1, 2 at level 2, two 2nd-level slots at level 3. */
const PACT_SLOTS = {
  byCharacterLevel: {
    1: [1, 0, 0, 0, 0, 0, 0, 0, 0],
    2: [2, 0, 0, 0, 0, 0, 0, 0, 0],
    3: [0, 2, 0, 0, 0, 0, 0, 0, 0],
    4: [0, 2, 0, 0, 0, 0, 0, 0, 0],
    5: [0, 0, 2, 0, 0, 0, 0, 0, 0],
  },
};
const FULL_CASTER_SLOTS = {
  byCharacterLevel: {
    1: SLOTS_L1_TWO,
    2: SLOTS_L2_THREE,
    3: SLOTS_L3_BARD,
    4: SLOTS_L4_FULL,
    5: SLOTS_L5_FULL,
  },
};
const BARD_CASTER_SLOTS = {
  byCharacterLevel: {
    1: SLOTS_L1_TWO,
    2: SLOTS_L2_THREE,
    3: SLOTS_L3_BARD,
    4: SLOTS_L4_FULL,
    5: SLOTS_L5_FULL,
  },
};
const HALF_CASTER_SLOTS = {
  byCharacterLevel: {
    1: SLOTS_L1_TWO,
    2: SLOTS_L1_TWO,
    3: SLOTS_L3_HALF,
    4: SLOTS_L3_HALF,
    5: SLOTS_L5_HALF,
  },
};

const PREPARED_BARD: SpellProgression = {
  listMode: "prepared",
  byCharacterLevel: {
    1: { cantripsKnown: 2, spellsPrepared: { kind: "fixed", count: 4 } },
    2: { cantripsKnown: 2, spellsPrepared: { kind: "fixed", count: 5 } },
    3: { cantripsKnown: 2, spellsPrepared: { kind: "fixed", count: 6 } },
    4: { cantripsKnown: 3, spellsPrepared: { kind: "fixed", count: 7 } },
    5: { cantripsKnown: 3, spellsPrepared: { kind: "fixed", count: 9 } },
  },
};
const PREPARED_CLERIC: SpellProgression = {
  listMode: "prepared",
  byCharacterLevel: {
    1: { cantripsKnown: 3, spellsPrepared: { kind: "fixed", count: 4 } },
    2: { cantripsKnown: 3, spellsPrepared: { kind: "fixed", count: 5 } },
    3: { cantripsKnown: 3, spellsPrepared: { kind: "fixed", count: 6 } },
    4: { cantripsKnown: 4, spellsPrepared: { kind: "fixed", count: 7 } },
    5: { cantripsKnown: 4, spellsPrepared: { kind: "fixed", count: 9 } },
  },
};
const PREPARED_DRUID: SpellProgression = {
  listMode: "prepared",
  byCharacterLevel: {
    1: { cantripsKnown: 2, spellsPrepared: { kind: "fixed", count: 4 } },
    2: { cantripsKnown: 2, spellsPrepared: { kind: "fixed", count: 5 } },
    3: { cantripsKnown: 2, spellsPrepared: { kind: "fixed", count: 6 } },
    4: { cantripsKnown: 3, spellsPrepared: { kind: "fixed", count: 7 } },
    5: { cantripsKnown: 3, spellsPrepared: { kind: "fixed", count: 9 } },
  },
};
const PREPARED_HALF_CASTER: SpellProgression = {
  listMode: "prepared",
  byCharacterLevel: {
    1: { cantripsKnown: 0, spellsPrepared: { kind: "fixed", count: 2 } },
    2: { cantripsKnown: 0, spellsPrepared: { kind: "fixed", count: 3 } },
    3: { cantripsKnown: 0, spellsPrepared: { kind: "fixed", count: 4 } },
    4: { cantripsKnown: 0, spellsPrepared: { kind: "fixed", count: 5 } },
    5: { cantripsKnown: 0, spellsPrepared: { kind: "fixed", count: 6 } },
  },
};
const PREPARED_ARTIFICER: SpellProgression = {
  listMode: "prepared",
  byCharacterLevel: {
    1: { cantripsKnown: 2, spellsPrepared: { kind: "fixed", count: 2 } },
    2: { cantripsKnown: 2, spellsPrepared: { kind: "fixed", count: 3 } },
    3: { cantripsKnown: 2, spellsPrepared: { kind: "fixed", count: 4 } },
    4: { cantripsKnown: 2, spellsPrepared: { kind: "fixed", count: 5 } },
    5: { cantripsKnown: 2, spellsPrepared: { kind: "fixed", count: 6 } },
  },
};
const KNOWN_SORCERER: SpellProgression = {
  listMode: "known",
  byCharacterLevel: {
    1: { cantripsKnown: 4, spellsKnown: 2 },
    2: { cantripsKnown: 4, spellsKnown: 4 },
    3: { cantripsKnown: 4, spellsKnown: 6 },
    4: { cantripsKnown: 5, spellsKnown: 7 },
    5: { cantripsKnown: 5, spellsKnown: 9 },
  },
};
const KNOWN_WARLOCK: SpellProgression = {
  listMode: "known",
  byCharacterLevel: {
    1: { cantripsKnown: 2, spellsKnown: 2 },
    2: { cantripsKnown: 2, spellsKnown: 3 },
    3: { cantripsKnown: 2, spellsKnown: 4 },
    4: { cantripsKnown: 3, spellsKnown: 5 },
    5: { cantripsKnown: 3, spellsKnown: 6 },
  },
};
const WIZARD_PROGRESSION: SpellProgression = {
  listMode: "spellbook",
  byCharacterLevel: {
    1: { cantripsKnown: 3, spellbookSize: 6, spellsPrepared: { kind: "fixed", count: 4 } },
    2: { cantripsKnown: 3, spellbookSize: 8, spellsPrepared: { kind: "fixed", count: 5 } },
    3: { cantripsKnown: 3, spellbookSize: 10, spellsPrepared: { kind: "fixed", count: 6 } },
    4: { cantripsKnown: 4, spellbookSize: 12, spellsPrepared: { kind: "fixed", count: 7 } },
    5: { cantripsKnown: 4, spellbookSize: 14, spellsPrepared: { kind: "fixed", count: 9 } },
  },
};

/** Simple + Martial weapon proficiency (srd-2024 Core Traits). */
const SIMPLE_AND_MARTIAL: WeaponProficiencyGrant[] = [{ kind: "simple" }, { kind: "martial" }];
const SIMPLE_ONLY: WeaponProficiencyGrant[] = [{ kind: "simple" }];
const ROGUE_WEAPON_PROFICIENCIES: WeaponProficiencyGrant[] = [
  { kind: "simple" },
  { kind: "martialWithAnyProperty", properties: ["Finesse", "Light"] },
];
const MONK_WEAPON_PROFICIENCIES: WeaponProficiencyGrant[] = [
  { kind: "simple" },
  { kind: "martialWithAnyProperty", properties: ["Light"] },
];

/** srd-2024 Core Class Traits armor training. */
const ALL_ARMOR_WITH_SHIELDS: { armorCategories: ArmorCategory[]; shieldProficiency: boolean } = {
  armorCategories: ["light", "medium", "heavy"],
  shieldProficiency: true,
};
const LIGHT_MEDIUM_SHIELDS: { armorCategories: ArmorCategory[]; shieldProficiency: boolean } = {
  armorCategories: ["light", "medium"],
  shieldProficiency: true,
};
const LIGHT_SHIELDS: { armorCategories: ArmorCategory[]; shieldProficiency: boolean } = {
  armorCategories: ["light"],
  shieldProficiency: true,
};
const LIGHT_ONLY: { armorCategories: ArmorCategory[]; shieldProficiency: boolean } = {
  armorCategories: ["light"],
  shieldProficiency: false,
};
const NO_ARMOR_TRAINING: { armorCategories: ArmorCategory[]; shieldProficiency: boolean } = {
  armorCategories: [],
  shieldProficiency: false,
};

const NO_TOOL_PROFICIENCIES: ToolProficiencyGrant[] = [];
const BARD_TOOL_PROFICIENCIES: ToolProficiencyGrant[] = [
  { kind: "choose", count: 3, categories: ["musicalInstrument"] },
];
const DRUID_TOOL_PROFICIENCIES: ToolProficiencyGrant[] = [{ kind: "fixed", toolId: "herbalism-kit" }];
const MONK_TOOL_PROFICIENCIES: ToolProficiencyGrant[] = [
  { kind: "choose", count: 1, categories: ["artisan", "musicalInstrument"] },
];
const ARTIFICER_TOOL_PROFICIENCIES: ToolProficiencyGrant[] = [
  { kind: "fixed", toolId: "thieves-tools" },
  { kind: "fixed", toolId: "tinkers-tools" },
  { kind: "choose", count: 1, categories: ["artisan"] },
];
const ROGUE_TOOL_PROFICIENCIES: ToolProficiencyGrant[] = [{ kind: "fixed", toolId: "thieves-tools" }];

/** 5etools 2024 primaryAbility — each inner array is AND; outer array is OR. */
const PRIMARY_STR: PrimaryAbility = [["str"]];
const PRIMARY_DEX: PrimaryAbility = [["dex"]];
const PRIMARY_INT: PrimaryAbility = [["int"]];
const PRIMARY_WIS: PrimaryAbility = [["wis"]];
const PRIMARY_CHA: PrimaryAbility = [["cha"]];
const PRIMARY_FIGHTER: PrimaryAbility = [["str"], ["dex"]];
const PRIMARY_MONK: PrimaryAbility = [["dex", "wis"]];
const PRIMARY_PALADIN: PrimaryAbility = [["str", "cha"]];
const PRIMARY_RANGER: PrimaryAbility = [["dex", "wis"]];

const ARTIFICER_SKILL_OPTIONS: SkillId[] = [
  "arcana",
  "history",
  "investigation",
  "medicine",
  "nature",
  "perception",
  "sleightOfHand",
];
const RANGER_SKILL_OPTIONS: SkillId[] = [
  "animalHandling",
  "athletics",
  "insight",
  "investigation",
  "nature",
  "perception",
  "stealth",
  "survival",
];
const ROGUE_SKILL_OPTIONS: SkillId[] = [
  "acrobatics",
  "athletics",
  "deception",
  "insight",
  "intimidation",
  "investigation",
  "perception",
  "persuasion",
  "sleightOfHand",
  "stealth",
];

/** 2024 multiclassing.proficienciesGained (hand-curated from 5etools edition "one"). */
const MC_EMPTY: MulticlassProficiencies = {
  weaponProficiencies: [],
  armorCategories: [],
  shieldProficiency: false,
  skillChoice: null,
  toolProficiencies: [],
};
const MC_MARTIAL_SHIELD: MulticlassProficiencies = {
  weaponProficiencies: [{ kind: "martial" }],
  armorCategories: [],
  shieldProficiency: true,
  skillChoice: null,
  toolProficiencies: [],
};
const MC_MARTIAL_LIGHT_MEDIUM_SHIELDS: MulticlassProficiencies = {
  weaponProficiencies: [{ kind: "martial" }],
  armorCategories: ["light", "medium"],
  shieldProficiency: true,
  skillChoice: null,
  toolProficiencies: [],
};
const MC_LIGHT_MEDIUM_SHIELDS: MulticlassProficiencies = {
  weaponProficiencies: [],
  armorCategories: ["light", "medium"],
  shieldProficiency: true,
  skillChoice: null,
  toolProficiencies: [],
};
const MC_LIGHT_SHIELDS: MulticlassProficiencies = {
  weaponProficiencies: [],
  armorCategories: ["light"],
  shieldProficiency: true,
  skillChoice: null,
  toolProficiencies: [],
};
const MC_LIGHT_ONLY: MulticlassProficiencies = {
  weaponProficiencies: [],
  armorCategories: ["light"],
  shieldProficiency: false,
  skillChoice: null,
  toolProficiencies: [],
};
const MC_ARTIFICER: MulticlassProficiencies = {
  weaponProficiencies: [],
  armorCategories: ["light", "medium"],
  shieldProficiency: true,
  skillChoice: { count: 1, options: ARTIFICER_SKILL_OPTIONS },
  toolProficiencies: [{ kind: "fixed", toolId: "tinkers-tools" }],
};
const MC_BARD: MulticlassProficiencies = {
  weaponProficiencies: [],
  armorCategories: ["light"],
  shieldProficiency: false,
  skillChoice: { count: 1, options: ALL_SKILLS },
  toolProficiencies: [{ kind: "choose", count: 1, categories: ["musicalInstrument"] }],
};
const MC_RANGER: MulticlassProficiencies = {
  weaponProficiencies: [{ kind: "martial" }],
  armorCategories: ["light", "medium"],
  shieldProficiency: true,
  skillChoice: { count: 1, options: RANGER_SKILL_OPTIONS },
  toolProficiencies: [],
};
const MC_ROGUE: MulticlassProficiencies = {
  weaponProficiencies: [],
  armorCategories: ["light"],
  shieldProficiency: false,
  skillChoice: { count: 1, options: ROGUE_SKILL_OPTIONS },
  toolProficiencies: [{ kind: "fixed", toolId: "thieves-tools" }],
};

/** Attach hand-curated level-1 features from the class feature catalog. */
function withFeatures(
  cls: Omit<ClassData, "features" | keyof CatalogSource>,
  source: CatalogSource,
): ClassData {
  return { ...cls, features: CLASS_FEATURE_CATALOG[cls.key] ?? [], ...source };
}

/**
 * Hand-curated from the Open5e v2 `/classes/` endpoint (document__key__in=srd-2024),
 * specifically each class's "Core <Class> Traits" feature table and its
 * Spellcasting feature. Curated by hand rather than parsed because:
 *  - the table lives as prose inside a feature `desc` (markdown-table text,
 *    occasionally with PDF-extraction artifacts like "In sight" for "Insight"),
 *  - Open5e doesn't expose a structured spell-slots-per-level field at all, so
 *    level-1 slot counts come from the public SRD 5.2 class tables directly.
 * Only 12 base classes exist in srd-2024, so this is a one-time transcription.
 */
export const CLASSES: ClassData[] = [
  withFeatures({
    key: "artificer",
    name: "Artificer",
    hitDie: 8,
    savingThrows: ["con", "int"],
    skillChoice: {
      count: 2,
      options: [
        "arcana",
        "history",
        "investigation",
        "medicine",
        "nature",
        "perception",
        "sleightOfHand",
      ],
    },
    casterType: "HALF",
    spellcastingAbility: "int",
    spellcastingGainedAtLevel: 1,
    spellSlots: HALF_CASTER_SLOTS,
    spellProgression: PREPARED_ARTIFICER,
    weaponProficiencies: SIMPLE_ONLY,
    ...LIGHT_MEDIUM_SHIELDS,
    toolProficiencies: ARTIFICER_TOOL_PROFICIENCIES,
    primaryAbility: PRIMARY_INT,
    multiclassProficiencies: MC_ARTIFICER,
    startingEquipment: [
      {
        label: "A",
        items: [
          "Studded Leather Armor",
          "Dagger",
          "Thieves' Tools",
          "Tinker's Tools",
          "Dungeoneer's Pack",
        ],
        gold: 16,
      },
      { label: "B", items: [], gold: 150 },
    ],
  }, NON_SRD_EFA),
  withFeatures({
    key: "barbarian",
    name: "Barbarian",
    hitDie: 12,
    savingThrows: ["str", "con"],
    skillChoice: { count: 2, options: ["animalHandling", "athletics", "intimidation", "nature", "perception", "survival"] },
    casterType: "NONE",
    spellcastingAbility: null,
    spellcastingGainedAtLevel: null,
    spellSlots: null,
    spellProgression: null,
    weaponProficiencies: SIMPLE_AND_MARTIAL,
    ...LIGHT_MEDIUM_SHIELDS,
    toolProficiencies: NO_TOOL_PROFICIENCIES,
    primaryAbility: PRIMARY_STR,
    multiclassProficiencies: MC_MARTIAL_SHIELD,
    startingEquipment: [
      { label: "B", items: [], gold: 75 },
    ],
  }, SRD_XPHB),
  withFeatures({
    key: "bard",
    name: "Bard",
    hitDie: 8,
    savingThrows: ["dex", "cha"],
    skillChoice: { count: 3, options: ALL_SKILLS },
    casterType: "FULL",
    spellcastingAbility: "cha",
    spellcastingGainedAtLevel: 1,
    spellSlots: BARD_CASTER_SLOTS,
    spellProgression: PREPARED_BARD,
    weaponProficiencies: SIMPLE_ONLY,
    ...LIGHT_ONLY,
    toolProficiencies: BARD_TOOL_PROFICIENCIES,
    primaryAbility: PRIMARY_CHA,
    multiclassProficiencies: MC_BARD,
    startingEquipment: [
      { label: "A", items: ["Leather Armor", "2 Daggers", "Musical Instrument of choice", "Entertainer's Pack"], gold: 19 },
      { label: "B", items: [], gold: 90 },
    ],
  }, SRD_XPHB),
  withFeatures({
    key: "cleric",
    name: "Cleric",
    hitDie: 8,
    savingThrows: ["wis", "cha"],
    skillChoice: { count: 2, options: ["history", "insight", "medicine", "persuasion", "religion"] },
    casterType: "FULL",
    spellcastingAbility: "wis",
    spellcastingGainedAtLevel: 1,
    spellSlots: FULL_CASTER_SLOTS,
    spellProgression: PREPARED_CLERIC,
    weaponProficiencies: SIMPLE_ONLY,
    ...LIGHT_MEDIUM_SHIELDS,
    toolProficiencies: NO_TOOL_PROFICIENCIES,
    primaryAbility: PRIMARY_WIS,
    multiclassProficiencies: MC_LIGHT_MEDIUM_SHIELDS,
    startingEquipment: [
      { label: "B", items: [], gold: 110 },
    ],
  }, SRD_XPHB),
  withFeatures({
    key: "druid",
    name: "Druid",
    hitDie: 8,
    savingThrows: ["int", "wis"],
    skillChoice: { count: 2, options: ["animalHandling", "arcana", "insight", "medicine", "nature", "perception", "religion", "survival"] },
    casterType: "FULL",
    spellcastingAbility: "wis",
    spellcastingGainedAtLevel: 1,
    spellSlots: FULL_CASTER_SLOTS,
    spellProgression: PREPARED_DRUID,
    weaponProficiencies: SIMPLE_ONLY,
    ...LIGHT_SHIELDS,
    toolProficiencies: DRUID_TOOL_PROFICIENCIES,
    primaryAbility: PRIMARY_WIS,
    multiclassProficiencies: MC_LIGHT_SHIELDS,
    startingEquipment: [
      { label: "A", items: ["Leather Armor", "Shield", "Sickle", "Druidic Focus (Quarterstaff)", "Explorer's Pack", "Herbalism Kit"], gold: 9 },
      { label: "B", items: [], gold: 50 },
    ],
  }, SRD_XPHB),
  withFeatures({
    key: "fighter",
    name: "Fighter",
    hitDie: 10,
    savingThrows: ["str", "con"],
    skillChoice: { count: 2, options: ["acrobatics", "animalHandling", "athletics", "history", "insight", "intimidation", "persuasion", "perception", "survival"] },
    casterType: "NONE",
    spellcastingAbility: null,
    spellcastingGainedAtLevel: null,
    spellSlots: null,
    spellProgression: null,
    weaponProficiencies: SIMPLE_AND_MARTIAL,
    ...ALL_ARMOR_WITH_SHIELDS,
    toolProficiencies: NO_TOOL_PROFICIENCIES,
    primaryAbility: PRIMARY_FIGHTER,
    multiclassProficiencies: MC_MARTIAL_LIGHT_MEDIUM_SHIELDS,
    startingEquipment: [
      { label: "A", items: ["Chain Mail", "Greatsword", "Flail", "8 Javelins", "Dungeoneer's Pack"], gold: 4 },
      { label: "B", items: ["Studded Leather Armor", "Scimitar", "Shortsword", "Longbow", "20 Arrows", "Quiver", "Dungeoneer's Pack"], gold: 11 },
      { label: "C", items: [], gold: 155 },
    ],
  }, SRD_XPHB),
  withFeatures({
    key: "monk",
    name: "Monk",
    hitDie: 8,
    savingThrows: ["str", "dex"],
    skillChoice: { count: 2, options: ["acrobatics", "athletics", "history", "insight", "religion", "stealth"] },
    casterType: "NONE",
    spellcastingAbility: null,
    spellcastingGainedAtLevel: null,
    spellSlots: null,
    spellProgression: null,
    weaponProficiencies: MONK_WEAPON_PROFICIENCIES,
    ...NO_ARMOR_TRAINING,
    toolProficiencies: MONK_TOOL_PROFICIENCIES,
    primaryAbility: PRIMARY_MONK,
    multiclassProficiencies: MC_EMPTY,
    startingEquipment: [
      { label: "A", items: ["Spear", "5 Daggers", "Artisan's Tools or Musical Instrument", "Explorer's Pack"], gold: 11 },
      { label: "B", items: [], gold: 50 },
    ],
  }, SRD_XPHB),
  withFeatures({
    key: "paladin",
    name: "Paladin",
    hitDie: 10,
    savingThrows: ["wis", "cha"],
    skillChoice: { count: 2, options: ["athletics", "insight", "intimidation", "medicine", "persuasion", "religion"] },
    casterType: "HALF",
    spellcastingAbility: "cha",
    spellcastingGainedAtLevel: 1,
    spellSlots: HALF_CASTER_SLOTS,
    spellProgression: PREPARED_HALF_CASTER,
    weaponProficiencies: SIMPLE_AND_MARTIAL,
    ...ALL_ARMOR_WITH_SHIELDS,
    toolProficiencies: NO_TOOL_PROFICIENCIES,
    primaryAbility: PRIMARY_PALADIN,
    multiclassProficiencies: MC_MARTIAL_LIGHT_MEDIUM_SHIELDS,
    startingEquipment: [
      { label: "B", items: [], gold: 150 },
    ],
  }, SRD_XPHB),
  withFeatures({
    key: "ranger",
    name: "Ranger",
    hitDie: 10,
    savingThrows: ["str", "dex"],
    skillChoice: { count: 3, options: ["animalHandling", "athletics", "insight", "investigation", "nature", "perception", "stealth", "survival"] },
    casterType: "HALF",
    spellcastingAbility: "wis",
    spellcastingGainedAtLevel: 1,
    spellSlots: HALF_CASTER_SLOTS,
    spellProgression: PREPARED_HALF_CASTER,
    weaponProficiencies: SIMPLE_AND_MARTIAL,
    ...LIGHT_MEDIUM_SHIELDS,
    toolProficiencies: NO_TOOL_PROFICIENCIES,
    primaryAbility: PRIMARY_RANGER,
    multiclassProficiencies: MC_RANGER,
    startingEquipment: [
      { label: "B", items: [], gold: 150 },
    ],
  }, SRD_XPHB),
  withFeatures({
    key: "rogue",
    name: "Rogue",
    hitDie: 8,
    savingThrows: ["dex", "int"],
    skillChoice: { count: 4, options: ["acrobatics", "athletics", "deception", "insight", "intimidation", "investigation", "perception", "persuasion", "sleightOfHand", "stealth"] },
    casterType: "NONE",
    spellcastingAbility: null,
    spellcastingGainedAtLevel: null,
    spellSlots: null,
    spellProgression: null,
    weaponProficiencies: ROGUE_WEAPON_PROFICIENCIES,
    ...LIGHT_ONLY,
    toolProficiencies: ROGUE_TOOL_PROFICIENCIES,
    primaryAbility: PRIMARY_DEX,
    multiclassProficiencies: MC_ROGUE,
    startingEquipment: [
      { label: "A", items: ["Leather Armor", "2 Daggers", "Shortsword", "Shortbow", "20 Arrows", "Quiver", "Thieves' Tools", "Burglar's Pack"], gold: 8 },
      { label: "B", items: [], gold: 100 },
    ],
  }, SRD_XPHB),
  withFeatures({
    key: "sorcerer",
    name: "Sorcerer",
    hitDie: 6,
    savingThrows: ["con", "cha"],
    skillChoice: { count: 2, options: ["arcana", "deception", "insight", "intimidation", "persuasion", "religion"] },
    casterType: "FULL",
    spellcastingAbility: "cha",
    spellcastingGainedAtLevel: 1,
    spellSlots: FULL_CASTER_SLOTS,
    spellProgression: KNOWN_SORCERER,
    weaponProficiencies: SIMPLE_ONLY,
    ...NO_ARMOR_TRAINING,
    toolProficiencies: NO_TOOL_PROFICIENCIES,
    primaryAbility: PRIMARY_CHA,
    multiclassProficiencies: MC_EMPTY,
    startingEquipment: [
      { label: "B", items: [], gold: 50 },
    ],
  }, SRD_XPHB),
  withFeatures({
    key: "warlock",
    name: "Warlock",
    hitDie: 8,
    savingThrows: ["wis", "cha"],
    skillChoice: { count: 2, options: ["arcana", "deception", "history", "intimidation", "investigation", "nature", "religion"] },
    casterType: "PACT",
    spellcastingAbility: "cha",
    spellcastingGainedAtLevel: 1,
    spellSlots: PACT_SLOTS,
    spellProgression: KNOWN_WARLOCK,
    weaponProficiencies: SIMPLE_ONLY,
    ...LIGHT_ONLY,
    toolProficiencies: NO_TOOL_PROFICIENCIES,
    primaryAbility: PRIMARY_CHA,
    multiclassProficiencies: MC_LIGHT_ONLY,
    startingEquipment: [
      { label: "B", items: [], gold: 100 },
    ],
  }, SRD_XPHB),
  withFeatures({
    key: "wizard",
    name: "Wizard",
    hitDie: 6,
    savingThrows: ["int", "wis"],
    skillChoice: { count: 2, options: ["arcana", "history", "insight", "investigation", "medicine", "nature", "religion"] },
    casterType: "FULL",
    spellcastingAbility: "int",
    spellcastingGainedAtLevel: 1,
    spellSlots: FULL_CASTER_SLOTS,
    spellProgression: WIZARD_PROGRESSION,
    weaponProficiencies: SIMPLE_ONLY,
    ...NO_ARMOR_TRAINING,
    toolProficiencies: NO_TOOL_PROFICIENCIES,
    primaryAbility: PRIMARY_INT,
    multiclassProficiencies: MC_EMPTY,
    startingEquipment: [
      { label: "B", items: [], gold: 55 },
    ],
  }, SRD_XPHB),
];
