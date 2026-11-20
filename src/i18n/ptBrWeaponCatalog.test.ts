import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, beforeEach } from "vitest";
import { setInstalledCatalogMessages, clearInstalledCatalogMessages } from "./catalogMessages";
import { createTranslator } from "./loadLocales";
import { parseMarkdownMessages } from "./parseMessages";

const CATALOG_ROOT = join(process.cwd(), "catalog-source/locales/pt-BR/catalog");

function ptBrCatalogRowsFromMarkdown(): {
  entity_type: string;
  entity_key: string;
  field: string;
  locale: string;
  text: string;
}[] {
  const weapons = parseMarkdownMessages(readFileSync(join(CATALOG_ROOT, "weapons.md"), "utf8"));
  const rows: ReturnType<typeof ptBrCatalogRowsFromMarkdown> = [];
  for (const [heading, text] of Object.entries(weapons)) {
    const dot = heading.lastIndexOf(".");
    if (dot <= 0) continue;
    rows.push({
      entity_type: "weapons",
      entity_key: heading.slice(0, dot),
      field: heading.slice(dot + 1),
      locale: "pt-BR",
      text,
    });
  }
  return rows;
}

describe("pt-BR weapon catalog strings", () => {
  beforeEach(() => {
    clearInstalledCatalogMessages();
  });

  it("surfaces translated weapon names through tEntity after install", () => {
    setInstalledCatalogMessages([
      ...ptBrCatalogRowsFromMarkdown(),
      {
        entity_type: "genericVariants",
        entity_key: "weapon-plus-1",
        field: "namePrefix",
        locale: "pt-BR",
        text: "+1 ",
      },
    ]);
    const t = createTranslator("pt-BR");
    expect(t("catalog.weapons.longsword.name", undefined, "Longsword")).toBe("Espada longa");
    expect(t("catalog.genericVariants.weapon-plus-1.namePrefix", undefined, "")).toBe("+1 ");
  });
});
