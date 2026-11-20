import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { CappedPickList } from "../form/CappedPickList";
import combatStyles from "./Combat.module.css";

export function ElixirsPickList({
  options,
  picks,
  maxCount,
}: {
  options: { key: string; name: string; desc: string; repeatable?: boolean }[];
  picks: (string | null)[];
  maxCount: number;
}) {
  const { dispatch } = useCharacter();
  const { t } = useLocale();

  const selectedKeys = picks.filter((pick): pick is string => pick != null);
  const remainingOptions = options
    .filter((option) => option.repeatable || !picks.includes(option.key))
    .map((option) => ({ key: option.key, label: option.name }));

  function addElixir(optionKey: string) {
    const index = picks.findIndex((pick) => pick == null);
    if (index < 0) return;
    dispatch({
      type: "SET_SUBCLASS_FEATURE_OPTION_PICK",
      choiceKey: "experimental-elixir",
      index,
      optionKey,
    });
  }

  function removeElixir(_optionKey: string, index: number) {
    dispatch({
      type: "SET_SUBCLASS_FEATURE_OPTION_PICK",
      choiceKey: "experimental-elixir",
      index,
      optionKey: null,
    });
  }

  return (
    <CappedPickList
      id="combat-experimental-elixir-select"
      groupLabel=""
      comboboxLabel={t("combat.elixirPick", { index: selectedKeys.length + 1 })}
      options={remainingOptions}
      selectedKeys={selectedKeys}
      maxCount={maxCount}
      onAdd={addElixir}
      onRemove={removeElixir}
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
