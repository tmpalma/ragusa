import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AMMUNITION_STATS, AMMO_TYPES } from "../../catalog-source/ammunitionStats.data.js";
import { ARMOR_STATS, WEAPON_STATS } from "../../catalog-source/equipmentStats.js";
import { SPECIES_FEATURE_CATALOG } from "../../catalog-source/speciesFeatureCatalog.js";
import { TOOL_STATS } from "../../catalog-source/toolStats.data.js";
import type {
  AdventuringGearData,
  AlignmentData,
  ArmorData,
  BackgroundData,
  BeastFormData,
  BookData,
  ClassData,
  ClassSpellList,
  ConditionData,
  DeityData,
  FeatData,
  GenericVariantData,
  LanguageData,
  MagicItemData,
  SpeciesData,
  SpellData,
  SubclassData,
  WeaponData,
} from "../../src/data/types.js";
import type { CatalogPayload } from "../../src/catalog/types.js";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const generatedDir = path.join(repoRoot, "catalog-source/generated");

function readJson<T>(filename: string): T {
  return JSON.parse(readFileSync(path.join(generatedDir, filename), "utf8")) as T;
}

function withSpeciesFeatures(
  species: Omit<SpeciesData, "features" | "choice" | "hasSizeChoice" | "size"> &
    Partial<Pick<SpeciesData, "features" | "choice" | "hasSizeChoice" | "size">>,
): SpeciesData {
  const catalog = SPECIES_FEATURE_CATALOG[species.key];
  return {
    ...species,
    features: catalog?.features ?? species.features ?? [],
    ...(catalog?.choice ? { choice: catalog.choice } : species.choice ? { choice: species.choice } : {}),
    ...(catalog?.hasSizeChoice || species.hasSizeChoice ? { hasSizeChoice: true } : {}),
    ...(catalog?.size ? { size: catalog.size } : species.size ? { size: species.size } : {}),
  };
}

function withWeaponStats(weapon: Omit<WeaponData, "weightLb" | "cost">): WeaponData {
  const stats = WEAPON_STATS[weapon.key];
  if (!stats) {
    throw new Error(`Missing equipment stats for weapon: ${weapon.key}`);
  }
  return { ...weapon, ...stats };
}

function withArmorStats(armor: Omit<ArmorData, "weightLb" | "cost">): ArmorData {
  const stats = ARMOR_STATS[armor.key];
  if (!stats) {
    throw new Error(`Missing equipment stats for armor: ${armor.key}`);
  }
  return { ...armor, ...stats };
}

export function loadCatalogSourceRows() {
  const classes = readJson<ClassData[]>("classes.json");
  const subclasses = readJson<SubclassData[]>("subclasses.json");
  const classSpellLists = readJson<Record<string, ClassSpellList>>("classSpellLists.json");
  const spells = readJson<SpellData[]>("spells.json");
  const species = (readJson<Omit<SpeciesData, "features">[]>("species.json")).map((s) => withSpeciesFeatures(s));
  const backgrounds = readJson<BackgroundData[]>("backgrounds.json");
  const deities = readJson<DeityData[]>("deities.json");
  const beasts = readJson<BeastFormData[]>("beasts.json");
  const conditions = readJson<ConditionData[]>("conditions.json");
  const books = readJson<BookData[]>("books.json");
  const feats = readJson<FeatData[]>("feats.json");
  const weapons = (readJson<Omit<WeaponData, "weightLb" | "cost">[]>("weapons.json")).map(withWeaponStats);
  const armor = (readJson<Omit<ArmorData, "weightLb" | "cost">[]>("armor.json")).map(withArmorStats);
  const alignments = readJson<AlignmentData[]>("alignments.json");
  const languages = readJson<LanguageData[]>("languages.json");
  const magicItems = readJson<MagicItemData[]>("magicItems.json");
  const genericVariants = readJson<GenericVariantData[]>("genericVariants.json");
  const adventuringGear = readJson<AdventuringGearData[]>("adventuringGear.json");

  return {
    CLASSES: classes,
    SUBCLASSES: subclasses,
    CLASS_SPELL_LISTS: classSpellLists,
    SPELLS: spells,
    SPECIES: species,
    BACKGROUNDS: backgrounds,
    DEITIES: deities,
    BEASTS: beasts,
    CONDITIONS: conditions,
    BOOKS: books,
    FEATS: feats,
    WEAPONS: weapons,
    ARMOR: armor,
    ALIGNMENTS: alignments,
    LANGUAGES: languages,
    MAGIC_ITEMS: magicItems,
    GENERIC_VARIANTS: genericVariants,
    ADVENTURING_GEAR: adventuringGear,
    AMMUNITION_STATS,
    TOOL_STATS,
  };
}

export function loadCatalogSourcePayload(catalogStrings: CatalogPayload["catalogStrings"]): CatalogPayload {
  const rows = loadCatalogSourceRows();
  return {
    classes: rows.CLASSES,
    subclasses: rows.SUBCLASSES,
    classSpellLists: rows.CLASS_SPELL_LISTS,
    spells: rows.SPELLS,
    species: rows.SPECIES,
    backgrounds: rows.BACKGROUNDS,
    deities: rows.DEITIES,
    beasts: rows.BEASTS,
    conditions: rows.CONDITIONS,
    books: rows.BOOKS,
    feats: rows.FEATS,
    weapons: rows.WEAPONS,
    armor: rows.ARMOR,
    alignments: rows.ALIGNMENTS,
    languages: rows.LANGUAGES,
    magicItems: rows.MAGIC_ITEMS,
    genericVariants: rows.GENERIC_VARIANTS,
    adventuringGear: rows.ADVENTURING_GEAR,
    ammunitionStats: { ...rows.AMMUNITION_STATS },
    toolStats: { ...rows.TOOL_STATS },
    catalogStrings,
  };
}

export const CATALOG_SOURCE_ROOT = path.join(repoRoot, "catalog-source");
