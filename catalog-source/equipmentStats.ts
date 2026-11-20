import type { CurrencyDenomination } from "../src/data/types.js";

export interface ItemCost {
  amount: number;
  denomination: CurrencyDenomination;
}

export interface EquipmentStats {
  weightLb: number;
  cost: ItemCost;
}

/** SRD 5.2 weight and cost for weapons. Open5e does not expose these fields. */
export const WEAPON_STATS: Record<string, EquipmentStats> = {
  battleaxe: { weightLb: 4, cost: { amount: 10, denomination: "gp" } },
  blowgun: { weightLb: 1, cost: { amount: 10, denomination: "gp" } },
  club: { weightLb: 2, cost: { amount: 1, denomination: "sp" } },
  dagger: { weightLb: 1, cost: { amount: 2, denomination: "gp" } },
  dart: { weightLb: 0.25, cost: { amount: 5, denomination: "cp" } },
  flail: { weightLb: 2, cost: { amount: 10, denomination: "gp" } },
  glaive: { weightLb: 6, cost: { amount: 20, denomination: "gp" } },
  greataxe: { weightLb: 7, cost: { amount: 30, denomination: "gp" } },
  greatclub: { weightLb: 10, cost: { amount: 2, denomination: "sp" } },
  greatsword: { weightLb: 6, cost: { amount: 50, denomination: "gp" } },
  halberd: { weightLb: 6, cost: { amount: 20, denomination: "gp" } },
  "hand-crossbow": { weightLb: 3, cost: { amount: 75, denomination: "gp" } },
  handaxe: { weightLb: 2, cost: { amount: 5, denomination: "gp" } },
  "heavy-crossbow": { weightLb: 18, cost: { amount: 50, denomination: "gp" } },
  javelin: { weightLb: 2, cost: { amount: 5, denomination: "sp" } },
  lance: { weightLb: 6, cost: { amount: 10, denomination: "gp" } },
  "light-crossbow": { weightLb: 5, cost: { amount: 25, denomination: "gp" } },
  "light-hammer": { weightLb: 2, cost: { amount: 2, denomination: "gp" } },
  longbow: { weightLb: 2, cost: { amount: 50, denomination: "gp" } },
  longsword: { weightLb: 3, cost: { amount: 15, denomination: "gp" } },
  mace: { weightLb: 4, cost: { amount: 5, denomination: "gp" } },
  maul: { weightLb: 10, cost: { amount: 10, denomination: "gp" } },
  morningstar: { weightLb: 4, cost: { amount: 15, denomination: "gp" } },
  musket: { weightLb: 10, cost: { amount: 500, denomination: "gp" } },
  pike: { weightLb: 18, cost: { amount: 5, denomination: "gp" } },
  pistol: { weightLb: 3, cost: { amount: 250, denomination: "gp" } },
  quarterstaff: { weightLb: 4, cost: { amount: 2, denomination: "sp" } },
  rapier: { weightLb: 2, cost: { amount: 25, denomination: "gp" } },
  scimitar: { weightLb: 3, cost: { amount: 25, denomination: "gp" } },
  shortbow: { weightLb: 2, cost: { amount: 25, denomination: "gp" } },
  shortsword: { weightLb: 2, cost: { amount: 10, denomination: "gp" } },
  sickle: { weightLb: 2, cost: { amount: 1, denomination: "gp" } },
  sling: { weightLb: 0, cost: { amount: 1, denomination: "sp" } },
  spear: { weightLb: 3, cost: { amount: 1, denomination: "gp" } },
  trident: { weightLb: 4, cost: { amount: 5, denomination: "gp" } },
  "war-pick": { weightLb: 2, cost: { amount: 5, denomination: "gp" } },
  warhammer: { weightLb: 2, cost: { amount: 15, denomination: "gp" } },
  whip: { weightLb: 3, cost: { amount: 2, denomination: "gp" } },
};

/** SRD 5.2 weight and cost for armor. Open5e does not expose these fields. */
export const ARMOR_STATS: Record<string, EquipmentStats> = {
  breastplate: { weightLb: 20, cost: { amount: 400, denomination: "gp" } },
  "chain-mail": { weightLb: 55, cost: { amount: 75, denomination: "gp" } },
  "chain-shirt": { weightLb: 20, cost: { amount: 50, denomination: "gp" } },
  "half-plate-armor": { weightLb: 40, cost: { amount: 750, denomination: "gp" } },
  "hide-armor": { weightLb: 12, cost: { amount: 10, denomination: "gp" } },
  "leather-armor": { weightLb: 10, cost: { amount: 10, denomination: "gp" } },
  "padded-armor": { weightLb: 8, cost: { amount: 5, denomination: "gp" } },
  "plate-armor": { weightLb: 65, cost: { amount: 1500, denomination: "gp" } },
  "ring-mail": { weightLb: 40, cost: { amount: 30, denomination: "gp" } },
  "scale-mail": { weightLb: 45, cost: { amount: 50, denomination: "gp" } },
  shield: { weightLb: 6, cost: { amount: 10, denomination: "gp" } },
  "splint-armor": { weightLb: 60, cost: { amount: 200, denomination: "gp" } },
  "studded-leather-armor": { weightLb: 13, cost: { amount: 45, denomination: "gp" } },
};
