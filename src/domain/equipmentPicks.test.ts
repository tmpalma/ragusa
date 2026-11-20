import { describe, expect, it } from "vitest";
import { MAGIC_ITEMS } from "../data";
import {
  equipmentPickCatalog,
  equipmentPickCatalogKeys,
  equipmentPickFilterForMagicRarity,
  equipmentPickLabelMatchesQuery,
  equipmentPickWeightLb,
  filterEquipmentPickCatalog,
  filterEquipmentPickComboboxOptionsByQuery,
  nonAttunementMagicItems,
  resolveEquipmentPick,
  sortEquipmentPickComboboxOptionsByLabel,
} from "./equipmentPicks";

describe("equipmentPickCatalog", () => {
  it("includes adventuring gear and all magic items", () => {
    const keys = equipmentPickCatalogKeys();
    expect(keys).toContain("backpack");
    expect(keys).toContain("bag-of-holding");
    expect(keys).toContain("cloak-of-protection");
    expect(nonAttunementMagicItems().every((item) => !item.requiresAttunement)).toBe(true);
  });

  it("filters catalog entries by type", () => {
    const catalog = filterEquipmentPickCatalog(
      nonAttunementMagicItems().map((item) => ({
        key: item.key,
        kind: "magic" as const,
        filterKey: equipmentPickFilterForMagicRarity(item.rarity),
        name: item.name,
      })),
      new Set(),
      "magic-common",
    );
    expect(catalog.length).toBeGreaterThan(0);
    expect(catalog.every((entry) => entry.filterKey === "magic-common")).toBe(true);
  });

  it("maps each magic item rarity to its own equipment pick filter", () => {
    expect(equipmentPickFilterForMagicRarity("common")).toBe("magic-common");
    expect(equipmentPickFilterForMagicRarity("uncommon")).toBe("magic-uncommon");
    expect(equipmentPickFilterForMagicRarity("rare")).toBe("magic-rare");
    expect(equipmentPickFilterForMagicRarity("very rare")).toBe("magic-very-rare");

    const filtered = filterEquipmentPickCatalog(
      [
        {
          key: "synthetic-rare-item",
          kind: "magic" as const,
          filterKey: equipmentPickFilterForMagicRarity("rare"),
          name: "Synthetic Rare Item",
        },
      ],
      new Set(),
      "magic-rare",
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.filterKey).toBe("magic-rare");

    const fromCatalog = equipmentPickCatalog().filter((entry) => entry.kind === "magic");
    for (const entry of fromCatalog) {
      const item = MAGIC_ITEMS.find((row) => row.key === entry.key);
      if (!item) continue;
      expect(entry.filterKey).toBe(equipmentPickFilterForMagicRarity(item.rarity));
      expect(entry.requiresAttunement).toBe(item.requiresAttunement);
    }
  });

  it("lists attunement magic items in the browse catalog and as addable gear keys", () => {
    const attuneKey = MAGIC_ITEMS.find((item) => item.requiresAttunement)?.key;
    expect(attuneKey).toBeTruthy();
    expect(equipmentPickCatalog().some((entry) => entry.key === attuneKey)).toBe(true);
    expect(equipmentPickCatalogKeys()).toContain(attuneKey);
  });

  it("resolves gear and magic picks including attunement items", () => {
    expect(resolveEquipmentPick("backpack")?.kind).toBe("gear");
    expect(resolveEquipmentPick("bag-of-holding")?.kind).toBe("magic");
    expect(resolveEquipmentPick("cloak-of-protection")?.kind).toBe("magic");
    expect(equipmentPickWeightLb("bag-of-holding", 2)).toBe(10);
  });
});

describe("equipment pick combobox search", () => {
  const warMageOptions = [
    { key: "wand-plus-1", label: "+1 Varinha do Mago de Guerra" },
    { key: "wand-plus-2", label: "+2 Varinha do Mago de Guerra" },
    { key: "backpack", label: "Mochila" },
  ];

  it("matches localized names after stripping a leading +N prefix", () => {
    expect(equipmentPickLabelMatchesQuery("+1 Varinha do Mago de Guerra", "varinha", "pt-BR")).toBe(true);
    expect(equipmentPickLabelMatchesQuery("+2 Varinha do Mago de Guerra", "mago de guerra", "pt-BR")).toBe(true);
    expect(equipmentPickLabelMatchesQuery("+1 Wand of the War Mage", "wand of the war", "en")).toBe(true);
    expect(equipmentPickLabelMatchesQuery("Mochila", "varinha", "pt-BR")).toBe(false);
  });

  it("returns all options when the query is empty", () => {
    expect(filterEquipmentPickComboboxOptionsByQuery(warMageOptions, "", "pt-BR")).toEqual(warMageOptions);
    expect(filterEquipmentPickComboboxOptionsByQuery(warMageOptions, "   ", "pt-BR")).toEqual(warMageOptions);
  });

  it("filters options by substring on the visible label", () => {
    const filtered = filterEquipmentPickComboboxOptionsByQuery(warMageOptions, "mago de guerra", "pt-BR");
    expect(filtered.map((row) => row.key)).toEqual(["wand-plus-1", "wand-plus-2"]);
  });

  it("sorts by label within each group", () => {
    const options = [
      { key: "b", label: "Zebra", group: "G" },
      { key: "a", label: "Apple", group: "G" },
      { key: "c", label: "Mochila", group: "H" },
      { key: "d", label: "Adaga", group: "H" },
    ];
    expect(sortEquipmentPickComboboxOptionsByLabel(options, "pt-BR").map((row) => row.key)).toEqual([
      "a",
      "b",
      "d",
      "c",
    ]);
  });
});
