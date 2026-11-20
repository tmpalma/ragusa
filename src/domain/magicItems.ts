import { MAGIC_ITEMS, findByKey } from "../data";
import type { AbilityId, MagicItemData, MagicItemEffect } from "../data/types";
import type { AdventuringGearEntry } from "./adventuringGear";
import { addCompactSpellPick, removeCompactSpellPick } from "./spellSelection";

export const ATTUNED_MAGIC_ITEM_MAX = 3;

export interface MagicItemContributions {
  acBonus: number;
  saveBonus: number;
  spellAttackBonus: number;
  spellSaveDcBonus: number;
  abilityCheckBonus: number;
  setAbilityScores: Partial<Record<AbilityId, number>>;
  walkSpeedFloor: number | null;
  weaponDamageBonuses: Partial<Record<string, number>>;
}

const EMPTY_CONTRIBUTIONS: MagicItemContributions = {
  acBonus: 0,
  saveBonus: 0,
  spellAttackBonus: 0,
  spellSaveDcBonus: 0,
  abilityCheckBonus: 0,
  setAbilityScores: {},
  walkSpeedFloor: null,
  weaponDamageBonuses: {},
};

export function attunementEligibleMagicItems(): MagicItemData[] {
  return MAGIC_ITEMS.filter((item) => item.requiresAttunement);
}

export function attunementEligibleKeys(): string[] {
  return attunementEligibleMagicItems().map((item) => item.key);
}

/** Attunement-eligible magic item keys the character is carrying in adventuring gear. */
export function attunementEligibleCarriedKeys(adventuringGear: readonly AdventuringGearEntry[]): string[] {
  const carried = new Set(adventuringGear.map((entry) => entry.key));
  return attunementEligibleKeys().filter((key) => carried.has(key));
}

export function addAttunedMagicItem(
  current: string[],
  itemKey: string,
  eligibleKeys: readonly string[] = attunementEligibleKeys(),
): string[] | null {
  return addCompactSpellPick(current, itemKey, ATTUNED_MAGIC_ITEM_MAX, [...eligibleKeys]);
}

export function removeAttunedMagicItem(current: string[], itemKey: string): string[] {
  return removeCompactSpellPick(current, itemKey);
}

function applyEffect(contributions: MagicItemContributions, effect: MagicItemEffect): void {
  switch (effect.type) {
    case "ac_bonus":
      contributions.acBonus += effect.amount;
      break;
    case "save_bonus":
      contributions.saveBonus += effect.amount;
      break;
    case "spell_attack_bonus":
      contributions.spellAttackBonus += effect.amount;
      break;
    case "spell_save_dc_bonus":
      contributions.spellSaveDcBonus += effect.amount;
      break;
    case "ability_check_bonus":
      contributions.abilityCheckBonus += effect.amount;
      break;
    case "set_ability_score":
      contributions.setAbilityScores[effect.ability] = Math.max(
        contributions.setAbilityScores[effect.ability] ?? 0,
        effect.score,
      );
      break;
    case "walk_speed_floor":
      contributions.walkSpeedFloor =
        contributions.walkSpeedFloor == null
          ? effect.feet
          : Math.max(contributions.walkSpeedFloor, effect.feet);
      break;
    case "weapon_damage_bonus":
      for (const weaponKey of effect.weaponKeys) {
        contributions.weaponDamageBonuses[weaponKey] =
          (contributions.weaponDamageBonuses[weaponKey] ?? 0) + effect.amount;
      }
      break;
  }
}

export function collectMagicItemContributions(attunedKeys: string[]): MagicItemContributions {
  const contributions: MagicItemContributions = {
    ...EMPTY_CONTRIBUTIONS,
    setAbilityScores: {},
    weaponDamageBonuses: {},
  };

  for (const key of attunedKeys) {
    const item = findByKey(MAGIC_ITEMS, key);
    if (!item?.requiresAttunement) continue;
    for (const effect of item.effects) {
      applyEffect(contributions, effect);
    }
  }

  return contributions;
}

export function applySetAbilityScores(
  scores: Record<AbilityId, number>,
  setScores: Partial<Record<AbilityId, number>>,
): Record<AbilityId, number> {
  return {
    str: setScores.str != null ? Math.max(scores.str, setScores.str) : scores.str,
    dex: setScores.dex != null ? Math.max(scores.dex, setScores.dex) : scores.dex,
    con: setScores.con != null ? Math.max(scores.con, setScores.con) : scores.con,
    int: setScores.int != null ? Math.max(scores.int, setScores.int) : scores.int,
    wis: setScores.wis != null ? Math.max(scores.wis, setScores.wis) : scores.wis,
    cha: setScores.cha != null ? Math.max(scores.cha, setScores.cha) : scores.cha,
  };
}
