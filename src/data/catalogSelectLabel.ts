import { BOOKS, findByKey } from "./index";
import type { CatalogSource } from "./types";

export function bookDisplayName(bookKey: string): string {
  return findByKey(BOOKS, bookKey)?.name ?? bookKey;
}

export function catalogSelectLabel(name: string, source: CatalogSource, srdSuffix = " (SRD)"): string {
  return source.srd ? `${name}${srdSuffix}` : name;
}

export function catalogGroupLabel(bookKey: string): string {
  return bookDisplayName(bookKey);
}
