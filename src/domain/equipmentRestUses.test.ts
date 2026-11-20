import { describe, expect, it } from "vitest";
import { GENERIC_VARIANTS, MAGIC_ITEMS, findByKey } from "../data";
import { characterReducer, INITIAL_CHARACTER } from "../state/characterState";
import {
  currentEquipmentRestUses,
  equipmentRestUsePools,
  equipmentRestUsePoolsForMagicItem,
  equipmentRestUsePoolsForVariant,
  gearRestUsesStorageKey,
  removeGearEquipmentRestUses,
  restoreEquipmentRestUsesOnShortRest,
} from "./equipmentRestUses";

function poolsForKey(key: string) {
  return equipmentRestUsePoolsForMagicItem(key);
}

describe("equipmentRestUsePools", () => {
  it("parses once per dawn items", () => {
    expect(poolsForKey("javelin-of-lightning")).toEqual([
      { maxUses: 1, recovery: "long", id: "lightning-bolt", heading: "Lightning Bolt" },
    ]);
    expect(poolsForKey("pearl-of-power")).toEqual([
      { maxUses: 1, recovery: "long", id: "default" },
    ]);
    expect(
      equipmentRestUsePools(
        "This property can't be used again until the next dawn.",
      ),
    ).toEqual([{ maxUses: 1, recovery: "long", id: "default" }]);
  });

  it("parses multi-use dawn items", () => {
    expect(poolsForKey("bag-of-tricks-gray")).toEqual([
      { maxUses: 3, recovery: "long", id: "default" },
    ]);
    expect(
      equipmentRestUsePools(
        "The cauldron can create stew three times. It then ceases to function until the next dawn, when it regains all its uses.",
      ),
    ).toEqual([{ maxUses: 3, recovery: "long", id: "default" }]);
    expect(
      equipmentRestUsePools(
        "You can do so three times, and expended uses recharge daily at dawn.",
      ),
    ).toEqual([{ maxUses: 3, recovery: "long", id: "default" }]);
  });

  it("returns no pool for charge-only or non-rest limits", () => {
    expect(poolsForKey("wand-of-magic-missiles")).toEqual([]);
    expect(equipmentRestUsePools("The chime can be used 10 times. After the tenth time, it cracks and becomes useless.")).toEqual([]);
    expect(
      equipmentRestUsePools(
        "When you've used the boots' property for a total of 10 minutes, the magic ceases to function for you until you finish a Long Rest.",
      ),
    ).toEqual([]);
  });

  it("parses per-heading pools on luck blade variant", () => {
    const luck = findByKey(GENERIC_VARIANTS, "luck-blade");
    expect(luck).toBeTruthy();
    const pools = equipmentRestUsePoolsForVariant("luck-blade");
    expect(pools).toHaveLength(2);
    expect(pools.map((pool) => pool.id).sort()).toEqual(["luck", "wish"]);
    expect(pools.every((pool) => pool.maxUses === 1 && pool.recovery === "long")).toBe(true);
  });

  it("parses short rest recovery from prose", () => {
    const pools = equipmentRestUsePools(
      "You can whisper once. You can't use this property again until you finish a Short Rest.",
    );
    expect(pools).toEqual([{ maxUses: 1, recovery: "short", id: "default" }]);
  });

  it("catalog-wide expectations stay stable", () => {
    const fixtureExpectations: Record<string, { count: number; max?: number; id?: string } | null> = {
      "javelin-of-lightning": { count: 1, max: 1, id: "lightning-bolt" },
      "pearl-of-power": { count: 1, max: 1 },
      "bag-of-tricks-gray": { count: 1, max: 3 },
      "wand-of-magic-missiles": null,
    };

    for (const [key, expected] of Object.entries(fixtureExpectations)) {
      const item = findByKey(MAGIC_ITEMS, key);
      expect(item, key).toBeTruthy();
      const pools = equipmentRestUsePools(item!.desc);
      if (expected == null) {
        expect(pools, key).toEqual([]);
      } else {
        expect(pools, key).toHaveLength(expected.count);
        if (expected.max != null) expect(pools[0]!.maxUses, key).toBe(expected.max);
        if (expected.id != null) expect(pools[0]!.id, key).toBe(expected.id);
      }
    }
  });
});

describe("equipment rest uses state", () => {
  it("restores spent uses on long rest only for long-recovery pools", () => {
    const itemKey = "javelin-of-lightning";
    const storageKey = gearRestUsesStorageKey(itemKey, "lightning-bolt");
    let state = characterReducer(INITIAL_CHARACTER, { type: "ADD_ADVENTURING_GEAR", itemKey });
    state = characterReducer(state, {
      type: "SET_EQUIPMENT_REST_USES",
      storageKey,
      value: 0,
    });
    expect(state.equipmentRestUsesRemaining[storageKey]).toBe(0);

    state = characterReducer(state, { type: "APPLY_REST", kind: "short" });
    expect(state.equipmentRestUsesRemaining[storageKey]).toBe(0);

    state = characterReducer(state, { type: "APPLY_REST", kind: "long" });
    expect(state.equipmentRestUsesRemaining[storageKey]).toBeUndefined();
    expect(currentEquipmentRestUses(state.equipmentRestUsesRemaining, storageKey, 1)).toBe(1);
  });

  it("leaves long-recovery pools unchanged on short rest", () => {
    const itemKey = "javelin-of-lightning";
    const storageKey = gearRestUsesStorageKey(itemKey, "lightning-bolt");
    const state = {
      ...characterReducer(INITIAL_CHARACTER, { type: "ADD_ADVENTURING_GEAR", itemKey }),
      equipmentRestUsesRemaining: { [storageKey]: 0 },
    };
    expect(restoreEquipmentRestUsesOnShortRest(state)).toEqual({ [storageKey]: 0 });
  });

  it("drops stored uses when gear is removed", () => {
    const itemKey = "javelin-of-lightning";
    const storageKey = gearRestUsesStorageKey(itemKey, "lightning-bolt");
    let state = characterReducer(INITIAL_CHARACTER, { type: "ADD_ADVENTURING_GEAR", itemKey });
    state = characterReducer(state, { type: "SET_EQUIPMENT_REST_USES", storageKey, value: 0 });
    state = characterReducer(state, { type: "REMOVE_ADVENTURING_GEAR", itemKey });
    expect(state.equipmentRestUsesRemaining[storageKey]).toBeUndefined();
    expect(removeGearEquipmentRestUses({ [storageKey]: 0 }, itemKey)).toEqual({});
  });
});
