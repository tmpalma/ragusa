import { describe, expect, it } from "vitest";
import { addAdventuringGear } from "./adventuringGear";
import { carriedWeightLb } from "./carryingCapacity";
import { availableEquipmentPickFilters, mergedEquipmentPickCatalog } from "./equipmentPicks";
import { homebrewGearKey } from "./homebrewItems";
import { setHomebrewItemRegistry, clearHomebrewItemRegistry } from "./homebrewItemRegistry";
import { INITIAL_CHARACTER } from "../state/characterState";

describe("homebrew equipment picks", () => {
  it("registers homebrew filter and weight when allowed", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    setHomebrewItemRegistry([
      {
        id,
        ownerEmail: "dm@example.com",
        campaignIds: ["camp"],
        updatedAt: "2026-01-01T00:00:00.000Z",
        data: {
          name: "Harvest",
          description: "Sickle",
          category: "weapon",
          weightLb: 2,
          cost: { amount: 5, denomination: "gp" },
        },
      },
    ]);

    const key = homebrewGearKey(id);
    const catalog = mergedEquipmentPickCatalog();
    expect(catalog.some((entry) => entry.key === key && entry.filterKey === "homebrew")).toBe(true);
    expect(availableEquipmentPickFilters(catalog)).toContain("homebrew");

    const next = addAdventuringGear([], key);
    expect(next).toEqual([{ key, quantity: 1 }]);

    const character = {
      ...INITIAL_CHARACTER,
      adventuringGear: next ?? [],
    };
    expect(carriedWeightLb(character)).toBeGreaterThanOrEqual(2);

    clearHomebrewItemRegistry();
    expect(addAdventuringGear([], key)).toBeNull();
  });
});
