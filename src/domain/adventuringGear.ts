import { adjustPackRemainingForQuantityChange, isGearPack } from "./gearPacks";
import { equipmentPickCatalogKeys } from "./equipmentPicks";

export interface AdventuringGearEntry {
  key: string;
  quantity: number;
  /** Remaining expendable supplies inside an adventuring pack; omit when fully stocked. */
  packRemaining?: Record<string, number>;
}

export interface StructuredGearDescParts {
  ability?: string;
  utilize?: string;
  craft?: string;
}

export function adventuringGearCatalogKeys(): string[] {
  return equipmentPickCatalogKeys();
}

export function selectedAdventuringGearKeys(entries: AdventuringGearEntry[]): string[] {
  return entries.map((entry) => entry.key);
}

export function adventuringGearQuantity(entries: AdventuringGearEntry[], itemKey: string): number {
  return entries.find((entry) => entry.key === itemKey)?.quantity ?? 0;
}

export function addAdventuringGear(current: AdventuringGearEntry[], itemKey: string): AdventuringGearEntry[] | null {
  if (!adventuringGearCatalogKeys().includes(itemKey)) return null;
  if (current.some((entry) => entry.key === itemKey)) return null;
  return [...current, { key: itemKey, quantity: 1 }];
}

export function setAdventuringGearQuantity(
  current: AdventuringGearEntry[],
  itemKey: string,
  quantity: number,
): AdventuringGearEntry[] | null {
  if (!adventuringGearCatalogKeys().includes(itemKey)) return null;
  const index = current.findIndex((entry) => entry.key === itemKey);
  if (index < 0) return null;

  const nextQuantity = Math.max(0, Math.floor(quantity));
  if (nextQuantity === 0) {
    return current.filter((entry) => entry.key !== itemKey);
  }

  return current.map((entry, entryIndex) => {
    if (entryIndex !== index) return entry;
    if (isGearPack(entry.key)) {
      return adjustPackRemainingForQuantityChange(entry, nextQuantity);
    }
    return { ...entry, quantity: nextQuantity };
  });
}

export function removeAdventuringGear(current: AdventuringGearEntry[], itemKey: string): AdventuringGearEntry[] {
  return current.filter((entry) => entry.key !== itemKey);
}

/** Ensures attuned wondrous keys appear in carried gear (legacy saves attuned without inventory). */
export function mergeAttunedKeysIntoAdventuringGear(
  adventuringGear: AdventuringGearEntry[],
  attunedMagicItemKeys: readonly string[],
): AdventuringGearEntry[] {
  const carried = new Set(adventuringGear.map((entry) => entry.key));
  const catalogKeys = new Set(adventuringGearCatalogKeys());
  let next = adventuringGear;
  for (const key of attunedMagicItemKeys) {
    if (carried.has(key) || !catalogKeys.has(key)) continue;
    next = [...next, { key, quantity: 1 }];
    carried.add(key);
  }
  return next;
}

const ARTISAN_DESC_LINE =
  /^\-\s*\*\*(Ability|Utilize|Craft):?\.\*\*\s*(.+)$/i;

export function parseStructuredGearDesc(desc: string): StructuredGearDescParts {
  const parts: StructuredGearDescParts = {};

  for (const line of desc.split("\n")) {
    const match = line.trim().match(ARTISAN_DESC_LINE);
    if (!match) continue;
    const [, label, value] = match;
    const normalized = label.toLowerCase();
    if (normalized === "ability") parts.ability = value.trim();
    if (normalized === "utilize") parts.utilize = value.trim();
    if (normalized === "craft") parts.craft = value.trim();
  }

  return parts;
}

export function hasStructuredGearDesc(desc: string): boolean {
  const parts = parseStructuredGearDesc(desc);
  return Boolean(parts.ability || parts.utilize || parts.craft);
}
