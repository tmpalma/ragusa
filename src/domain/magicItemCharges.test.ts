import { describe, expect, it } from "vitest";
import { MAGIC_ITEMS, findByKey } from "../data";
import {
  currentMagicItemCharges,
  magicItemChargeMax,
  magicItemChargeMaxFromDesc,
  removeMagicItemChargeKey,
} from "./magicItemCharges";

describe("magicItemChargeMaxFromDesc", () => {
  it("reads a fixed integer charge pool", () => {
    expect(magicItemChargeMaxFromDesc("This staff has 6 charges and can be wielded")).toBe(6);
    expect(magicItemChargeMaxFromDesc("These boots have 4 charges and regain")).toBe(4);
  });

  it("ignores dice charge pools", () => {
    expect(magicItemChargeMaxFromDesc("This wand has 7 charges")).toBe(7);
    expect(magicItemChargeMaxFromDesc("regains 1d3 expended charges")).toBeNull();
  });
});

describe("magicItemChargeMax", () => {
  it("reads charge max from catalog items", () => {
    const wand = findByKey(MAGIC_ITEMS, "wand-of-magic-missiles");
    expect(wand).toBeTruthy();
    expect(magicItemChargeMax("wand-of-magic-missiles")).toBe(7);
  });
});

describe("currentMagicItemCharges", () => {
  it("defaults to max when unset", () => {
    expect(currentMagicItemCharges({}, "staff-of-birdcalls", 10)).toBe(10);
  });

  it("clamps stored values", () => {
    expect(currentMagicItemCharges({ key: 12 }, "key", 10)).toBe(10);
    expect(currentMagicItemCharges({ key: -1 }, "key", 10)).toBe(0);
  });
});

describe("removeMagicItemChargeKey", () => {
  it("drops a key when present", () => {
    expect(removeMagicItemChargeKey({ a: 1, b: 2 }, "a")).toEqual({ b: 2 });
    expect(removeMagicItemChargeKey({ a: 1 }, "missing")).toEqual({ a: 1 });
  });
});
