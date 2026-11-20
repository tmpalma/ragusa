import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { CappedPickList } from "../form/CappedPickList";
import combatStyles from "../combat/Combat.module.css";

export function MetamagicPickList({
  choiceKey,
  options,
  picks,
  maxCount,
}: {
  choiceKey: string;
  options: { key: string; name: string; desc: string }[];
  picks: (string | null)[];
  maxCount: number;
}) {
  const { dispatch } = useCharacter();
  const { t } = useLocale();

  const selectedKeys = picks.filter((pick): pick is string => pick != null);
  const pickedSet = new Set(selectedKeys);
  const remainingOptions = options
    .filter((option) => !pickedSet.has(option.key))
    .map((option) => ({ key: option.key, label: option.name }));

  function addMetamagic(optionKey: string) {
    const index = picks.findIndex((pick) => pick == null);
    if (index < 0) return;
    dispatch({
      type: "SET_CLASS_FEATURE_OPTION_PICK",
      choiceKey,
      index,
      optionKey,
    });
  }

  function removeMetamagic(optionKey: string) {
    const index = picks.findIndex((pick) => pick === optionKey);
    if (index < 0) return;
    dispatch({
      type: "SET_CLASS_FEATURE_OPTION_PICK",
      choiceKey,
      index,
      optionKey: null,
    });
  }

  return (
    <CappedPickList
      id="metamagic-select"
      groupLabel={t("spells.metamagicPickLabel")}
      comboboxLabel={t("spells.metamagicOption")}
      options={remainingOptions}
      selectedKeys={selectedKeys}
      maxCount={maxCount}
      onAdd={addMetamagic}
      onRemove={removeMetamagic}
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
  );
}
