import { describe, expect, it } from "vitest";
import { formatCharacterPageSubtitle } from "./characterSubtitle";
import { INITIAL_CHARACTER } from "../state/characterState";

describe("formatCharacterPageSubtitle", () => {
  const className = (key: string) =>
    ({ barbarian: "Barbarian", ranger: "Ranger", rogue: "Rogue" })[key] ?? key;
  const subclassName = (key: string) =>
    ({ barbarian: "Berserker", ranger: "Gloomstalker", rogue: "Assassin" })[key] ?? null;
  const formatWithSubclass = (name: string, subclass: string, level: number) =>
    `${name} (${subclass}) ${level}`;
  const formatWithoutSubclass = (name: string, level: number) => `${name} ${level}`;
  const formatSubtitle = (name: string, classLine: string) => `${name} - ${classLine}`;

  it("formats a single class with subclass", () => {
    expect(
      formatCharacterPageSubtitle(
        {
          ...INITIAL_CHARACTER,
          name: "Argo",
          classKey: "barbarian",
          level: 4,
          levelPath: ["barbarian", "barbarian", "barbarian", "barbarian"],
          subclassByClass: { barbarian: "berserker" },
        },
        className,
        subclassName,
        formatWithSubclass,
        formatWithoutSubclass,
        formatSubtitle,
        "Unnamed Character",
      ),
    ).toBe("Argo - Barbarian (Berserker) 4");
  });

  it("formats multiclass with subclasses", () => {
    expect(
      formatCharacterPageSubtitle(
        {
          ...INITIAL_CHARACTER,
          name: "Volk",
          classKey: "ranger",
          level: 9,
          levelPath: [
            "ranger",
            "ranger",
            "ranger",
            "ranger",
            "ranger",
            "ranger",
            "rogue",
            "rogue",
            "rogue",
          ],
          subclassByClass: { ranger: "gloomstalker", rogue: "assassin" },
        },
        className,
        subclassName,
        formatWithSubclass,
        formatWithoutSubclass,
        formatSubtitle,
        "Unnamed Character",
      ),
    ).toBe("Volk - Ranger (Gloomstalker) 6 / Rogue (Assassin) 3");
  });
});
