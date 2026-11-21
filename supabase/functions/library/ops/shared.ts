import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { LibraryOpError } from "../errors.ts";
import { assertAuthUserLink, displayNameFromEmail } from "../rules/auth.ts";

export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Ensures the caller's `players` row exists and is linked to their auth user.
 * - New row: inserted with `display_name` = email local part and `auth_user_id = userId`.
 * - Existing row: `display_name` is never touched (insert is ON CONFLICT DO NOTHING).
 *   A null `auth_user_id` is set to `userId`; a different one throws `forbidden` (reused email).
 */
export async function upsertPlayer(db: SupabaseClient, email: string, userId: string): Promise<void> {
  const { error: insertError } = await db
    .from("players")
    .upsert(
      { email, display_name: displayNameFromEmail(email), auth_user_id: userId },
      { onConflict: "email", ignoreDuplicates: true },
    );
  if (insertError) throw insertError;
  const { data: row, error: readError } = await db
    .from("players")
    .select("auth_user_id")
    .eq("email", email)
    .maybeSingle();
  if (readError) throw readError;
  if (!row) throw new Error("Player row missing after upsert.");
  if (!assertAuthUserLink(row.auth_user_id as string | null, userId)) return;
  const { data: linked, error: linkError } = await db
    .from("players")
    .update({ auth_user_id: userId })
    .eq("email", email)
    .is("auth_user_id", null)
    .select("auth_user_id");
  if (linkError) throw linkError;
  if ((linked ?? []).length > 0) return;
  // Lost a race with a concurrent link: re-check who won.
  const { data: after, error: recheckError } = await db
    .from("players")
    .select("auth_user_id")
    .eq("email", email)
    .maybeSingle();
  if (recheckError) throw recheckError;
  assertAuthUserLink((after?.auth_user_id as string | null) ?? null, userId);
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
