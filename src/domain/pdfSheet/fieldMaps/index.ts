import { EN_FIELD_MAP } from "./en";
import { PT_BR_FIELD_MAP } from "./pt-BR";
import type { PdfFieldMap, PdfLocale } from "../types";

export function fieldMapForLocale(locale: string): PdfFieldMap {
  return locale === "pt-BR" ? PT_BR_FIELD_MAP : EN_FIELD_MAP;
}

export function allMappedFieldNames(locale: PdfLocale): string[] {
  const map = fieldMapForLocale(locale);
  return Object.values(map).map((binding) => binding.field);
}
