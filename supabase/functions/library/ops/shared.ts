import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { LibraryOpError } from "../errors.ts";

export function nowIso(): string {
  return new Date().toISOString();
}

/** Best-effort player row upsert (errors intentionally ignored, as before the split). */
export async function upsertPlayer(db: SupabaseClient, email: string): Promise<void> {
  await db.from("players").upsert({ email, display_name: email }, { onConflict: "email" });
}

export async function ownedCampaignIdSet(db: SupabaseClient, email: string): Promise<Set<string>> {
  const { data, error } = await db.from("campaigns").select("id").eq("owner_email", email);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.id as string));
}

export async function requireCharacter(db: SupabaseClient, email: string, characterId: string) {
  const { data, error } = await db
    .from("characters")
    .select("id, owner_email, title, document, updated_at")
    .eq("id", characterId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.owner_email !== email) {
    throw new LibraryOpError("not_found", "Character not found.");
  }
  return data;
}

export async function requireCampaign(db: SupabaseClient, email: string, campaignId: string) {
  const { data, error } = await db
    .from("campaigns")
    .select("id, owner_email, title, updated_at")
    .eq("id", campaignId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.owner_email !== email) {
    throw new LibraryOpError("not_found", "Campaign not found.");
  }
  return data;
}

export async function membershipForCharacter(db: SupabaseClient, characterId: string) {
  const { data, error } = await db
    .from("campaign_members")
    .select("id, campaign_id, character_id, sort_order, initiative, session")
    .eq("character_id", characterId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function joinedMembers(db: SupabaseClient, campaignId: string) {
  const { data: memberships, error: membershipError } = await db
    .from("campaign_members")
    .select("id, campaign_id, character_id, sort_order, initiative, session")
    .eq("campaign_id", campaignId)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  if (membershipError) throw membershipError;
  const members = [];
  for (const membership of memberships ?? []) {
    const { data: character, error: characterError } = await db
      .from("characters")
      .select("document")
      .eq("id", membership.character_id)
      .maybeSingle();
    if (characterError) throw characterError;
    if (!character) continue;
    members.push({
      id: membership.id,
      campaignId: membership.campaign_id,
      characterId: membership.character_id,
      sortOrder: membership.sort_order,
      initiative: membership.initiative,
      session: membership.session ?? {},
      character: character.document,
    });
  }
  return members;
}
