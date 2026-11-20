import { describe, expect, it } from "vitest";
import { findByKey, SPELLS } from "../data";
import {
  enspelledAllowedSchools,
  enspelledSpellLevel,
  enspelledSpellOptions,
  isEnspelledVariantKey,
  isValidEnspelledSpellPick,
} from "./enspelledVariants";

describe("enspelledVariants", () => {
  it("detects enspelled variant keys", () => {
    expect(isEnspelledVariantKey("enspelled-armor-cantrip")).toBe(true);
    expect(isEnspelledVariantKey("enspelled-weapon-level-3")).toBe(true);
    expect(isEnspelledVariantKey("weapon-plus-1")).toBe(false);
  });

  it("parses spell level from variant key", () => {
    expect(enspelledSpellLevel("enspelled-armor-cantrip")).toBe(0);
    expect(enspelledSpellLevel("enspelled-weapon-level-5")).toBe(5);
  });

  it("restricts armor schools to Abjuration and Illusion", () => {
    expect(enspelledAllowedSchools("enspelled-armor-level-1")).toEqual(["Abjuration", "Illusion"]);
  });

  it("restricts weapon schools to conjuration/divination/evocation/necromancy/transmutation", () => {
    expect(enspelledAllowedSchools("enspelled-weapon-level-1")).toEqual([
      "Conjuration",
      "Divination",
      "Evocation",
      "Necromancy",
      "Transmutation",
    ]);
  });

  it("filters spell options by level and school", () => {
    const options = enspelledSpellOptions("enspelled-armor-level-1");
    expect(options.length).toBeGreaterThan(0);
    for (const key of options) {
      const spell = findByKey(SPELLS, key);
      expect(spell?.level).toBe(1);
      expect(["Abjuration", "Illusion"]).toContain(spell?.school);
    }
    expect(isValidEnspelledSpellPick("enspelled-armor-level-1", options[0]!)).toBe(true);
    const burningHands = SPELLS.find((spell) => spell.name === "Burning Hands");
    if (burningHands) {
      expect(isValidEnspelledSpellPick("enspelled-armor-level-1", burningHands.key)).toBe(false);
    }
  });
});
