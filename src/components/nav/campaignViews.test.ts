import { describe, expect, it } from "vitest";
import { campaignViewPath, resolveCampaignViewId } from "./campaignViews";

describe("campaignViews", () => {
  it("resolves items segment", () => {
    expect(resolveCampaignViewId("items")).toBe("items");
    expect(campaignViewPath("items")).toBe("/campaign/items");
  });
});
