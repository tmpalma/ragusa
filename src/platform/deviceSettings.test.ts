import { afterEach, describe, expect, it } from "vitest";
import {
  loadCombatKeepAwakeEnabled,
  saveCombatKeepAwakeEnabled,
} from "./deviceSettings";
import { createMemoryPersistStore, resetPersistStoreForTests, setPersistStoreForTests } from "./persistStore";

afterEach(() => {
  resetPersistStoreForTests();
});

describe("deviceSettings", () => {
  it("defaults combat keep-awake to false", async () => {
    setPersistStoreForTests(createMemoryPersistStore());
    await expect(loadCombatKeepAwakeEnabled()).resolves.toBe(false);
  });

  it("persists combat keep-awake preference", async () => {
    setPersistStoreForTests(createMemoryPersistStore());
    await saveCombatKeepAwakeEnabled(true);
    await expect(loadCombatKeepAwakeEnabled()).resolves.toBe(true);
    await saveCombatKeepAwakeEnabled(false);
    await expect(loadCombatKeepAwakeEnabled()).resolves.toBe(false);
  });
});
