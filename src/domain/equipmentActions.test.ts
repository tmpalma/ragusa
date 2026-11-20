import { describe, expect, it } from "vitest";
import { INITIAL_CHARACTER, characterReducer } from "../state/characterState";
import { currentMagicItemCharges, magicItemChargeMax } from "./magicItemCharges";
import {
  armoryEquipmentActionKey,
  gearEquipmentActionKey,
  isEquipmentActionEligible,
  listEquipmentActionDisplays,
} from "./equipmentActions";

describe("equipmentActions", () => {
  it("allows non-attunement magic gear pins without attunement", () => {
    let state = characterReducer(INITIAL_CHARACTER, {
      type: "ADD_ADVENTURING_GEAR",
      itemKey: "bag-of-holding",
    });
    const actionKey = gearEquipmentActionKey("bag-of-holding");
    expect(isEquipmentActionEligible(state, actionKey)).toBe(true);
    state = characterReducer(state, { type: "ADD_EQUIPMENT_ACTION", actionKey });
    expect(state.equipmentActionKeys).toEqual([actionKey]);
    expect(listEquipmentActionDisplays(state)).toHaveLength(1);
  });

  it("blocks attunement magic gear until attuned", () => {
    const attuneKey = "cloak-of-protection";
    let state = characterReducer(INITIAL_CHARACTER, { type: "ADD_ADVENTURING_GEAR", itemKey: attuneKey });
    const actionKey = gearEquipmentActionKey(attuneKey);
    expect(isEquipmentActionEligible(state, actionKey)).toBe(false);
    const blocked = characterReducer(state, { type: "ADD_EQUIPMENT_ACTION", actionKey });
    expect(blocked.equipmentActionKeys).toEqual([]);

    state = characterReducer(state, { type: "ADD_ATTUNED_MAGIC_ITEM", itemKey: attuneKey });
    expect(isEquipmentActionEligible(state, actionKey)).toBe(true);
    state = characterReducer(state, { type: "ADD_EQUIPMENT_ACTION", actionKey });
    expect(state.equipmentActionKeys).toEqual([actionKey]);
  });

  it("drops gear pins when gear is removed or unattuned", () => {
    const attuneKey = "cloak-of-protection";
    let state = characterReducer(INITIAL_CHARACTER, { type: "ADD_ADVENTURING_GEAR", itemKey: attuneKey });
    state = characterReducer(state, { type: "ADD_ATTUNED_MAGIC_ITEM", itemKey: attuneKey });
    const actionKey = gearEquipmentActionKey(attuneKey);
    state = characterReducer(state, { type: "ADD_EQUIPMENT_ACTION", actionKey });

    state = characterReducer(state, { type: "REMOVE_ATTUNED_MAGIC_ITEM", itemKey: attuneKey });
    expect(state.equipmentActionKeys).toEqual([]);

    state = characterReducer(state, { type: "ADD_ATTUNED_MAGIC_ITEM", itemKey: attuneKey });
    state = characterReducer(state, { type: "ADD_EQUIPMENT_ACTION", actionKey });
    state = characterReducer(state, { type: "REMOVE_ADVENTURING_GEAR", itemKey: attuneKey });
    expect(state.equipmentActionKeys).toEqual([]);
  });

  it("tracks magic item charges and clears them when gear is removed", () => {
    const itemKey = "wand-of-magic-missiles";
    const max = magicItemChargeMax(itemKey);
    expect(max).toBe(7);

    let state = characterReducer(INITIAL_CHARACTER, { type: "ADD_ADVENTURING_GEAR", itemKey });
    state = characterReducer(state, {
      type: "SET_MAGIC_ITEM_CHARGE_REMAINING",
      itemKey,
      value: 4,
    });
    expect(state.magicItemChargeRemaining[itemKey]).toBe(4);
    expect(currentMagicItemCharges(state.magicItemChargeRemaining, itemKey, max!)).toBe(4);

    state = characterReducer(state, { type: "REMOVE_ADVENTURING_GEAR", itemKey });
    expect(state.magicItemChargeRemaining[itemKey]).toBeUndefined();
  });

  it("drops armory pins when unattuned or removed", () => {
    let state = characterReducer(INITIAL_CHARACTER, {
      type: "ADD_ARMOR",
      id: "a1",
      key: "chain-mail",
      variantKey: "armor-of-acid-resistance",
    });
    const actionKey = armoryEquipmentActionKey("a1");
    state = characterReducer(state, { type: "SET_ARMOR_ATTUNED", id: "a1", attuned: false });
    expect(isEquipmentActionEligible(state, actionKey)).toBe(false);

    state = characterReducer(state, { type: "SET_ARMOR_ATTUNED", id: "a1", attuned: true });
    state = characterReducer(state, { type: "ADD_EQUIPMENT_ACTION", actionKey });
    expect(state.equipmentActionKeys).toEqual([actionKey]);

    state = characterReducer(state, { type: "SET_ARMOR_ATTUNED", id: "a1", attuned: false });
    expect(state.equipmentActionKeys).toEqual([]);

    state = characterReducer(state, { type: "SET_ARMOR_ATTUNED", id: "a1", attuned: true });
    state = characterReducer(state, { type: "ADD_EQUIPMENT_ACTION", actionKey });
    state = characterReducer(state, { type: "REMOVE_ARMOR", id: "a1" });
    expect(state.equipmentActionKeys).toEqual([]);
  });
});
