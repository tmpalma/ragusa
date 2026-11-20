import {
  availableMasteryWeaponOptions,
  collectClassFeatureContributions,
  compactWeaponMasteryPicks,
  eligibleMasteryWeapons,
  firstEmptyWeaponMasterySlot,
  weaponMasteryPicksForClass,
  weaponMasterySlotForKey,
  weaponProficienciesFromClassFeatureChoices,
} from "../../domain/classFeatures";
import { CLASSES, WEAPONS, findByKey } from "../../data";
import { effectiveLevelPath } from "../../domain/classLevels";
import { mergedWeaponProficiencyGrants } from "../../domain/training";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { useTableRules } from "../../state/TableRulesContext";
import { CappedPickList } from "./CappedPickList";

interface WeaponMasteryInputProps {
  classKey: string;
  classLevel: number;
}

export function WeaponMasteryInput({ classKey, classLevel }: WeaponMasteryInputProps) {
  const { character, derived, dispatch } = useCharacter();
  const tableRules = useTableRules();
  const { t, tEntity, tGlossary } = useLocale();
  const perClassContributions = collectClassFeatureContributions(classKey, classLevel);
  const { weaponMasteryCount, weaponMasteryMeleeOnly } = perClassContributions;
  const classData = findByKey(CLASSES, classKey);

  if (weaponMasteryCount <= 0 || !classData) {
    return null;
  }

  const levelPath = effectiveLevelPath(character);
  const classFeatureChoices =
    character.classFeatureChoicesByClass[classKey] ??
    (classKey === character.classKey ? character.classFeatureChoices : {});

  const mergedGrants = [
    ...mergedWeaponProficiencyGrants({
      rules: tableRules,
      levelPath,
      resolveClass: (key) => findByKey(CLASSES, key),
      classFeatureChoicesByClass: character.classFeatureChoicesByClass,
      subclassByClass: character.subclassByClass,
      legacyClassFeatureChoices: character.classFeatureChoices,
      legacySubclassKey: character.subclassKey,
    }),
    ...derived.featContributions.weaponProficiencyGrants.map((proficiency) => ({ kind: proficiency })),
    ...weaponProficienciesFromClassFeatureChoices(classData, classLevel, classFeatureChoices),
  ];

  const storedPicks = weaponMasteryPicksForClass(
    character.weaponMasteryPicksByClass,
    classKey,
    classKey === character.classKey ? character.weaponMasteryPicks : [],
  );
  const picks =
    storedPicks.length === weaponMasteryCount
      ? storedPicks
      : Array.from({ length: weaponMasteryCount }, () => "");
  const selectedKeys = compactWeaponMasteryPicks(picks);

  function weaponLabel(weaponKey: string): string {
    const weapon =
      WEAPONS.find((entry) => entry.key === weaponKey) ??
      eligibleMasteryWeapons(classData, weaponMasteryMeleeOnly, mergedGrants).find(
        (entry) => entry.key === weaponKey,
      );
    const name = tEntity("catalog.weapons", weaponKey, "name", weapon?.name ?? weaponKey);
    return weapon?.mastery
      ? `${name} (${tGlossary("weaponProperty", weapon.mastery)})`
      : name;
  }

  const remainingWeapons = availableMasteryWeaponOptions(
    picks,
    classData,
    weaponMasteryMeleeOnly,
    -1,
    mergedGrants,
  );

  return (
    <CappedPickList
      id={`weapon-mastery-select-${classKey}`}
      groupLabel={t("character.weaponMasteryChooseCounted", {
        count: selectedKeys.length,
        max: weaponMasteryCount,
      })}
      comboboxLabel={t("character.weapon")}
      options={remainingWeapons.map((weapon) => ({
        key: weapon.key,
        label: weaponLabel(weapon.key),
      }))}
      selectedKeys={selectedKeys}
      maxCount={weaponMasteryCount}
      onAdd={(weaponKey) => {
        const index = firstEmptyWeaponMasterySlot(picks);
        if (index < 0) return;
        dispatch({ type: "SET_WEAPON_MASTERY_PICK", classKey, index, weaponKey });
      }}
      onRemove={(weaponKey) => {
        const index = weaponMasterySlotForKey(picks, weaponKey);
        if (index < 0) return;
        dispatch({ type: "SET_WEAPON_MASTERY_PICK", classKey, index, weaponKey: null });
      }}
      renderSelected={(weaponKey) => weaponLabel(weaponKey)}
    />
  );
}
