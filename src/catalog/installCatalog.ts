import { AMMO_TYPES, AMMUNITION_STATS, type AmmoType, type AmmunitionPackStats } from "../data/ammunitionStats";
import { TOOL_IDS, TOOL_STATS, type ToolData, type ToolId } from "../data/toolStats";
import { setInstalledCatalogMessages } from "../i18n/catalogMessages";
import * as store from "./catalogStore";
import type { CatalogPayload } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function validateCatalogPayload(value: unknown): value is CatalogPayload {
  if (!isRecord(value)) return false;
  const arrays = [
    "classes",
    "subclasses",
    "spells",
    "species",
    "backgrounds",
    "deities",
    "beasts",
    "conditions",
    "books",
    "feats",
    "weapons",
    "armor",
    "alignments",
    "languages",
    "magicItems",
    "genericVariants",
    "adventuringGear",
    "catalogStrings",
  ] as const;
  for (const key of arrays) {
    if (!isArray(value[key])) return false;
  }
  if (!isRecord(value.classSpellLists)) return false;
  if (!isRecord(value.ammunitionStats)) return false;
  if (!isRecord(value.toolStats)) return false;
  return true;
}

function replaceAmmunitionStats(stats: Record<string, AmmunitionPackStats>) {
  for (const key of Object.keys(AMMUNITION_STATS)) {
    delete AMMUNITION_STATS[key as AmmoType];
  }
  for (const [key, data] of Object.entries(stats)) {
    AMMUNITION_STATS[key as AmmoType] = data;
  }
  AMMO_TYPES.length = 0;
  AMMO_TYPES.push(...(Object.keys(stats) as AmmoType[]));
}

function replaceToolStats(stats: Record<string, ToolData>) {
  for (const key of Object.keys(TOOL_STATS)) {
    delete TOOL_STATS[key as ToolId];
  }
  for (const [key, data] of Object.entries(stats)) {
    TOOL_STATS[key as ToolId] = data;
  }
  TOOL_IDS.length = 0;
  TOOL_IDS.push(...(Object.keys(stats) as ToolId[]));
}

export function installCatalog(payload: CatalogPayload): void {
  if (!validateCatalogPayload(payload)) {
    throw new Error("Invalid catalog payload");
  }

  store.replaceArray(store.CLASSES, payload.classes);
  store.replaceArray(store.SUBCLASSES, payload.subclasses);
  store.replaceRecord(store.CLASS_SPELL_LISTS, payload.classSpellLists);
  store.replaceArray(store.SPELLS, payload.spells);
  store.replaceArray(store.SPECIES, payload.species);
  store.replaceArray(store.BACKGROUNDS, payload.backgrounds);
  store.replaceArray(store.DEITIES, payload.deities);
  store.replaceArray(store.BEASTS, payload.beasts);
  store.replaceArray(store.CONDITIONS, payload.conditions);
  store.replaceArray(store.BOOKS, payload.books);
  store.replaceArray(store.FEATS, payload.feats);
  store.replaceArray(store.WEAPONS, payload.weapons);
  store.replaceArray(store.ARMOR, payload.armor);
  store.replaceArray(store.ALIGNMENTS, payload.alignments);
  store.replaceArray(store.LANGUAGES, payload.languages);
  store.replaceArray(store.MAGIC_ITEMS, payload.magicItems);
  store.replaceArray(store.GENERIC_VARIANTS, payload.genericVariants);
  store.replaceArray(store.ADVENTURING_GEAR, payload.adventuringGear);

  replaceAmmunitionStats(payload.ammunitionStats);
  replaceToolStats(payload.toolStats);
  setInstalledCatalogMessages(payload.catalogStrings);
}
