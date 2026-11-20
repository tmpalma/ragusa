import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const CHARACTER_FILE_FORMAT = "dnd55e-chargen-character";
const CHARACTER_FILE_SCHEMA_VERSION = 1;

type LibraryErrorCode =
  | "character_already_seated"
  | "character_has_membership"
  | "not_found"
  | "invalid_character_file"
  | "empty_title"
  | "invalid_homebrew_item";

class LibraryOpError extends Error {
  readonly code: LibraryErrorCode;

  constructor(code: LibraryErrorCode, message: string) {
    super(message);
    this.name = "LibraryOpError";
    this.code = code;
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HOMEBREW_CATEGORIES = ["ring", "weapon", "wondrous", "other"] as const;
const CURRENCY_DENOMINATIONS = ["pp", "gp", "ep", "sp", "cp"] as const;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function nowIso(): string {
  return new Date().toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseImportDocument(fileJson: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fileJson);
  } catch {
    throw new LibraryOpError("invalid_character_file", "Invalid character file.");
  }
  if (!isRecord(parsed)) {
    throw new LibraryOpError("invalid_character_file", "Invalid character file.");
  }
  if (parsed.format !== CHARACTER_FILE_FORMAT) {
    throw new LibraryOpError("invalid_character_file", "Invalid character file.");
  }
  const schemaVersion = parsed.schemaVersion;
  if (typeof schemaVersion !== "number" || schemaVersion > CHARACTER_FILE_SCHEMA_VERSION) {
    throw new LibraryOpError("invalid_character_file", "Invalid character file.");
  }
  const character = parsed.character;
  if (!isRecord(character)) {
    throw new LibraryOpError("invalid_character_file", "Invalid character file.");
  }
  return character;
}

function validateHomebrewData(data: Record<string, unknown>): Record<string, unknown> {
  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name) throw new LibraryOpError("invalid_homebrew_item", "Item name is required.");
  const weightLb = data.weightLb;
  if (typeof weightLb !== "number" || !Number.isFinite(weightLb) || weightLb < 0) {
    throw new LibraryOpError("invalid_homebrew_item", "Weight is invalid.");
  }
  const category = data.category;
  if (typeof category !== "string" || !HOMEBREW_CATEGORIES.includes(category as (typeof HOMEBREW_CATEGORIES)[number])) {
    throw new LibraryOpError("invalid_homebrew_item", "Category is invalid.");
  }
  const cost = data.cost;
  if (!isRecord(cost)) throw new LibraryOpError("invalid_homebrew_item", "Cost is invalid.");
  const amount = cost.amount;
  const denomination = cost.denomination;
  if (
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount < 0 ||
    typeof denomination !== "string" ||
    !CURRENCY_DENOMINATIONS.includes(denomination as (typeof CURRENCY_DENOMINATIONS)[number])
  ) {
    throw new LibraryOpError("invalid_homebrew_item", "Cost is invalid.");
  }
  const range = data.range;
  if (range !== undefined) {
    if (!isRecord(range)) throw new LibraryOpError("invalid_homebrew_item", "Range is invalid.");
    const normalFeet = range.normalFeet;
    const longFeet = range.longFeet;
    if (
      typeof normalFeet !== "number" ||
      !Number.isFinite(normalFeet) ||
      normalFeet < 0 ||
      typeof longFeet !== "number" ||
      !Number.isFinite(longFeet) ||
      longFeet < 0
    ) {
      throw new LibraryOpError("invalid_homebrew_item", "Range is invalid.");
    }
  }
  return { ...data, name };
}

async function ownedCampaignIdSet(db: SupabaseClient, email: string): Promise<Set<string>> {
  const { data, error } = await db.from("campaigns").select("id").eq("owner_email", email);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.id as string));
}

async function assertOwnedCampaignIds(db: SupabaseClient, email: string, campaignIds: string[]): Promise<void> {
  if (campaignIds.length === 0) {
    throw new LibraryOpError("invalid_homebrew_item", "Select at least one campaign.");
  }
  const owned = await ownedCampaignIdSet(db, email);
  for (const id of campaignIds) {
    if (!owned.has(id)) {
      throw new LibraryOpError("invalid_homebrew_item", "Campaign is not available.");
    }
  }
}

