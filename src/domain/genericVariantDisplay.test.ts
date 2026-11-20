import { describe, expect, it } from "vitest";
import { GENERIC_VARIANTS, findByKey } from "../data";
import { armorForVariant, findGenericVariant, weaponsForVariant } from "./genericVariantMatcher";
import {
  localizedVariantDisplayName,
  variantAffixesForDisplay,
  variantDisplayName,
  variantRarityLocaleKey,
} from "./genericVariantDisplay";

function variant(key: string) {
  const row = findByKey(GENERIC_VARIANTS, key);
  expect(row, key).toBeTruthy();
  return row!;
}

describe("variantDisplayName", () => {
  it("returns the base name for a mundane (null) variant", () => {
    expect(variantDisplayName("Longsword", null)).toBe("Longsword");
    expect(variantDisplayName("Chain Mail", undefined)).toBe("Chain Mail");
  });

  it("applies prefix and suffix from the catalog", () => {
    expect(variantDisplayName("Longsword", variant("weapon-plus-1"))).toBe("+1 Longsword");
    expect(variantDisplayName("Chain Mail", variant("elven-chain"))).toBe("Elven Chain Mail");
    expect(variantDisplayName("Plate Armor", variant("armor-of-acid-resistance"))).toBe(
      "Plate Armor of Acid Resistance",
    );
    expect(variantDisplayName("Longsword", variant("weapon-of-warning"))).toBe("Longsword of Warning");
  });

  it("uses explicit affixes when provided", () => {
    const plusOne = variant("weapon-plus-1");
    expect(
      variantDisplayName("Espada longa", plusOne, { namePrefix: "+1 ", nameSuffix: "" }),
    ).toBe("+1 Espada longa");
    expect(
      variantDisplayName("Espada longa", variant("weapon-of-warning"), {
        namePrefix: "",
        nameSuffix: " de Alerta",
      }),
    ).toBe("Espada longa de Alerta");
  });
});

describe("localizedVariantDisplayName", () => {
  it("prefers catalog affix strings over JSON defaults", () => {
    const plusOne = variant("weapon-plus-1");
    const tEntity = (catalog: string, key: string, field: string, fallback?: string) => {
      if (catalog === "catalog.genericVariants" && key === "weapon-plus-1" && field === "namePrefix") {
        return "+1 ";
      }
      return fallback ?? "";
    };
    expect(localizedVariantDisplayName("Espada longa", plusOne, tEntity)).toBe("+1 Espada longa");
  });

  it("falls back to JSON affixes when catalog has no override", () => {
    const plusOne = variant("weapon-plus-1");
    const tEntity = (_catalog: string, _key: string, _field: string, fallback?: string) => fallback ?? "";
    expect(localizedVariantDisplayName("Longsword", plusOne, tEntity)).toBe("+1 Longsword");
  });
});

describe("variantAffixesForDisplay", () => {
  it("reads prefix and suffix fields from the catalog", () => {
    const plusOne = variant("weapon-plus-1");
    const tEntity = (catalog: string, key: string, field: string, fallback?: string) => {
      if (catalog === "catalog.genericVariants" && key === plusOne.key && field === "namePrefix") {
        return "★ ";
      }
      return fallback ?? "";
    };
    expect(variantAffixesForDisplay(plusOne, tEntity)).toEqual({
      namePrefix: "★ ",
      nameSuffix: "",
    });
  });
});

describe("variantRarityLocaleKey", () => {
  it("maps catalog rarities onto equipment.rarity.* keys", () => {
    expect(variantRarityLocaleKey("common")).toBe("equipment.rarity.common");
    expect(variantRarityLocaleKey("very rare")).toBe("equipment.rarity.very rare");
    expect(variantRarityLocaleKey("legendary")).toBe("equipment.rarity.legendary");
  });
});

describe("Armory picker filtering", () => {
  it("limits Elven Chain to chain mail and chain shirt", () => {
    const keys = armorForVariant(findGenericVariant("elven-chain"))
      .map((row) => row.key)
      .sort();
    expect(keys).toEqual(["chain-mail", "chain-shirt"]);
  });

  it("does not offer shields for Armor of Gleaming", () => {
    const keys = armorForVariant(findGenericVariant("armor-plus-1")).map((row) => row.key);
    expect(keys).not.toContain("shield");
    expect(keys).toContain("leather-armor");
    expect(keys).toContain("plate-armor");
  });

  it("offers only a shield for +1 Shield", () => {
    expect(armorForVariant(findGenericVariant("shield-plus-1")).map((row) => row.key)).toEqual(["shield"]);
  });

  it("offers weapons and not armor for Dazzling Weapon", () => {
    expect(weaponsForVariant(findGenericVariant("weapon-plus-1")).length).toBeGreaterThan(0);
    expect(armorForVariant(findGenericVariant("weapon-plus-1"))).toEqual([]);
  });
});
