// Pure, runtime-agnostic rules. No esm.sh imports, no Deno globals, no I/O.
import { LibraryOpError } from "../errors.ts";
import { isRecord } from "./shared.ts";

export const HOMEBREW_CATEGORIES = ["ring", "weapon", "wondrous", "other"] as const;
export const CURRENCY_DENOMINATIONS = ["pp", "gp", "ep", "sp", "cp"] as const;

export type HomebrewItemRow = {
  id: unknown;
  owner_email: unknown;
  campaign_ids: unknown;
  data: unknown;
  updated_at: unknown;
};

/** Validates homebrew item data and returns it with a trimmed `name`. */
export function validateHomebrewData(data: Record<string, unknown>): Record<string, unknown> {
  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name) throw new LibraryOpError("invalid_homebrew_item", "Item name is required.");
  const weightLb = data.weightLb;
  if (typeof weightLb !== "number" || !Number.isFinite(weightLb) || weightLb < 0) {
    throw new LibraryOpError("invalid_homebrew_item", "Weight is invalid.");
  }
  const category = data.category;
  if (typeof category !== "string" || !HOMEBREW_CATEGORIES.includes(category as (typeof HOMEBREW_CATEGORIES)[number])) {
    throw new LibraryOpError("invalid_homebrew_item", "Category is invalid.");
  }
  const cost = data.cost;
  if (!isRecord(cost)) throw new LibraryOpError("invalid_homebrew_item", "Cost is invalid.");
  const amount = cost.amount;
  const denomination = cost.denomination;
  if (
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount < 0 ||
    typeof denomination !== "string" ||
    !CURRENCY_DENOMINATIONS.includes(denomination as (typeof CURRENCY_DENOMINATIONS)[number])
  ) {
    throw new LibraryOpError("invalid_homebrew_item", "Cost is invalid.");
  }
  const range = data.range;
  if (range !== undefined) {
    if (!isRecord(range)) throw new LibraryOpError("invalid_homebrew_item", "Range is invalid.");
    const normalFeet = range.normalFeet;
    const longFeet = range.longFeet;
    if (
      typeof normalFeet !== "number" ||
      !Number.isFinite(normalFeet) ||
      normalFeet < 0 ||
      typeof longFeet !== "number" ||
      !Number.isFinite(longFeet) ||
      longFeet < 0
    ) {
      throw new LibraryOpError("invalid_homebrew_item", "Range is invalid.");
    }
  }
  return { ...data, name };
}

/** Narrows a payload `data` field to a record, else the "Item name is required." error. */
export function requireHomebrewDataRecord(data: unknown): Record<string, unknown> {
  if (!isRecord(data)) {
    throw new LibraryOpError("invalid_homebrew_item", "Item name is required.");
  }
  return data;
}

/** String entries of a `campaignIds` payload array (non-strings dropped). */
export function stringIds(value: unknown[]): string[] {
  return value.filter((id): id is string => typeof id === "string");
}

/** Every campaign id must be non-empty and owned by the caller. */
export function assertCampaignIdsOwned(campaignIds: readonly string[], owned: ReadonlySet<string>): void {
  if (campaignIds.length === 0) {
    throw new LibraryOpError("invalid_homebrew_item", "Select at least one campaign.");
  }
  for (const id of campaignIds) {
    if (!owned.has(id)) {
      throw new LibraryOpError("invalid_homebrew_item", "Campaign is not available.");
    }
  }
}

/**
 * Access to `listHomebrewItems { campaignId }`: the campaign's DM (owner) or any member (the caller owns a
 * character seated in it). Everyone else, and a missing campaign, gets `not_found` so the campaign's
 * existence is not revealed.
 */
export function assertCampaignItemsAccess(input: {
  callerEmail: string;
  /** `owner_email` of the campaign, or null when it does not exist. */
  campaignOwnerEmail: string | null;
  /** The caller owns a character with a `campaign_members` row in this campaign. */
  callerIsMember: boolean;
}): void {
  if (input.campaignOwnerEmail === null) {
    throw new LibraryOpError("not_found", "Campaign not found.");
  }
  if (input.campaignOwnerEmail === input.callerEmail) return;
  if (input.callerIsMember) return;
  throw new LibraryOpError("not_found", "Campaign not found.");
}

export const HOMEBREW_ITEMS_FILE_FORMAT = "ragusa-homebrew-items";
export const HOMEBREW_ITEMS_FILE_SCHEMA_VERSION = 1;

function invalidItemsFile(message: string): LibraryOpError {
  return new LibraryOpError("invalid_items_file", message);
}

/**
 * Parses an exported items file (`{ format, schemaVersion, exportedAt, items: [{ data }] }`) and validates
 * every item with `validateHomebrewData`. All or nothing: any problem throws `invalid_items_file`.
 * Returns the validated item data (trimmed name, `description` defaulted to "").
 */
export function parseHomebrewItemsFile(fileJson: unknown): Record<string, unknown>[] {
  if (typeof fileJson !== "string") throw invalidItemsFile("Items file is missing.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(fileJson);
  } catch {
    throw invalidItemsFile("Items file is not valid JSON.");
  }
  if (!isRecord(parsed)) throw invalidItemsFile("Items file is invalid.");
  if (parsed.format !== HOMEBREW_ITEMS_FILE_FORMAT) throw invalidItemsFile("Unsupported items file format.");
  const schemaVersion = parsed.schemaVersion;
  if (typeof schemaVersion !== "number" || !Number.isFinite(schemaVersion)) {
    throw invalidItemsFile("Items file schema version is invalid.");
  }
  if (schemaVersion > HOMEBREW_ITEMS_FILE_SCHEMA_VERSION) {
    throw invalidItemsFile("Items file requires a newer version of this app.");
  }
  if (!Array.isArray(parsed.items)) throw invalidItemsFile("Items file has no items list.");
  return parsed.items.map((entry: unknown, index: number) => {
    if (!isRecord(entry) || !isRecord(entry.data)) {
      throw invalidItemsFile(`Item ${index + 1} is invalid.`);
    }
    let data: Record<string, unknown>;
    try {
      data = validateHomebrewData(entry.data);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Invalid item.";
      throw invalidItemsFile(`Item ${index + 1}: ${reason}`);
    }
    return { ...data, description: typeof data.description === "string" ? data.description : "" };
  });
}

export function homebrewItemFromRow(row: HomebrewItemRow) {
  return {
    id: row.id,
    ownerEmail: row.owner_email,
    campaignIds: row.campaign_ids ?? [],
    data: row.data,
    updatedAt: row.updated_at,
  };
}
