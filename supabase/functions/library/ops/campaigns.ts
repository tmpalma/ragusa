import { LibraryOpError } from "../errors.ts";
import {
  assertCharacterNotSeated,
  assertMembershipInCampaign,
  countMembersByCampaign,
  nextSortOrder,
} from "../rules/campaigns.ts";
import { distinctIds } from "../rules/auth.ts";
import { optionalTrimmedString, trimmedString } from "../rules/shared.ts";
import {
  joinedMembers,
  membershipForCharacter,
  nowIso,
  requireCampaign,
  requireCharacter,
  upsertPlayer,
} from "./shared.ts";
import type { OpRecord } from "./types.ts";

export const campaignOps: OpRecord = {
  async listCampaigns({ db, email }) {
    const { data: campaigns, error } = await db
      .from("campaigns")
      .select("id, owner_email, title, updated_at")
      .eq("owner_email", email)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    const campaignIds = distinctIds(campaigns ?? [], (row) => row.id);
    let memberships: Array<{ campaign_id: unknown }> = [];
    if (campaignIds.length > 0) {
      const { data, error: membershipError } = await db
        .from("campaign_members")
        .select("campaign_id")
        .in("campaign_id", campaignIds);
      if (membershipError) throw membershipError;
      memberships = data ?? [];
    }
    const counts = countMembersByCampaign(memberships);
    return (campaigns ?? []).map((row) => ({
      id: row.id,
      ownerEmail: row.owner_email,
      title: row.title,
      updatedAt: row.updated_at,
      memberCount: counts.get(row.id as string) ?? 0,
    }));
  },

  async createCampaign({ db, email, userId }, payload) {
    const title = trimmedString(payload.title);
    if (!email || !title) throw new LibraryOpError("empty_title", "Title is required.");
    await upsertPlayer(db, email, userId);
    const { data, error } = await db
      .from("campaigns")
      .insert({ owner_email: email, title })
      .select("id, owner_email, title, updated_at")
      .single();
    if (error) throw error;
    return {
      id: data.id,
      ownerEmail: data.owner_email,
      title: data.title,
      updatedAt: data.updated_at,
      members: [],
    };
  },

  async openCampaign({ db, email }, payload) {
    const campaignId = payload.campaignId as string;
    const row = await requireCampaign(db, email, campaignId);
    return {
      id: row.id,
      ownerEmail: row.owner_email,
      title: row.title,
      updatedAt: row.updated_at,
      members: await joinedMembers(db, campaignId),
    };
  },

  async saveCampaign({ db, email }, payload) {
    const campaignId = payload.campaignId as string;
    const row = await requireCampaign(db, email, campaignId);
    const title = optionalTrimmedString(payload.title);
    const patch: Record<string, unknown> = { updated_at: nowIso() };
    if (title) patch.title = title;
    const { data, error } = await db
      .from("campaigns")
      .update(patch)
      .eq("id", row.id)
      .select("id, owner_email, title, updated_at")
      .single();
    if (error) throw error;
    return {
      id: data.id,
      ownerEmail: data.owner_email,
      title: data.title,
      updatedAt: data.updated_at,
      members: await joinedMembers(db, campaignId),
    };
  },

  async deleteCampaign({ db, email }, payload) {
    const campaignId = payload.campaignId as string;
    await requireCampaign(db, email, campaignId);
    const { error: membershipError } = await db.from("campaign_members").delete().eq("campaign_id", campaignId);
    if (membershipError) throw membershipError;
    const { error } = await db.from("campaigns").delete().eq("id", campaignId).eq("owner_email", email);
    if (error) throw error;
    return null;
  },

  async seatCharacter({ db, email }, payload) {
    const campaignId = payload.campaignId as string;
    const characterId = payload.characterId as string;
    await requireCharacter(db, email, characterId);
    await requireCampaign(db, email, campaignId);
    const existing = await membershipForCharacter(db, characterId);
    assertCharacterNotSeated(existing);
    const { data: siblings, error: countError } = await db
      .from("campaign_members")
      .select("sort_order")
      .eq("campaign_id", campaignId);
    if (countError) throw countError;
    const sortOrder = nextSortOrder(siblings ?? []);
    const { error: insertError } = await db.from("campaign_members").insert({
      campaign_id: campaignId,
      character_id: characterId,
      sort_order: sortOrder,
      initiative: null,
      session: {},
    });
    if (insertError) throw insertError;
    await db.from("campaigns").update({ updated_at: nowIso() }).eq("id", campaignId);
    return null;
  },

  async unseatCharacter({ db, email }, payload) {
    const campaignId = payload.campaignId as string;
    const characterId = payload.characterId as string;
    await requireCampaign(db, email, campaignId);
    await requireCharacter(db, email, characterId);
    const membership = assertMembershipInCampaign(await membershipForCharacter(db, characterId), campaignId);
    const { error } = await db.from("campaign_members").delete().eq("id", membership.id);
    if (error) throw error;
    return null;
  },
};
