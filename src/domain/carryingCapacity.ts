import { ARMOR, WEAPONS, MAGIC_ITEMS, findByKey, SPECIES } from "../data";
import type { CreatureSize, ItemCost, SpeciesData } from "../data/types";
import { ammoStackValueCp, ammoStackWeightLb, weaponCarriedWeightLb, weaponGearValueCp } from "./ammunition";
import { adventuringGearEntryValueCp, adventuringGearEntryWeightLb } from "./gearPacks";
import { equipmentPickValueCp, resolveEquipmentPick } from "./equipmentPicks";
import type { Character, Currency, CurrencyDenomination, InventoryItem, SpeciesSizeChoice } from "../state/characterState";

export type CarryingSizeCategory = "tiny" | "smallMedium" | "large" | "huge" | "gargantuan";

const CARRY_MULTIPLIERS: Record<CarryingSizeCategory, number> = {
  tiny: 7.5,
  smallMedium: 15,
  large: 30,
  huge: 60,
  gargantuan: 120,
};

const SIZE_LADDER: CarryingSizeCategory[] = ["tiny", "smallMedium", "large", "huge", "gargantuan"];

const CP_PER_DENOMINATION: Record<CurrencyDenomination, number> = {
  cp: 1,
  sp: 10,
  ep: 50,
  gp: 100,
  pp: 1000,
};

export interface CarryingLimits {
  carryLb: number;
  dragLiftPushLb: number;
}

export interface CarryingSummary {
  currentLb: number;
  carryLb: number;
  dragLiftPushLb: number;
}

export function creatureSizeForCharacter(
  speciesData: SpeciesData | null,
  speciesSize: SpeciesSizeChoice | null,
): CreatureSize {
  if (speciesData?.hasSizeChoice) {
    return speciesSize ?? "medium";
  }
  return speciesData?.size ?? "medium";
}

export function effectiveCarryingSizeCategory(
  _creatureSize: CreatureSize,
  carryingSizeIncrease: number,
): CarryingSizeCategory {
  const startIndex = SIZE_LADDER.indexOf("smallMedium");
  const nextIndex = Math.min(startIndex + carryingSizeIncrease, SIZE_LADDER.length - 1);
  return SIZE_LADDER[nextIndex];
}

export function carryingLimits(strengthScore: number, sizeCategory: CarryingSizeCategory): CarryingLimits {
  const multiplier = CARRY_MULTIPLIERS[sizeCategory];
  const carryLb = strengthScore * multiplier;
  return {
    carryLb,
    dragLiftPushLb: carryLb * 2,
  };
}

export function costToCopper(cost: ItemCost): number {
  return cost.amount * CP_PER_DENOMINATION[cost.denomination];
}

export function currencyToCopper(currency: Currency): number {
  return (
    currency.cp * CP_PER_DENOMINATION.cp +
    currency.sp * CP_PER_DENOMINATION.sp +
    currency.ep * CP_PER_DENOMINATION.ep +
    currency.gp * CP_PER_DENOMINATION.gp +
    currency.pp * CP_PER_DENOMINATION.pp
  );
}

export function copperToCoinBreakdown(totalCp: number): Partial<Record<CurrencyDenomination, number>> {
  let remaining = Math.max(0, Math.floor(totalCp));
  const breakdown: Partial<Record<CurrencyDenomination, number>> = {};

  if (remaining >= 100) {
    breakdown.gp = Math.floor(remaining / 100);
    remaining %= 100;
  }
  if (remaining >= 10) {
    breakdown.sp = Math.floor(remaining / 10);
    remaining %= 10;
  }
  if (remaining > 0) {
    breakdown.cp = remaining;
  }

  return breakdown;
}

function coinCount(currency: Currency): number {
  return currency.pp + currency.gp + currency.ep + currency.sp + currency.cp;
}

function inventoryWeightLb(items: InventoryItem[]): number {
  return items.reduce((total, item) => total + item.weightLb, 0);
}

function catalogGearWeightLb(character: Character): number {
  const weaponWeight = character.weapons.reduce((total, weapon) => {
    const data = findByKey(WEAPONS, weapon.key);
    return total + (data ? weaponCarriedWeightLb(weapon, data) : 0);
  }, 0);

  const armorWeight = character.armor.reduce((total, armor) => {
    const data = findByKey(ARMOR, armor.key);
    return total + (data?.weightLb ?? 0);
  }, 0);

  return weaponWeight + armorWeight + ammoStackWeightLb(character.ammunitionRemaining, character.magicAmmunition);
}

function catalogPickedItemWeightLb(character: Character): number {
  const carriedKeys = new Set(character.adventuringGear.map((entry) => entry.key));
  const pickedWeight = character.adventuringGear.reduce((total, entry) => {
    const resolved = resolveEquipmentPick(entry.key);
    if (!resolved) return total;
    return total + adventuringGearEntryWeightLb(entry, resolved.item.weightLb);
  }, 0);
  const magicWeight = character.attunedMagicItemKeys.reduce((total, key) => {
    if (carriedKeys.has(key)) return total;
    const data = findByKey(MAGIC_ITEMS, key);
    return total + (data?.weightLb ?? 0);
  }, 0);
  return pickedWeight + magicWeight;
}

function catalogPickedItemValueCp(character: Character): number {
  return character.adventuringGear.reduce((total, entry) => {
    const resolved = resolveEquipmentPick(entry.key);
    if (resolved?.kind !== "gear") return total;
    return total + adventuringGearEntryValueCp(entry, equipmentPickValueCp(entry.key, 1));
  }, 0);
}

export function carriedWeightLb(character: Character): number {
  const gearWeight =
    catalogGearWeightLb(character) + inventoryWeightLb(character.inventoryItems) + catalogPickedItemWeightLb(character);
  const coinWeight = coinCount(character.currency) / 50;
  return gearWeight + coinWeight;
}

export function gearValueCp(character: Character): number {
  const weaponValue = character.weapons.reduce((total, weapon) => {
    const data = findByKey(WEAPONS, weapon.key);
    return total + (data ? weaponGearValueCp(weapon, data) : 0);
  }, 0);

  const armorValue = character.armor.reduce((total, armor) => {
    const data = findByKey(ARMOR, armor.key);
    return total + (data ? costToCopper(data.cost) : 0);
  }, 0);

  const miscValue = character.inventoryItems.reduce((total, item) => total + costToCopper(item.cost), 0);
  const ammoValue = ammoStackValueCp(character.ammunitionRemaining, character.magicAmmunition);
  const pickedGearValue = catalogPickedItemValueCp(character);

  return weaponValue + armorValue + miscValue + ammoValue + pickedGearValue;
}

export function computeCarryingSummary(
  character: Character,
  strengthScore: number,
  carryingSizeIncrease: number,
): CarryingSummary {
  const speciesData = findByKey(SPECIES, character.speciesKey);
  const creatureSize = creatureSizeForCharacter(speciesData, character.speciesSize);
  const sizeCategory = effectiveCarryingSizeCategory(creatureSize, carryingSizeIncrease);
  const limits = carryingLimits(strengthScore, sizeCategory);

  return {
    currentLb: carriedWeightLb(character),
    carryLb: limits.carryLb,
    dragLiftPushLb: limits.dragLiftPushLb,
  };
}
