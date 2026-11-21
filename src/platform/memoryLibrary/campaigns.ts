import { parseCharacterFile } from "../../domain/characterFile";
import {
  LibraryClientError,
  type CampaignLibrary,
  type LibraryCampaign,
  type LibraryCampaignSummary,
  type LibraryMembership,
} from "../libraryClient";
import {
  ensurePlayerRow,
  membershipForCharacter,
  newId,
  normalizeEmail,
  now,
  requireCampaign,
  requireCharacter,
  type CampaignRow,
  type MembershipRow,
  type MemoryLibraryStore,
} from "./store";

/** Campaigns plus seating (memberships). A character can have at most one membership. */
export function createCampaignLibrary(store: MemoryLibraryStore): CampaignLibrary {
  const { characters, campaigns, memberships } = store;

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

  return {
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
      ensurePlayerRow(store, ownerEmail);
      const row: CampaignRow = {
        id: newId(),
        ownerEmail,
        title,
        updatedAt: now(),
      };
      campaigns.set(row.id, row);
      return toCampaign(row);
    },

    async openCampaign(email, campaignId) {
      const ownerEmail = normalizeEmail(email);
      return toCampaign(requireCampaign(store, ownerEmail, campaignId));
    },

    async saveCampaign(email, campaignId, input) {
      const ownerEmail = normalizeEmail(email);
      const row = requireCampaign(store, ownerEmail, campaignId);
      const title = input.title?.trim();
      if (title) row.title = title;
      row.updatedAt = now();
      return toCampaign(row);
    },

    async deleteCampaign(email, campaignId) {
      const ownerEmail = normalizeEmail(email);
      requireCampaign(store, ownerEmail, campaignId);
      for (const [membershipId, membership] of memberships) {
        if (membership.campaignId === campaignId) memberships.delete(membershipId);
      }
      campaigns.delete(campaignId);
    },

    async seatCharacter(email, campaignId, characterId) {
      const ownerEmail = normalizeEmail(email);
      requireCharacter(store, ownerEmail, characterId);
      const campaign = requireCampaign(store, ownerEmail, campaignId);
      if (membershipForCharacter(store, characterId)) {
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
        id: newId(),
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
      requireCampaign(store, ownerEmail, campaignId);
      requireCharacter(store, ownerEmail, characterId);
      const membership = membershipForCharacter(store, characterId);
      if (!membership || membership.campaignId !== campaignId) {
        throw new LibraryClientError("not_found", "Membership not found.");
      }
      memberships.delete(membership.id);
    },
  };
}
