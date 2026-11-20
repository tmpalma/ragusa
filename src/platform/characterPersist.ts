import { parseCharacterFile, serializeCharacterFile } from "../domain/characterFile";
import { normalizeEmail } from "./claimedIdentity";
import { INITIAL_CHARACTER, type Character } from "../state/characterState";
import type { CampaignMember } from "../state/campaignState";
import { getPersistStore } from "./persistStore";

/** Legacy global keys — not used for signed-in play (see player-scoped keys). */
export const LAST_CHARACTER_KEY = "last-character";
export const LAST_CAMPAIGN_KEY = "last-campaign";

export interface ActivePlaySelection {
  characterId?: string | null;
  campaignId?: string | null;
}

interface PersistedCampaignPayload {
  members: Array<{
    id: string;
    character: string;
    initiative?: number | null;
  }>;
}

export function playerLastCharacterKey(email: string): string {
  return `last-character:${normalizeEmail(email)}`;
}

export function playerLastCampaignKey(email: string): string {
  return `last-campaign:${normalizeEmail(email)}`;
}

export function playerActivePlayKey(email: string): string {
  return `active-play:${normalizeEmail(email)}`;
}

export async function loadLastCharacter(): Promise<Character | null> {
  try {
    const raw = await getPersistStore().get(LAST_CHARACTER_KEY);
    if (raw == null) return null;
    return parseCharacterFile(raw);
  } catch {
    return null;
  }
}

export async function saveLastCharacter(character: Character): Promise<void> {
  const json = serializeCharacterFile(character);
  await getPersistStore().set(LAST_CHARACTER_KEY, json);
}

export async function loadPlayerLastCharacter(email: string): Promise<Character | null> {
  try {
    const raw = await getPersistStore().get(playerLastCharacterKey(email));
    if (raw == null) return null;
    return parseCharacterFile(raw);
  } catch {
    return null;
  }
}

export async function savePlayerLastCharacter(email: string, character: Character): Promise<void> {
  const json = serializeCharacterFile(character);
  await getPersistStore().set(playerLastCharacterKey(email), json);
}

export async function loadActivePlay(email: string): Promise<ActivePlaySelection | null> {
  try {
    const raw = await getPersistStore().get(playerActivePlayKey(email));
    if (raw == null) return null;
    const parsed = JSON.parse(raw) as ActivePlaySelection;
    if (typeof parsed !== "object" || parsed === null) return null;
    return {
      characterId: typeof parsed.characterId === "string" ? parsed.characterId : null,
      campaignId: typeof parsed.campaignId === "string" ? parsed.campaignId : null,
    };
  } catch {
    return null;
  }
}

export async function saveActivePlay(
  email: string,
  patch: Partial<ActivePlaySelection>,
): Promise<void> {
  const normalized = normalizeEmail(email);
  const previous = activePlayWriteChains.get(normalized) ?? Promise.resolve();
  const next = previous.then(() => writeActivePlay(normalized, patch));
  activePlayWriteChains.set(normalized, next);
  try {
    await next;
  } finally {
    if (activePlayWriteChains.get(normalized) === next) {
      activePlayWriteChains.delete(normalized);
    }
  }
}

const activePlayWriteChains = new Map<string, Promise<void>>();

async function writeActivePlay(normalizedEmail: string, patch: Partial<ActivePlaySelection>): Promise<void> {
  const key = playerActivePlayKey(normalizedEmail);
  const existing = await loadActivePlay(normalizedEmail);
  const next: ActivePlaySelection = {
    characterId:
      "characterId" in patch ? (patch.characterId ?? null) : (existing?.characterId ?? null),
    campaignId: "campaignId" in patch ? (patch.campaignId ?? null) : (existing?.campaignId ?? null),
  };
  const hasCharacter = typeof next.characterId === "string" && next.characterId.length > 0;
  const hasCampaign = typeof next.campaignId === "string" && next.campaignId.length > 0;
  if (!hasCharacter && !hasCampaign) {
    await getPersistStore().set(key, JSON.stringify({ characterId: null, campaignId: null }));
    return;
  }
  await getPersistStore().set(
    key,
    JSON.stringify({
      characterId: hasCharacter ? next.characterId : null,
      campaignId: hasCampaign ? next.campaignId : null,
    }),
  );
}

export async function loadLastCampaign(): Promise<CampaignMember[]> {
  try {
    const raw = await getPersistStore().get(LAST_CAMPAIGN_KEY);
    if (raw == null) return [];

    const payload = JSON.parse(raw) as PersistedCampaignPayload;
    if (!Array.isArray(payload.members)) return [];

    const members: CampaignMember[] = [];
    for (const entry of payload.members) {
      if (typeof entry?.id !== "string" || typeof entry?.character !== "string") continue;
      try {
        const initiative =
          typeof entry.initiative === "number" && Number.isFinite(entry.initiative)
            ? Math.trunc(entry.initiative)
            : null;
        members.push({
          id: entry.id,
          character: parseCharacterFile(entry.character),
          initiative,
        });
      } catch {
        // Skip malformed member entries; other valid members still restore.
      }
    }
    return members;
  } catch {
    return [];
  }
}

export async function saveLastCampaign(members: CampaignMember[]): Promise<void> {
  const payload: PersistedCampaignPayload = {
    members: members.map((member) => ({
      id: member.id,
      character: serializeCharacterFile(member.character),
      initiative: member.initiative,
    })),
  };
  await getPersistStore().set(LAST_CAMPAIGN_KEY, JSON.stringify(payload));
}

export async function loadPlayerLastCampaign(email: string): Promise<CampaignMember[]> {
  try {
    const raw = await getPersistStore().get(playerLastCampaignKey(email));
    if (raw == null) return [];

    const payload = JSON.parse(raw) as PersistedCampaignPayload;
    if (!Array.isArray(payload.members)) return [];

    const members: CampaignMember[] = [];
    for (const entry of payload.members) {
      if (typeof entry?.id !== "string" || typeof entry?.character !== "string") continue;
      try {
        const initiative =
          typeof entry.initiative === "number" && Number.isFinite(entry.initiative)
            ? Math.trunc(entry.initiative)
            : null;
        members.push({
          id: entry.id,
          character: parseCharacterFile(entry.character),
          initiative,
        });
      } catch {
        // Skip malformed member entries.
      }
    }
    return members;
  } catch {
    return [];
  }
}

export async function savePlayerLastCampaign(email: string, members: CampaignMember[]): Promise<void> {
  const payload: PersistedCampaignPayload = {
    members: members.map((member) => ({
      id: member.id,
      character: serializeCharacterFile(member.character),
      initiative: member.initiative,
    })),
  };
  await getPersistStore().set(playerLastCampaignKey(email), JSON.stringify(payload));
}

/** Exported for tests: parse errors should fall back to INITIAL_CHARACTER. */
export function parseLastCharacterOrDefault(raw: string | null): Character {
  if (raw == null) return INITIAL_CHARACTER;
  try {
    return parseCharacterFile(raw);
  } catch {
    return INITIAL_CHARACTER;
  }
}
