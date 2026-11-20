import type { CatalogSource } from "../../src/data/types.js";

export const SRD_XPHB: CatalogSource = { srd: true, book: "XPHB" };
export const SRD_XMM: CatalogSource = { srd: true, book: "XMM" };
export const SRD_XDMG: CatalogSource = { srd: true, book: "XDMG" };
export const NON_SRD_EFA: CatalogSource = { srd: false, book: "EFA" };
export const NON_SRD_FRHOF: CatalogSource = { srd: false, book: "FRHoF" };
export const NON_SRD_ABH: CatalogSource = { srd: false, book: "ABH" };

export function nonSrd(book: string): CatalogSource {
  return { srd: false, book };
}
