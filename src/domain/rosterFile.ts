import type { LibraryCampaign } from "../platform/libraryClient";
import type { Character } from "../state/characterState";
import { parseCharacterFile, serializeCharacterFile, type CharacterFileEnvelope } from "./characterFile";
import { fileDateStamp, fileNameBase } from "./homebrewItemsFile";

export const ROSTER_FILE_FORMAT = "ragusa-roster" as const;
export const ROSTER_FILE_SCHEMA_VERSION = 1;

export interface RosterFileMember {
  /** Owner of the seated character. `null` when the source does not carry it (see `serializeRosterFile`). */
  ownerEmail: string | null;
  characterId: string;
  initiative: number | null;
  /** A normal character file, so a single member can be pulled out and imported. */
  file: CharacterFileEnvelope;
}

export interface RosterFileEnvelope {
  format: typeof ROSTER_FILE_FORMAT;
  schemaVersion: number;
  exportedAt: string;
  campaign: { id: string; title: string; dm: string };
  members: RosterFileMember[];
}

/** Opened campaign, as returned by `openCampaign`. Members may carry an `ownerEmail` when the source has it. */
export type RosterCampaignSource = Pick<LibraryCampaign, "id" | "title" | "ownerEmail"> & {
  members: (Pick<LibraryCampaign["members"][number], "characterId" | "initiative" | "character"> & {
    ownerEmail?: string | null;
  })[];
};

export class RosterFileParseError extends Error {
  readonly code = "invalid_roster_file" as const;

  constructor(message: string) {
    super(message);
    this.name = "RosterFileParseError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Roster snapshot of an opened campaign. Each member's `file` reuses `serializeCharacterFile`.
 * `LibraryMembership` has no owner email today, so `ownerEmail` is `null` unless the source supplies one.
 */
export function serializeRosterFile(campaign: RosterCampaignSource, exportedAt = new Date()): string {
  const envelope: RosterFileEnvelope = {
    format: ROSTER_FILE_FORMAT,
    schemaVersion: ROSTER_FILE_SCHEMA_VERSION,
    exportedAt: exportedAt.toISOString(),
    campaign: { id: campaign.id, title: campaign.title, dm: campaign.ownerEmail },
    members: campaign.members.map((member) => ({
      ownerEmail: member.ownerEmail ?? null,
      characterId: member.characterId,
      initiative: member.initiative,
      file: JSON.parse(serializeCharacterFile(member.character, exportedAt)) as CharacterFileEnvelope,
    })),
  };
  return JSON.stringify(envelope, null, 2);
}

export interface ParsedRosterFile {
  exportedAt: string;
  campaign: { id: string; title: string; dm: string };
  members: { ownerEmail: string | null; characterId: string; initiative: number | null; character: Character }[];
}

/** Reads a roster snapshot back; each member file goes through `parseCharacterFile`. */
export function parseRosterFile(source: string): ParsedRosterFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new RosterFileParseError("Roster file is not valid JSON.");
  }
  if (!isRecord(parsed)) throw new RosterFileParseError("Roster file is invalid.");
  if (parsed.format !== ROSTER_FILE_FORMAT) throw new RosterFileParseError("Unsupported roster file format.");
  const schemaVersion = parsed.schemaVersion;
  if (typeof schemaVersion !== "number" || !Number.isFinite(schemaVersion)) {
    throw new RosterFileParseError("Roster file schema version is invalid.");
  }
  if (schemaVersion > ROSTER_FILE_SCHEMA_VERSION) {
    throw new RosterFileParseError("Roster file requires a newer version of this app.");
  }
  const campaign = parsed.campaign;
  if (
    !isRecord(campaign) ||
    typeof campaign.id !== "string" ||
    typeof campaign.title !== "string" ||
    typeof campaign.dm !== "string"
  ) {
    throw new RosterFileParseError("Roster campaign is invalid.");
  }
  if (!Array.isArray(parsed.members)) throw new RosterFileParseError("Roster has no members list.");
  const members = parsed.members.map((entry: unknown, index: number) => {
    const fail = () => new RosterFileParseError(`Member ${index + 1} is invalid.`);
    if (!isRecord(entry) || typeof entry.characterId !== "string") throw fail();
    const ownerEmail = entry.ownerEmail ?? null;
    if (ownerEmail !== null && typeof ownerEmail !== "string") throw fail();
    const initiative = entry.initiative ?? null;
    if (initiative !== null && (typeof initiative !== "number" || !Number.isFinite(initiative))) throw fail();
    let character: Character;
    try {
      character = parseCharacterFile(JSON.stringify(entry.file));
    } catch {
      throw fail();
    }
    return { ownerEmail, characterId: entry.characterId, initiative, character };
  });
  return {
    exportedAt: typeof parsed.exportedAt === "string" ? parsed.exportedAt : "",
    campaign: { id: campaign.id, title: campaign.title, dm: campaign.dm },
    members,
  };
}

/** `<campaign>-roster-<yyyy-mm-dd>.json` */
export function rosterFileName(campaignTitle: string, date = new Date()): string {
  return `${fileNameBase(campaignTitle)}-roster-${fileDateStamp(date)}.json`;
}
