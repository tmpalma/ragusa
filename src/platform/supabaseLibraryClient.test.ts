import { FunctionsHttpError } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
        email: "ada@example.com",
        campaignIds: record.campaignIds,
      }),
    });
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
        email: "ada@example.com",
        campaignId: "22222222-2222-4222-8222-222222222222",
      },
    });
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
});
