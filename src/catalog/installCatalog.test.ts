import { describe, expect, it } from "vitest";
import { CLASSES, SPECIES, SPELLS } from "../data/index";
import { getMessages } from "../i18n/loadLocales";
import { buildFixtureCatalogPayload } from "../testSupport/buildFixtureCatalogPayload";
import { installCatalog } from "./installCatalog";
import type { ClassData, SpeciesData, SpellData } from "../data/types";
import type { CatalogPayload } from "./types";

describe("installCatalog", () => {
  it("maps RPC rows to catalog store exports without merging species features again", () => {
    const payload: CatalogPayload = {
      classes: [
        { key: "fighter", name: "Fighter", srd: true, book: "XPHB", features: [], startingEquipment: [] } as unknown as ClassData,
      ],
      subclasses: [],
      classSpellLists: {},
      spells: [
        { key: "acid-arrow", name: "Acid Arrow", srd: true, book: "XPHB", level: 2, school: "Evocation" } as unknown as SpellData,
      ],
      species: [
        {
          key: "human",
          name: "Human",
          srd: true,
          book: "XPHB",
          speeds: [{ type: "walk", feet: 30 }],
          traits: [],
          features: [
            {
              key: "human-versatile",
              name: "Versatile",
              desc: "Pick a feat.",
              grantedAtLevel: 1,
              combatSurface: false,
              effects: [],
            },
          ],
        } as SpeciesData,
      ],
      backgrounds: [],
      deities: [],
      beasts: [],
      conditions: [],
      books: [{ key: "XPHB", name: "Player's Handbook", ruleset: "2024" }],
      feats: [],
      weapons: [],
      armor: [],
      alignments: [],
      languages: [],
      magicItems: [],
      genericVariants: [],
      adventuringGear: [],
      ammunitionStats: {
        arrows: {
          packSize: 20,
          packWeightLb: 1,
          packCost: { amount: 1, denomination: "gp" },
          storage: "Quiver",
        },
      },
      toolStats: {
        "thieves-tools": { id: "thieves-tools", category: "other", ability: "dex" },
      },
      catalogStrings: [
        {
          entity_type: "spells",
          entity_key: "acid-arrow",
          field: "name",
          locale: "en",
          text: "Acid Arrow (display)",
        },
      ],
    };

    installCatalog(payload);

    expect(CLASSES[0]?.key).toBe("fighter");
    expect(SPELLS[0]?.key).toBe("acid-arrow");
    expect(SPECIES[0]?.features).toHaveLength(1);

    const messages = getMessages("en");
    expect(messages["catalog.spells.acid-arrow.name"]).toBe("Acid Arrow (display)");
  });

  it("indexes ui strings for t() and catalog.* lookups", () => {
    installCatalog({
      ...buildFixtureCatalogPayload(),
      catalogStrings: [
        {
          entity_type: "ui",
          entity_key: "app",
          field: "tab.items",
          locale: "en",
          text: "Items",
        },
      ],
    });

    const messages = getMessages("en");
    expect(messages["app.tab.items"]).toBe("Items");
    expect(messages["catalog.ui.app.tab.items"]).toBe("Items");

    installCatalog(buildFixtureCatalogPayload());
  });
});
