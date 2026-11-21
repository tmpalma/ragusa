import type { HomebrewItemData, HomebrewItemRecord } from "../../domain/homebrewItems";
import { HomebrewItemsFileParseError, parseHomebrewItemsFile } from "../../domain/homebrewItemsFile";
import { LibraryClientError, type HomebrewLibrary } from "../libraryClient";
import { validateHomebrewItemData } from "../libraryValidation";
import {
  assertOwnedCampaignIds,
  ensurePlayerRow,
  newId,
  normalizeEmail,
  now,
  type HomebrewItemRow,
  type MemoryLibraryStore,
} from "./store";

function toRecord(row: HomebrewItemRow): HomebrewItemRecord {
  return {
    id: row.id,
    ownerEmail: row.ownerEmail,
    campaignIds: [...row.campaignIds],
    data: structuredClone(row.data),
    updatedAt: row.updatedAt,
  };
}

function sortRecords(records: HomebrewItemRecord[]): HomebrewItemRecord[] {
  return records.sort((a, b) =>
    a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : a.data.name.localeCompare(b.data.name),
  );
}

/** Mirrors the edge rule: the campaign's DM or a member (owns a seated character), else `not_found`. */
function assertCanListCampaignItems(store: MemoryLibraryStore, email: string, campaignId: string): void {
  const campaign = store.campaigns.get(campaignId);
  if (campaign && campaign.ownerEmail === email) return;
  if (campaign) {
    for (const membership of store.memberships.values()) {
      if (membership.campaignId !== campaignId) continue;
      if (store.characters.get(membership.characterId)?.ownerEmail === email) return;
    }
  }
  throw new LibraryClientError("not_found", "Campaign not found.");
}

export function createHomebrewLibrary(store: MemoryLibraryStore): HomebrewLibrary {
  const { homebrewItems } = store;

  return {
    async listHomebrewItems(email, filter) {
      const callerEmail = normalizeEmail(email);
      const campaignId = filter?.campaignId;
      let rows: HomebrewItemRow[];
      if (campaignId) {
        // Member-visible: every item linked to the campaign, whoever owns it.
        assertCanListCampaignItems(store, callerEmail, campaignId);
        rows = [...homebrewItems.values()].filter((row) => row.campaignIds.includes(campaignId));
      } else {
        rows = [...homebrewItems.values()].filter((row) => row.ownerEmail === callerEmail);
      }
      return sortRecords(rows.map(toRecord));
    },

    async createHomebrewItem(email, input) {
      const ownerEmail = normalizeEmail(email);
      ensurePlayerRow(store, ownerEmail);
      assertOwnedCampaignIds(store, ownerEmail, input.campaignIds);
      validateHomebrewItemData(input.data);
      const row: HomebrewItemRow = {
        id: newId(),
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
      return toRecord(row);
    },

    async updateHomebrewItem(email, itemId, input) {
      const ownerEmail = normalizeEmail(email);
      const row = homebrewItems.get(itemId);
      if (!row || row.ownerEmail !== ownerEmail) {
        throw new LibraryClientError("not_found", "Item not found.");
      }
      if (input.campaignIds) {
        assertOwnedCampaignIds(store, ownerEmail, input.campaignIds);
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
      return toRecord(row);
    },

    async deleteHomebrewItem(email, itemId) {
      const ownerEmail = normalizeEmail(email);
      const row = homebrewItems.get(itemId);
      if (!row || row.ownerEmail !== ownerEmail) {
        throw new LibraryClientError("not_found", "Item not found.");
      }
      homebrewItems.delete(itemId);
    },

    async importHomebrewItems(email, input) {
      const ownerEmail = normalizeEmail(email);
      let items: HomebrewItemData[];
      try {
        items = parseHomebrewItemsFile(input.fileJson);
      } catch (error) {
        if (error instanceof HomebrewItemsFileParseError) {
          throw new LibraryClientError("invalid_items_file", error.message);
        }
        throw error;
      }
      ensurePlayerRow(store, ownerEmail);
      assertOwnedCampaignIds(store, ownerEmail, input.campaignIds);
      // Everything is validated above, so the inserts below cannot fail halfway.
      const updatedAt = now();
      return items.map((data) => {
        const row: HomebrewItemRow = {
          id: newId(),
          ownerEmail,
          campaignIds: [...input.campaignIds],
          data,
          updatedAt,
        };
        homebrewItems.set(row.id, row);
        return toRecord(row);
      });
    },
  };
}
