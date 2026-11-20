import { describe, expect, it } from "vitest";
import type { FeatData } from "../data/types";
import { FEATS } from "../data";
import { INITIAL_CHARACTER } from "../state/characterState";
import {
  availableFeatCategories,
  compareFeatsByCategoryThenName,
  excludeHiddenFeatPickerCategories,
  filterFeatsByCategory,
  isHiddenFeatPickerCategory,
} from "./featCategories";
import { classGrantedFeatPickerOptions } from "./featSlots";
import { findByKey } from "../data";

function feat(key: string, category: string, name?: string): FeatData {
  const existing = findByKey(FEATS, key);
  return {
    key,
    name: name ?? existing?.name ?? key,
    category,
    desc: existing?.desc ?? "",
    srd: existing?.srd ?? false,
    book: existing?.book ?? "XPHB",
  };
}

describe("featCategories", () => {
  it("returns categories in fixed order", () => {
    const categories = availableFeatCategories([
      feat("grappler", "General"),
      feat("alert", "Origin"),
      feat("archery", "Fighting Style"),
    ]);
    expect(categories).toEqual(["Origin", "General", "Fighting Style"]);
  });

  it("sorts by category then name when unfiltered", () => {
    const sorted = filterFeatsByCategory(
      [
        feat("grappler", "General"),
        feat("alert", "Origin"),
        feat("skilled", "Origin"),
        feat("archery", "Fighting Style"),
      ],
      null,
    );
    expect(sorted.map((entry) => entry.key)).toEqual(["alert", "skilled", "grappler", "archery"]);
  });

  it("filters to one category and sorts by name", () => {
    const sorted = filterFeatsByCategory(
      [
        feat("grappler", "General"),
        feat("alert", "Origin"),
        feat("actor", "General"),
      ],
      "General",
    );
    expect(sorted.map((entry) => entry.key)).toEqual(["actor", "grappler"]);
  });

  it("compareFeatsByCategoryThenName orders unknown categories last", () => {
    const a = feat("a", "Custom");
    const b = feat("b", "General");
    expect(compareFeatsByCategoryThenName(a, b)).toBeGreaterThan(0);
  });

  it("flags Dragonmark and Dark Gift as hidden from feat pickers", () => {
    expect(isHiddenFeatPickerCategory("Dragonmark")).toBe(true);
    expect(isHiddenFeatPickerCategory("Dark Gift")).toBe(true);
    expect(isHiddenFeatPickerCategory("General")).toBe(false);
  });

  it("excludes hidden feat picker categories", () => {
    const visible = excludeHiddenFeatPickerCategories([
      feat("alert", "Origin"),
      feat("aberrant-dragonmark", "Dragonmark"),
      feat("aberrant-anatomy", "Dark Gift"),
      feat("grappler", "General"),
    ]);
    expect(visible.map((entry) => entry.key)).toEqual(["alert", "grappler"]);
  });
});

describe("classGrantedFeatPickerOptions", () => {
  it("excludes Epic Boon, Dragonmark, and Dark Gift feats", () => {
    const options = classGrantedFeatPickerOptions(
      [
        feat("boon-of-fate", "Epic Boon"),
        feat("grappler", "General"),
        feat("alert", "Origin"),
        feat("aberrant-dragonmark", "Dragonmark"),
        feat("aberrant-anatomy", "Dark Gift"),
      ],
      INITIAL_CHARACTER,
      4,
      () => true,
    );
    expect(options.map((entry) => entry.key).sort()).toEqual(["alert", "grappler"]);
  });
});
