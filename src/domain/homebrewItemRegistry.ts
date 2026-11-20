import type { HomebrewItemRecord } from "./homebrewItems";
import { homebrewGearKey, parseHomebrewGearKey } from "./homebrewItems";

const registryById = new Map<string, HomebrewItemRecord>();
const allowedGearKeys = new Set<string>();

export function setHomebrewItemRegistry(items: readonly HomebrewItemRecord[]): void {
  registryById.clear();
  allowedGearKeys.clear();
  for (const item of items) {
    registryById.set(item.id, item);
    allowedGearKeys.add(homebrewGearKey(item.id));
  }
}

export function clearHomebrewItemRegistry(): void {
  registryById.clear();
  allowedGearKeys.clear();
}

export function getHomebrewItemRecord(id: string): HomebrewItemRecord | undefined {
  return registryById.get(id);
}

export function getHomebrewItemByGearKey(key: string): HomebrewItemRecord | undefined {
  const id = parseHomebrewGearKey(key);
  if (!id) return undefined;
  return registryById.get(id);
}

export function isAllowedHomebrewGearKey(key: string): boolean {
  return allowedGearKeys.has(key);
}

export function listRegisteredHomebrewItems(): HomebrewItemRecord[] {
  return [...registryById.values()];
}
