import type { CatalogStringRow } from "../catalog/types";

const messagesByLocale = new Map<string, Record<string, string>>();

function registerCatalogStringRow(catalog: Record<string, string>, row: CatalogStringRow): void {
  catalog[`catalog.${row.entity_type}.${row.entity_key}.${row.field}`] = row.text;
  if (row.entity_type === "ui") {
    catalog[`${row.entity_key}.${row.field}`] = row.text;
  }
}

export function setInstalledCatalogMessages(rows: CatalogStringRow[]): void {
  messagesByLocale.clear();
  for (const row of rows) {
    let catalog = messagesByLocale.get(row.locale);
    if (!catalog) {
      catalog = {};
      messagesByLocale.set(row.locale, catalog);
    }
    registerCatalogStringRow(catalog, row);
  }
}

export function getInstalledCatalogMessages(locale: string): Record<string, string> {
  return messagesByLocale.get(locale) ?? {};
}

export function clearInstalledCatalogMessages(): void {
  messagesByLocale.clear();
}
