import { describe, expect, it } from "vitest";
import {
  addAdventuringGear,
  hasStructuredGearDesc,
  mergeAttunedKeysIntoAdventuringGear,
  parseStructuredGearDesc,
  removeAdventuringGear,
  setAdventuringGearQuantity,
} from "./adventuringGear";

describe("adventuring gear picks", () => {
  it("adds unique catalog keys and rejects duplicates or unknown keys", () => {
    const one = addAdventuringGear([], "backpack");
    expect(one).toEqual([{ key: "backpack", quantity: 1 }]);
    expect(addAdventuringGear(one!, "backpack")).toBeNull();
    expect(addAdventuringGear([], "not-a-real-item")).toBeNull();
    expect(addAdventuringGear([], "cloak-of-protection")).toEqual([{ key: "cloak-of-protection", quantity: 1 }]);
    const bag = addAdventuringGear([], "bag-of-holding");
    expect(bag).toEqual([{ key: "bag-of-holding", quantity: 1 }]);
    expect(removeAdventuringGear([{ key: "backpack", quantity: 1 }, { key: "rope", quantity: 2 }], "backpack")).toEqual([
      { key: "rope", quantity: 2 },
    ]);
  });

  it("updates quantity and removes the entry at zero", () => {
    const entries = [{ key: "rope", quantity: 1 }];
    expect(setAdventuringGearQuantity(entries, "rope", 3)).toEqual([{ key: "rope", quantity: 3 }]);
    expect(setAdventuringGearQuantity(entries, "rope", 0)).toEqual([]);
    expect(setAdventuringGearQuantity(entries, "missing", 2)).toBeNull();
  });

  it("merges legacy attuned keys into carried gear", () => {
    expect(mergeAttunedKeysIntoAdventuringGear([], ["cloak-of-protection"])).toEqual([
      { key: "cloak-of-protection", quantity: 1 },
    ]);
    expect(
      mergeAttunedKeysIntoAdventuringGear([{ key: "backpack", quantity: 1 }], ["cloak-of-protection", "backpack"]),
    ).toEqual([{ key: "backpack", quantity: 1 }, { key: "cloak-of-protection", quantity: 1 }]);
  });

  it("restocks pack expendables when pack quantity increases", () => {
    const entries = [{ key: "explorers-pack", quantity: 1, packRemaining: { oil: 0, rations: 10, torch: 10 } }];
    const doubled = setAdventuringGearQuantity(entries, "explorers-pack", 2);
    expect(doubled).toEqual([
      { key: "explorers-pack", quantity: 2, packRemaining: { oil: 2, rations: 20, torch: 20 } },
    ]);
  });
});

describe("parseStructuredGearDesc", () => {
  it("parses ability, utilize, and craft lines from catalog text", () => {
    const desc =
      "- **Ability:.** Intelligence\n- **Utilize:.** Identify a substance (DC 15)\n- **Craft:.** Acid, Oil";
    expect(parseStructuredGearDesc(desc)).toEqual({
      ability: "Intelligence",
      utilize: "Identify a substance (DC 15)",
      craft: "Acid, Oil",
    });
    expect(hasStructuredGearDesc(desc)).toBe(true);
    expect(hasStructuredGearDesc("A plain rope description.")).toBe(false);
  });

  it("parses instrument and kit entries without craft lines", () => {
    expect(
      parseStructuredGearDesc(
        "- **Ability:.** Charisma\n- **Utilize:.** Play a known tune (DC 10), or improvise a song (DC 15)",
      ),
    ).toEqual({
      ability: "Charisma",
      utilize: "Play a known tune (DC 10), or improvise a song (DC 15)",
    });
  });
});
