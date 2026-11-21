import { LibraryOpError } from "../errors.ts";
import {
  assertCharacterDeletable,
  characterFromRow,
  importedCharacterTitle,
  newCharacterDocument,
  parseImportDocument,
} from "../rules/characters.ts";
import { isRecord, optionalTrimmedString, trimmedString } from "../rules/shared.ts";
import { membershipForCharacter, nowIso, requireCharacter, upsertPlayer } from "./shared.ts";
import type { OpRecord } from "./types.ts";

export const characterOps: OpRecord = {
  async listCharacters({ db, email }) {
    const { data: characters, error } = await db
      .from("characters")
      .select("id, owner_email, title, updated_at")
      .eq("owner_email", email)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    const { data: memberships, error: membershipError } = await db
      .from("campaign_members")
      .select("character_id, campaign_id");
    if (membershipError) throw membershipError;
    const membershipByCharacter = new Map<string, string>();
    for (const row of memberships ?? []) {
      membershipByCharacter.set(row.character_id as string, row.campaign_id as string);
    }
    const campaignIds = [...new Set(membershipByCharacter.values())];
    const campaignTitles = new Map<string, string>();
    if (campaignIds.length > 0) {
      const { data: campaigns, error: campaignError } = await db
        .from("campaigns")
        .select("id, title")
        .in("id", campaignIds);
      if (campaignError) throw campaignError;
      for (const campaign of campaigns ?? []) {
        campaignTitles.set(campaign.id as string, campaign.title as string);
      }
    }
    return (characters ?? []).map((row) => {
      const campaignId = membershipByCharacter.get(row.id as string) ?? null;
      return {
        id: row.id,
        ownerEmail: row.owner_email,
        title: row.title,
        updatedAt: row.updated_at,
        campaignId,
        campaignTitle: campaignId ? (campaignTitles.get(campaignId) ?? null) : null,
      };
    });
  },

  async createCharacter({ db, email }, payload) {
    const title = trimmedString(payload.title);
    if (!email || !title) throw new LibraryOpError("empty_title", "Title is required.");
    await upsertPlayer(db, email);
    const document = newCharacterDocument(payload.document, title);
    const { data, error } = await db
      .from("characters")
      .insert({ owner_email: email, title, document })
      .select("id, owner_email, title, document, updated_at")
      .single();
    if (error) throw error;
    return characterFromRow(data);
  },

  async openCharacter({ db, email }, payload) {
    const characterId = payload.characterId as string;
    const row = await requireCharacter(db, email, characterId);
    return characterFromRow(row);
  },

  async saveCharacter({ db, email }, payload) {
    const characterId = payload.characterId as string;
    const row = await requireCharacter(db, email, characterId);
    const title = optionalTrimmedString(payload.title);
    const document = payload.document;
    if (!isRecord(document)) throw new LibraryOpError("not_found", "Character not found.");
    const patch: Record<string, unknown> = {
      document,
      updated_at: nowIso(),
    };
    if (title) patch.title = title;
    const { data, error } = await db
      .from("characters")
      .update(patch)
      .eq("id", row.id)
      .select("id, owner_email, title, document, updated_at")
      .single();
    if (error) throw error;
    return characterFromRow(data);
  },

  async deleteCharacter({ db, email }, payload) {
    const characterId = payload.characterId as string;
    await requireCharacter(db, email, characterId);
    const membership = await membershipForCharacter(db, characterId);
    assertCharacterDeletable(membership);
    const { error } = await db.from("characters").delete().eq("id", characterId).eq("owner_email", email);
    if (error) throw error;
    return null;
  },

  async importCharacter({ db, email }, payload) {
    const fileJson = typeof payload.fileJson === "string" ? payload.fileJson : "";
    if (!email) throw new LibraryOpError("empty_title", "Email is required.");
    const document = parseImportDocument(fileJson);
    const title = importedCharacterTitle(document);
    await upsertPlayer(db, email);
    const { data, error } = await db
      .from("characters")
      .insert({ owner_email: email, title, document })
      .select("id, owner_email, title, document, updated_at")
      .single();
    if (error) throw error;
    return characterFromRow(data);
  },
};
