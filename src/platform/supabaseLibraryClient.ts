import type { HomebrewItemData } from "../domain/homebrewItems";
import {
  LibraryClientError,
  type LibraryCampaign,
  type LibraryCampaignSummary,
  type LibraryCharacter,
  type LibraryCharacterSummary,
  type LibraryClient,
  type LibraryErrorCode,
} from "./libraryClient";
import { notifyLibraryUnauthenticated } from "./authEvents";
import { getSupabaseClient } from "./supabaseClient";

type LibraryInvokeOk<T> = { ok: true; data: T };
type LibraryInvokeErr = { ok: false; code: LibraryErrorCode | "internal"; message: string };
type LibraryInvokeResponse<T> = LibraryInvokeOk<T> | LibraryInvokeErr;

function throwLibraryInvokeFailure(parsed: LibraryInvokeErr): never {
  if (parsed.code === "unauthenticated") {
    notifyLibraryUnauthenticated();
  }
  if (parsed.code === "internal") {
    throw new Error(parsed.message);
  }
  throw new LibraryClientError(parsed.code, parsed.message);
}

function isLibraryInvokeErr(value: unknown): value is LibraryInvokeErr {
  if (!value || typeof value !== "object" || !("ok" in value)) return false;
  const record = value as Record<string, unknown>;
  return (
    record.ok === false &&
    typeof record.code === "string" &&
    typeof record.message === "string"
  );
}

async function responseBodyToLibraryErr(context: unknown): Promise<LibraryInvokeErr | null> {
  if (!(context instanceof Response)) return null;
  try {
    const body = (await context.json()) as unknown;
    return isLibraryInvokeErr(body) ? body : null;
  } catch {
    return null;
  }
}

/**
 * Calls the `library` Edge Function. The server identifies the caller only from the Supabase access token,
 * which `functions.invoke` sends as `Authorization: Bearer <jwt>` while a session exists, so the body
 * carries no email. `_email` stays on the signature until `LibraryClient` drops its `email` parameters.
 */
async function invokeLibrary<T>(_email: string, op: string, payload: Record<string, unknown> = {}): Promise<T> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }
  const { data, error } = await supabase.functions.invoke("library", {
    body: { ...payload, op },
  });
  if (error) {
    const context = "context" in error ? (error as { context?: unknown }).context : undefined;
    const fromHttp = await responseBodyToLibraryErr(context);
    if (fromHttp) {
      throwLibraryInvokeFailure(fromHttp);
    }
    if (context instanceof Response && context.status === 401) {
      throwLibraryInvokeFailure({ ok: false, code: "unauthenticated", message: "Sign in again." });
    }
    throw new Error(error.message || "Library request failed.");
  }
  const parsed = data as LibraryInvokeResponse<T> | null;
  if (!parsed || typeof parsed !== "object" || !("ok" in parsed)) {
    throw new Error("Library returned an invalid response.");
  }
  if (!parsed.ok) {
    throwLibraryInvokeFailure(parsed);
  }
  return parsed.data;
}

export function createSupabaseLibraryClient(): LibraryClient {
  return {
    ensurePlayer(email) {
      return invokeLibrary(email, "ensurePlayer");
    },

    listCharacters(email) {
      return invokeLibrary<LibraryCharacterSummary[]>(email, "listCharacters");
    },

    createCharacter(email, input) {
      return invokeLibrary<LibraryCharacter>(email, "createCharacter", {
        title: input.title,
        document: input.document,
      });
    },

    openCharacter(email, characterId) {
      return invokeLibrary<LibraryCharacter>(email, "openCharacter", { characterId });
    },

    saveCharacter(email, characterId, input) {
      return invokeLibrary<LibraryCharacter>(email, "saveCharacter", {
        characterId,
        title: input.title,
        document: input.document,
      });
    },

    deleteCharacter(email, characterId) {
      return invokeLibrary(email, "deleteCharacter", { characterId });
    },

    importCharacter(email, fileJson) {
      return invokeLibrary<LibraryCharacter>(email, "importCharacter", { fileJson });
    },

    listCampaigns(email) {
      return invokeLibrary<LibraryCampaignSummary[]>(email, "listCampaigns");
    },

    createCampaign(email, input) {
      return invokeLibrary<LibraryCampaign>(email, "createCampaign", { title: input.title });
    },

    openCampaign(email, campaignId) {
      return invokeLibrary<LibraryCampaign>(email, "openCampaign", { campaignId });
    },

    saveCampaign(email, campaignId, input) {
      return invokeLibrary<LibraryCampaign>(email, "saveCampaign", {
        campaignId,
        title: input.title,
      });
    },

    deleteCampaign(email, campaignId) {
      return invokeLibrary(email, "deleteCampaign", { campaignId });
    },

    seatCharacter(email, campaignId, characterId) {
      return invokeLibrary(email, "seatCharacter", { campaignId, characterId });
    },

    unseatCharacter(email, campaignId, characterId) {
      return invokeLibrary(email, "unseatCharacter", { campaignId, characterId });
    },

    listHomebrewItems(email, filter) {
      return invokeLibrary(email, "listHomebrewItems", {
        campaignId: filter?.campaignId,
      });
    },

    createHomebrewItem(email, input) {
      return invokeLibrary(email, "createHomebrewItem", {
        campaignIds: input.campaignIds,
        data: input.data as HomebrewItemData,
      });
    },

    updateHomebrewItem(email, itemId, input) {
      return invokeLibrary(email, "updateHomebrewItem", {
        itemId,
        campaignIds: input.campaignIds,
        data: input.data,
      });
    },

    deleteHomebrewItem(email, itemId) {
      return invokeLibrary(email, "deleteHomebrewItem", { itemId });
    },
  };
}
