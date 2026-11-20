import { getPersistStore } from "./persistStore";

const COMBAT_KEEP_AWAKE_KEY = "device-combat-keep-awake";

export async function loadCombatKeepAwakeEnabled(): Promise<boolean> {
  const value = await getPersistStore().get(COMBAT_KEEP_AWAKE_KEY);
  return value === "true";
}

export async function saveCombatKeepAwakeEnabled(enabled: boolean): Promise<void> {
  await getPersistStore().set(COMBAT_KEEP_AWAKE_KEY, enabled ? "true" : "false");
}
