import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import alignmentsJson from "../catalog-source/generated/alignments.json" with { type: "json" };
import languagesJson from "../catalog-source/generated/languages.json" with { type: "json" };
import armorJson from "../catalog-source/generated/armor.json" with { type: "json" };
import backgroundsJson from "../catalog-source/generated/backgrounds.json" with { type: "json" };
import classesJson from "../catalog-source/generated/classes.json" with { type: "json" };
import { SUBCLASSES } from "./adapters/subclassCatalog.js";
import { CONDITIONS } from "./adapters/conditions.js";
import { WILD_SHAPE_BEASTS } from "./adapters/wildShapeBeasts.js";
import featsJson from "../catalog-source/generated/feats.json" with { type: "json" };
import speciesJson from "../catalog-source/generated/species.json" with { type: "json" };
import weaponsJson from "../catalog-source/generated/weapons.json" with { type: "json" };
import type {
  AlignmentData,
  DeityData,
  LanguageData,
  ArmorData,
  BackgroundData,
  ClassData,
  FeatData,
  ConditionData,
  SpeciesData,
  SpellData,
  WeaponData,
  WeaponMasteryProperty,
  MagicItemData,
  AdventuringGearData,
  GenericVariantData,
} from "../src/data/types.js";
import deitiesJson from "./adapters/deities.json" with { type: "json" };
import genericVariantsJson from "./adapters/genericVariants.json" with { type: "json" };
import { WEAPON_MASTERY_DESCRIPTIONS } from "./adapters/weaponMasteryDescriptions.js";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function appendSection(lines: string[], key: string, value: string) {
  lines.push(`## ${key}`);
  lines.push(value);
  lines.push("");
}

