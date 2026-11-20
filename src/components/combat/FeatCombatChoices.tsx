import { WEAPONS } from "../../data";
import { availableFeatWeaponMasteryOptions, effectiveWeaponProficiencyGrants } from "../../domain/classFeatures";
import {
  featCombatDamageTypeLabelKey,
  featDamageTypeOptions,
  FEAT_COMBAT_DAMAGE_TYPE_PICK_KEYS,
  FEAT_COMBAT_WEAPON_MASTERY_PICK_KEYS,
  type FeatChoices,
} from "../../domain/featEffects";
import { findActiveFeatSlot } from "../../domain/featSlots";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import type { CharacterAction } from "../../state/characterState";
import { Combobox } from "../form/Combobox";

interface FeatCombatChoicesProps {
  featKey: string;
}

function formatDamageTypeLabel(damageType: string, t: ReturnType<typeof useLocale>["t"]): string {
  const localized = t(`rules.damageType.${damageType}`);
  if (localized !== `rules.damageType.${damageType}`) return localized;
  return damageType.charAt(0).toUpperCase() + damageType.slice(1);
}

export function featHasCombatChoices(featKey: string): boolean {
  return (
    FEAT_COMBAT_DAMAGE_TYPE_PICK_KEYS.has(featKey) ||
    FEAT_COMBAT_WEAPON_MASTERY_PICK_KEYS.has(featKey)
  );
}

export function FeatCombatChoices({ featKey }: FeatCombatChoicesProps) {
  const { character, derived, dispatch } = useCharacter();
  const { t, tEntity, tGlossary } = useLocale();
  const slotInfo = findActiveFeatSlot(character, featKey);
  if (!slotInfo) return null;

  const { slot } = slotInfo;

  function choicesForKey(key: string): FeatChoices {
    if (key === featKey) {
      switch (slot.source.kind) {
        case "origin":
          return character.featChoices;
        case "fightingStyle":
          return character.fightingStyleFeatChoices;
        case "versatile":
          return character.extraFeatChoices[slot.source.index] ?? character.featChoices;
        case "classGrant":
          return character.classGrantedFeatChoices[slot.source.level] ?? character.featChoices;
      }
    }
    if (key === character.featKey) return character.featChoices;
    if (key === character.fightingStyleFeatKey) return character.fightingStyleFeatChoices;
    const extraIndex = character.extraFeats.indexOf(key);
    if (extraIndex >= 0) return character.extraFeatChoices[extraIndex] ?? character.featChoices;
    for (const [levelText, grantedKey] of Object.entries(character.classGrantedFeats)) {
      if (grantedKey === key) {
        return character.classGrantedFeatChoices[Number(levelText)] ?? character.featChoices;
      }
    }
    return character.featChoices;
  }

  const choices = choicesForKey(featKey);

  function dispatchAction(action: CharacterAction) {
    dispatch(action);
  }

  function setDamageType(damageType: string | null) {
    switch (slot.source.kind) {
      case "origin":
        dispatchAction({ type: "SET_FEAT_DAMAGE_TYPE", damageType });
        break;
      case "fightingStyle":
        dispatchAction({ type: "SET_FIGHTING_STYLE_FEAT_DAMAGE_TYPE", damageType });
        break;
      case "versatile":
        dispatchAction({ type: "SET_EXTRA_FEAT_DAMAGE_TYPE", featIndex: slot.source.index, damageType });
        break;
      case "classGrant":
        dispatchAction({ type: "SET_CLASS_GRANTED_FEAT_DAMAGE_TYPE", level: slot.source.level, damageType });
        break;
    }
  }

  function setWeaponMasteryPick(weaponKey: string | null) {
    switch (slot.source.kind) {
      case "origin":
        dispatchAction({ type: "SET_FEAT_WEAPON_MASTERY_PICK", weaponKey });
        break;
      case "fightingStyle":
        dispatchAction({ type: "SET_FIGHTING_STYLE_FEAT_WEAPON_MASTERY_PICK", weaponKey });
        break;
      case "versatile":
        dispatchAction({ type: "SET_EXTRA_FEAT_WEAPON_MASTERY_PICK", featIndex: slot.source.index, weaponKey });
        break;
      case "classGrant":
        dispatchAction({ type: "SET_CLASS_GRANTED_FEAT_WEAPON_MASTERY_PICK", level: slot.source.level, weaponKey });
        break;
    }
  }

  const idPrefix = `combat-feat-${featKey}`;

  if (FEAT_COMBAT_DAMAGE_TYPE_PICK_KEYS.has(featKey)) {
    return (
      <Combobox
        id={`${idPrefix}-damage-type`}
        label={t(featCombatDamageTypeLabelKey(featKey) as "character.featDamageType")}
        value={choices.damageTypePick}
        onChange={(key) => setDamageType(key)}
        options={featDamageTypeOptions(featKey).map((damageType) => ({
          key: damageType,
          label: formatDamageTypeLabel(damageType, t),
        }))}
      />
    );
  }

  if (FEAT_COMBAT_WEAPON_MASTERY_PICK_KEYS.has(featKey)) {
    const extraWeaponProficiencies = [
      ...effectiveWeaponProficiencyGrants(
        derived.classData,
        character.level,
        character.classFeatureChoices,
        character.subclassKey,
      ),
      ...derived.featContributions.weaponProficiencyGrants.map((proficiency) => ({ kind: proficiency })),
    ];
    const weaponMasteryOptions = availableFeatWeaponMasteryOptions(derived.classData, extraWeaponProficiencies);
    return (
      <Combobox
        id={`${idPrefix}-weapon-mastery`}
        label={t("character.featWeaponMasteryPick")}
        value={choices.weaponMasteryPick}
        onChange={(key) => setWeaponMasteryPick(key)}
        options={weaponMasteryOptions.map((weapon) => {
          const data = WEAPONS.find((entry) => entry.key === weapon.key);
          const name = tEntity("catalog.weapons", weapon.key, "name", data?.name ?? weapon.key);
          const label = data?.mastery ? `${name} (${tGlossary("weaponProperty", data.mastery)})` : name;
          return { key: weapon.key, label };
        })}
      />
    );
  }

  return null;
}
