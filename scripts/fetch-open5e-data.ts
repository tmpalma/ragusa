import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { BOOKS } from "./adapters/books.js";
import { loadAlignments } from "./adapters/alignments.js";
import { LANGUAGES } from "./adapters/languages.js";
import { loadArmor } from "./adapters/armor.js";
import { BACKGROUNDS } from "./adapters/backgrounds.js";
import { CLASSES } from "./adapters/classes.js";
import { loadFeats } from "./adapters/feats.js";
import { CONDITIONS } from "./adapters/conditions.js";
import { WILD_SHAPE_BEASTS } from "./adapters/wildShapeBeasts.js";
import { loadSpecies } from "./adapters/species.js";
import { loadSpells } from "./adapters/spells.js";
import { SUBCLASSES } from "./adapters/subclassCatalog.js";
import { loadWeapons } from "./adapters/weapons.js";
import adventuringGearJson from "./adapters/adventuringGear.json" with { type: "json" };
import genericVariantsJson from "./adapters/genericVariants.json" with { type: "json" };
import deitiesJson from "./adapters/deities.json" with { type: "json" };
import magicItemsJson from "./adapters/magicItems.json" with { type: "json" };
import { writeLocaleCatalog } from "./writeLocaleCatalog.js";
import type { AdventuringGearData, GenericVariantData, MagicItemData } from "../src/data/types.js";

const OUT_DIR = path.join(import.meta.dirname, "..", "catalog-source", "generated");

async function writeJson(filename: string, data: unknown) {
  await writeFile(path.join(OUT_DIR, filename), JSON.stringify(data, null, 2) + "\n");
  console.log(`[write] catalog-source/generated/${filename}`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // Species/weapons/armor/feats/alignments are structured enough in Open5e's
  // v2 API to transform mechanically. Classes and backgrounds are hand-curated
  // constants (see scripts/adapters/classes.ts and backgrounds.ts) because their
  // source data is prose tables Open5e hasn't structured — this script still
  // "emits" them here so every entity type has one place it's written from.
  const [species, weapons, armor, feats, alignments, spellData] = await Promise.all([
    loadSpecies(),
    loadWeapons(),
    loadArmor(),
    loadFeats(),
    loadAlignments(),
    loadSpells(),
  ]);

  await writeJson("species.json", species);
  await writeJson("weapons.json", weapons);
  await writeJson("armor.json", armor);
  await writeJson("feats.json", feats);
  await writeJson("alignments.json", alignments);
  await writeJson("languages.json", LANGUAGES);
  await writeJson("spells.json", spellData.spells);
  await writeJson("classSpellLists.json", spellData.classSpellLists);
  await writeJson("classes.json", CLASSES);
  await writeJson("subclasses.json", SUBCLASSES);
  await writeJson("backgrounds.json", BACKGROUNDS);
  await writeJson("deities.json", deitiesJson);
  await writeJson("beasts.json", WILD_SHAPE_BEASTS);
  await writeJson("conditions.json", CONDITIONS);
  await writeJson("books.json", BOOKS);
  await writeJson("magicItems.json", magicItemsJson);
  await writeJson("adventuringGear.json", adventuringGearJson);
  await writeJson("genericVariants.json", genericVariantsJson);

  await writeLocaleCatalog("en", spellData.spells, {
    species,
    backgrounds: BACKGROUNDS,
    feats,
    magicItems: magicItemsJson as MagicItemData[],
    adventuringGear: adventuringGearJson as AdventuringGearData[],
    genericVariants: genericVariantsJson as GenericVariantData[],
    classes: CLASSES,
  });

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
