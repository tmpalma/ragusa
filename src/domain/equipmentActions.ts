import { ARMOR, WEAPONS, findByKey } from "../data";
import type { MagicItemRarity } from "../data/types";
import { localizedVariantDisplayName } from "./genericVariantDisplay";
import type { EntityNameTranslate } from "./genericVariantDisplay";
import { findGenericVariant } from "./genericVariantMatcher";
import { resolveEquipmentPick } from "./equipmentPicks";
import {
  hasStructuredGearDesc,
  parseStructuredGearDesc,
  type AdventuringGearEntry,
  type StructuredGearDescParts,
} from "./adventuringGear";
export const GEAR_EQUIPMENT_ACTION_PREFIX = "gear:";
export const ARMORY_EQUIPMENT_ACTION_PREFIX = "armory:";

export function gearEquipmentActionKey(catalogKey: string): string {
  return `${GEAR_EQUIPMENT_ACTION_PREFIX}${catalogKey}`;
}

export function armoryEquipmentActionKey(instanceId: string): string {
  return `${ARMORY_EQUIPMENT_ACTION_PREFIX}${instanceId}`;
}

export type ParsedEquipmentActionKey =
  | { kind: "gear"; catalogKey: string }
  | { kind: "armory"; instanceId: string };

export function parseEquipmentActionKey(actionKey: string): ParsedEquipmentActionKey | null {
  if (actionKey.startsWith(GEAR_EQUIPMENT_ACTION_PREFIX)) {
    const catalogKey = actionKey.slice(GEAR_EQUIPMENT_ACTION_PREFIX.length);
    return catalogKey ? { kind: "gear", catalogKey } : null;
  }
  if (actionKey.startsWith(ARMORY_EQUIPMENT_ACTION_PREFIX)) {
    const instanceId = actionKey.slice(ARMORY_EQUIPMENT_ACTION_PREFIX.length);
    return instanceId ? { kind: "armory", instanceId } : null;
  }
  return null;
}

function gearEntryForKey(
  adventuringGear: readonly AdventuringGearEntry[],
  catalogKey: string,
): AdventuringGearEntry | undefined {
  return adventuringGear.find((entry) => entry.key === catalogKey);
}

export type EquipmentActionCharacterSources = {
  adventuringGear: readonly AdventuringGearEntry[];
  attunedMagicItemKeys: readonly string[];
  weapons: readonly { id: string; key: string; variantKey?: string; attuned?: boolean }[];
  armor: readonly { id: string; key: string; variantKey?: string; attuned?: boolean }[];
  equipmentActionKeys?: readonly string[];
};

function isGearEquipmentActionEligible(
  character: Pick<EquipmentActionCharacterSources, "adventuringGear" | "attunedMagicItemKeys">,
  catalogKey: string,
): boolean {
  const entry = gearEntryForKey(character.adventuringGear, catalogKey);
  if (!entry || entry.quantity <= 0) return false;
  const resolved = resolveEquipmentPick(catalogKey);
  if (resolved?.kind === "magic" && resolved.item.requiresAttunement) {
    return character.attunedMagicItemKeys.includes(catalogKey);
  }
  return true;
}

function isArmoryEquipmentActionEligible(
  character: Pick<EquipmentActionCharacterSources, "weapons" | "armor">,
  instanceId: string,
): boolean {
  const weapon = character.weapons.find((entry) => entry.id === instanceId);
  const armor = character.armor.find((entry) => entry.id === instanceId);
  const piece = weapon ?? armor;
  if (!piece?.variantKey) return false;
  const variant = findGenericVariant(piece.variantKey);
  if (variant?.requiresAttunement && !piece.attuned) return false;
  return true;
}

export function isEquipmentActionEligible(
  character: Pick<EquipmentActionCharacterSources, "adventuringGear" | "attunedMagicItemKeys" | "weapons" | "armor">,
  actionKey: string,
): boolean {
  const parsed = parseEquipmentActionKey(actionKey);
  if (!parsed) return false;
  if (parsed.kind === "gear") {
    return isGearEquipmentActionEligible(character, parsed.catalogKey);
  }
  return isArmoryEquipmentActionEligible(character, parsed.instanceId);
}

export function removeEquipmentActionKeys(keys: readonly string[], ...toRemove: string[]): string[] {
  const drop = new Set(toRemove);
  return keys.filter((key) => !drop.has(key));
}

