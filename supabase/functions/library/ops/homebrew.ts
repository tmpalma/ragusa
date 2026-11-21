import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { LibraryOpError } from "../errors.ts";
import {
  assertCampaignIdsOwned,
  assertCampaignItemsAccess,
  homebrewItemFromRow,
  parseHomebrewItemsFile,
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

/** True when the caller owns a character with a `campaign_members` row in `campaignId`. */
async function callerIsCampaignMember(db: SupabaseClient, email: string, campaignId: string): Promise<boolean> {
  const { data: characters, error: characterError } = await db
    .from("characters")
    .select("id")
    .eq("owner_email", email);
  if (characterError) throw characterError;
  const characterIds = (characters ?? []).map((row) => row.id as string);
  if (characterIds.length === 0) return false;
  const { data: memberships, error: membershipError } = await db
    .from("campaign_members")
    .select("id")
    .eq("campaign_id", campaignId)
    .in("character_id", characterIds)
    .limit(1);
  if (membershipError) throw membershipError;
  return (memberships ?? []).length > 0;
}

/** DM or member of `campaignId`, else `not_found`. */
async function assertCanListCampaignItems(db: SupabaseClient, email: string, campaignId: string): Promise<void> {
  const { data: campaign, error } = await db
    .from("campaigns")
    .select("owner_email")
    .eq("id", campaignId)
    .maybeSingle();
  if (error) throw error;
  const campaignOwnerEmail = (campaign?.owner_email as string | undefined) ?? null;
  const callerIsMember =
    campaignOwnerEmail !== null && campaignOwnerEmail !== email
      ? await callerIsCampaignMember(db, email, campaignId)
      : false;
  assertCampaignItemsAccess({ callerEmail: email, campaignOwnerEmail, callerIsMember });
}

export const homebrewOps: OpRecord = {
  async listHomebrewItems({ db, email }, payload) {
    let query = db.from("homebrew_items").select("id, owner_email, campaign_ids, data, updated_at");
    const campaignId = payload.campaignId;
    if (typeof campaignId === "string" && campaignId) {
      // Member-visible: every item linked to the campaign, whoever owns it.
      await assertCanListCampaignItems(db, email, campaignId);
      query = query.contains("campaign_ids", [campaignId]);
    } else {
      query = query.eq("owner_email", email);
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

  async importHomebrewItems({ db, email, userId }, payload) {
    const campaignIds = Array.isArray(payload.campaignIds) ? stringIds(payload.campaignIds) : [];
    // Pure and all or nothing: any bad item throws invalid_items_file before anything is written.
    const items = parseHomebrewItemsFile(payload.fileJson);
    await upsertPlayer(db, email, userId);
    await assertOwnedCampaignIds(db, email, campaignIds);
    if (items.length === 0) return [];
    // A single multi-row insert is one statement, so it lands entirely or not at all.
    const { data: rows, error } = await db
      .from("homebrew_items")
      .insert(items.map((data) => ({ owner_email: email, campaign_ids: campaignIds, data })))
      .select("id, owner_email, campaign_ids, data, updated_at");
    if (error) throw error;
    return (rows ?? []).map(homebrewItemFromRow);
  },
};
