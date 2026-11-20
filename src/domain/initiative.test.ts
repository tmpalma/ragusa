import { describe, expect, it } from "vitest";
import { INITIAL_CHARACTER } from "../state/characterState";
import { computeDerivedStats } from "./deriveCharacter";
import { computeInitiative } from "./initiative";

describe("computeInitiative", () => {
  it("equals the Dexterity modifier", () => {
    expect(computeInitiative(3, false)).toBe(3);
    expect(computeInitiative(-1, false)).toBe(-1);
    expect(computeInitiative(0, false)).toBe(0);
  });

  it("adds proficiency bonus when the Alert feat is present", () => {
    expect(computeInitiative(2, true)).toBe(4);
    expect(computeInitiative(2, true, 3)).toBe(5);
  });

  it("ignores unrelated feats", () => {
    expect(computeInitiative(2, false)).toBe(2);
  });

  it("adds Alert from the Criminal origin feat on a derived character", () => {
    const dex14 = {
      ...INITIAL_CHARACTER,
      abilityScores: { ...INITIAL_CHARACTER.abilityScores, dex: 14 },
    };
    expect(computeDerivedStats(dex14).initiative).toBe(2);

    const criminal = { ...dex14, backgroundKey: "criminal", featKey: "alert" };
    expect(computeDerivedStats(criminal).initiative).toBe(4);
  });

  it("uses the chosen feat rather than the background's suggested feat", () => {
    const criminalWithoutAlert = {
      ...INITIAL_CHARACTER,
      abilityScores: { ...INITIAL_CHARACTER.abilityScores, dex: 14 },
      backgroundKey: "criminal",
      featKey: "savage-attacker",
    };
    expect(computeDerivedStats(criminalWithoutAlert).initiative).toBe(2);
  });
});
