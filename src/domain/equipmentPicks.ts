import { ADVENTURING_GEAR, MAGIC_ITEMS, findByKey } from "../data";
import type {
  AdventuringGearCategory,
  AdventuringGearData,
  MagicItemData,
  MagicItemRarity,
} from "../data/types";
import { homebrewRecordAsGear } from "./homebrewGearResolve";
import { getHomebrewItemByGearKey, listRegisteredHomebrewItems } from "./homebrewItemRegistry";
import type { HomebrewItemRecord } from "./homebrewItems";
import { homebrewGearKey } from "./homebrewItems";

export const MAGIC_ITEM_RARITY_ORDER: MagicItemRarity[] = [
  "common",
  "uncommon",
  "rare",
  "very rare",
  "legendary",
  "artifact",
];

export type MagicEquipmentPickFilter =
  | "magic-common"
  | "magic-uncommon"
  | "magic-rare"
  | "magic-very-rare"
  | "magic-legendary"
  | "magic-artifact";

export type EquipmentPickFilter = AdventuringGearCategory | MagicEquipmentPickFilter | "homebrew";

export function isHomebrewEquipmentPickFilter(filterKey: EquipmentPickFilter): filterKey is "homebrew" {
  return filterKey === "homebrew";
}

export function equipmentPickFilterForMagicRarity(rarity: MagicItemRarity): MagicEquipmentPickFilter {
  return `magic-${rarity.replace(/ /g, "-")}` as MagicEquipmentPickFilter;
}

export function isMagicEquipmentPickFilter(filterKey: EquipmentPickFilter): filterKey is MagicEquipmentPickFilter {
  return filterKey.startsWith("magic-");
}

export type EquipmentPickKind = "gear" | "magic";

export interface EquipmentPickCatalogEntry {
  key: string;
  kind: EquipmentPickKind;
  filterKey: EquipmentPickFilter;
  name: string;
  /** Set for magic rows; gear entries omit this. */
  requiresAttunement?: boolean;
}

