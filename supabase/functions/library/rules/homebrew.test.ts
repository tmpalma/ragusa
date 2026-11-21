import { describe, expect, it } from "vitest";
import {
  assertCampaignIdsOwned,
  assertCampaignItemsAccess,
  homebrewItemFromRow,
  parseHomebrewItemsFile,
  stringIds,
  validateHomebrewData,
} from "./homebrew.ts";

function item(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: "Ring of Ragusa",
    weightLb: 0,
    category: "ring",
    cost: { amount: 100, denomination: "gp" },
    ...overrides,
  };
}

function invalid(message: string) {
  return expect.objectContaining({ code: "invalid_homebrew_item", message });
}

describe("validateHomebrewData", () => {
  it("accepts a valid item and trims the name", () => {
    expect(validateHomebrewData(item({ name: "  Ring  ", extra: true }))).toEqual(
      item({ name: "Ring", extra: true }),
    );
  });

  it("accepts a valid range", () => {
    const data = item({ range: { normalFeet: 20, longFeet: 60 } });
    expect(validateHomebrewData(data)).toEqual(data);
  });

  it("requires a name", () => {
    expect(() => validateHomebrewData(item({ name: "   " }))).toThrow(invalid("Item name is required."));
    expect(() => validateHomebrewData(item({ name: 3 }))).toThrow(invalid("Item name is required."));
  });

  it("rejects an invalid weight", () => {
    for (const weightLb of [-1, Number.NaN, Number.POSITIVE_INFINITY, "1", undefined]) {
      expect(() => validateHomebrewData(item({ weightLb }))).toThrow(invalid("Weight is invalid."));
    }
  });

  it("rejects an invalid category", () => {
    expect(() => validateHomebrewData(item({ category: "armor" }))).toThrow(invalid("Category is invalid."));
    expect(() => validateHomebrewData(item({ category: undefined }))).toThrow(invalid("Category is invalid."));
  });

  it("rejects an invalid cost", () => {
    for (const cost of [
      undefined,
      [],
      { amount: -1, denomination: "gp" },
      { amount: 1, denomination: "zz" },
      { amount: "1", denomination: "gp" },
    ]) {
      expect(() => validateHomebrewData(item({ cost }))).toThrow(invalid("Cost is invalid."));
    }
  });

  it("rejects an invalid range", () => {
    for (const range of [null, "far", { normalFeet: 20 }, { normalFeet: -5, longFeet: 60 }]) {
      expect(() => validateHomebrewData(item({ range }))).toThrow(invalid("Range is invalid."));
    }
  });
});

describe("assertCampaignIdsOwned", () => {
  it("requires at least one campaign", () => {
    expect(() => assertCampaignIdsOwned([], new Set(["a"]))).toThrow(invalid("Select at least one campaign."));
  });

  it("refuses campaigns the caller does not own", () => {
    expect(() => assertCampaignIdsOwned(["a", "b"], new Set(["a"]))).toThrow(invalid("Campaign is not available."));
  });

  it("accepts owned campaigns", () => {
    expect(() => assertCampaignIdsOwned(["a", "b"], new Set(["a", "b", "c"]))).not.toThrow();
  });
});

describe("stringIds", () => {
  it("drops non-string ids", () => {
    expect(stringIds(["a", 1, null, "b"])).toEqual(["a", "b"]);
  });
});

describe("homebrewItemFromRow", () => {
  it("maps a row and defaults campaign ids", () => {
    expect(
      homebrewItemFromRow({ id: "i", owner_email: "e", campaign_ids: null, data: { name: "x" }, updated_at: "t" }),
    ).toEqual({ id: "i", ownerEmail: "e", campaignIds: [], data: { name: "x" }, updatedAt: "t" });
  });
});

describe("assertCampaignItemsAccess", () => {
  const notFound = expect.objectContaining({ code: "not_found", message: "Campaign not found." });

  it("lets the DM in", () => {
    expect(() =>
      assertCampaignItemsAccess({ callerEmail: "dm@x", campaignOwnerEmail: "dm@x", callerIsMember: false }),
    ).not.toThrow();
  });

  it("lets a member in", () => {
    expect(() =>
      assertCampaignItemsAccess({ callerEmail: "p@x", campaignOwnerEmail: "dm@x", callerIsMember: true }),
    ).not.toThrow();
  });

  it("hides the campaign from strangers", () => {
    expect(() =>
      assertCampaignItemsAccess({ callerEmail: "s@x", campaignOwnerEmail: "dm@x", callerIsMember: false }),
    ).toThrow(notFound);
  });

  it("reports a missing campaign as not_found", () => {
    expect(() =>
      assertCampaignItemsAccess({ callerEmail: "s@x", campaignOwnerEmail: null, callerIsMember: false }),
    ).toThrow(notFound);
  });
});

describe("parseHomebrewItemsFile", () => {
  const invalidFile = expect.objectContaining({ code: "invalid_items_file" });

  function file(overrides: Record<string, unknown> = {}): string {
    return JSON.stringify({
      format: "ragusa-homebrew-items",
      schemaVersion: 1,
      exportedAt: "2026-11-20T00:00:00.000Z",
      items: [{ data: item({ name: "  Ring  ", description: "Shiny" }) }, { data: item({ name: "Plain" }) }],
      ...overrides,
    });
  }

  it("returns validated item data", () => {
    expect(parseHomebrewItemsFile(file())).toEqual([
      item({ name: "Ring", description: "Shiny" }),
      item({ name: "Plain", description: "" }),
    ]);
  });

  it("accepts an older schema version and an empty list", () => {
    expect(parseHomebrewItemsFile(file({ schemaVersion: 0, items: [] }))).toEqual([]);
  });

  it("rejects non-JSON and non-string input", () => {
    expect(() => parseHomebrewItemsFile("{not json")).toThrow(invalidFile);
    expect(() => parseHomebrewItemsFile(undefined)).toThrow(invalidFile);
    expect(() => parseHomebrewItemsFile("[]")).toThrow(invalidFile);
  });

  it("rejects the wrong format", () => {
    expect(() => parseHomebrewItemsFile(file({ format: "dnd55e-chargen-character" }))).toThrow(invalidFile);
  });

  it("rejects a newer or missing schema version", () => {
    expect(() => parseHomebrewItemsFile(file({ schemaVersion: 2 }))).toThrow(invalidFile);
    expect(() => parseHomebrewItemsFile(file({ schemaVersion: "1" }))).toThrow(invalidFile);
  });

  it("rejects a non-array items field", () => {
    expect(() => parseHomebrewItemsFile(file({ items: {} }))).toThrow(invalidFile);
  });

  it("rejects the whole file when any item is invalid", () => {
    expect(() =>
      parseHomebrewItemsFile(file({ items: [{ data: item() }, { data: item({ weightLb: -1 }) }] })),
    ).toThrow(expect.objectContaining({ code: "invalid_items_file", message: "Item 2: Weight is invalid." }));
    expect(() => parseHomebrewItemsFile(file({ items: [item()] }))).toThrow(invalidFile);
  });
});
