/**
 * Catalog upsert. Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the
 * environment, or from .env.local when a variable is unset.
 * Inserts a new key and updates an existing one. A key missing from the source
 * files is left in the database.
 * Species features and weapon/armor weight and cost are merged into `data`
 * before the write, matching scripts/lib/loadCatalogSource.ts.
 * English catalog_strings come from those objects. Portuguese rows come from
 * catalog-source/locales/pt-BR/catalog.
 */
import { readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCatalogSourceRows, CATALOG_SOURCE_ROOT } from "./lib/loadCatalogSource.js";
import { parseMarkdownMessages, slugify } from "../src/i18n/parseMessages.js";
import { WEAPON_MASTERY_DESCRIPTIONS } from "./adapters/weaponMasteryDescriptions.js";

const {
  ADVENTURING_GEAR,
  ALIGNMENTS,
  AMMUNITION_STATS,
  ARMOR,
  BACKGROUNDS,
  BEASTS,
  BOOKS,
  CLASS_SPELL_LISTS,
  CLASSES,
  CONDITIONS,
  DEITIES,
  FEATS,
  GENERIC_VARIANTS,
  LANGUAGES,
  MAGIC_ITEMS,
  SPECIES,
  SPELLS,
  SUBCLASSES,
  TOOL_STATS,
  WEAPONS,
} = loadCatalogSourceRows();

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

type CatalogStringRow = {
  entity_type: string;
  entity_key: string;
  field: string;
  locale: string;
  text: string;
};

type Sourced = { key: string; srd: boolean; book: string };

type SeedPayload = {
  books: { key: string; data: unknown }[];
  sourced: Record<string, { key: string; data: unknown; srd: boolean; book: string }[]>;
  subclasses: { key: string; data: unknown; srd: boolean; book: string; class_key: string }[];
  backgrounds: { key: string; data: unknown; srd: boolean; book: string; feat_key: string | null }[];
  deities: { key: string; data: unknown; srd: boolean; book: string; alignment_key: string | null }[];
  classSpellLists: { class_key: string; data: unknown }[];
  ammunition: { key: string; data: unknown }[];
  tools: { key: string; data: unknown }[];
  catalogStrings: CatalogStringRow[];
};

