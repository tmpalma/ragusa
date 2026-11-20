import type { CurrencyDenomination, ItemCost } from "./types";

export type AmmoType = "arrows" | "bolts" | "needles" | "sling-bullets" | "firearm-bullets";

export interface AmmunitionPackStats {
  /** Pieces per purchase unit (SRD 5.2). */
  packSize: number;
  packWeightLb: number;
  packCost: ItemCost;
  /** Typical storage container; display only. */
  storage: string;
}

/** Populated from get_catalog() during app boot. */
export const AMMUNITION_STATS = {} as Record<AmmoType, AmmunitionPackStats>;

export const AMMO_TYPES = [] as AmmoType[];

const CP_PER_DENOMINATION: Record<CurrencyDenomination, number> = {
  cp: 1,
  sp: 10,
  ep: 50,
  gp: 100,
  pp: 1000,
};

export function packCostCp(stats: AmmunitionPackStats): number {
  return stats.packCost.amount * CP_PER_DENOMINATION[stats.packCost.denomination];
}

export function unitWeightLb(type: AmmoType): number {
  const stats = AMMUNITION_STATS[type];
  return stats.packWeightLb / stats.packSize;
}

export function unitCostCp(type: AmmoType): number {
  const stats = AMMUNITION_STATS[type];
  return packCostCp(stats) / stats.packSize;
}
