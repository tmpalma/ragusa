import type { Character } from "../state/characterState";
import type { HomebrewItemData, HomebrewItemRecord } from "../domain/homebrewItems";

/**
 * Library backend used by the account screens.
 * The app configures an implementation at startup. Chunk C3 uses the in-memory stub.
 * A later chunk swaps that factory for the edge function without changing call sites.
 */
export type LibraryErrorCode =
  | "character_already_seated"
  | "character_has_membership"
  | "not_found"
  | "invalid_character_file"
  | "empty_title"
  | "invalid_homebrew_item";

export class LibraryClientError extends Error {
  readonly code: LibraryErrorCode;

  constructor(code: LibraryErrorCode, message: string) {
    super(message);
    this.name = "LibraryClientError";
    this.code = code;
  }
}

export interface LibraryCharacterSummary {
  id: string;
  ownerEmail: string;
  title: string;
  updatedAt: string;
  campaignId: string | null;
  campaignTitle: string | null;
}

export interface LibraryCharacter {
  id: string;
  ownerEmail: string;
  title: string;
  document: Character;
  updatedAt: string;
}

export interface LibraryCampaignSummary {
  id: string;
  ownerEmail: string;
  title: string;
  updatedAt: string;
  memberCount: number;
}

/** Membership joined to the seated character. `session` is unused in this chunk. */
export interface LibraryMembership {
  id: string;
  campaignId: string;
  characterId: string;
  sortOrder: number;
  initiative: number | null;
  session: Record<string, unknown>;
  character: Character;
}

export interface LibraryCampaign {
  id: string;
  ownerEmail: string;
  title: string;
  updatedAt: string;
  members: LibraryMembership[];
}

export interface LibraryClient {
  ensurePlayer(email: string): Promise<void>;

  listCharacters(email: string): Promise<LibraryCharacterSummary[]>;
  createCharacter(email: string, input: { title: string; document?: Character }): Promise<LibraryCharacter>;
  openCharacter(email: string, characterId: string): Promise<LibraryCharacter>;
  saveCharacter(
    email: string,
    characterId: string,
    input: { title?: string; document: Character },
  ): Promise<LibraryCharacter>;
  deleteCharacter(email: string, characterId: string): Promise<void>;
  importCharacter(email: string, fileJson: string): Promise<LibraryCharacter>;

  listCampaigns(email: string): Promise<LibraryCampaignSummary[]>;
  createCampaign(email: string, input: { title: string }): Promise<LibraryCampaign>;
  openCampaign(email: string, campaignId: string): Promise<LibraryCampaign>;
  saveCampaign(email: string, campaignId: string, input: { title?: string }): Promise<LibraryCampaign>;
  deleteCampaign(email: string, campaignId: string): Promise<void>;

  seatCharacter(email: string, campaignId: string, characterId: string): Promise<void>;
  unseatCharacter(email: string, campaignId: string, characterId: string): Promise<void>;

  listHomebrewItems(email: string, filter?: { campaignId?: string }): Promise<HomebrewItemRecord[]>;
  createHomebrewItem(
    email: string,
    input: { campaignIds: string[]; data: HomebrewItemData },
  ): Promise<HomebrewItemRecord>;
  updateHomebrewItem(
    email: string,
    itemId: string,
    input: { campaignIds?: string[]; data?: HomebrewItemData },
  ): Promise<HomebrewItemRecord>;
  deleteHomebrewItem(email: string, itemId: string): Promise<void>;
}

let singleton: LibraryClient | null = null;
let factory: (() => LibraryClient) | null = null;

export function configureLibraryClient(next: () => LibraryClient): void {
  factory = next;
}

export function getLibraryClient(): LibraryClient {
  if (!singleton) {
    if (!factory) {
      throw new Error("Library client is not configured.");
    }
    singleton = factory();
  }
  return singleton;
}

export interface LibraryCharacterBinding {
  email: string;
  characterId: string;
  /** Set once the library document has been dispatched into the character provider. */
  loaded: boolean;
}

export interface LibraryCampaignBinding {
  email: string;
  campaignId: string;
}

type SessionListener = () => void;

let characterBinding: LibraryCharacterBinding | null = null;
let campaignBinding: LibraryCampaignBinding | null = null;
const sessionListeners = new Set<SessionListener>();

function emitLibrarySession(): void {
  for (const listener of sessionListeners) listener();
}

export function subscribeLibrarySession(listener: SessionListener): () => void {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}

export function getLibraryCharacterBinding(): LibraryCharacterBinding | null {
  return characterBinding;
}

export function getLibraryCampaignBinding(): LibraryCampaignBinding | null {
  return campaignBinding;
}

export function beginLibraryCharacterOpen(email: string, characterId: string): void {
  characterBinding = { email, characterId, loaded: false };
  emitLibrarySession();
}

export function completeLibraryCharacterOpen(): void {
  if (!characterBinding) return;
  characterBinding = { ...characterBinding, loaded: true };
  emitLibrarySession();
}

export function clearLibraryCharacterBinding(): void {
  if (!characterBinding) return;
  characterBinding = null;
  emitLibrarySession();
}

export function setLibraryCampaignBinding(binding: LibraryCampaignBinding | null): void {
  campaignBinding = binding;
  emitLibrarySession();
}
