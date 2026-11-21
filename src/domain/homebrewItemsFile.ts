import {
  CURRENCY_DENOMINATIONS,
  HOMEBREW_ITEM_CATEGORIES,
  type HomebrewItemData,
  type HomebrewItemRecord,
} from "./homebrewItems";

export const HOMEBREW_ITEMS_FILE_FORMAT = "ragusa-homebrew-items" as const;
export const HOMEBREW_ITEMS_FILE_SCHEMA_VERSION = 1;

export interface HomebrewItemsFileEnvelope {
  format: typeof HOMEBREW_ITEMS_FILE_FORMAT;
  schemaVersion: number;
  exportedAt: string;
  items: { data: HomebrewItemData }[];
}

/** Thrown by `parseHomebrewItemsFile`. Same code as the server's import rejection. */
export class HomebrewItemsFileParseError extends Error {
  readonly code = "invalid_items_file" as const;

  constructor(message: string) {
    super(message);
    this.name = "HomebrewItemsFileParseError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/**
 * Keeps only each record's `data`: ids, owner and campaign links mean nothing to another DM.
 */
export function serializeHomebrewItemsFile(
  records: readonly Pick<HomebrewItemRecord, "data">[],
  exportedAt = new Date(),
): string {
  const envelope: HomebrewItemsFileEnvelope = {
    format: HOMEBREW_ITEMS_FILE_FORMAT,
    schemaVersion: HOMEBREW_ITEMS_FILE_SCHEMA_VERSION,
    exportedAt: exportedAt.toISOString(),
    items: records.map((record) => ({ data: record.data })),
  };
  return JSON.stringify(envelope, null, 2);
}

/** Mirrors the server's `validateHomebrewData`; returns the data with a trimmed name. */
function validateItemData(raw: Record<string, unknown>, position: number): HomebrewItemData {
  const fail = (reason: string) => new HomebrewItemsFileParseError(`Item ${position}: ${reason}`);
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name) throw fail("Item name is required.");
  if (!isNonNegativeNumber(raw.weightLb)) throw fail("Weight is invalid.");
  const category = raw.category;
  if (typeof category !== "string" || !(HOMEBREW_ITEM_CATEGORIES as string[]).includes(category)) {
    throw fail("Category is invalid.");
  }
  const cost = raw.cost;
  if (
    !isRecord(cost) ||
    !isNonNegativeNumber(cost.amount) ||
    typeof cost.denomination !== "string" ||
    !(CURRENCY_DENOMINATIONS as string[]).includes(cost.denomination)
  ) {
    throw fail("Cost is invalid.");
  }
  const range = raw.range;
  if (range !== undefined) {
    if (!isRecord(range) || !isNonNegativeNumber(range.normalFeet) || !isNonNegativeNumber(range.longFeet)) {
      throw fail("Range is invalid.");
    }
  }
  return {
    ...raw,
    name,
    description: typeof raw.description === "string" ? raw.description : "",
  } as unknown as HomebrewItemData;
}

/**
 * Parses an items export. Mirrors the server's import rules so bad files are caught before upload:
 * wrong JSON, wrong format, a newer schema, a missing items list or any invalid item throws
 * `HomebrewItemsFileParseError` (all or nothing).
 */
export function parseHomebrewItemsFile(source: string): HomebrewItemData[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new HomebrewItemsFileParseError("Items file is not valid JSON.");
  }
  if (!isRecord(parsed)) throw new HomebrewItemsFileParseError("Items file is invalid.");
  if (parsed.format !== HOMEBREW_ITEMS_FILE_FORMAT) {
    throw new HomebrewItemsFileParseError("Unsupported items file format.");
  }
  const schemaVersion = parsed.schemaVersion;
  if (typeof schemaVersion !== "number" || !Number.isFinite(schemaVersion)) {
    throw new HomebrewItemsFileParseError("Items file schema version is invalid.");
  }
  if (schemaVersion > HOMEBREW_ITEMS_FILE_SCHEMA_VERSION) {
    throw new HomebrewItemsFileParseError("Items file requires a newer version of this app.");
  }
  if (!Array.isArray(parsed.items)) throw new HomebrewItemsFileParseError("Items file has no items list.");
  return parsed.items.map((entry: unknown, index: number) => {
    if (!isRecord(entry) || !isRecord(entry.data)) {
      throw new HomebrewItemsFileParseError(`Item ${index + 1} is invalid.`);
    }
    return validateItemData(entry.data, index + 1);
  });
}

/** Local calendar date as `yyyy-mm-dd`, for export file names. */
export function fileDateStamp(date: Date): string {
  const yyyy = String(date.getFullYear()).padStart(4, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** File-name-safe version of a campaign title (fallback "campaign"). */
export function fileNameBase(title: string, fallback = "campaign"): string {
  const base = title.trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ");
  return base.length > 0 ? base : fallback;
}

/** `<campaign>-items-<yyyy-mm-dd>.json` */
export function homebrewItemsFileName(campaignTitle: string, date = new Date()): string {
  return `${fileNameBase(campaignTitle)}-items-${fileDateStamp(date)}.json`;
}