export function homebrewEquipmentPickEntries(): EquipmentPickCatalogEntry[] {
  return listRegisteredHomebrewItems()
    .map((item) => ({
      key: homebrewGearKey(item.id),
      kind: "gear" as const,
      filterKey: "homebrew" as const,
      name: item.data.name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export type ResolvedEquipmentPick =
  | { kind: "gear"; item: AdventuringGearData }
  | { kind: "magic"; item: MagicItemData }
  | { kind: "homebrew"; record: HomebrewItemRecord; item: AdventuringGearData };

export const EQUIPMENT_PICK_FILTER_ORDER: EquipmentPickFilter[] = [
  "adventuring-gear",
  "artisans-tools",
  "tool",
  "instrument",
  "gaming-set",
  "spellcasting-focus",
  "food-and-drink",
  "tack-and-harness",
  "other",
  "homebrew",
  "magic-common",
  "magic-uncommon",
  "magic-rare",
  "magic-very-rare",
  "magic-legendary",
  "magic-artifact",
];

const GEAR_CATEGORY_ORDER = EQUIPMENT_PICK_FILTER_ORDER.filter(
  (key): key is AdventuringGearCategory =>
    !isMagicEquipmentPickFilter(key) && !isHomebrewEquipmentPickFilter(key),
);

export function nonAttunementMagicItems(): MagicItemData[] {
  return MAGIC_ITEMS.filter((item) => !item.requiresAttunement);
}

export function equipmentPickCatalog(): EquipmentPickCatalogEntry[] {
  const gear = ADVENTURING_GEAR.map((item) => ({
    key: item.key,
    kind: "gear" as const,
    filterKey: item.category,
    name: item.name,
  }));
  const magic = MAGIC_ITEMS.map((item) => ({
    key: item.key,
    kind: "magic" as const,
    filterKey: equipmentPickFilterForMagicRarity(item.rarity),
    name: item.name,
    requiresAttunement: item.requiresAttunement,
  }));
  return [...gear, ...magic];
}

export function mergedEquipmentPickCatalog(): EquipmentPickCatalogEntry[] {
  return [...equipmentPickCatalog(), ...homebrewEquipmentPickEntries()];
}

/** Keys addable as adventuring gear (catalog plus registered homebrew). */
export function equipmentPickCatalogKeys(): string[] {
  return mergedEquipmentPickCatalog().map((entry) => entry.key);
}

/** @deprecated Prefer mergedEquipmentPickCatalog for UI lists. */
export function staticEquipmentPickCatalogKeys(): string[] {
  return equipmentPickCatalog().map((entry) => entry.key);
}

export function equipmentPickCatalogEntry(key: string): EquipmentPickCatalogEntry | undefined {
  return mergedEquipmentPickCatalog().find((entry) => entry.key === key);
}

export function availableEquipmentPickFilters(catalog: EquipmentPickCatalogEntry[]): EquipmentPickFilter[] {
  const present = new Set(catalog.map((entry) => entry.filterKey));
  return EQUIPMENT_PICK_FILTER_ORDER.filter((filterKey) => present.has(filterKey));
}

export function filterEquipmentPickCatalog(
  catalog: EquipmentPickCatalogEntry[],
  pickedKeys: Set<string>,
  filterKey: EquipmentPickFilter | null,
): EquipmentPickCatalogEntry[] {
  return catalog
    .filter((entry) => !pickedKeys.has(entry.key))
    .filter((entry) => filterKey == null || entry.filterKey === filterKey)
    .sort((a, b) => {
      const filterDelta = EQUIPMENT_PICK_FILTER_ORDER.indexOf(a.filterKey) - EQUIPMENT_PICK_FILTER_ORDER.indexOf(b.filterKey);
      if (filterDelta !== 0) return filterDelta;
      if (a.kind !== b.kind) return a.kind === "gear" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

export function resolveEquipmentPick(key: string): ResolvedEquipmentPick | null {
  const homebrew = getHomebrewItemByGearKey(key);
  if (homebrew) {
    const item = homebrewRecordAsGear(homebrew);
    return { kind: "homebrew", record: homebrew, item };
  }
  const gear = findByKey(ADVENTURING_GEAR, key);
  if (gear) return { kind: "gear", item: gear };
  const magic = findByKey(MAGIC_ITEMS, key);
  if (magic) return { kind: "magic", item: magic };
  return null;
}

export function equipmentPickWeightLb(key: string, quantity: number): number {
  const resolved = resolveEquipmentPick(key);
  if (!resolved) return 0;
  return resolved.item.weightLb * quantity;
}

const CP_PER_DENOMINATION = { cp: 1, sp: 10, ep: 50, gp: 100, pp: 1000 };

export function equipmentPickValueCp(key: string, quantity: number): number {
  const resolved = resolveEquipmentPick(key);
  if (resolved?.kind !== "gear" && resolved?.kind !== "homebrew") return 0;
  const item = resolved.item;
  return item.cost.amount * quantity * CP_PER_DENOMINATION[item.cost.denomination];
}

export interface EquipmentPickComboboxOption {
  key: string;
  label: string;
  group?: string;
}

/** Strip a leading +N bonus prefix from magic item display names for search. */
export function equipmentPickLabelForSearch(label: string): string {
  return label.replace(/^\+\d+\s+/u, "").trim();
}

export function equipmentPickLabelMatchesQuery(label: string, query: string, locale = "en"): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;
  const needle = trimmed.toLocaleLowerCase(locale);
  const haystack = label.toLocaleLowerCase(locale);
  if (haystack.includes(needle)) return true;
  return equipmentPickLabelForSearch(label).toLocaleLowerCase(locale).includes(needle);
}

export function filterEquipmentPickComboboxOptionsByQuery(
  options: EquipmentPickComboboxOption[],
  query: string,
  locale = "en",
): EquipmentPickComboboxOption[] {
  const trimmed = query.trim();
  if (!trimmed) return options;
  return options.filter((option) => equipmentPickLabelMatchesQuery(option.label, trimmed, locale));
}

export function sortEquipmentPickComboboxOptionsByLabel(
  options: EquipmentPickComboboxOption[],
  locale = "en",
): EquipmentPickComboboxOption[] {
  const ungrouped = options.filter((option) => !option.group);
  const grouped = options.filter((option) => option.group);
  if (grouped.length === 0) {
    return [...ungrouped].sort((left, right) =>
      left.label.localeCompare(right.label, locale, { sensitivity: "base" }),
    );
  }

  const groupOrder: string[] = [];
  const byGroup = new Map<string, EquipmentPickComboboxOption[]>();
  for (const option of grouped) {
    const group = option.group!;
    if (!byGroup.has(group)) {
      groupOrder.push(group);
      byGroup.set(group, []);
    }
    byGroup.get(group)!.push(option);
  }

  const sortedGrouped = groupOrder.flatMap((group) =>
    [...(byGroup.get(group) ?? [])].sort((left, right) =>
      left.label.localeCompare(right.label, locale, { sensitivity: "base" }),
    ),
  );

  const sortedUngrouped = [...ungrouped].sort((left, right) =>
    left.label.localeCompare(right.label, locale, { sensitivity: "base" }),
  );

  return [...sortedUngrouped, ...sortedGrouped];
}

export function sortEquipmentPickEntries(keys: string[]): string[] {
  const catalogByKey = new Map(mergedEquipmentPickCatalog().map((entry) => [entry.key, entry]));
  return [...keys].sort((leftKey, rightKey) => {
    const left = catalogByKey.get(leftKey);
    const right = catalogByKey.get(rightKey);
    if (!left || !right) return leftKey.localeCompare(rightKey);
    const filterDelta =
      EQUIPMENT_PICK_FILTER_ORDER.indexOf(left.filterKey) - EQUIPMENT_PICK_FILTER_ORDER.indexOf(right.filterKey);
    if (filterDelta !== 0) return filterDelta;
    return left.name.localeCompare(right.name);
  });
}

export { GEAR_CATEGORY_ORDER };
