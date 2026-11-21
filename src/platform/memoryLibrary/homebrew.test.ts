import { describe, expect, it } from "vitest";
import { createMemoryLibraryClient } from "../memoryLibraryClient";

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
