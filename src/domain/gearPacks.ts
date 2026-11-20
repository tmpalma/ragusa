import { ADVENTURING_GEAR, findByKey } from "../data";
import type { AdventuringGearEntry } from "./adventuringGear";
import { costToCopper } from "./carryingCapacity";

export interface GearPackContent {
  itemKey: string;
  quantity: number;
}

/** Consumed supplies and one-shot bags (ball bearings, caltrops) tracked per pack. */
export const EXPENDABLE_GEAR_KEYS = new Set([
  "oil",
  "rations",
  "torch",
  "candle",
  "paper",
  "parchment",
  "holy-water",
  "ball-bearings",
  "caltrops",
]);

/** SRD adventuring pack contents (hand-maintained from XPHB pack lists). */
export const GEAR_PACKS: Record<string, GearPackContent[]> = {
  "burglars-pack": [
    { itemKey: "backpack", quantity: 1 },
    { itemKey: "ball-bearings", quantity: 1 },
    { itemKey: "bell", quantity: 1 },
    { itemKey: "candle", quantity: 10 },
    { itemKey: "crowbar", quantity: 1 },
    { itemKey: "hooded-lantern", quantity: 1 },
    { itemKey: "oil", quantity: 7 },
    { itemKey: "rations", quantity: 5 },
    { itemKey: "rope", quantity: 1 },
    { itemKey: "tinderbox", quantity: 1 },
    { itemKey: "waterskin", quantity: 1 },
  ],
  "diplomats-pack": [
    { itemKey: "chest", quantity: 1 },
    { itemKey: "fine-clothes", quantity: 1 },
    { itemKey: "ink", quantity: 1 },
    { itemKey: "ink-pen", quantity: 5 },
    { itemKey: "lamp", quantity: 1 },
    { itemKey: "map-or-scroll-case", quantity: 2 },
    { itemKey: "oil", quantity: 4 },
    { itemKey: "paper", quantity: 5 },
    { itemKey: "parchment", quantity: 5 },
    { itemKey: "perfume", quantity: 1 },
    { itemKey: "tinderbox", quantity: 1 },
  ],
  "dungeoneers-pack": [
    { itemKey: "backpack", quantity: 1 },
    { itemKey: "caltrops", quantity: 1 },
    { itemKey: "crowbar", quantity: 1 },
    { itemKey: "oil", quantity: 2 },
    { itemKey: "rations", quantity: 10 },
    { itemKey: "rope", quantity: 1 },
    { itemKey: "tinderbox", quantity: 1 },
    { itemKey: "torch", quantity: 10 },
    { itemKey: "waterskin", quantity: 1 },
  ],
  "entertainers-pack": [
    { itemKey: "backpack", quantity: 1 },
    { itemKey: "bedroll", quantity: 1 },
    { itemKey: "bell", quantity: 1 },
    { itemKey: "bullseye-lantern", quantity: 1 },
    { itemKey: "costume", quantity: 3 },
    { itemKey: "mirror", quantity: 1 },
    { itemKey: "oil", quantity: 8 },
    { itemKey: "rations", quantity: 9 },
    { itemKey: "tinderbox", quantity: 1 },
    { itemKey: "waterskin", quantity: 1 },
  ],
  "explorers-pack": [
    { itemKey: "backpack", quantity: 1 },
    { itemKey: "bedroll", quantity: 1 },
    { itemKey: "oil", quantity: 2 },
    { itemKey: "rations", quantity: 10 },
    { itemKey: "rope", quantity: 1 },
    { itemKey: "tinderbox", quantity: 1 },
    { itemKey: "torch", quantity: 10 },
    { itemKey: "waterskin", quantity: 1 },
  ],
  "priests-pack": [
    { itemKey: "backpack", quantity: 1 },
    { itemKey: "blanket", quantity: 1 },
    { itemKey: "holy-water", quantity: 1 },
    { itemKey: "lamp", quantity: 1 },
    { itemKey: "rations", quantity: 7 },
    { itemKey: "robe", quantity: 1 },
    { itemKey: "tinderbox", quantity: 1 },
  ],
  "scholars-pack": [
    { itemKey: "backpack", quantity: 1 },
    { itemKey: "book", quantity: 1 },
    { itemKey: "ink", quantity: 1 },
    { itemKey: "ink-pen", quantity: 1 },
    { itemKey: "lamp", quantity: 1 },
    { itemKey: "oil", quantity: 10 },
    { itemKey: "parchment", quantity: 10 },
    { itemKey: "tinderbox", quantity: 1 },
  ],
};

export function isGearPack(key: string): boolean {
  return key in GEAR_PACKS;
}

export function gearPackContents(packKey: string): GearPackContent[] {
  return GEAR_PACKS[packKey] ?? [];
}

export function packExpendableContents(packKey: string): GearPackContent[] {
  return gearPackContents(packKey).filter((content) => EXPENDABLE_GEAR_KEYS.has(content.itemKey));
}

