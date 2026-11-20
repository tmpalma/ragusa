import type { AbilityId } from "../data/types";
import type { CharacterAction } from "../state/characterState";
import type { findActiveFeatSlot } from "./featSlots";

export function dispatchFeatSpellcastingAbility(
  dispatch: (action: CharacterAction) => void,
  slot: NonNullable<ReturnType<typeof findActiveFeatSlot>>,
  ability: AbilityId | null,
): void {
  switch (slot.slot.source.kind) {
    case "origin":
      dispatch({ type: "SET_FEAT_SPELLCASTING_ABILITY", ability });
      break;
    case "versatile":
      dispatch({
        type: "SET_EXTRA_FEAT_SPELLCASTING_ABILITY",
        featIndex: slot.slot.source.index,
        ability,
      });
      break;
    case "classGrant":
      dispatch({
        type: "SET_CLASS_GRANTED_FEAT_SPELLCASTING_ABILITY",
        level: slot.slot.source.level,
        ability,
      });
      break;
    default:
      break;
  }
}

export function dispatchFeatCantripPick(
  dispatch: (action: CharacterAction) => void,
  slot: NonNullable<ReturnType<typeof findActiveFeatSlot>>,
  pickIndex: number,
  spellKey: string | null,
): void {
  switch (slot.slot.source.kind) {
    case "origin":
      dispatch({ type: "SET_FEAT_CANTRIP_PICK", index: pickIndex, spellKey });
      break;
    case "versatile":
      dispatch({
        type: "SET_EXTRA_FEAT_CANTRIP_PICK",
        featIndex: slot.slot.source.index,
        pickIndex,
        spellKey,
      });
      break;
    case "classGrant":
      dispatch({
        type: "SET_CLASS_GRANTED_FEAT_CANTRIP_PICK",
        level: slot.slot.source.level,
        pickIndex,
        spellKey,
      });
      break;
    default:
      break;
  }
}

export function dispatchFeatSpellPick(
  dispatch: (action: CharacterAction) => void,
  slot: NonNullable<ReturnType<typeof findActiveFeatSlot>>,
  pickIndex: number,
  spellKey: string | null,
): void {
  switch (slot.slot.source.kind) {
    case "origin":
      dispatch({ type: "SET_FEAT_SPELL_PICK", index: pickIndex, spellKey });
      break;
    case "versatile":
      dispatch({
        type: "SET_EXTRA_FEAT_SPELL_PICK",
        featIndex: slot.slot.source.index,
        pickIndex,
        spellKey,
      });
      break;
    case "classGrant":
      dispatch({
        type: "SET_CLASS_GRANTED_FEAT_SPELL_PICK",
        level: slot.slot.source.level,
        pickIndex,
        spellKey,
      });
      break;
    default:
      break;
  }
}
