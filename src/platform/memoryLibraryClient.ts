import type { HomebrewItemData } from "../domain/homebrewItems";
import { parseCharacterFile, serializeCharacterFile } from "../domain/characterFile";
import {
  assertHomebrewCampaignIds,
  normalizeLibraryEmail,
  validateHomebrewItemData,
} from "./libraryValidation";
import { INITIAL_CHARACTER, type Character } from "../state/characterState";
import {
  LibraryClientError,
  type LibraryCampaign,
  type LibraryCampaignSummary,
  type LibraryCharacter,
  type LibraryCharacterSummary,
  type LibraryClient,
  type LibraryMembership,
} from "./libraryClient";

interface PlayerRow {
  email: string;
  displayName: string;
}

interface CharacterRow {
  id: string;
  ownerEmail: string;
  title: string;
  documentJson: string;
  updatedAt: string;
}

interface CampaignRow {
  id: string;
  ownerEmail: string;
  title: string;
  updatedAt: string;
}

interface MembershipRow {
  id: string;
  campaignId: string;
  characterId: string;
  sortOrder: number;
  initiative: number | null;
  session: Record<string, unknown>;
}

interface HomebrewItemRow {
  id: string;
  ownerEmail: string;
  campaignIds: string[];
  data: HomebrewItemData;
  updatedAt: string;
}

const normalizeEmail = normalizeLibraryEmail;

function now(): string {
  return new Date().toISOString();
}

function assertOwnedCampaignIds(email: string, campaignIds: string[], campaigns: Map<string, CampaignRow>): void {
  const owned = new Set(
    [...campaigns.values()].filter((row) => row.ownerEmail === email).map((row) => row.id),
  );
  assertHomebrewCampaignIds(campaignIds, owned);
}

/**
 * In-memory stand-in for the library edge function.
 * A character can have at most one membership. Import always inserts a new row.
 */
