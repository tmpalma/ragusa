import { describe, expect, it } from "vitest";
import { BACKGROUNDS, FEATS, findByKey } from "../data";
import type { SkillId } from "../data/types";
import { CUSTOM_BACKGROUND_KEY, backgroundDisplayName, resolveBackgroundData } from "./background";
import { INITIAL_CHARACTER, characterReducer } from "../state/characterState";

describe("background catalog", () => {
  it("resolves every background featKey to a catalog feat", () => {
    for (const background of BACKGROUNDS) {
      if (!background.featKey) continue;
      expect(findByKey(FEATS, background.featKey), background.key).not.toBeNull();
    }
  });
});

describe("SET_BACKGROUND feat suggestion", () => {
  it("auto-applies the background feat when featTouched is false", () => {
    const next = characterReducer(
      { ...INITIAL_CHARACTER, backgroundKey: "acolyte", featTouched: false },
      { type: "SET_BACKGROUND", key: "acolyte" },
    );
    expect(next.featKey).toBe("magic-initiate-cleric");
  });
});

describe("resolveBackgroundData", () => {
  it("returns synthetic data for custom background with player choices", () => {
    const character = {
      ...INITIAL_CHARACTER,
      backgroundKey: CUSTOM_BACKGROUND_KEY,
      customBackgroundName: "Street Urchin",
      backgroundSkillPicks: ["stealth", "sleightOfHand"] as (SkillId | null)[],
      backgroundToolPicks: ["thieves-tools"],
    };

    const background = resolveBackgroundData(character);
    expect(background).toMatchObject({
      key: CUSTOM_BACKGROUND_KEY,
      name: "Street Urchin",
      skillProficiencies: ["stealth", "sleightOfHand"],
      featKey: null,
      startingEquipment: [],
    });
    expect(background?.toolProficiency).toEqual({
      kind: "choose",
      count: 1,
      categories: ["artisan", "gamingSet", "musicalInstrument", "other"],
    });
  });
});

describe("backgroundDisplayName", () => {
  it("uses the player name for custom backgrounds", () => {
    const background = resolveBackgroundData({
      ...INITIAL_CHARACTER,
      backgroundKey: CUSTOM_BACKGROUND_KEY,
      customBackgroundName: "Mercenary",
      backgroundSkillPicks: [],
    });
    expect(
      backgroundDisplayName({ customBackgroundName: "Mercenary" }, background, "Custom"),
    ).toBe("Mercenary");
  });

  it("falls back to the localized custom label when the name is empty", () => {
    const background = resolveBackgroundData({
      ...INITIAL_CHARACTER,
      backgroundKey: CUSTOM_BACKGROUND_KEY,
      customBackgroundName: "",
      backgroundSkillPicks: [],
    });
    expect(backgroundDisplayName({ customBackgroundName: "" }, background, "Custom")).toBe("Custom");
  });
});
