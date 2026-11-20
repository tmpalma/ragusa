import { describe, expect, it } from "vitest";
import {
  classLevelsStubFromPath,
  effectiveLevelPath,
  formatClassLevelLine,
  hydrateLevelPath,
  levelPathFromClassKeyAndLevel,
  levelPathFromClassLevelsStub,
  resolvedClassLevels,
  syncCharacterLevelAliases,
} from "./classLevels";
import { INITIAL_CHARACTER } from "../state/characterState";

describe("resolvedClassLevels", () => {
  it("aggregates in first-taken order", () => {
    expect(resolvedClassLevels(["fighter", "fighter", "wizard"])).toEqual([
      { classKey: "fighter", classLevel: 2 },
      { classKey: "wizard", classLevel: 1 },
    ]);
  });
});

describe("formatClassLevelLine", () => {
  const className = (key: string) =>
    ({ fighter: "Fighter", wizard: "Wizard" })[key] ?? key;

  it("formats a single class", () => {
    expect(formatClassLevelLine([{ classKey: "wizard", classLevel: 3 }], className)).toBe(
      "Wizard 3",
    );
  });

  it("joins multiclass segments with a separator", () => {
    expect(
      formatClassLevelLine(
        [
          { classKey: "wizard", classLevel: 3 },
          { classKey: "fighter", classLevel: 1 },
        ],
        className,
      ),
    ).toBe("Wizard 3 / Fighter 1");
  });
});

describe("hydrateLevelPath", () => {
  it("prefers levelPath over classKey + level", () => {
    expect(
      hydrateLevelPath({
        levelPath: ["wizard", "fighter"],
        classKey: "barbarian",
        level: 4,
      }),
    ).toEqual(["wizard", "fighter"]);
  });

  it("expands classLevels stub", () => {
    expect(
      hydrateLevelPath({
        classLevels: [{ classKey: "ranger", level: 1 }, { classKey: "sorcerer", level: 3 }],
      }),
    ).toEqual(["ranger", "sorcerer", "sorcerer", "sorcerer"]);
  });

  it("falls back to classKey + level", () => {
    expect(hydrateLevelPath({ classKey: "cleric", level: 3 })).toEqual(["cleric", "cleric", "cleric"]);
  });
});

describe("levelPathFromClassKeyAndLevel", () => {
  it("returns empty for null class", () => {
    expect(levelPathFromClassKeyAndLevel(null, 3)).toEqual([]);
  });
});

describe("effectiveLevelPath", () => {
  it("pads a short levelPath to match character level", () => {
    expect(
      effectiveLevelPath({
        ...INITIAL_CHARACTER,
        classKey: "rogue",
        level: 2,
        levelPath: ["rogue"],
      }),
    ).toEqual(["rogue", "rogue"]);
  });
});

describe("classLevelsStubFromPath", () => {
  it("round-trips through stub expansion", () => {
    const path = ["fighter", "wizard", "wizard"];
    expect(levelPathFromClassLevelsStub(classLevelsStubFromPath(path))).toEqual(path);
  });
});

describe("syncCharacterLevelAliases", () => {
  it("migrates subclassKey into subclassByClass", () => {
    const synced = syncCharacterLevelAliases({
      ...INITIAL_CHARACTER,
      classKey: "bard",
      level: 3,
      levelPath: ["bard", "bard", "bard"],
      subclassKey: "college-of-lore",
      subclassByClass: {},
    });
    expect(synced.subclassByClass.bard).toBe("college-of-lore");
    expect(synced.subclassKey).toBe("college-of-lore");
  });
});