async function requireCharacter(db: SupabaseClient, email: string, characterId: string) {
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

async function requireCampaign(db: SupabaseClient, email: string, campaignId: string) {
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

async function membershipForCharacter(db: SupabaseClient, characterId: string) {
  const { data, error } = await db
    .from("campaign_members")
    .select("id, campaign_id, character_id, sort_order, initiative, session")
    .eq("character_id", characterId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function joinedMembers(db: SupabaseClient, campaignId: string) {
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

async function dispatch(db: SupabaseClient, op: string, email: string, payload: Record<string, unknown>): Promise<unknown> {
  switch (op) {
    case "ensurePlayer": {
      if (!email) {
        throw new LibraryOpError("empty_title", "Email is required.");
      }
      const { data: existing, error: readError } = await db
        .from("players")
        .select("email")
        .eq("email", email)
        .maybeSingle();
      if (readError) throw readError;
      if (existing) return null;
      const { error } = await db.from("players").insert({ email, display_name: email });
      if (error) throw error;
      return null;
    }

    case "listCharacters": {
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
    }

    case "createCharacter": {
      const title = typeof payload.title === "string" ? payload.title.trim() : "";
      if (!email || !title) throw new LibraryOpError("empty_title", "Title is required.");
      await db.from("players").upsert({ email, display_name: email }, { onConflict: "email" });
      const document =
        payload.document && isRecord(payload.document) ? payload.document : { name: title };
      const { data, error } = await db
        .from("characters")
        .insert({ owner_email: email, title, document })
        .select("id, owner_email, title, document, updated_at")
        .single();
      if (error) throw error;
      return {
        id: data.id,
        ownerEmail: data.owner_email,
        title: data.title,
        document: data.document,
        updatedAt: data.updated_at,
      };
    }

    case "openCharacter": {
      const characterId = payload.characterId as string;
      const row = await requireCharacter(db, email, characterId);
      return {
        id: row.id,
        ownerEmail: row.owner_email,
        title: row.title,
        document: row.document,
        updatedAt: row.updated_at,
      };
    }

    case "saveCharacter": {
      const characterId = payload.characterId as string;
      const row = await requireCharacter(db, email, characterId);
      const title = typeof payload.title === "string" ? payload.title.trim() : undefined;
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
      return {
        id: data.id,
        ownerEmail: data.owner_email,
        title: data.title,
        document: data.document,
        updatedAt: data.updated_at,
      };
    }

    case "deleteCharacter": {
      const characterId = payload.characterId as string;
      await requireCharacter(db, email, characterId);
      const membership = await membershipForCharacter(db, characterId);
      if (membership) {
        throw new LibraryOpError(
          "character_has_membership",
          "Remove the character from their campaign before deleting them.",
        );
      }
      const { error } = await db.from("characters").delete().eq("id", characterId).eq("owner_email", email);
      if (error) throw error;
      return null;
    }

    case "importCharacter": {
      const fileJson = typeof payload.fileJson === "string" ? payload.fileJson : "";
      if (!email) throw new LibraryOpError("empty_title", "Email is required.");
      const document = parseImportDocument(fileJson);
      const title =
        typeof document.name === "string" && document.name.trim()
          ? document.name.trim()
          : "Imported character";
      await db.from("players").upsert({ email, display_name: email }, { onConflict: "email" });
      const { data, error } = await db
        .from("characters")
        .insert({ owner_email: email, title, document })
        .select("id, owner_email, title, document, updated_at")
        .single();
      if (error) throw error;
      return {
        id: data.id,
        ownerEmail: data.owner_email,
        title: data.title,
        document: data.document,
        updatedAt: data.updated_at,
      };
    }

    case "listCampaigns": {
      const { data: campaigns, error } = await db
        .from("campaigns")
        .select("id, owner_email, title, updated_at")
        .eq("owner_email", email)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const { data: memberships, error: membershipError } = await db
        .from("campaign_members")
        .select("campaign_id");
      if (membershipError) throw membershipError;
      const counts = new Map<string, number>();
      for (const row of memberships ?? []) {
        const id = row.campaign_id as string;
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
      return (campaigns ?? []).map((row) => ({
        id: row.id,
        ownerEmail: row.owner_email,
        title: row.title,
        updatedAt: row.updated_at,
        memberCount: counts.get(row.id as string) ?? 0,
      }));
    }

    case "createCampaign": {
      const title = typeof payload.title === "string" ? payload.title.trim() : "";
      if (!email || !title) throw new LibraryOpError("empty_title", "Title is required.");
      await db.from("players").upsert({ email, display_name: email }, { onConflict: "email" });
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
    }

    case "openCampaign": {
      const campaignId = payload.campaignId as string;
      const row = await requireCampaign(db, email, campaignId);
      return {
        id: row.id,
        ownerEmail: row.owner_email,
        title: row.title,
        updatedAt: row.updated_at,
        members: await joinedMembers(db, campaignId),
      };
    }

    case "saveCampaign": {
      const campaignId = payload.campaignId as string;
      const row = await requireCampaign(db, email, campaignId);
      const title = typeof payload.title === "string" ? payload.title.trim() : undefined;
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
    }

    case "deleteCampaign": {
      const campaignId = payload.campaignId as string;
      await requireCampaign(db, email, campaignId);
      const { error: membershipError } = await db.from("campaign_members").delete().eq("campaign_id", campaignId);
      if (membershipError) throw membershipError;
      const { error } = await db.from("campaigns").delete().eq("id", campaignId).eq("owner_email", email);
      if (error) throw error;
      return null;
    }

    case "seatCharacter": {
      const campaignId = payload.campaignId as string;
      const characterId = payload.characterId as string;
      await requireCharacter(db, email, characterId);
      await requireCampaign(db, email, campaignId);
      const existing = await membershipForCharacter(db, characterId);
      if (existing) {
        throw new LibraryOpError("character_already_seated", "That character is already in a campaign.");
      }
      const { data: siblings, error: countError } = await db
        .from("campaign_members")
        .select("sort_order")
        .eq("campaign_id", campaignId);
      if (countError) throw countError;
      let sortOrder = 0;
      for (const row of siblings ?? []) {
        sortOrder = Math.max(sortOrder, (row.sort_order as number) + 1);
      }
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
    }

    case "unseatCharacter": {
      const campaignId = payload.campaignId as string;
      const characterId = payload.characterId as string;
      await requireCampaign(db, email, campaignId);
      await requireCharacter(db, email, characterId);
      const membership = await membershipForCharacter(db, characterId);
      if (!membership || membership.campaign_id !== campaignId) {
        throw new LibraryOpError("not_found", "Membership not found.");
      }
      const { error } = await db.from("campaign_members").delete().eq("id", membership.id);
      if (error) throw error;
      return null;
    }

    case "listHomebrewItems": {
      let query = db.from("homebrew_items").select("id, owner_email, campaign_ids, data, updated_at").eq("owner_email", email);
      const campaignId = payload.campaignId;
      if (typeof campaignId === "string" && campaignId) {
        query = query.contains("campaign_ids", [campaignId]);
      }
      const { data, error } = await query.order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        ownerEmail: row.owner_email,
        campaignIds: row.campaign_ids ?? [],
        data: row.data,
        updatedAt: row.updated_at,
      }));
    }

    case "createHomebrewItem": {
      const campaignIds = Array.isArray(payload.campaignIds)
        ? payload.campaignIds.filter((id): id is string => typeof id === "string")
        : [];
      if (!isRecord(payload.data)) {
        throw new LibraryOpError("invalid_homebrew_item", "Item name is required.");
      }
      await db.from("players").upsert({ email, display_name: email }, { onConflict: "email" });
      await assertOwnedCampaignIds(db, email, campaignIds);
      const data = validateHomebrewData(payload.data);
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
      return {
        id: row.id,
        ownerEmail: row.owner_email,
        campaignIds: row.campaign_ids ?? [],
        data: row.data,
        updatedAt: row.updated_at,
      };
    }

    case "updateHomebrewItem": {
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
        const campaignIds = payload.campaignIds.filter((id): id is string => typeof id === "string");
        await assertOwnedCampaignIds(db, email, campaignIds);
        patch.campaign_ids = campaignIds;
      }
      if (payload.data !== undefined) {
        if (!isRecord(payload.data)) {
          throw new LibraryOpError("invalid_homebrew_item", "Item name is required.");
        }
        patch.data = validateHomebrewData(payload.data);
      }
      const { data: row, error } = await db
        .from("homebrew_items")
        .update(patch)
        .eq("id", itemId)
        .select("id, owner_email, campaign_ids, data, updated_at")
        .single();
      if (error) throw error;
      return {
        id: row.id,
        ownerEmail: row.owner_email,
        campaignIds: row.campaign_ids ?? [],
        data: row.data,
        updatedAt: row.updated_at,
      };
    }

    case "deleteHomebrewItem": {
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
    }

    default:
      throw new Error(`Unknown library op: ${op}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ ok: false, code: "internal", message: "Library function is not configured." }, 500);
    }
    const body = await req.json();
    const op = typeof body.op === "string" ? body.op : "";
    const email = normalizeEmail(typeof body.email === "string" ? body.email : "");
    const { op: _op, email: _email, ...payload } = body;
    const db = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const data = await dispatch(db, op, email, payload);
    return json({ ok: true, data });
  } catch (err) {
    if (err instanceof LibraryOpError) {
      return json({ ok: false, code: err.code, message: err.message }, 400);
    }
    console.error(err);
    const message = err instanceof Error ? err.message : "Library request failed.";
    return json({ ok: false, code: "internal", message }, 500);
  }
});