export function packContentMax(packKey: string, itemKey: string, packQuantity: number): number {
  const content = gearPackContents(packKey).find((entry) => entry.itemKey === itemKey);
  if (!content) return 0;
  return content.quantity * packQuantity;
}

/** Remaining count per expendable; omitted or partial map means full stock. */
export function resolvedPackRemaining(entry: AdventuringGearEntry): Record<string, number> {
  if (!isGearPack(entry.key)) return {};
  const remaining: Record<string, number> = {};
  for (const content of packExpendableContents(entry.key)) {
    const max = packContentMax(entry.key, content.itemKey, entry.quantity);
    const stored = entry.packRemaining?.[content.itemKey];
    remaining[content.itemKey] =
      stored != null && Number.isFinite(stored) ? Math.min(Math.max(0, Math.floor(stored)), max) : max;
  }
  return remaining;
}

export function isPackFullyStocked(entry: AdventuringGearEntry): boolean {
  if (!isGearPack(entry.key)) return true;
  const remaining = resolvedPackRemaining(entry);
  for (const content of packExpendableContents(entry.key)) {
    const max = packContentMax(entry.key, content.itemKey, entry.quantity);
    if ((remaining[content.itemKey] ?? max) !== max) return false;
  }
  return true;
}

function compactPackRemaining(entry: AdventuringGearEntry): AdventuringGearEntry {
  if (isPackFullyStocked(entry)) {
    const { packRemaining: _removed, ...rest } = entry;
    return rest;
  }
  return {
    ...entry,
    packRemaining: resolvedPackRemaining(entry),
  };
}

export function packConsumedWeightLb(entry: AdventuringGearEntry): number {
  if (!isGearPack(entry.key)) return 0;
  const remaining = resolvedPackRemaining(entry);
  let consumed = 0;
  for (const content of packExpendableContents(entry.key)) {
    const max = packContentMax(entry.key, content.itemKey, entry.quantity);
    const left = remaining[content.itemKey] ?? max;
    const spent = max - left;
    if (spent <= 0) continue;
    const item = findByKey(ADVENTURING_GEAR, content.itemKey);
    if (item) consumed += item.weightLb * spent;
  }
  return consumed;
}

export function packConsumedValueCp(entry: AdventuringGearEntry): number {
  if (!isGearPack(entry.key)) return 0;
  const remaining = resolvedPackRemaining(entry);
  let consumed = 0;
  for (const content of packExpendableContents(entry.key)) {
    const max = packContentMax(entry.key, content.itemKey, entry.quantity);
    const left = remaining[content.itemKey] ?? max;
    const spent = max - left;
    if (spent <= 0) continue;
    const item = findByKey(ADVENTURING_GEAR, content.itemKey);
    if (item) consumed += costToCopper(item.cost) * spent;
  }
  return consumed;
}

export function adventuringGearEntryWeightLb(entry: AdventuringGearEntry, catalogWeightLb: number): number {
  const base = catalogWeightLb * entry.quantity;
  if (!isGearPack(entry.key)) return base;
  return Math.max(0, base - packConsumedWeightLb(entry));
}

export function adventuringGearEntryValueCp(entry: AdventuringGearEntry, catalogValueCpPerUnit: number): number {
  const base = catalogValueCpPerUnit * entry.quantity;
  if (!isGearPack(entry.key)) return base;
  return Math.max(0, base - packConsumedValueCp(entry));
}

export function setPackContentRemaining(
  entry: AdventuringGearEntry,
  itemKey: string,
  value: number,
): AdventuringGearEntry | null {
  if (!isGearPack(entry.key)) return null;
  if (!packExpendableContents(entry.key).some((content) => content.itemKey === itemKey)) return null;

  const max = packContentMax(entry.key, itemKey, entry.quantity);
  const nextValue = Math.min(Math.max(0, Math.floor(value)), max);
  const remaining = resolvedPackRemaining(entry);
  remaining[itemKey] = nextValue;

  return compactPackRemaining({ ...entry, packRemaining: remaining });
}

export function adjustPackRemainingForQuantityChange(
  entry: AdventuringGearEntry,
  nextQuantity: number,
): AdventuringGearEntry {
  if (!isGearPack(entry.key) || nextQuantity <= 0) return entry;

  const currentQuantity = entry.quantity;
  if (currentQuantity === nextQuantity) return entry;

  const remaining = resolvedPackRemaining(entry);
  const adjusted: Record<string, number> = {};

  for (const content of packExpendableContents(entry.key)) {
    const currentMax = packContentMax(entry.key, content.itemKey, currentQuantity);
    const nextMax = packContentMax(entry.key, content.itemKey, nextQuantity);
    const currentRemaining = remaining[content.itemKey] ?? currentMax;

    if (nextQuantity > currentQuantity) {
      adjusted[content.itemKey] = currentRemaining + content.quantity * (nextQuantity - currentQuantity);
    } else {
      adjusted[content.itemKey] = Math.min(currentRemaining, nextMax);
    }
  }

  return compactPackRemaining({ ...entry, quantity: nextQuantity, packRemaining: adjusted });
}