export function pruneEquipmentActionKeys(
  character: EquipmentActionCharacterSources & { equipmentActionKeys: readonly string[] },
): string[] {
  return character.equipmentActionKeys.filter((key) => isEquipmentActionEligible(character, key));
}

export type EquipmentActionGearMagicDisplay = {
  kind: "gear-magic";
  actionKey: string;
  catalogKey: string;
  quantity: number;
  isAttuned: boolean;
};

export type EquipmentActionGearMundaneDisplay = {
  kind: "gear-mundane";
  actionKey: string;
  catalogKey: string;
  quantity: number;
  structuredParts: StructuredGearDescParts | null;
  plainDesc: string;
};

export type EquipmentActionArmoryDisplay = {
  kind: "armory";
  actionKey: string;
  instanceId: string;
  pieceKind: "weapon" | "armor";
  baseKey: string;
  variantKey: string;
  rarity: MagicItemRarity | null;
};

export type EquipmentActionDisplay =
  | EquipmentActionGearMagicDisplay
  | EquipmentActionGearMundaneDisplay
  | EquipmentActionArmoryDisplay;

export function resolveEquipmentActionDisplay(
  character: Pick<EquipmentActionCharacterSources, "adventuringGear" | "attunedMagicItemKeys" | "weapons" | "armor">,
  actionKey: string,
): EquipmentActionDisplay | null {
  if (!isEquipmentActionEligible(character, actionKey)) return null;
  const parsed = parseEquipmentActionKey(actionKey);
  if (!parsed) return null;

  if (parsed.kind === "gear") {
    const entry = gearEntryForKey(character.adventuringGear, parsed.catalogKey);
    if (!entry) return null;
    const resolved = resolveEquipmentPick(parsed.catalogKey);
    if (!resolved) return null;
    if (resolved.kind === "magic") {
      return {
        kind: "gear-magic",
        actionKey,
        catalogKey: parsed.catalogKey,
        quantity: entry.quantity,
        isAttuned: character.attunedMagicItemKeys.includes(parsed.catalogKey),
      };
    }
    const structuredParts = hasStructuredGearDesc(resolved.item.desc)
      ? parseStructuredGearDesc(resolved.item.desc)
      : null;
    return {
      kind: "gear-mundane",
      actionKey,
      catalogKey: parsed.catalogKey,
      quantity: entry.quantity,
      structuredParts,
      plainDesc: resolved.item.desc,
    };
  }

  const weapon = character.weapons.find((entry) => entry.id === parsed.instanceId);
  if (weapon?.variantKey) {
    const variant = findGenericVariant(weapon.variantKey);
    return {
      kind: "armory",
      actionKey,
      instanceId: parsed.instanceId,
      pieceKind: "weapon",
      baseKey: weapon.key,
      variantKey: weapon.variantKey,
      rarity: variant?.rarity ?? null,
    };
  }
  const armor = character.armor.find((entry) => entry.id === parsed.instanceId);
  if (armor?.variantKey) {
    const variant = findGenericVariant(armor.variantKey);
    return {
      kind: "armory",
      actionKey,
      instanceId: parsed.instanceId,
      pieceKind: "armor",
      baseKey: armor.key,
      variantKey: armor.variantKey,
      rarity: variant?.rarity ?? null,
    };
  }
  return null;
}

export function listEquipmentActionDisplays(
  character: EquipmentActionCharacterSources & { equipmentActionKeys: readonly string[] },
): EquipmentActionDisplay[] {
  const displays: EquipmentActionDisplay[] = [];
  for (const actionKey of character.equipmentActionKeys) {
    const display = resolveEquipmentActionDisplay(character, actionKey);
    if (display) displays.push(display);
  }
  return displays;
}

export function armoryEquipmentActionDisplayName(
  display: EquipmentActionArmoryDisplay,
  tEntity: EntityNameTranslate,
): string {
  const catalogKey = display.pieceKind === "weapon" ? "catalog.weapons" : "catalog.armor";
  const base =
    display.pieceKind === "weapon"
      ? findByKey(WEAPONS, display.baseKey)
      : findByKey(ARMOR, display.baseKey);
  const baseName = tEntity(catalogKey, display.baseKey, "name", base?.name ?? display.baseKey);
  return localizedVariantDisplayName(baseName, findGenericVariant(display.variantKey), tEntity);
}