export function buildCatalogMarkdown(
  spells: SpellData[] = [],
  options: {
    species?: SpeciesData[];
    backgrounds?: BackgroundData[];
    feats?: FeatData[];
    magicItems?: MagicItemData[];
    adventuringGear?: AdventuringGearData[];
    genericVariants?: GenericVariantData[];
    classes?: ClassData[];
  } = {},
): Record<string, string> {
  const files: Record<string, string> = {};

  const speciesLines: string[] = [];
  for (const species of options.species ?? (speciesJson as SpeciesData[])) {
    appendSection(speciesLines, `${species.key}.name`, species.name);
    for (const trait of species.traits) {
      const traitSlug = slugify(trait.name);
      appendSection(speciesLines, `${species.key}.trait.${traitSlug}.name`, trait.name);
      appendSection(speciesLines, `${species.key}.trait.${traitSlug}.desc`, trait.desc);
    }
  }
  files["species.md"] = speciesLines.join("\n").trimEnd() + "\n";

  const classLines: string[] = [];
  for (const cls of options.classes ?? (classesJson as ClassData[])) {
    appendSection(classLines, `${cls.key}.name`, cls.name);
    for (const feature of cls.features ?? []) {
      appendSection(classLines, `${cls.key}.feature.${feature.key}.name`, feature.name);
      appendSection(classLines, `${cls.key}.feature.${feature.key}.desc`, feature.desc);
    }
    for (const option of cls.startingEquipment) {
      for (const item of option.items) {
        appendSection(classLines, `${cls.key}.equipment.${slugify(option.label)}.${slugify(item)}`, item);
      }
    }
  }
  for (const subclass of SUBCLASSES) {
    appendSection(classLines, `${subclass.classKey}.subclass.${subclass.key}.name`, subclass.name);
    appendSection(classLines, `${subclass.classKey}.subclass.${subclass.key}.desc`, subclass.desc);
    for (const feature of subclass.features) {
      appendSection(
        classLines,
        `${subclass.classKey}.subclass.${subclass.key}.feature.${feature.key}.name`,
        feature.name,
      );
      appendSection(
        classLines,
        `${subclass.classKey}.subclass.${subclass.key}.feature.${feature.key}.desc`,
        feature.desc,
      );
    }
  }
  files["classes.md"] = classLines.join("\n").trimEnd() + "\n";

  const backgroundLines: string[] = [];
  for (const bg of options.backgrounds ?? (backgroundsJson as BackgroundData[])) {
    appendSection(backgroundLines, `${bg.key}.name`, bg.name);
    for (const option of bg.startingEquipment) {
      for (const item of option.items) {
        appendSection(backgroundLines, `${bg.key}.equipment.${slugify(option.label)}.${slugify(item)}`, item);
      }
    }
  }
  files["backgrounds.md"] = backgroundLines.join("\n").trimEnd() + "\n";

  const featLines: string[] = [];
  for (const feat of options.feats ?? (featsJson as FeatData[])) {
    appendSection(featLines, `${feat.key}.name`, feat.name);
    appendSection(featLines, `${feat.key}.desc`, feat.desc);
  }
  files["feats.md"] = featLines.join("\n").trimEnd() + "\n";

  const conditionLines: string[] = [];
  for (const condition of CONDITIONS) {
    appendSection(conditionLines, `${condition.key}.name`, condition.name);
    appendSection(conditionLines, `${condition.key}.desc`, condition.desc);
  }
  files["conditions.md"] = conditionLines.join("\n").trimEnd() + "\n";

  const beastLines: string[] = [];
  for (const beast of WILD_SHAPE_BEASTS) {
    appendSection(beastLines, `${beast.key}.name`, beast.name);
    for (const trait of beast.traits ?? []) {
      appendSection(beastLines, `${beast.key}.trait.${slugify(trait.name)}.name`, trait.name);
      appendSection(beastLines, `${beast.key}.trait.${slugify(trait.name)}.desc`, trait.desc);
    }
  }
  files["beasts.md"] = beastLines.join("\n").trimEnd() + "\n";

  const spellLines: string[] = [];
  for (const spell of spells) {
    appendSection(spellLines, `${spell.key}.name`, spell.name);
    appendSection(spellLines, `${spell.key}.desc`, spell.desc);
  }
  files["spells.md"] = spellLines.join("\n").trimEnd() + "\n";

  const magicItemLines: string[] = [];
  for (const item of options.magicItems ?? []) {
    appendSection(magicItemLines, `${item.key}.name`, item.name);
    appendSection(magicItemLines, `${item.key}.desc`, item.desc);
  }
  files["magicItems.md"] = magicItemLines.join("\n").trimEnd() + "\n";

  const gearLines: string[] = [];
  for (const item of options.adventuringGear ?? []) {
    appendSection(gearLines, `${item.key}.name`, item.name);
    appendSection(gearLines, `${item.key}.desc`, item.desc);
  }
  files["adventuringGear.md"] = gearLines.join("\n").trimEnd() + "\n";

  const genericVariantLines: string[] = [];
  for (const item of options.genericVariants ?? (genericVariantsJson as GenericVariantData[])) {
    appendSection(genericVariantLines, `${item.key}.name`, item.name);
    appendSection(genericVariantLines, `${item.key}.desc`, item.desc);
  }
  files["genericVariants.md"] = genericVariantLines.join("\n").trimEnd() + "\n";

  const weaponLines: string[] = [];
  for (const weapon of weaponsJson as WeaponData[]) {
    appendSection(weaponLines, `${weapon.key}.name`, weapon.name);
    appendSection(weaponLines, `${weapon.key}.damageType`, weapon.damageType);
    for (const prop of weapon.properties) {
      appendSection(weaponLines, `${weapon.key}.property.${slugify(prop)}`, prop);
    }
  }
  files["weapons.md"] = weaponLines.join("\n").trimEnd() + "\n";

  const armorLines: string[] = [];
  for (const armor of armorJson as ArmorData[]) {
    appendSection(armorLines, `${armor.key}.name`, armor.name);
  }
  files["armor.md"] = armorLines.join("\n").trimEnd() + "\n";

  const alignmentLines: string[] = [];
  for (const alignment of alignmentsJson as AlignmentData[]) {
    appendSection(alignmentLines, `${alignment.key}.name`, alignment.name);
    appendSection(alignmentLines, `${alignment.key}.description`, alignment.description);
  }
  files["alignments.md"] = alignmentLines.join("\n").trimEnd() + "\n";

  const deityLines: string[] = [];
  const pantheons = new Set<string>();
  for (const deity of deitiesJson as DeityData[]) {
    pantheons.add(deity.pantheon);
    appendSection(deityLines, `${deity.key}.name`, deity.name);
    if (deity.title) appendSection(deityLines, `${deity.key}.title`, deity.title);
    if (deity.symbol) appendSection(deityLines, `${deity.key}.symbol`, deity.symbol);
    if (deity.portfolio) appendSection(deityLines, `${deity.key}.portfolio`, deity.portfolio);
    if (deity.worshipers) appendSection(deityLines, `${deity.key}.worshipers`, deity.worshipers);
    if (deity.plane) appendSection(deityLines, `${deity.key}.plane`, deity.plane);
    if (deity.category) appendSection(deityLines, `${deity.key}.category`, deity.category);
    if (deity.altNames?.length) appendSection(deityLines, `${deity.key}.altNames`, deity.altNames.join(", "));
  }
  for (const pantheon of [...pantheons].sort()) {
    appendSection(deityLines, `pantheon.${slugify(pantheon)}`, pantheon);
  }
  files["deities.md"] = deityLines.join("\n").trimEnd() + "\n";

  const languageLines: string[] = [];
  for (const language of languagesJson as LanguageData[]) {
    appendSection(languageLines, `${language.key}.name`, language.name);
  }
  files["languages.md"] = languageLines.join("\n").trimEnd() + "\n";

  const glossaryLines: string[] = [];
  const damageTypes = new Set<string>();
  const weaponProperties = new Set<string>();
  const equipmentItems = new Set<string>();
  const speedTypes = new Set<string>();

  for (const weapon of weaponsJson as WeaponData[]) {
    if (weapon.damageType) damageTypes.add(weapon.damageType);
    for (const prop of weapon.properties) weaponProperties.add(prop);
    if (weapon.mastery) weaponProperties.add(weapon.mastery);
  }
  for (const mastery of Object.keys(WEAPON_MASTERY_DESCRIPTIONS) as WeaponMasteryProperty[]) {
    weaponProperties.add(mastery);
  }

  for (const cls of classesJson as ClassData[]) {
    for (const option of cls.startingEquipment) {
      for (const item of option.items) equipmentItems.add(item);
    }
  }
  for (const bg of backgroundsJson as BackgroundData[]) {
    for (const option of bg.startingEquipment) {
      for (const item of option.items) equipmentItems.add(item);
    }
  }

  for (const species of speciesJson as SpeciesData[]) {
    for (const speed of species.speeds) speedTypes.add(speed.type);
  }
  for (const beast of WILD_SHAPE_BEASTS) {
    for (const speed of beast.speeds) speedTypes.add(speed.type);
  }

  for (const type of [...damageTypes].sort()) {
    appendSection(glossaryLines, `damageType.${type}`, type);
  }
  for (const prop of [...weaponProperties].sort()) {
    appendSection(glossaryLines, `weaponProperty.${prop}`, prop);
  }
  for (const item of [...equipmentItems].sort()) {
    appendSection(glossaryLines, `equipmentItem.${item}`, item);
  }
  for (const type of [...speedTypes].sort()) {
    const label = type.charAt(0).toUpperCase() + type.slice(1);
    appendSection(glossaryLines, `speedType.${type}`, label);
  }
  for (const mastery of (Object.keys(WEAPON_MASTERY_DESCRIPTIONS) as WeaponMasteryProperty[]).sort()) {
    appendSection(glossaryLines, `weaponMasteryDesc.${mastery}`, WEAPON_MASTERY_DESCRIPTIONS[mastery]);
  }

  files["glossary.md"] = glossaryLines.join("\n").trimEnd() + "\n";

  return files;
}

export async function writeLocaleCatalog(
  locale: string = "en",
  spells: SpellData[] = [],
  options: {
    species?: SpeciesData[];
    backgrounds?: BackgroundData[];
    feats?: FeatData[];
    magicItems?: MagicItemData[];
    adventuringGear?: AdventuringGearData[];
    genericVariants?: GenericVariantData[];
    classes?: ClassData[];
  } = {},
) {
  const outDir = path.join(import.meta.dirname, "..", "catalog-source", "locales", locale, "catalog");
  await mkdir(outDir, { recursive: true });
  const files = buildCatalogMarkdown(spells, options);
  for (const [filename, content] of Object.entries(files)) {
    await writeFile(path.join(outDir, filename), content);
    console.log(`[write] catalog-source/locales/${locale}/catalog/${filename}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  writeLocaleCatalog().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
