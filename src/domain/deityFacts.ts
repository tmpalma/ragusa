import { ALIGNMENTS, findByKey } from "../data";
import type { DeityData } from "../data/types";

export interface DeityFactRow {
  labelKey: string;
  value: string;
}

function slugifyPantheon(pantheon: string): string {
  return pantheon
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function pantheonLocaleKey(pantheon: string): string {
  return `catalog.deities.pantheon.${slugifyPantheon(pantheon)}`;
}

function resolveEntityField(
  tEntity: (catalog: string, key: string, field: string, fallback?: string) => string,
  catalog: string,
  entityKey: string,
  field: string,
  fallback?: string,
): string | undefined {
  const localeKey = `${catalog}.${entityKey}.${field}`;
  const value = tEntity(catalog, entityKey, field, fallback);
  if (!value || value === localeKey) return undefined;
  return value;
}

export function buildDeityFactRows(
  deity: DeityData,
  t: (key: string, params?: Record<string, string | number>, fallback?: string) => string,
  tEntity: (catalog: string, key: string, field: string, fallback?: string) => string,
): DeityFactRow[] {
  const rows: DeityFactRow[] = [];

  const title = resolveEntityField(tEntity, "catalog.deities", deity.key, "title", deity.title);
  const altNames = resolveEntityField(
    tEntity,
    "catalog.deities",
    deity.key,
    "altNames",
    deity.altNames?.join(", "),
  );
  const titles = [title, altNames].filter(Boolean).join("; ");
  if (titles) rows.push({ labelKey: "character.deityFact.titles", value: titles });

  const pantheonLabel = t(pantheonLocaleKey(deity.pantheon), undefined, deity.pantheon);
  const category = resolveEntityField(tEntity, "catalog.deities", deity.key, "category", deity.category);
  const pantheonValue = category ? `${pantheonLabel} (${category})` : pantheonLabel;
  rows.push({ labelKey: "character.deityFact.pantheon", value: pantheonValue });

  if (deity.alignmentKey) {
    const alignment = findByKey(ALIGNMENTS, deity.alignmentKey);
    const alignmentName =
      resolveEntityField(
        tEntity,
        "catalog.alignments",
        deity.alignmentKey,
        "name",
        alignment?.name ?? deity.alignmentKey,
      ) ?? deity.alignmentKey;
    rows.push({ labelKey: "character.deityFact.alignment", value: alignmentName });
  }

  const symbol = resolveEntityField(tEntity, "catalog.deities", deity.key, "symbol", deity.symbol);
  if (symbol) rows.push({ labelKey: "character.deityFact.symbol", value: symbol });

  const portfolio = resolveEntityField(tEntity, "catalog.deities", deity.key, "portfolio", deity.portfolio);
  if (portfolio) rows.push({ labelKey: "character.deityFact.portfolio", value: portfolio });

  if (deity.domains?.length) {
    rows.push({ labelKey: "character.deityFact.domains", value: deity.domains.join(", ") });
  }

  const worshipers = resolveEntityField(tEntity, "catalog.deities", deity.key, "worshipers", deity.worshipers);
  if (worshipers) rows.push({ labelKey: "character.deityFact.worshipers", value: worshipers });

  const plane = resolveEntityField(tEntity, "catalog.deities", deity.key, "plane", deity.plane);
  if (plane) rows.push({ labelKey: "character.deityFact.plane", value: plane });

  return rows;
}
