import { describe, expect, it } from "vitest";
import {
  clampDeathSave,
  clearDeathSaves,
  deathSavesClearedIfHealed,
  DEATH_SAVE_MAX,
  hasDeathSaveMarks,
} from "./deathSaves";

describe("deathSaves", () => {
  it("clamps values to 0–3", () => {
    expect(clampDeathSave(-1)).toBe(0);
    expect(clampDeathSave(0)).toBe(0);
    expect(clampDeathSave(DEATH_SAVE_MAX)).toBe(DEATH_SAVE_MAX);
    expect(clampDeathSave(4)).toBe(DEATH_SAVE_MAX);
    expect(clampDeathSave(2.7)).toBe(2);
  });

  it("detects marks and clears them", () => {
    expect(hasDeathSaveMarks(clearDeathSaves())).toBe(false);
    expect(hasDeathSaveMarks({ deathSaveSuccesses: 1, deathSaveFailures: 0 })).toBe(true);
    expect(hasDeathSaveMarks({ deathSaveSuccesses: 0, deathSaveFailures: 2 })).toBe(true);
  });

  it("clears marks only when effective HP is above 0", () => {
    const marked = { deathSaveSuccesses: 2, deathSaveFailures: 1 };
    expect(deathSavesClearedIfHealed(marked, 0, 10)).toBeNull();
    expect(deathSavesClearedIfHealed(marked, null, 10)).toEqual(clearDeathSaves());
    expect(deathSavesClearedIfHealed(marked, 3, 10)).toEqual(clearDeathSaves());
    expect(deathSavesClearedIfHealed(clearDeathSaves(), 5, 10)).toBeNull();
  });
});
