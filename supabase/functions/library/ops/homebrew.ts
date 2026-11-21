import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { LibraryOpError } from "../errors.ts";
import {
  assertCampaignIdsOwned,
  homebrewItemFromRow,
  requireHomebrewDataRecord,
  stringIds,
  validateHomebrewData,
} from "../rules/homebrew.ts";
import { nowIso, ownedCampaignIdSet, upsertPlayer } from "./shared.ts";
import type { OpRecord } from "./types.ts";

async function assertOwnedCampaignIds(db: SupabaseClient, email: string, campaignIds: string[]): Promise<void> {
  // Empty lists are refused without querying, as before the split.
  const owned = campaignIds.length === 0 ? new Set<string>() : await ownedCampaignIdSet(db, email);
  assertCampaignIdsOwned(campaignIds, owned);
}

export const homebrewOps: OpRecord = {
  async listHomebrewItems({ db, email }, payload) {
    let query = db.from("homebrew_items").select("id, owner_email, campaign_ids, data, updated_at").eq("owner_email", email);
    const campaignId = payload.campaignId;
    if (typeof campaignId === "string" && campaignId) {
      query = query.contains("campaign_ids", [campaignId]);
    }
    const { data, error } = await query.order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(homebrewItemFromRow);
  },

  async createHomebrewItem({ db, email, userId }, payload) {
    const campaignIds = Array.isArray(payload.campaignIds) ? stringIds(payload.campaignIds) : [];
    const rawData = requireHomebrewDataRecord(payload.data);
    await upsertPlayer(db, email, userId);
    await assertOwnedCampaignIds(db, email, campaignIds);
    const data = validateHomebrewData(rawData);
    const { data: row, error } = await db
      .from("homebrew_items")
      .insert({
        owner_email: email,
        campaign_ids: campaignIds,
        data,
      })
      .select("id, owner_email, campaign_ids, data, updated_at")
      .single();
    if (error) throw error;
    return homebrewItemFromRow(row);
  },

  async updateHomebrewItem({ db, email }, payload) {
    const itemId = payload.itemId as string;
    const { data: existing, error: fetchError } = await db
      .from("homebrew_items")
      .select("id, owner_email, campaign_ids, data, updated_at")
      .eq("id", itemId)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!existing || existing.owner_email !== email) {
      throw new LibraryOpError("not_found", "Item not found.");
    }
    const patch: Record<string, unknown> = { updated_at: nowIso() };
    if (Array.isArray(payload.campaignIds)) {
      const campaignIds = stringIds(payload.campaignIds);
      await assertOwnedCampaignIds(db, email, campaignIds);
      patch.campaign_ids = campaignIds;
    }
    if (payload.data !== undefined) {
      patch.data = validateHomebrewData(requireHomebrewDataRecord(payload.data));
    }
    const { data: row, error } = await db
      .from("homebrew_items")
      .update(patch)
      .eq("id", itemId)
      .select("id, owner_email, campaign_ids, data, updated_at")
      .single();
    if (error) throw error;
    return homebrewItemFromRow(row);
  },

  async deleteHomebrewItem({ db, email }, payload) {
    const itemId = payload.itemId as string;
    const { data: existing, error: fetchError } = await db
      .from("homebrew_items")
      .select("id, owner_email")
      .eq("id", itemId)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!existing || existing.owner_email !== email) {
      throw new LibraryOpError("not_found", "Item not found.");
    }
    const { error } = await db.from("homebrew_items").delete().eq("id", itemId);
    if (error) throw error;
    return null;
  },

  // TODO(P1-B): parse { fileJson, campaignIds }, validate every item (invalid_items_file), insert, return records.
  async importHomebrewItems() {
    throw new Error("Not implemented: importHomebrewItems (Phase 1)");
  },
};
