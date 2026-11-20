import { describe, expect, it } from "vitest";
import { ARTIFICER_PLANS } from "./artificerPlanCatalog";
import {
  ALIGNMENTS,
  BACKGROUNDS,
  BEASTS,
  CONDITIONS,
  BOOKS,
  CLASSES,
  DEITIES,
  FEATS,
  GENERIC_VARIANTS,
  SPECIES,
  SPELLS,
  SUBCLASSES,
  ARMOR,
  WEAPONS,
} from "./index";
import type { BookData, CatalogSource } from "./types";

const BOOK_KEYS = new Set(BOOKS.map((book) => book.key));

function assertCatalogSource(entity: CatalogSource & { key: string }, label: string) {
  expect(typeof entity.srd, `${label} ${entity.key} srd`).toBe("boolean");
  expect(BOOK_KEYS.has(entity.book), `${label} ${entity.key} book ${entity.book}`).toBe(true);
}

describe("catalog origin metadata", () => {
  it("defines ruleset for every book", () => {
    for (const book of BOOKS) {
      expect(["2014", "2024"]).toContain(book.ruleset);
    }
  });

  it("stamps srd and book on every selectable catalog row", () => {
    for (const spell of SPELLS) assertCatalogSource(spell, "spell");
    for (const feat of FEATS) assertCatalogSource(feat, "feat");
    for (const species of SPECIES) assertCatalogSource(species, "species");
    for (const cls of CLASSES) assertCatalogSource(cls, "class");
    for (const subclass of SUBCLASSES) assertCatalogSource(subclass, "subclass");
    for (const background of BACKGROUNDS) assertCatalogSource(background, "background");
    for (const beast of BEASTS) assertCatalogSource(beast, "beast");
    for (const condition of CONDITIONS) assertCatalogSource(condition, "condition");
    for (const weapon of WEAPONS) assertCatalogSource(weapon, "weapon");
    for (const armor of ARMOR) assertCatalogSource(armor, "armor");
    for (const alignment of ALIGNMENTS) assertCatalogSource(alignment, "alignment");
    for (const deity of DEITIES) assertCatalogSource(deity, "deity");
    for (const plan of ARTIFICER_PLANS) {
      expect(typeof plan.srd, `artificerPlan ${plan.key} srd`).toBe("boolean");
      expect(plan.book.length, `artificerPlan ${plan.key} book`).toBeGreaterThan(0);
    }
    for (const variant of GENERIC_VARIANTS) assertCatalogSource(variant, "genericVariant");
  });

  it("includes representative origin fixtures", () => {
    expect(CLASSES.find((cls) => cls.key === "wizard")).toMatchObject({ srd: true, book: "XPHB" });
    expect(SPECIES.find((species) => species.key === "human")).toMatchObject({ srd: true, book: "XPHB" });
    expect(SUBCLASSES.find((subclass) => subclass.key === "life-domain")).toMatchObject({ srd: true, book: "XPHB" });
    expect(SUBCLASSES.find((subclass) => subclass.key === "college-of-lore")).toMatchObject({
      srd: true,
      book: "XPHB",
    });
    expect(BEASTS[0]).toMatchObject({ srd: true, book: "XMM" });
    expect(BACKGROUNDS.find((bg) => bg.key === "acolyte")).toMatchObject({ srd: true, book: "XPHB" });
    expect(DEITIES.some((deity) => deity.srd && deity.book === "PHB")).toBe(true);
    expect(DEITIES.some((deity) => deity.srd && deity.book === "FRHoF")).toBe(true);
    expect(BOOKS.find((book) => book.key === "XPHB")?.name).toBe("Player's Handbook (2024)");
    expect(GENERIC_VARIANTS.find((variant) => variant.key === "weapon-plus-1")).toMatchObject({
      srd: true,
      book: "XDMG",
    });
    expect(GENERIC_VARIANTS.find((variant) => variant.key === "armor-plus-1")).toMatchObject({
      srd: true,
      book: "XDMG",
      appliesTo: "armor",
    });
    expect(GENERIC_VARIANTS.find((variant) => variant.key === "ammunition-plus-1")).toMatchObject({
      srd: true,
      book: "XDMG",
      appliesTo: "ammunition",
    });
  });

  it("uses unique deity keys", () => {
    const keys = DEITIES.map((deity) => deity.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("seeds 2014 and 2024 book metadata without 2014 content", () => {
    const byKey = Object.fromEntries(BOOKS.map((book: BookData) => [book.key, book])) as Record<string, BookData>;
    expect(byKey.PHB.ruleset).toBe("2014");
    expect(byKey.XPHB.ruleset).toBe("2024");
    expect(byKey.XDMG.ruleset).toBe("2024");
    expect(byKey.XMM.ruleset).toBe("2024");
    expect(byKey.FRHoF.ruleset).toBe("2024");
    expect(Object.keys(byKey).sort()).toEqual(["FRHoF", "PHB", "XDMG", "XMM", "XPHB"]);
  });
});
