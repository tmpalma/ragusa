import type { HomebrewItemData } from "../../domain/homebrewItems";
import { assertHomebrewCampaignIds, normalizeLibraryEmail } from "../libraryValidation";
import { LibraryClientError } from "../libraryClient";

export interface PlayerRow {
  email: string;
  displayName: string;
}

export interface CharacterRow {
  id: string;
  ownerEmail: string;
  title: string;
  documentJson: string;
  updatedAt: string;
}

export interface CampaignRow {
  id: string;
  ownerEmail: string;
  title: string;
  updatedAt: string;
}

export interface MembershipRow {
  id: string;
  campaignId: string;
  characterId: string;
  sortOrder: number;
  initiative: number | null;
  session: Record<string, unknown>;
}

export interface HomebrewItemRow {
  id: string;
  ownerEmail: string;
  campaignIds: string[];
  data: HomebrewItemData;
  updatedAt: string;
}

/** Shared in-memory tables. Every domain factory reads and writes the same store. */
export interface MemoryLibraryStore {
  players: Map<string, PlayerRow>;
  characters: Map<string, CharacterRow>;
  campaigns: Map<string, CampaignRow>;
  memberships: Map<string, MembershipRow>;
  homebrewItems: Map<string, HomebrewItemRow>;
}

export function createMemoryLibraryStore(): MemoryLibraryStore {
  return {
    players: new Map(),
    characters: new Map(),
    campaigns: new Map(),
    memberships: new Map(),
    homebrewItems: new Map(),
  };
}

export const normalizeEmail = normalizeLibraryEmail;

export function now(): string {
  return new Date().toISOString();
}

export function newId(): string {
  return crypto.randomUUID();
}

export function ensurePlayerRow(store: MemoryLibraryStore, email: string): void {
  if (store.players.has(email)) return;
  // Same default as the edge function: the email's local part (`ada` for `ada@example.com`).
  const at = email.indexOf("@");
  const local = (at >= 0 ? email.slice(0, at) : email).trim();
  store.players.set(email, { email, displayName: local || email });
}

export function requireCharacter(store: MemoryLibraryStore, email: string, characterId: string): CharacterRow {
  const row = store.characters.get(characterId);
  if (!row || row.ownerEmail !== email) {
    throw new LibraryClientError("not_found", "Character not found.");
  }
  return row;
}

export function requireCampaign(store: MemoryLibraryStore, email: string, campaignId: string): CampaignRow {
  const row = store.campaigns.get(campaignId);
  if (!row || row.ownerEmail !== email) {
    throw new LibraryClientError("not_found", "Campaign not found.");
  }
  return row;
}

export function membershipForCharacter(store: MemoryLibraryStore, characterId: string): MembershipRow | null {
  for (const membership of store.memberships.values()) {
    if (membership.characterId === characterId) return membership;
  }
  return null;
}

export function assertOwnedCampaignIds(store: MemoryLibraryStore, email: string, campaignIds: string[]): void {
  const owned = new Set(
    [...store.campaigns.values()].filter((row) => row.ownerEmail === email).map((row) => row.id),
  );
  assertHomebrewCampaignIds(campaignIds, owned);
}
