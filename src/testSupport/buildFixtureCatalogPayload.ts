import { ARMOR_STATS, WEAPON_STATS } from "../../catalog-source/equipmentStats.js";
import { SPECIES_FEATURE_CATALOG } from "../../catalog-source/speciesFeatureCatalog.js";
import { AMMUNITION_STATS } from "../../catalog-source/ammunitionStats.data.js";
import { TOOL_STATS } from "../../catalog-source/toolStats.data.js";
import { WEAPON_MASTERY_DESCRIPTIONS } from "../../scripts/adapters/weaponMasteryDescriptions.js";
import type { CatalogPayload, CatalogStringRow } from "../catalog/types.js";
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
  WeaponMasteryProperty,
} from "../data/types.js";
import adventuringGearJson from "../data/__fixtures__/adventuringGear.json";
import alignmentsJson from "../data/__fixtures__/alignments.json";
import armorJson from "../data/__fixtures__/armor.json";
import backgroundsJson from "../data/__fixtures__/backgrounds.json";
import beastsJson from "../data/__fixtures__/beasts.json";
import booksJson from "../data/__fixtures__/books.json";
import classSpellListsJson from "../data/__fixtures__/classSpellLists.json";
import classesJson from "../data/__fixtures__/classes.json";
import conditionsJson from "../data/__fixtures__/conditions.json";
import deitiesJson from "../data/__fixtures__/deities.json";
import featsJson from "../data/__fixtures__/feats.json";
import genericVariantsJson from "../data/__fixtures__/genericVariants.json";
import languagesJson from "../data/__fixtures__/languages.json";
import magicItemsJson from "../data/__fixtures__/magicItems.json";
import speciesJson from "../data/__fixtures__/species.json";
import spellsJson from "../data/__fixtures__/spells.json";
import subclassesJson from "../data/__fixtures__/subclasses.json";
import weaponsJson from "../data/__fixtures__/weapons.json";
import uiStringsFixture from "./uiStrings.fixture.json";

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
  if (!stats) throw new Error(`Missing equipment stats for weapon: ${weapon.key}`);
  return { ...weapon, ...stats };
}

function withArmorStats(armor: Omit<ArmorData, "weightLb" | "cost">): ArmorData {
  const stats = ARMOR_STATS[armor.key];
  if (!stats) throw new Error(`Missing equipment stats for armor: ${armor.key}`);
  return { ...armor, ...stats };
}

function addString(
  rows: CatalogStringRow[],
  entityType: string,
  entityKey: string,
  field: string,
  text: string | undefined,
) {
  if (text === undefined) return;
  rows.push({ entity_type: entityType, entity_key: entityKey, field, locale: "en", text });
}

function englishCatalogStrings(payload: Omit<CatalogPayload, "catalogStrings">): CatalogStringRow[] {
  const rows: CatalogStringRow[] = [];
  for (const species of payload.species) {
    addString(rows, "species", species.key, "name", species.name);
  }
  for (const cls of payload.classes) {
    addString(rows, "classes", cls.key, "name", cls.name);
  }
  for (const background of payload.backgrounds) {
    addString(rows, "backgrounds", background.key, "name", background.name);
  }
  for (const feat of payload.feats) {
    addString(rows, "feats", feat.key, "name", feat.name);
  }
  for (const variant of payload.genericVariants ?? []) {
    addString(rows, "genericVariants", variant.key, "name", variant.name);
    addString(rows, "genericVariants", variant.key, "desc", variant.desc);
    if (variant.namePrefix !== undefined) {
      addString(rows, "genericVariants", variant.key, "namePrefix", variant.namePrefix);
    }
    if (variant.nameSuffix !== undefined) {
      addString(rows, "genericVariants", variant.key, "nameSuffix", variant.nameSuffix);
    }
  }
  for (const weapon of payload.weapons) {
    addString(rows, "weapons", weapon.key, "name", weapon.name);
  }
  for (const armor of payload.armor) {
    addString(rows, "armor", armor.key, "name", armor.name);
  }
  for (const alignment of payload.alignments) {
    addString(rows, "alignments", alignment.key, "name", alignment.name);
  }
  for (const deity of payload.deities) {
    addString(rows, "deities", deity.key, "name", deity.name);
  }
  for (const beast of payload.beasts) {
    addString(rows, "beasts", beast.key, "name", beast.name);
  }
  for (const condition of payload.conditions) {
    addString(rows, "conditions", condition.key, "name", condition.name);
  }
  for (const mastery of Object.keys(WEAPON_MASTERY_DESCRIPTIONS) as WeaponMasteryProperty[]) {
    addString(rows, "glossary", "weaponMasteryDesc", mastery, WEAPON_MASTERY_DESCRIPTIONS[mastery]);
  }
  return rows;
}

export function buildFixtureCatalogPayload(): CatalogPayload {
  const species = (speciesJson as Omit<SpeciesData, "features">[]).map((s) => withSpeciesFeatures(s));
  const weapons = (weaponsJson as Omit<WeaponData, "weightLb" | "cost">[]).map(withWeaponStats);
  const armor = (armorJson as Omit<ArmorData, "weightLb" | "cost">[]).map(withArmorStats);

  const partial = {
    classes: classesJson as ClassData[],
    subclasses: subclassesJson as SubclassData[],
    classSpellLists: classSpellListsJson as Record<string, ClassSpellList>,
    spells: spellsJson as SpellData[],
    species,
    backgrounds: backgroundsJson as BackgroundData[],
    deities: deitiesJson as DeityData[],
    beasts: beastsJson as BeastFormData[],
    conditions: conditionsJson as ConditionData[],
    books: booksJson as BookData[],
    feats: featsJson as FeatData[],
    weapons,
    armor,
    alignments: alignmentsJson as AlignmentData[],
    languages: languagesJson as LanguageData[],
    magicItems: magicItemsJson as MagicItemData[],
    genericVariants: genericVariantsJson as GenericVariantData[],
    adventuringGear: adventuringGearJson as AdventuringGearData[],
    ammunitionStats: { ...AMMUNITION_STATS },
    toolStats: { ...TOOL_STATS },
  };

  const uiRows = (uiStringsFixture as { catalogStrings: CatalogStringRow[] }).catalogStrings;

  return {
    ...partial,
    catalogStrings: [...englishCatalogStrings(partial), ...uiRows],
  };
}
