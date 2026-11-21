import { describe, expect, it } from "vitest";
import type { HomebrewItemData } from "../../domain/homebrewItems";
import { serializeHomebrewItemsFile } from "../../domain/homebrewItemsFile";
import { createMemoryLibraryClient } from "../memoryLibraryClient";
import { createCampaignLibrary } from "./campaigns";
import { createCharacterLibrary } from "./characters";
import { createHomebrewLibrary } from "./homebrew";
import { createMemoryLibraryStore } from "./store";

const EMAIL = "ada@example.com";

describe("memory library client: homebrew", () => {
  it("stores homebrew items for owned campaigns only", async () => {
    const client = createMemoryLibraryClient();
    await client.ensurePlayer(EMAIL);
    const campaign = await client.createCampaign(EMAIL, { title: "Citadel" });
    const other = await client.createCampaign(EMAIL, { title: "Other" });

    const created = await client.createHomebrewItem(EMAIL, {
      campaignIds: [campaign.id],
      data: {
        name: "Seed",
        description: "+1d6",
        category: "weapon",
        weightLb: 2,
        cost: { amount: 0, denomination: "gp" },
      },
    });

    expect(created.campaignIds).toEqual([campaign.id]);
    const listed = await client.listHomebrewItems(EMAIL, { campaignId: campaign.id });
    expect(listed).toHaveLength(1);
    expect(await client.listHomebrewItems(EMAIL, { campaignId: other.id })).toHaveLength(0);

    await expect(
      client.createHomebrewItem("eve@example.com", {
        campaignIds: [campaign.id],
        data: {
          name: "Stolen",
          description: "",
          category: "other",
          weightLb: 0,
          cost: { amount: 0, denomination: "gp" },
        },
      }),
    ).rejects.toMatchObject({ code: "invalid_homebrew_item" });
  });
});

function fixture() {
  const store = createMemoryLibraryStore();
  const client = {
    ...createCharacterLibrary(store),
    ...createCampaignLibrary(store),
    ...createHomebrewLibrary(store),
  };
  return { store, client };
}

const DM = "dm@example.com";
const PLAYER = "pat@example.com";
const STRANGER = "eve@example.com";

const ring: HomebrewItemData = {
  name: "Ring",
  description: "",
  category: "ring",
  weightLb: 0,
  cost: { amount: 1, denomination: "gp" },
};

describe("memory library client: member-visible campaign items", () => {
  it("lets the DM and members list every campaign item, and hides the campaign from strangers", async () => {
    const { store, client } = fixture();
    const campaign = await client.createCampaign(DM, { title: "Citadel" });
    await client.createHomebrewItem(DM, { campaignIds: [campaign.id], data: ring });
    const character = await client.createCharacter(PLAYER, { title: "Pat" });
    // Phase 1 has no join op yet: seat the player's character in the DM's campaign directly.
    store.memberships.set("m1", {
      id: "m1",
      campaignId: campaign.id,
      characterId: character.id,
      sortOrder: 0,
      initiative: null,
      session: {},
    });

    expect(await client.listHomebrewItems(DM, { campaignId: campaign.id })).toHaveLength(1);
    const forPlayer = await client.listHomebrewItems(PLAYER, { campaignId: campaign.id });
    expect(forPlayer.map((row) => [row.ownerEmail, row.data.name])).toEqual([[DM, "Ring"]]);
    await expect(client.listHomebrewItems(STRANGER, { campaignId: campaign.id })).rejects.toMatchObject({
      code: "not_found",
    });
    await expect(client.listHomebrewItems(DM, { campaignId: "missing" })).rejects.toMatchObject({
      code: "not_found",
    });
    // Without a campaign filter: own items only.
    expect(await client.listHomebrewItems(PLAYER)).toEqual([]);
    expect(await client.listHomebrewItems(DM)).toHaveLength(1);
  });
});

describe("memory library client: importHomebrewItems", () => {
  it("round-trips an export into owned campaigns", async () => {
    const { client } = fixture();
    const a = await client.createCampaign(DM, { title: "A" });
    const b = await client.createCampaign(DM, { title: "B" });
    const source = await client.createHomebrewItem(DM, { campaignIds: [a.id], data: ring });
    const fileJson = serializeHomebrewItemsFile([source, { data: { ...ring, name: "Cloak", category: "wondrous" } }]);

    const imported = await client.importHomebrewItems(DM, { fileJson, campaignIds: [a.id, b.id] });
    expect(imported.map((row) => row.data.name)).toEqual(["Ring", "Cloak"]);
    expect(imported.every((row) => row.ownerEmail === DM && row.id !== source.id)).toBe(true);
    expect(imported[0].campaignIds).toEqual([a.id, b.id]);
    expect(await client.listHomebrewItems(DM, { campaignId: b.id })).toHaveLength(2);
  });

  it("is all or nothing on an invalid file", async () => {
    const { client } = fixture();
    const a = await client.createCampaign(DM, { title: "A" });
    const oneBadItem = JSON.stringify({
      format: "ragusa-homebrew-items",
      schemaVersion: 1,
      exportedAt: "x",
      items: [{ data: ring }, { data: { ...ring, weightLb: -1 } }],
    });
    const wrongFormat = JSON.stringify({ format: "other", schemaVersion: 1, items: [] });
    for (const bad of [oneBadItem, "not json", wrongFormat]) {
      await expect(client.importHomebrewItems(DM, { fileJson: bad, campaignIds: [a.id] })).rejects.toMatchObject({
        code: "invalid_items_file",
      });
    }
    expect(await client.listHomebrewItems(DM)).toEqual([]);
  });

  it("requires owned, non-empty campaign ids", async () => {
    const { client } = fixture();
    const a = await client.createCampaign(DM, { title: "A" });
    const fileJson = serializeHomebrewItemsFile([{ data: ring }]);
    await expect(client.importHomebrewItems(DM, { fileJson, campaignIds: [] })).rejects.toMatchObject({
      code: "invalid_homebrew_item",
    });
    await expect(client.importHomebrewItems(STRANGER, { fileJson, campaignIds: [a.id] })).rejects.toMatchObject({
      code: "invalid_homebrew_item",
    });
    expect(await client.listHomebrewItems(STRANGER)).toEqual([]);
  });
});
