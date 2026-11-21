import { FunctionsHttpError } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { onLibraryUnauthenticated } from "./authEvents";
import { LibraryClientError } from "./libraryClient";
import { createSupabaseLibraryClient } from "./supabaseLibraryClient";

const invoke = vi.fn();

vi.mock("./supabaseClient", () => ({
  getSupabaseClient: () => ({
    functions: { invoke },
  }),
}));

describe("supabase library client", () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it("maps library error codes from the edge function", async () => {
    invoke.mockResolvedValue({
      data: { ok: false, code: "invalid_homebrew_item", message: "Campaign is not available." },
      error: null,
    });
    const client = createSupabaseLibraryClient();
    await expect(
      client.createHomebrewItem("ada@example.com", {
        campaignIds: ["00000000-0000-4000-8000-000000000001"],
        data: {
          name: "Seed",
          description: "",
          category: "weapon",
          weightLb: 1,
          cost: { amount: 0, denomination: "gp" },
        },
      }),
    ).rejects.toMatchObject({
      name: "LibraryClientError",
      code: "invalid_homebrew_item",
    });
  });

  it("returns homebrew rows from a successful create", async () => {
    const record = {
      id: "11111111-1111-4111-8111-111111111111",
      ownerEmail: "ada@example.com",
      campaignIds: ["22222222-2222-4222-8222-222222222222"],
      data: {
        name: "Seed",
        description: "+1d6",
        category: "weapon" as const,
        weightLb: 2,
        cost: { amount: 0, denomination: "gp" as const },
      },
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    invoke.mockResolvedValue({ data: { ok: true, data: record }, error: null });
    const client = createSupabaseLibraryClient();
    const created = await client.createHomebrewItem("ada@example.com", {
      campaignIds: record.campaignIds,
      data: record.data,
    });
    expect(created).toEqual(record);
    expect(invoke).toHaveBeenCalledWith("library", {
      body: expect.objectContaining({
        op: "createHomebrewItem",
        campaignIds: record.campaignIds,
      }),
    });
    expect(invoke.mock.calls[0][1].body).not.toHaveProperty("email");
  });

  it("passes campaign filter when listing homebrew items", async () => {
    invoke.mockResolvedValue({ data: { ok: true, data: [] }, error: null });
    const client = createSupabaseLibraryClient();
    await client.listHomebrewItems("ada@example.com", {
      campaignId: "22222222-2222-4222-8222-222222222222",
    });
    expect(invoke).toHaveBeenCalledWith("library", {
      body: {
        op: "listHomebrewItems",
        campaignId: "22222222-2222-4222-8222-222222222222",
      },
    });
  });

  it("never sends the caller's email in the body", async () => {
    invoke.mockResolvedValue({ data: { ok: true, data: null }, error: null });
    const client = createSupabaseLibraryClient();
    await client.ensurePlayer("ada@example.com");
    await client.listCharacters("ada@example.com");
    await client.openCharacter("ada@example.com", "c1");
    expect(invoke).toHaveBeenCalledTimes(3);
    for (const [, options] of invoke.mock.calls) {
      expect(options.body).not.toHaveProperty("email");
    }
    expect(invoke.mock.calls[0][1]).toEqual({ body: { op: "ensurePlayer" } });
  });

  it("does not let a payload override the op", async () => {
    invoke.mockResolvedValue({ data: { ok: true, data: null }, error: null });
    const client = createSupabaseLibraryClient();
    await client.openCampaign("ada@example.com", "k1");
    expect(invoke.mock.calls[0][1].body).toEqual({ op: "openCampaign", campaignId: "k1" });
  });

  it("reports unauthenticated (401) and maps it to a LibraryClientError", async () => {
    const listener = vi.fn();
    const stop = onLibraryUnauthenticated(listener);
    try {
      const response = new Response(
        JSON.stringify({ ok: false, code: "unauthenticated", message: "Missing token." }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
      invoke.mockResolvedValue({ data: null, error: new FunctionsHttpError(response) });
      const client = createSupabaseLibraryClient();
      await expect(client.listCampaigns("ada@example.com")).rejects.toMatchObject({
        name: "LibraryClientError",
        code: "unauthenticated",
      });
      expect(listener).toHaveBeenCalledTimes(1);

      invoke.mockResolvedValue({ data: null, error: new FunctionsHttpError(new Response("nope", { status: 401 })) });
      await expect(client.listCampaigns("ada@example.com")).rejects.toMatchObject({ code: "unauthenticated" });
      expect(listener).toHaveBeenCalledTimes(2);
    } finally {
      stop();
    }
  });

  it("maps forbidden (403) without ending the session", async () => {
    const listener = vi.fn();
    const stop = onLibraryUnauthenticated(listener);
    try {
      const response = new Response(
        JSON.stringify({ ok: false, code: "forbidden", message: "Email is linked to another account." }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
      invoke.mockResolvedValue({ data: null, error: new FunctionsHttpError(response) });
      const client = createSupabaseLibraryClient();
      await expect(client.ensurePlayer("ada@example.com")).rejects.toMatchObject({ code: "forbidden" });
      expect(listener).not.toHaveBeenCalled();
    } finally {
      stop();
    }
  });

  it("surfaces transport failures from functions.invoke", async () => {
    invoke.mockResolvedValue({ data: null, error: { message: "Function not found" } });
    const client = createSupabaseLibraryClient();
    await expect(client.listCampaigns("ada@example.com")).rejects.toThrow("Function not found");
  });

  it("reads library error bodies from FunctionsHttpError responses", async () => {
    const response = new Response(
      JSON.stringify({ ok: false, code: "empty_title", message: "Display name is required." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
    const httpError = new FunctionsHttpError(response);
    invoke.mockResolvedValue({ data: null, error: httpError });
    const client = createSupabaseLibraryClient();
    await expect(client.ensurePlayer("ada@example.com")).rejects.toMatchObject({
      name: "LibraryClientError",
      code: "empty_title",
      message: "Display name is required.",
    });
  });

  it("rejects malformed edge payloads", async () => {
    invoke.mockResolvedValue({ data: { unexpected: true }, error: null });
    const client = createSupabaseLibraryClient();
    await expect(client.listCampaigns("ada@example.com")).rejects.toThrow("invalid response");
  });

  it("wraps internal edge errors as generic errors", async () => {
    invoke.mockResolvedValue({
      data: { ok: false, code: "internal", message: "relation homebrew_items does not exist" },
      error: null,
    });
    const client = createSupabaseLibraryClient();
    await expect(client.listHomebrewItems("ada@example.com")).rejects.toThrow("homebrew_items");
    await expect(client.listHomebrewItems("ada@example.com")).rejects.not.toBeInstanceOf(LibraryClientError);
  });

  it("passes getPlayer and updatePlayer through without the email", async () => {
    const player = { email: "ada@example.com", displayName: "Ada" };
    invoke.mockResolvedValue({ data: { ok: true, data: player }, error: null });
    const client = createSupabaseLibraryClient();
    await expect(client.getPlayer("ada@example.com")).resolves.toEqual(player);
    await expect(client.updatePlayer("ada@example.com", { displayName: "Ada" })).resolves.toEqual(player);
    expect(invoke.mock.calls[0][1]).toEqual({ body: { op: "getPlayer" } });
    expect(invoke.mock.calls[1][1]).toEqual({ body: { op: "updatePlayer", displayName: "Ada" } });
  });

  it("passes importHomebrewItems through without the email", async () => {
    invoke.mockResolvedValue({ data: { ok: true, data: [] }, error: null });
    const client = createSupabaseLibraryClient();
    const fileJson = JSON.stringify({ format: "ragusa-homebrew-items", schemaVersion: 1, items: [] });
    const campaignIds = ["22222222-2222-4222-8222-222222222222"];
    await expect(client.importHomebrewItems("ada@example.com", { fileJson, campaignIds })).resolves.toEqual([]);
    expect(invoke.mock.calls[0][1]).toEqual({
      body: { op: "importHomebrewItems", fileJson, campaignIds },
    });
  });
});
