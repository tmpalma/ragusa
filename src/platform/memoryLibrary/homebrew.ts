import type { HomebrewItemRecord } from "../../domain/homebrewItems";
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

export function createHomebrewLibrary(store: MemoryLibraryStore): HomebrewLibrary {
  const { homebrewItems } = store;

  return {
    async listHomebrewItems(email, filter) {
      const ownerEmail = normalizeEmail(email);
      let rows = [...homebrewItems.values()].filter((row) => row.ownerEmail === ownerEmail);
      if (filter?.campaignId) {
        rows = rows.filter((row) => row.campaignIds.includes(filter.campaignId!));
      }
      return rows
        .map(toRecord)
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : a.data.name.localeCompare(b.data.name)));
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

    // TODO(P1-B): parse { fileJson, campaignIds }, validate every item (invalid_items_file), insert, return records.
    async importHomebrewItems() {
      throw new Error("Not implemented: importHomebrewItems (Phase 1)");
    },
  };
}
