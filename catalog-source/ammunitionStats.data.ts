import type { CurrencyDenomination, ItemCost } from "../src/data/types.js";

export type AmmoType = "arrows" | "bolts" | "needles" | "sling-bullets" | "firearm-bullets";

export interface AmmunitionPackStats {
  /** Pieces per purchase unit (SRD 5.2). */
  packSize: number;
  packWeightLb: number;
  packCost: ItemCost;
  /** Typical storage container; display only. */
  storage: string;
}

/** SRD 5.2 ammunition table. Pack size is how you buy; remaining is tracked in pieces. */
export const AMMUNITION_STATS: Record<AmmoType, AmmunitionPackStats> = {
  arrows: {
    packSize: 20,
    packWeightLb: 1,
    packCost: { amount: 1, denomination: "gp" },
    storage: "Quiver",
  },
  bolts: {
    packSize: 20,
    packWeightLb: 1.5,
    packCost: { amount: 1, denomination: "gp" },
    storage: "Case",
  },
  needles: {
    packSize: 50,
    packWeightLb: 1,
    packCost: { amount: 1, denomination: "gp" },
    storage: "Pouch",
  },
  "sling-bullets": {
    packSize: 20,
    packWeightLb: 1.5,
    packCost: { amount: 4, denomination: "cp" },
    storage: "Pouch",
  },
  "firearm-bullets": {
    packSize: 10,
    packWeightLb: 2,
    packCost: { amount: 3, denomination: "gp" },
    storage: "Pouch",
  },
};

export const AMMO_TYPES: AmmoType[] = [
  "arrows",
  "bolts",
  "needles",
  "sling-bullets",
  "firearm-bullets",
];

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