export function createMemoryLibraryClient(): LibraryClient {
  const players = new Map<string, PlayerRow>();
  const characters = new Map<string, CharacterRow>();
  const campaigns = new Map<string, CampaignRow>();
  const memberships = new Map<string, MembershipRow>();
  const homebrewItems = new Map<string, HomebrewItemRow>();

  function ensurePlayerRow(email: string): void {
    if (players.has(email)) return;
    players.set(email, { email, displayName: email });
  }

  function requireCharacter(email: string, characterId: string): CharacterRow {
    const row = characters.get(characterId);
    if (!row || row.ownerEmail !== email) {
      throw new LibraryClientError("not_found", "Character not found.");
    }
    return row;
  }

  function requireCampaign(email: string, campaignId: string): CampaignRow {
    const row = campaigns.get(campaignId);
    if (!row || row.ownerEmail !== email) {
      throw new LibraryClientError("not_found", "Campaign not found.");
    }
    return row;
  }

  function membershipForCharacter(characterId: string): MembershipRow | null {
    for (const membership of memberships.values()) {
      if (membership.characterId === characterId) return membership;
    }
    return null;
  }

  function toCharacter(row: CharacterRow): LibraryCharacter {
    return {
      id: row.id,
      ownerEmail: row.ownerEmail,
      title: row.title,
      document: parseCharacterFile(row.documentJson),
      updatedAt: row.updatedAt,
    };
  }

  function characterSummary(row: CharacterRow): LibraryCharacterSummary {
    const membership = membershipForCharacter(row.id);
    const campaign = membership ? campaigns.get(membership.campaignId) : undefined;
    return {
      id: row.id,
      ownerEmail: row.ownerEmail,
      title: row.title,
      updatedAt: row.updatedAt,
      campaignId: membership?.campaignId ?? null,
      campaignTitle: campaign?.title ?? null,
    };
  }

  function campaignSummary(row: CampaignRow): LibraryCampaignSummary {
    let memberCount = 0;
    for (const membership of memberships.values()) {
      if (membership.campaignId === row.id) memberCount += 1;
    }
    return {
      id: row.id,
      ownerEmail: row.ownerEmail,
      title: row.title,
      updatedAt: row.updatedAt,
      memberCount,
    };
  }

  function joinedMembers(campaignId: string): LibraryMembership[] {
    const members: LibraryMembership[] = [];
    for (const membership of memberships.values()) {
      if (membership.campaignId !== campaignId) continue;
      const character = characters.get(membership.characterId);
      if (!character) continue;
      members.push({
        id: membership.id,
        campaignId: membership.campaignId,
        characterId: membership.characterId,
        sortOrder: membership.sortOrder,
        initiative: membership.initiative,
        session: { ...membership.session },
        character: parseCharacterFile(character.documentJson),
      });
    }
    members.sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
    return members;
  }

  function toCampaign(row: CampaignRow): LibraryCampaign {
    return {
      id: row.id,
      ownerEmail: row.ownerEmail,
      title: row.title,
      updatedAt: row.updatedAt,
      members: joinedMembers(row.id),
    };
  }

  function insertCharacter(email: string, title: string, document: Character): LibraryCharacter {
    const row: CharacterRow = {
      id: crypto.randomUUID(),
      ownerEmail: email,
      title,
      documentJson: serializeCharacterFile(document),
      updatedAt: now(),
    };
    characters.set(row.id, row);
    return toCharacter(row);
  }

  return {
    async ensurePlayer(email) {
      const ownerEmail = normalizeEmail(email);
      if (!ownerEmail) {
        throw new LibraryClientError("empty_title", "Email is required.");
      }
      ensurePlayerRow(ownerEmail);
    },

    async listCharacters(email) {
      const ownerEmail = normalizeEmail(email);
      return [...characters.values()]
        .filter((row) => row.ownerEmail === ownerEmail)
        .map(characterSummary)
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : a.title.localeCompare(b.title)));
    },

    async createCharacter(email, input) {
      const ownerEmail = normalizeEmail(email);
      const title = input.title.trim();
      if (!ownerEmail || !title) {
        throw new LibraryClientError("empty_title", "Title is required.");
      }
      ensurePlayerRow(ownerEmail);
      const document = input.document ?? { ...INITIAL_CHARACTER, name: title };
      return insertCharacter(ownerEmail, title, document);
    },

    async openCharacter(email, characterId) {
      const ownerEmail = normalizeEmail(email);
      return toCharacter(requireCharacter(ownerEmail, characterId));
    },

    async saveCharacter(email, characterId, input) {
      const ownerEmail = normalizeEmail(email);
      const row = requireCharacter(ownerEmail, characterId);
      const title = input.title?.trim();
      if (title) row.title = title;
      row.documentJson = serializeCharacterFile(input.document);
      row.updatedAt = now();
      return toCharacter(row);
    },

    async deleteCharacter(email, characterId) {
      const ownerEmail = normalizeEmail(email);
      requireCharacter(ownerEmail, characterId);
      if (membershipForCharacter(characterId)) {
        throw new LibraryClientError(
          "character_has_membership",
          "Remove the character from their campaign before deleting them.",
        );
      }
      characters.delete(characterId);
    },

    async importCharacter(email, fileJson) {
      const ownerEmail = normalizeEmail(email);
      if (!ownerEmail) {
        throw new LibraryClientError("empty_title", "Email is required.");
      }
      let document: Character;
      try {
        document = parseCharacterFile(fileJson);
      } catch {
        throw new LibraryClientError("invalid_character_file", "Invalid character file.");
      }
      ensurePlayerRow(ownerEmail);
      const title = document.name.trim() || "Imported character";
      return insertCharacter(ownerEmail, title, document);
    },

    async listCampaigns(email) {
      const ownerEmail = normalizeEmail(email);
      return [...campaigns.values()]
        .filter((row) => row.ownerEmail === ownerEmail)
        .map(campaignSummary)
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : a.title.localeCompare(b.title)));
    },

    async createCampaign(email, input) {
      const ownerEmail = normalizeEmail(email);
      const title = input.title.trim();
      if (!ownerEmail || !title) {
        throw new LibraryClientError("empty_title", "Title is required.");
      }
      ensurePlayerRow(ownerEmail);
      const row: CampaignRow = {
        id: crypto.randomUUID(),
        ownerEmail,
        title,
        updatedAt: now(),
      };
      campaigns.set(row.id, row);
      return toCampaign(row);
    },

    async openCampaign(email, campaignId) {
      const ownerEmail = normalizeEmail(email);
      return toCampaign(requireCampaign(ownerEmail, campaignId));
    },

    async saveCampaign(email, campaignId, input) {
      const ownerEmail = normalizeEmail(email);
      const row = requireCampaign(ownerEmail, campaignId);
      const title = input.title?.trim();
      if (title) row.title = title;
      row.updatedAt = now();
      return toCampaign(row);
    },

    async deleteCampaign(email, campaignId) {
      const ownerEmail = normalizeEmail(email);
      requireCampaign(ownerEmail, campaignId);
      for (const [membershipId, membership] of memberships) {
        if (membership.campaignId === campaignId) memberships.delete(membershipId);
      }
      campaigns.delete(campaignId);
    },

    async seatCharacter(email, campaignId, characterId) {
      const ownerEmail = normalizeEmail(email);
      requireCharacter(ownerEmail, characterId);
      const campaign = requireCampaign(ownerEmail, campaignId);
      if (membershipForCharacter(characterId)) {
        throw new LibraryClientError(
          "character_already_seated",
          "That character is already in a campaign.",
        );
      }
      let sortOrder = 0;
      for (const membership of memberships.values()) {
        if (membership.campaignId === campaignId) sortOrder = Math.max(sortOrder, membership.sortOrder + 1);
      }
      const membership: MembershipRow = {
        id: crypto.randomUUID(),
        campaignId,
        characterId,
        sortOrder,
        initiative: null,
        session: {},
      };
      memberships.set(membership.id, membership);
      campaign.updatedAt = now();
    },

    async unseatCharacter(email, campaignId, characterId) {
      const ownerEmail = normalizeEmail(email);
      requireCampaign(ownerEmail, campaignId);
      requireCharacter(ownerEmail, characterId);
      const membership = membershipForCharacter(characterId);
      if (!membership || membership.campaignId !== campaignId) {
        throw new LibraryClientError("not_found", "Membership not found.");
      }
      memberships.delete(membership.id);
    },
    async listHomebrewItems(email, filter) {
      const ownerEmail = normalizeEmail(email);
      let rows = [...homebrewItems.values()].filter((row) => row.ownerEmail === ownerEmail);
      if (filter?.campaignId) {
        rows = rows.filter((row) => row.campaignIds.includes(filter.campaignId!));
      }
      return rows
        .map((row) => ({
          id: row.id,
          ownerEmail: row.ownerEmail,
          campaignIds: [...row.campaignIds],
          data: structuredClone(row.data),
          updatedAt: row.updatedAt,
        }))
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : a.data.name.localeCompare(b.data.name)));
    },

    async createHomebrewItem(email, input) {
      const ownerEmail = normalizeEmail(email);
      ensurePlayerRow(ownerEmail);
      assertOwnedCampaignIds(ownerEmail, input.campaignIds, campaigns);
      validateHomebrewItemData(input.data);
      const row: HomebrewItemRow = {
        id: crypto.randomUUID(),
        ownerEmail,
        campaignIds: [...input.campaignIds],
        data: {
          ...input.data,
          name: input.data.name.trim(),
          description: input.data.description,
        },
        updatedAt: now(),
      };
      homebrewItems.set(row.id, row);
      return {
        id: row.id,
        ownerEmail: row.ownerEmail,
        campaignIds: [...row.campaignIds],
        data: structuredClone(row.data),
        updatedAt: row.updatedAt,
      };
    },

    async updateHomebrewItem(email, itemId, input) {
      const ownerEmail = normalizeEmail(email);
      const row = homebrewItems.get(itemId);
      if (!row || row.ownerEmail !== ownerEmail) {
        throw new LibraryClientError("not_found", "Item not found.");
      }
      if (input.campaignIds) {
        assertOwnedCampaignIds(ownerEmail, input.campaignIds, campaigns);
        row.campaignIds = [...input.campaignIds];
      }
      if (input.data) {
        validateHomebrewItemData(input.data);
        row.data = {
          ...input.data,
          name: input.data.name.trim(),
          description: input.data.description,
        };
      }
      row.updatedAt = now();
      return {
        id: row.id,
        ownerEmail: row.ownerEmail,
        campaignIds: [...row.campaignIds],
        data: structuredClone(row.data),
        updatedAt: row.updatedAt,
      };
    },

    async deleteHomebrewItem(email, itemId) {
      const ownerEmail = normalizeEmail(email);
      const row = homebrewItems.get(itemId);
      if (!row || row.ownerEmail !== ownerEmail) {
        throw new LibraryClientError("not_found", "Item not found.");
      }
      homebrewItems.delete(itemId);
    },
  };
}
