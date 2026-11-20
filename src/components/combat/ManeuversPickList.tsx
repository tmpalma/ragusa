import type { AbilityId } from "../../data/types";
import { battleMasterManeuverSaveDc } from "../../domain/classFeatures";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { CappedPickList } from "../form/CappedPickList";
import combatStyles from "./Combat.module.css";

export function ManeuversPickList({
  options,
  picks,
  maxCount,
  abilityModifiers,
}: {
  options: { key: string; name: string; desc: string }[];
  picks: (string | null)[];
  maxCount: number;
  abilityModifiers: Record<AbilityId, number>;
}) {
  const { dispatch, character } = useCharacter();
  const { t } = useLocale();

  const selectedKeys = picks.filter((pick): pick is string => pick != null);
  const pickedSet = new Set(selectedKeys);
  const remainingOptions = options
    .filter((option) => !pickedSet.has(option.key))
    .map((option) => ({ key: option.key, label: option.name }));

  const saveDc = battleMasterManeuverSaveDc(abilityModifiers, character.level);

  function addManeuver(maneuverKey: string) {
    const index = picks.findIndex((pick) => pick == null);
    if (index < 0) return;
    dispatch({
      type: "SET_SUBCLASS_FEATURE_OPTION_PICK",
      choiceKey: "maneuvers",
      index,
      optionKey: maneuverKey,
    });
  }

  function removeManeuver(maneuverKey: string) {
    const index = picks.findIndex((pick) => pick === maneuverKey);
    if (index < 0) return;
    dispatch({
      type: "SET_SUBCLASS_FEATURE_OPTION_PICK",
      choiceKey: "maneuvers",
      index,
      optionKey: null,
    });
  }

  return (
    <>
      <p className={combatStyles.meta}>
        {t("combat.classFeature.monkSaveDcMeta", { dc: saveDc })}
      </p>
      <CappedPickList
        id="combat-superiority-maneuver-select"
        groupLabel=""
        comboboxLabel={t("combat.maneuver")}
        options={remainingOptions}
        selectedKeys={selectedKeys}
        maxCount={maxCount}
      onAdd={addManeuver}
      onRemove={removeManeuver}
      removeConfirmName={(key) => options.find((entry) => entry.key === key)?.name ?? key}
      renderSelected={(key) => {
        const option = options.find((entry) => entry.key === key);
        if (!option) return key;
          return (
            <span className={combatStyles.maneuverPickEntry}>
              <span className={combatStyles.maneuverPickName}>{option.name}</span>
              <span className={combatStyles.maneuverPickDesc}>{option.desc}</span>
            </span>
          );
        }}
      />
    </>
  );
}
