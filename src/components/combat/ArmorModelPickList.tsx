import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { CappedPickList } from "../form/CappedPickList";
import combatStyles from "./Combat.module.css";

export function ArmorModelPickList({
  choiceKey,
  options,
  selectedOptionKey,
}: {
  choiceKey: string;
  options: { key: string; name: string; desc: string }[];
  selectedOptionKey: string | null;
}) {
  const { dispatch } = useCharacter();
  const { t } = useLocale();

  const selectedKeys = selectedOptionKey ? [selectedOptionKey] : [];
  const remainingOptions = options
    .filter((option) => option.key !== selectedOptionKey)
    .map((option) => ({ key: option.key, label: option.name }));

  function addModel(optionKey: string) {
    dispatch({
      type: "SET_SUBCLASS_FEATURE_CHOICE",
      choiceKey,
      optionKey: optionKey,
    });
  }

  function removeModel() {
    dispatch({
      type: "SET_SUBCLASS_FEATURE_CHOICE",
      choiceKey,
      optionKey: null,
    });
  }

  return (
    <CappedPickList
      id={`combat-armor-model-${choiceKey}-select`}
      groupLabel=""
      comboboxLabel={t("character.subclassFeatureChoice")}
      options={remainingOptions}
      selectedKeys={selectedKeys}
      maxCount={1}
      onAdd={addModel}
      onRemove={() => removeModel()}
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
