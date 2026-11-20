import { describe, expect, it } from "vitest";
import { DEITIES, findByKey } from "../data";
import type { DeityData } from "../data/types";
import { createTranslator } from "../i18n/loadLocales";
import { buildDeityFactRows } from "./deityFacts";

const FIXTURE_DEITY: DeityData = {
  key: "fixture-deity",
  name: "Fixture Deity",
  pantheon: "Celtic",
  title: "Fixture Title",
  alignmentKey: "neutral-good",
  domains: ["Nature"],
  symbol: "A longbow",
  portfolio: "Archery, hunting, survival",
  srd: true,
  book: "PHB",
};

const t = (key: string, _params?: Record<string, string | number>, fallback?: string) => fallback ?? key;
const tEntity = (_catalog: string, _key: string, _field: string, fallback?: string) => fallback ?? "";

const tEntityLikeApp = (catalog: string, key: string, field: string, fallback?: string) =>
  createTranslator("en")(`${catalog}.${key}.${field}`, undefined, fallback);

describe("buildDeityFactRows", () => {
  it("includes populated deity facts", () => {
    const rows = buildDeityFactRows(FIXTURE_DEITY, t, tEntity);
    expect(rows.map((row) => row.labelKey)).toEqual([
      "character.deityFact.titles",
      "character.deityFact.pantheon",
      "character.deityFact.alignment",
      "character.deityFact.symbol",
      "character.deityFact.portfolio",
      "character.deityFact.domains",
    ]);
    expect(rows.find((row) => row.labelKey === "character.deityFact.domains")?.value).toContain("Nature");
    expect(rows.find((row) => row.labelKey === "character.deityFact.portfolio")?.value).toBe(
      "Archery, hunting, survival",
    );
  });

  it("omits portfolio when the deity has no portfolio data", () => {
    const deity = findByKey(DEITIES, "anubis");
    expect(deity).toBeTruthy();
    expect(deity!.portfolio).toBeUndefined();
    const rows = buildDeityFactRows(deity!, t, tEntityLikeApp);
    expect(rows.some((row) => row.labelKey === "character.deityFact.portfolio")).toBe(false);
    for (const row of rows) {
      expect(row.value).not.toMatch(/^catalog\./);
    }
  });
});
