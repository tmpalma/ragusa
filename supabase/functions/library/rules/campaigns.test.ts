import { describe, expect, it } from "vitest";
import {
  assertCharacterNotSeated,
  assertMembershipInCampaign,
  countMembersByCampaign,
  nextSortOrder,
} from "./campaigns.ts";

describe("assertCharacterNotSeated", () => {
  it("allows seating when no membership exists", () => {
    expect(() => assertCharacterNotSeated(null)).not.toThrow();
  });

  it("refuses seating when a membership exists", () => {
    expect(() => assertCharacterNotSeated({ id: "m1", campaign_id: "c1" })).toThrow(
      expect.objectContaining({
        code: "character_already_seated",
        message: "That character is already in a campaign.",
      }),
    );
  });
});

describe("assertMembershipInCampaign", () => {
  it("returns the membership when it is in the campaign", () => {
    const membership = { id: "m1", campaign_id: "c1" };
    expect(assertMembershipInCampaign(membership, "c1")).toBe(membership);
  });

  it("refuses a missing or foreign membership", () => {
    const notFound = expect.objectContaining({ code: "not_found", message: "Membership not found." });
    expect(() => assertMembershipInCampaign(null, "c1")).toThrow(notFound);
    expect(() => assertMembershipInCampaign({ id: "m1", campaign_id: "c2" }, "c1")).toThrow(notFound);
  });
});

describe("nextSortOrder", () => {
  it("is 0 for an empty campaign", () => {
    expect(nextSortOrder([])).toBe(0);
  });

  it("is one past the highest existing order", () => {
    expect(nextSortOrder([{ sort_order: 0 }, { sort_order: 4 }, { sort_order: 2 }])).toBe(5);
  });
});

describe("countMembersByCampaign", () => {
  it("counts memberships per campaign", () => {
    const counts = countMembersByCampaign([{ campaign_id: "a" }, { campaign_id: "b" }, { campaign_id: "a" }]);
    expect(counts.get("a")).toBe(2);
    expect(counts.get("b")).toBe(1);
    expect(counts.get("c")).toBeUndefined();
  });
});
