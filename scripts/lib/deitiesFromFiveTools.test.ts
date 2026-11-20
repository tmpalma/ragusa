import { describe, expect, it } from "vitest";
import {
  alignmentLettersToKey,
  buildDeityCatalog,
  normalizePantheon,
  type RawFiveToolsDeity,
} from "./deitiesFromFiveTools.js";

describe("deitiesFromFiveTools", () => {
  it("normalizes pantheon aliases", () => {
    expect(normalizePantheon("Forgotten Realms")).toBe("Faerûnian");
    expect(normalizePantheon("Gnome")).toBe("Gnomish");
    expect(normalizePantheon("Elven")).toBe("Elven");
  });

  it("maps alignment letter arrays to catalog keys", () => {
    expect(alignmentLettersToKey(["C", "G"])).toBe("chaotic-good");
    expect(alignmentLettersToKey(["N"])).toBe("neutral");
    expect(alignmentLettersToKey(["L", "E"])).toBe("lawful-evil");
  });

  it("merges Solonor reprints and keeps richer fields", () => {
    const catalog = buildDeityCatalog([
      {
        name: "Solonor Thelandira",
        source: "MTF",
        pantheon: "Elven",
        alignment: ["C", "G"],
        category: "The Seldarine",
        domains: ["Nature", "War"],
        province: "Archery, hunting, survival",
        symbol: "Silver arrow with green fletching",
      },
      {
        name: "Solonor Thelandira",
        source: "SCAG",
        pantheon: "Elven",
        alignment: ["C", "G"],
        title: "God of archery",
        domains: ["War"],
        symbol: "Silver arrow with green fletching",
      },
    ]);

    expect(catalog).toHaveLength(1);
    expect(catalog[0]).toMatchObject({
      key: "solonor-thelandira",
      name: "Solonor Thelandira",
      pantheon: "Elven",
      title: "God of archery",
      category: "The Seldarine",
      portfolio: "Archery, hunting, survival",
      alignmentKey: "chaotic-good",
      domains: ["Nature", "War"],
      symbol: "Silver arrow with green fletching",
      book: "MTF",
    });
  });

  it("keeps Asmodeus separate per pantheon with disambiguated keys", () => {
    const catalog = buildDeityCatalog([
      {
        name: "Asmodeus",
        source: "DMG",
        pantheon: "Dawn War",
        alignment: ["L", "E"],
        title: "God of tyranny",
      },
      {
        name: "Asmodeus",
        source: "EGW",
        pantheon: "Exandria",
        alignment: ["L", "E"],
        title: "the Lord of the Nine Hells",
      },
      {
        name: "Asmodeus",
        source: "FRHoF",
        pantheon: "Faerûnian",
        alignment: ["L", "E"],
        title: "Lord of the Nine Hells",
      },
    ]);

    expect(catalog).toHaveLength(3);
    expect(catalog.map((d) => d.key).sort()).toEqual([
      "asmodeus-dawn-war",
      "asmodeus-exandria",
      "asmodeus-faer-nian",
    ]);
  });

  it("merges Forgotten Realms and Faerûnian pantheon reprints", () => {
    const catalog = buildDeityCatalog([
      {
        name: "Azuth",
        source: "PHB",
        pantheon: "Forgotten Realms",
        alignment: ["L", "N"],
        title: "God of wizards",
      },
      {
        name: "Azuth",
        source: "FRHoF",
        pantheon: "Faerûnian",
        title: "God of wizards and mages",
      },
    ]);

    expect(catalog).toHaveLength(1);
    expect(catalog[0].pantheon).toBe("Faerûnian");
    expect(catalog[0].book).toBe("FRHoF");
    expect(catalog[0].alignmentKey).toBe("lawful-neutral");
  });

  it("marks srd when any merged reprint is srd", () => {
    const catalog = buildDeityCatalog([
      { name: "Anubis", source: "PHB", pantheon: "Egyptian", srd: true, title: "God of judgment" },
      { name: "Anubis", source: "SCAG", pantheon: "Egyptian", title: "God of the afterlife" },
    ] as RawFiveToolsDeity[]);

    expect(catalog).toHaveLength(1);
    expect(catalog[0].srd).toBe(true);
  });
});
