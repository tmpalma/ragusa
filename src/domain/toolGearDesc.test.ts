import { describe, expect, it } from "vitest";
import { gearKeyForToolId, structuredDescPartsForTool } from "./toolGearDesc";

describe("gearKeyForToolId", () => {
  it("maps tool ids to adventuring gear keys when they differ", () => {
    expect(gearKeyForToolId("gaming-set-dice")).toBe("dice-set");
    expect(gearKeyForToolId("gaming-set-playing-cards")).toBe("playing-cards");
    expect(gearKeyForToolId("musical-instrument-lute")).toBe("lute");
    expect(gearKeyForToolId("calligraphers-supplies")).toBe("calligraphers-supplies");
  });

  it("returns null when no gear entry exists", () => {
    expect(gearKeyForToolId("gaming-set-dragonchess")).toBeNull();
  });
});

describe("structuredDescPartsForTool", () => {
  it("returns structured parts for aliased gaming set tools", () => {
    expect(structuredDescPartsForTool("gaming-set-dice")).toEqual({
      ability: "Wisdom",
      utilize: "Discern whether someone is cheating (DC 10), or win the game (DC 20)",
    });
  });

  it("falls back to category description when the specific gear entry is missing", () => {
    expect(structuredDescPartsForTool("gaming-set-dragonchess")).toEqual({
      ability: "Wisdom",
      utilize: "Discern whether someone is cheating (DC 10), or win the game (DC 20)",
    });
  });

  it("returns artisan tool descriptions directly", () => {
    expect(structuredDescPartsForTool("calligraphers-supplies")).toMatchObject({
      ability: "Dexterity",
    });
  });
});
