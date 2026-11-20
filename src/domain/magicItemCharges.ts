import { MAGIC_ITEMS, findByKey } from "../data";

/** Fixed charge pool from catalog desc (e.g. "has 6 charges"); ignores dice pools like "1d3 charges". */
export function magicItemChargeMaxFromDesc(desc: string): number | null {
  const match = desc.match(/\b(?:has|have)\s+(\d+)\s+charges?\b/i);
  if (!match) return null;
  const amount = Number(match[1]);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function magicItemChargeMax(catalogKey: string): number | null {
  const item = findByKey(MAGIC_ITEMS, catalogKey);
  if (!item) return null;
  return magicItemChargeMaxFromDesc(item.desc);
}

export function currentMagicItemCharges(
  remaining: Record<string, number>,
  catalogKey: string,
  max: number,
): number {
  const stored = remaining[catalogKey];
  if (stored == null) return max;
  return Math.min(max, Math.max(0, Math.round(stored)));
}

export function removeMagicItemChargeKey(
  remaining: Record<string, number>,
  itemKey: string,
): Record<string, number> {
  if (!(itemKey in remaining)) return remaining;
  const { [itemKey]: _removed, ...rest } = remaining;
  return rest;
}