function loadEnvFile() {
  const file = path.join(repoRoot, ".env.local");
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function assertUnique(label: string, keys: string[]) {
  const seen = new Set<string>();
  for (const key of keys) {
    if (seen.has(key)) throw new Error(`Duplicate ${label} key: ${key}`);
    seen.add(key);
  }
}

function sourcedRows<T extends Sourced>(items: T[]) {
  return items.map((item) => ({
    key: item.key,
    data: item,
    srd: item.srd,
    book: item.book,
  }));
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

function englishCatalogStrings(): CatalogStringRow[] {
  const rows: CatalogStringRow[] = [];

  for (const species of SPECIES) {
    addString(rows, "species", species.key, "name", species.name);
    for (const trait of species.traits) {
      const entityKey = `${species.key}.trait.${slugify(trait.name)}`;
      addString(rows, "species", entityKey, "name", trait.name);
      addString(rows, "species", entityKey, "desc", trait.desc);
    }
  }

  for (const cls of CLASSES) {
    addString(rows, "classes", cls.key, "name", cls.name);
    for (const feature of cls.features) {
      const entityKey = `${cls.key}.feature.${feature.key}`;
      addString(rows, "classes", entityKey, "name", feature.name);
      addString(rows, "classes", entityKey, "desc", feature.desc);
    }
    for (const option of cls.startingEquipment) {
      for (const item of option.items) {
        addString(
          rows,
          "classes",
          `${cls.key}.equipment.${slugify(option.label)}`,
          slugify(item),
          item,
        );
      }
    }
  }

  for (const subclass of SUBCLASSES) {
    const entityKey = `${subclass.classKey}.subclass.${subclass.key}`;
    addString(rows, "classes", entityKey, "name", subclass.name);
    addString(rows, "classes", entityKey, "desc", subclass.desc);
    for (const feature of subclass.features) {
      const featureKey = `${entityKey}.feature.${feature.key}`;
      addString(rows, "classes", featureKey, "name", feature.name);
      addString(rows, "classes", featureKey, "desc", feature.desc);
    }
  }

  for (const background of BACKGROUNDS) {
    addString(rows, "backgrounds", background.key, "name", background.name);
    for (const option of background.startingEquipment) {
      for (const item of option.items) {
        addString(
          rows,
          "backgrounds",
          `${background.key}.equipment.${slugify(option.label)}`,
          slugify(item),
          item,
        );
      }
    }
  }

  for (const feat of FEATS) {
    addString(rows, "feats", feat.key, "name", feat.name);
    addString(rows, "feats", feat.key, "desc", feat.desc);
  }
  for (const condition of CONDITIONS) {
    addString(rows, "conditions", condition.key, "name", condition.name);
    addString(rows, "conditions", condition.key, "desc", condition.desc);
  }
  for (const beast of BEASTS) {
    addString(rows, "beasts", beast.key, "name", beast.name);
    for (const trait of beast.traits ?? []) {
      const entityKey = `${beast.key}.trait.${slugify(trait.name)}`;
      addString(rows, "beasts", entityKey, "name", trait.name);
      addString(rows, "beasts", entityKey, "desc", trait.desc);
    }
  }
  for (const spell of SPELLS) {
    addString(rows, "spells", spell.key, "name", spell.name);
    addString(rows, "spells", spell.key, "desc", spell.desc);
  }
  for (const item of MAGIC_ITEMS) {
    addString(rows, "magicItems", item.key, "name", item.name);
    addString(rows, "magicItems", item.key, "desc", item.desc);
  }
  for (const item of ADVENTURING_GEAR) {
    addString(rows, "adventuringGear", item.key, "name", item.name);
    addString(rows, "adventuringGear", item.key, "desc", item.desc);
  }
  for (const item of GENERIC_VARIANTS) {
    addString(rows, "genericVariants", item.key, "name", item.name);
    addString(rows, "genericVariants", item.key, "desc", item.desc);
    if (item.namePrefix !== undefined) {
      addString(rows, "genericVariants", item.key, "namePrefix", item.namePrefix);
    }
    if (item.nameSuffix !== undefined) {
      addString(rows, "genericVariants", item.key, "nameSuffix", item.nameSuffix);
    }
  }
  for (const weapon of WEAPONS) {
    addString(rows, "weapons", weapon.key, "name", weapon.name);
    addString(rows, "weapons", weapon.key, "damageType", weapon.damageType);
    for (const property of weapon.properties) {
      addString(rows, "weapons", `${weapon.key}.property`, slugify(property), property);
    }
  }
  for (const armor of ARMOR) addString(rows, "armor", armor.key, "name", armor.name);
  for (const alignment of ALIGNMENTS) {
    addString(rows, "alignments", alignment.key, "name", alignment.name);
    addString(rows, "alignments", alignment.key, "description", alignment.description);
  }

  const pantheons = new Set<string>();
  for (const deity of DEITIES) {
    pantheons.add(deity.pantheon);
    addString(rows, "deities", deity.key, "name", deity.name);
    addString(rows, "deities", deity.key, "title", deity.title);
    addString(rows, "deities", deity.key, "symbol", deity.symbol);
    addString(rows, "deities", deity.key, "portfolio", deity.portfolio);
    addString(rows, "deities", deity.key, "worshipers", deity.worshipers);
    addString(rows, "deities", deity.key, "plane", deity.plane);
    addString(rows, "deities", deity.key, "category", deity.category);
    if (deity.altNames?.length) {
      addString(rows, "deities", deity.key, "altNames", deity.altNames.join(", "));
    }
  }
  for (const pantheon of [...pantheons].sort()) {
    addString(rows, "deities", "pantheon", slugify(pantheon), pantheon);
  }

  for (const language of LANGUAGES) addString(rows, "languages", language.key, "name", language.name);

  const damageTypes = new Set<string>();
  const weaponProperties = new Set<string>();
  const equipmentItems = new Set<string>();
  const speedTypes = new Set<string>();
  for (const weapon of WEAPONS) {
    if (weapon.damageType) damageTypes.add(weapon.damageType);
    for (const property of weapon.properties) weaponProperties.add(property);
    if (weapon.mastery) weaponProperties.add(weapon.mastery);
  }
  for (const mastery of Object.keys(WEAPON_MASTERY_DESCRIPTIONS)) weaponProperties.add(mastery);
  for (const cls of CLASSES) {
    for (const option of cls.startingEquipment) {
      for (const item of option.items) equipmentItems.add(item);
    }
  }
  for (const background of BACKGROUNDS) {
    for (const option of background.startingEquipment) {
      for (const item of option.items) equipmentItems.add(item);
    }
  }
  for (const species of SPECIES) {
    for (const speed of species.speeds) speedTypes.add(speed.type);
  }
  for (const beast of BEASTS) {
    for (const speed of beast.speeds) speedTypes.add(speed.type);
  }
  for (const type of [...damageTypes].sort()) addString(rows, "glossary", "damageType", type, type);
  for (const property of [...weaponProperties].sort()) {
    addString(rows, "glossary", "weaponProperty", property, property);
  }
  for (const item of [...equipmentItems].sort()) addString(rows, "glossary", "equipmentItem", item, item);
  for (const type of [...speedTypes].sort()) {
    addString(rows, "glossary", "speedType", type, type.charAt(0).toUpperCase() + type.slice(1));
  }
  for (const mastery of Object.keys(WEAPON_MASTERY_DESCRIPTIONS).sort()) {
    addString(
      rows,
      "glossary",
      "weaponMasteryDesc",
      mastery,
      WEAPON_MASTERY_DESCRIPTIONS[mastery as keyof typeof WEAPON_MASTERY_DESCRIPTIONS],
    );
  }

  return rows;
}

async function portugueseCatalogStrings(): Promise<CatalogStringRow[]> {
  const dir = path.join(CATALOG_SOURCE_ROOT, "locales/pt-BR/catalog");
  const files = (await readdir(dir)).filter((file) => file.endsWith(".md"));
  const rows: CatalogStringRow[] = [];
  for (const file of files) {
    const messages = parseMarkdownMessages(await readFile(path.join(dir, file), "utf8"));
    const entityType = file.slice(0, -".md".length);
    for (const [heading, text] of Object.entries(messages)) {
      const dot = heading.lastIndexOf(".");
      if (dot <= 0) throw new Error(`${file} heading has no field: ${heading}`);
      rows.push({
        entity_type: entityType,
        entity_key: heading.slice(0, dot),
        field: heading.slice(dot + 1),
        locale: "pt-BR",
        text,
      });
    }
  }
  return rows;
}

function dedupeStrings(rows: CatalogStringRow[]): CatalogStringRow[] {
  const map = new Map<string, CatalogStringRow>();
  for (const row of rows) {
    const id = [row.entity_type, row.entity_key, row.field, row.locale].join("\0");
    const previous = map.get(id);
    if (previous && previous.text !== row.text) {
      throw new Error(`Conflicting catalog string ${row.locale} ${row.entity_type}.${row.entity_key}.${row.field}`);
    }
    map.set(id, row);
  }
  return [...map.values()];
}

function buildPayload(catalogStrings: CatalogStringRow[]): SeedPayload {
  const bookKeys = new Set(BOOKS.map((book) => book.key));
  const classKeys = new Set(CLASSES.map((cls) => cls.key));
  const featKeys = new Set(FEATS.map((feat) => feat.key));
  const alignmentKeys = new Set(ALIGNMENTS.map((alignment) => alignment.key));

  const sourcedLists = {
    classes: CLASSES,
    feats: FEATS,
    alignments: ALIGNMENTS,
    spells: SPELLS,
    species: SPECIES,
    beasts: BEASTS,
    conditions: CONDITIONS,
    weapons: WEAPONS,
    armor: ARMOR,
    languages: LANGUAGES,
    magic_items: MAGIC_ITEMS,
    generic_variants: GENERIC_VARIANTS,
    adventuring_gear: ADVENTURING_GEAR,
  };

  for (const [label, items] of Object.entries(sourcedLists)) {
    assertUnique(label, items.map((item) => item.key));
    for (const item of items) {
      if (!bookKeys.has(item.book)) throw new Error(`${label} ${item.key} references missing book ${item.book}`);
    }
  }
  assertUnique("books", BOOKS.map((book) => book.key));
  assertUnique("subclasses", SUBCLASSES.map((subclass) => subclass.key));
  for (const subclass of SUBCLASSES) {
    if (!bookKeys.has(subclass.book)) throw new Error(`subclass ${subclass.key} references missing book ${subclass.book}`);
    if (!classKeys.has(subclass.classKey)) {
      throw new Error(`subclass ${subclass.key} references missing class ${subclass.classKey}`);
    }
  }
  for (const background of BACKGROUNDS) {
    if (background.featKey && !featKeys.has(background.featKey)) {
      throw new Error(`background ${background.key} references missing feat ${background.featKey}`);
    }
  }
  for (const deity of DEITIES) {
    if (deity.alignmentKey && !alignmentKeys.has(deity.alignmentKey)) {
      throw new Error(`deity ${deity.key} references missing alignment ${deity.alignmentKey}`);
    }
  }
  for (const classKey of Object.keys(CLASS_SPELL_LISTS)) {
    if (!classKeys.has(classKey)) throw new Error(`class spell list references missing class ${classKey}`);
  }

  const sourced: SeedPayload["sourced"] = {};
  for (const [table, items] of Object.entries(sourcedLists)) sourced[table] = sourcedRows(items);

  return {
    books: BOOKS.map((book) => ({ key: book.key, data: book })),
    sourced,
    subclasses: SUBCLASSES.map((subclass) => ({
      key: subclass.key,
      data: subclass,
      srd: subclass.srd,
      book: subclass.book,
      class_key: subclass.classKey,
    })),
    backgrounds: BACKGROUNDS.map((background) => ({
      key: background.key,
      data: background,
      srd: background.srd,
      book: background.book,
      feat_key: background.featKey,
    })),
    deities: DEITIES.map((deity) => ({
      key: deity.key,
      data: deity,
      srd: deity.srd,
      book: deity.book,
      alignment_key: deity.alignmentKey ?? null,
    })),
    classSpellLists: Object.entries(CLASS_SPELL_LISTS).map(([class_key, data]) => ({ class_key, data })),
    ammunition: Object.entries(AMMUNITION_STATS).map(([key, data]) => ({ key, data })),
    tools: Object.entries(TOOL_STATS).map(([key, data]) => ({ key, data })),
    catalogStrings: dedupeStrings(catalogStrings),
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) batches.push(items.slice(index, index + size));
  return batches;
}

async function upsert(base: string, serviceKey: string, table: string, rows: unknown[], onConflict: string) {
  if (rows.length === 0) return;
  for (const batch of chunk(rows, 200)) {
    const response = await fetch(`${base}/rest/v1/${table}?on_conflict=${onConflict}`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(batch),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`${table} upsert failed (${response.status}): ${body.slice(0, 600)}`);
    }
  }
}

async function upload(base: string, serviceKey: string, payload: SeedPayload) {
  await upsert(base, serviceKey, "books", payload.books, "key");
  await Promise.all(
    Object.entries(payload.sourced).map(([table, rows]) => upsert(base, serviceKey, table, rows, "key")),
  );
  await Promise.all([
    upsert(base, serviceKey, "subclasses", payload.subclasses, "key"),
    upsert(base, serviceKey, "backgrounds", payload.backgrounds, "key"),
    upsert(base, serviceKey, "deities", payload.deities, "key"),
    upsert(base, serviceKey, "class_spell_lists", payload.classSpellLists, "class_key"),
    upsert(base, serviceKey, "ammunition", payload.ammunition, "key"),
    upsert(base, serviceKey, "tools", payload.tools, "key"),
    upsert(base, serviceKey, "catalog_strings", payload.catalogStrings, "entity_type,entity_key,field,locale"),
  ]);
}

async function countRows(base: string, serviceKey: string, table: string, column: string): Promise<number> {
  const response = await fetch(`${base}/rest/v1/${table}?select=${column}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: "count=exact",
      Range: "0-0",
    },
  });
  if (!response.ok && response.status !== 416) {
    const body = await response.text();
    throw new Error(`${table} count failed (${response.status}): ${body.slice(0, 400)}`);
  }
  const match = /\/(\d+)$/.exec(response.headers.get("content-range") ?? "");
  if (!match) throw new Error(`${table} count header missing`);
  return Number(match[1]);
}

async function selectRows(base: string, serviceKey: string, table: string, query: string): Promise<unknown[]> {
  const response = await fetch(`${base}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${table} read failed (${response.status}): ${body.slice(0, 400)}`);
  }
  return response.json() as Promise<unknown[]>;
}

function sameJson(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (typeof left !== "object" || typeof right !== "object" || left === null || right === null) return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((value, index) => sameJson(value, right[index]));
  }
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const keys = Object.keys(leftRecord);
  if (keys.length !== Object.keys(rightRecord).length) return false;
  return keys.every((key) => sameJson(leftRecord[key], rightRecord[key]));
}

async function verify(base: string, serviceKey: string, payload: SeedPayload) {
  const expected: Record<string, number> = {
    books: payload.books.length,
    subclasses: payload.subclasses.length,
    backgrounds: payload.backgrounds.length,
    deities: payload.deities.length,
    class_spell_lists: payload.classSpellLists.length,
    ammunition: payload.ammunition.length,
    tools: payload.tools.length,
    catalog_strings: payload.catalogStrings.length,
  };
  for (const [table, rows] of Object.entries(payload.sourced)) expected[table] = rows.length;

  for (const [table, expectedCount] of Object.entries(expected)) {
    const column = table === "class_spell_lists" ? "class_key" : table === "catalog_strings" ? "entity_type" : "key";
    const actual = await countRows(base, serviceKey, table, column);
    if (actual !== expectedCount) {
      throw new Error(`${table} count is ${actual}, expected ${expectedCount}`);
    }
    console.log(`${table}: ${actual}`);
  }

  const fighter = payload.sourced.classes.find((row) => row.key === "fighter") ?? payload.sourced.classes[0];
  const subclass = payload.subclasses.find((row) => row.srd === false) ?? payload.subclasses[0];
  const magicItem = payload.sourced.magic_items.find((row) => row.srd === false) ?? payload.sourced.magic_items[0];
  const portuguese = payload.catalogStrings.find((row) => row.locale === "pt-BR");
  if (!fighter || !subclass || !magicItem || !portuguese) throw new Error("Spot-check rows are missing from the payload");

  const [classRow] = await selectRows(base, serviceKey, "classes", `key=eq.${fighter.key}&select=data`);
  const [subclassRow] = await selectRows(base, serviceKey, "subclasses", `key=eq.${subclass.key}&select=data`);
  const [itemRow] = await selectRows(base, serviceKey, "magic_items", `key=eq.${magicItem.key}&select=data`);
  const [stringRow] = await selectRows(
    base,
    serviceKey,
    "catalog_strings",
    [
      `entity_type=eq.${encodeURIComponent(portuguese.entity_type)}`,
      `entity_key=eq.${encodeURIComponent(portuguese.entity_key)}`,
      `field=eq.${encodeURIComponent(portuguese.field)}`,
      "locale=eq.pt-BR",
      "select=text",
    ].join("&"),
  );

  const classData = (classRow as { data?: unknown } | undefined)?.data;
  const subclassData = (subclassRow as { data?: unknown } | undefined)?.data;
  const itemData = (itemRow as { data?: unknown } | undefined)?.data;
  const stringText = (stringRow as { text?: string } | undefined)?.text;
  if (!sameJson(classData, fighter.data)) throw new Error(`Class spot check mismatch: ${fighter.key}`);
  if (!sameJson(subclassData, subclass.data)) throw new Error(`Subclass spot check mismatch: ${subclass.key}`);
  if (!sameJson(itemData, magicItem.data)) throw new Error(`Magic item spot check mismatch: ${magicItem.key}`);
  if (stringText !== portuguese.text) throw new Error(`Portuguese spot check mismatch: ${portuguese.entity_key}.${portuguese.field}`);

  console.log(`spot check class ${fighter.key}, subclass ${subclass.key} (srd ${subclass.srd}), magic item ${magicItem.key}`);
  console.log(`spot check pt-BR ${portuguese.entity_type}.${portuguese.entity_key}.${portuguese.field}`);
}

async function main() {
  loadEnvFile();
  const base = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }

  const payload = buildPayload([...englishCatalogStrings(), ...(await portugueseCatalogStrings())]);
  await upload(base, serviceKey, payload);
  await upload(base, serviceKey, payload);
  await verify(base, serviceKey, payload);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
