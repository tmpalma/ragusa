import { slugifyItemName } from "./fiveToolsText.js";
import type { DeityData } from "../../src/data/types.js";

/** Normalize pantheon labels so reprints merge (Forgotten Realms ↔ Faerûnian, etc.). */
export function normalizePantheon(pantheon: string): string {
  switch (pantheon) {
    case "Forgotten Realms":
      return "Faerûnian";
    case "Gnome":
      return "Gnomish";
    default:
      return pantheon;
  }
}

/** Higher number = preferred when merging reprints. */
const SOURCE_PRIORITY: Record<string, number> = {
  FRHoF: 100,
  XDMG: 95,
  EGW: 90,
  ERLW: 85,
  MOT: 80,
  DSotDQ: 75,
  MTF: 70,
  SCAG: 65,
  VGM: 60,
  VRGR: 55,
  GoS: 50,
  PHB: 40,
  DMG: 35,
};

function sourcePriority(source: string): number {
  return SOURCE_PRIORITY[source] ?? 10;
}

export interface RawFiveToolsDeity {
  name: string;
  source: string;
  pantheon: string;
  alignment?: string[];
  title?: string;
  altNames?: string[];
  category?: string;
  domains?: string[];
  province?: string;
  symbol?: string;
  worshipers?: string;
  plane?: string;
  srd?: boolean;
  reprintAlias?: string;
  _copy?: unknown;
}

const ALIGNMENT_KEY_BY_LETTERS: Record<string, string> = {
  "L,G": "lawful-good",
  "L,N": "lawful-neutral",
  "L,E": "lawful-evil",
  "N,G": "neutral-good",
  N: "neutral",
  "N,E": "neutral-evil",
  "C,G": "chaotic-good",
  "C,N": "chaotic-neutral",
  "C,E": "chaotic-evil",
};

export function alignmentLettersToKey(letters: string[] | undefined): string | undefined {
  if (!letters?.length) return undefined;
  const key = letters.join(",");
  return ALIGNMENT_KEY_BY_LETTERS[key];
}

function mergeField<T>(primary: T | undefined, fallback: T | undefined): T | undefined {
  if (primary === undefined || primary === null) return fallback;
  if (Array.isArray(primary) && primary.length === 0) return fallback;
  if (typeof primary === "string" && primary.trim() === "") return fallback;
  return primary;
}

function mergeAltNames(primary: string[] | undefined, fallback: string[] | undefined): string[] | undefined {
  const combined = [...(primary ?? []), ...(fallback ?? [])];
  if (combined.length === 0) return undefined;
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const name of combined) {
    const trimmed = name.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    unique.push(trimmed);
  }
  return unique.length > 0 ? unique : undefined;
}

function mergeDeityRecords(records: RawFiveToolsDeity[]): RawFiveToolsDeity {
  const sorted = [...records].sort((a, b) => sourcePriority(b.source) - sourcePriority(a.source));
  let merged = { ...sorted[0] };
  for (const record of sorted.slice(1)) {
    merged = {
      ...merged,
      title: mergeField(merged.title, record.title),
      altNames: mergeAltNames(merged.altNames, record.altNames ?? (record.reprintAlias ? [record.reprintAlias] : undefined)),
      category: mergeField(merged.category, record.category),
      domains: mergeField(merged.domains, record.domains),
      province: mergeField(merged.province, record.province),
      symbol: mergeField(merged.symbol, record.symbol),
      worshipers: mergeField(merged.worshipers, record.worshipers),
      plane: mergeField(merged.plane, record.plane),
      alignment: mergeField(merged.alignment, record.alignment),
      srd: merged.srd || record.srd,
    };
  }
  if (merged.reprintAlias && !merged.altNames?.includes(merged.reprintAlias)) {
    merged.altNames = mergeAltNames(merged.altNames, [merged.reprintAlias]);
  }
  return merged;
}

function rawToDeityData(raw: RawFiveToolsDeity, key: string): DeityData {
  const pantheon = normalizePantheon(raw.pantheon);
  return {
    key,
    name: raw.name,
    pantheon,
    ...(raw.title ? { title: raw.title } : {}),
    ...(raw.altNames?.length ? { altNames: raw.altNames } : {}),
    ...(raw.category ? { category: raw.category } : {}),
    ...(alignmentLettersToKey(raw.alignment) ? { alignmentKey: alignmentLettersToKey(raw.alignment) } : {}),
    ...(raw.domains?.length ? { domains: raw.domains } : {}),
    ...(raw.symbol ? { symbol: raw.symbol } : {}),
    ...(raw.province ? { portfolio: raw.province } : {}),
    ...(raw.worshipers ? { worshipers: raw.worshipers } : {}),
    ...(raw.plane ? { plane: raw.plane } : {}),
    srd: raw.srd === true,
    book: raw.source,
  };
}

export function buildDeityCatalog(rawDeities: RawFiveToolsDeity[]): DeityData[] {
  const groups = new Map<string, RawFiveToolsDeity[]>();
  for (const deity of rawDeities) {
    if (!deity.name || !deity.pantheon || !deity.source) continue;
    const pantheon = normalizePantheon(deity.pantheon);
    const groupKey = `${deity.name}||${pantheon}`;
    const list = groups.get(groupKey) ?? [];
    list.push({ ...deity, pantheon });
    groups.set(groupKey, list);
  }

  const mergedRecords = [...groups.values()].map((records) => mergeDeityRecords(records));

  const namesInMultiplePantheons = new Set<string>();
  const pantheonsByName = new Map<string, Set<string>>();
  for (const record of mergedRecords) {
    const pantheon = normalizePantheon(record.pantheon);
    const set = pantheonsByName.get(record.name) ?? new Set<string>();
    set.add(pantheon);
    pantheonsByName.set(record.name, set);
  }
  for (const [name, pantheons] of pantheonsByName) {
    if (pantheons.size > 1) namesInMultiplePantheons.add(name);
  }

  const usedKeys = new Set<string>();
  const catalog: DeityData[] = [];

  for (const record of mergedRecords.sort((a, b) => a.name.localeCompare(b.name))) {
    const pantheon = normalizePantheon(record.pantheon);
    const baseKey = slugifyItemName(record.name);
    let key = namesInMultiplePantheons.has(record.name)
      ? `${baseKey}-${slugifyItemName(pantheon)}`
      : baseKey;
    if (usedKeys.has(key)) {
      key = `${baseKey}-${slugifyItemName(pantheon)}`;
    }
    usedKeys.add(key);
    catalog.push(rawToDeityData(record, key));
  }

  return catalog.sort((a, b) => a.name.localeCompare(b.name) || a.pantheon.localeCompare(b.pantheon));
}
