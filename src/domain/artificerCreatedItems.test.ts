import { describe, expect, it } from "vitest";
import { INITIAL_CHARACTER } from "../state/characterState";
import { artificerCreatedItemLabels, listArtificerCreatedItemKeys } from "./artificerCreatedItems";

describe("listArtificerCreatedItemKeys", () => {
  it("returns created keys for artificers at level 2+", () => {
    const keys = listArtificerCreatedItemKeys({
      ...INITIAL_CHARACTER,
      classKey: "artificer",
      level: 3,
      artificerCreatedItemKeys: ["bag-of-holding", "weapon-plus-1"],
    });
    expect(keys).toEqual(["bag-of-holding", "weapon-plus-1"]);
  });

  it("returns an empty list for non-artificers", () => {
    expect(
      listArtificerCreatedItemKeys({
        ...INITIAL_CHARACTER,
        artificerCreatedItemKeys: ["bag-of-holding"],
      }),
    ).toEqual([]);
  });
});

describe("artificerCreatedItemLabels", () => {
  it("resolves magic items and generic variants", () => {
    const labels = artificerCreatedItemLabels(
      {
        ...INITIAL_CHARACTER,
        classKey: "artificer",
        level: 3,
        artificerCreatedItemKeys: ["bag-of-holding", "weapon-plus-1"],
      },
      {
        magicItemName: (key) => (key === "bag-of-holding" ? "Bag of Holding" : key),
        variantName: (key) => (key === "weapon-plus-1" ? "+1 Weapon" : key),
        planName: (key) => key,
      },
    );
    expect(labels).toEqual(["Bag of Holding", "+1 Weapon"]);
  });
});
