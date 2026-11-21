import { describe, expect, it } from "vitest";
import type { HomebrewItemData, HomebrewItemRecord } from "./homebrewItems";
import {
  homebrewItemsFileName,
  parseHomebrewItemsFile,
  serializeHomebrewItemsFile,
} from "./homebrewItemsFile";

function data(overrides: Partial<HomebrewItemData> = {}): HomebrewItemData {
  return {
    name: "Ring of Ragusa",
    description: "Glows near the sea.",
    category: "ring",
    weightLb: 0,
    cost: { amount: 100, denomination: "gp" },
    ...overrides,
  };
}

function record(id: string, overrides: Partial<HomebrewItemData> = {}): HomebrewItemRecord {
  return {
    id,
    ownerEmail: "dm@example.com",
    campaignIds: ["c1", "c2"],
    data: data(overrides),
    updatedAt: "2026-11-01T00:00:00.000Z",
  };
}

function envelope(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    format: "ragusa-homebrew-items",
    schemaVersion: 1,
    exportedAt: "2026-11-20T00:00:00.000Z",
    items: [{ data: data() }],
    ...overrides,
  });
}

describe("serializeHomebrewItemsFile", () => {
  it("keeps only data and strips ids, owner and campaign links", () => {
    const json = serializeHomebrewItemsFile(
      [record("a"), record("b", { name: "Seed", category: "weapon", range: { normalFeet: 20, longFeet: 60 } })],
      new Date("2026-11-20T12:00:00.000Z"),
    );
    const parsed = JSON.parse(json);
    expect(parsed).toEqual({
      format: "ragusa-homebrew-items",
      schemaVersion: 1,
      exportedAt: "2026-11-20T12:00:00.000Z",
      items: [
        { data: data() },
        { data: data({ name: "Seed", category: "weapon", range: { normalFeet: 20, longFeet: 60 } }) },
      ],
    });
    expect(json).not.toContain("dm@example.com");
    expect(json).not.toContain("c1");
  });

  it("round-trips through parseHomebrewItemsFile", () => {
    const records = [record("a"), record("b", { name: "Cloak", category: "wondrous", weightKg: 1, weightLb: 2 })];
    expect(parseHomebrewItemsFile(serializeHomebrewItemsFile(records))).toEqual(records.map((row) => row.data));
  });
});

describe("parseHomebrewItemsFile", () => {
  const invalid = expect.objectContaining({ code: "invalid_items_file" });

  it("trims names and defaults a missing description", () => {
    const { description: _omit, ...noDescription } = data({ name: "  Ring  " });
    void _omit;
    expect(parseHomebrewItemsFile(envelope({ items: [{ data: noDescription }] }))).toEqual([
      data({ name: "Ring", description: "" }),
    ]);
  });

  it("rejects non-JSON and non-object files", () => {
    expect(() => parseHomebrewItemsFile("nope")).toThrow(invalid);
    expect(() => parseHomebrewItemsFile("[]")).toThrow(invalid);
  });

  it("rejects the wrong format", () => {
    expect(() => parseHomebrewItemsFile(envelope({ format: "ragusa-roster" }))).toThrow(invalid);
  });

  it("rejects a newer schema version", () => {
    expect(() => parseHomebrewItemsFile(envelope({ schemaVersion: 2 }))).toThrow(invalid);
    expect(() => parseHomebrewItemsFile(envelope({ schemaVersion: undefined }))).toThrow(invalid);
  });

  it("rejects a non-array items field", () => {
    expect(() => parseHomebrewItemsFile(envelope({ items: "x" }))).toThrow(invalid);
  });

  it("rejects the whole file when one item is invalid", () => {
    for (const bad of [
      data({ name: " " }),
      { ...data(), weightLb: -1 },
      { ...data(), category: "armor" },
      { ...data(), cost: { amount: 1, denomination: "zz" } },
      { ...data(), range: { normalFeet: 5 } },
    ]) {
      expect(() => parseHomebrewItemsFile(envelope({ items: [{ data: data() }, { data: bad }] }))).toThrow(
        expect.objectContaining({ code: "invalid_items_file", message: expect.stringMatching(/^Item 2: /) }),
      );
    }
    expect(() => parseHomebrewItemsFile(envelope({ items: [data()] }))).toThrow(invalid);
  });
});

describe("homebrewItemsFileName", () => {
  it("uses the campaign title and the local date", () => {
    expect(homebrewItemsFileName("Lost / Mine", new Date(2026, 10, 5))).toBe("Lost - Mine-items-2026-11-05.json");
    expect(homebrewItemsFileName("  ", new Date(2026, 0, 1))).toBe("campaign-items-2026-01-01.json");
  });
});
