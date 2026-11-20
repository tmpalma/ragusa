import { invocationCantripChoiceKey, invocationOptionsForLevel } from "../../domain/classFeatures";
import { findSpellByKey } from "../../domain/spellSelection";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { CappedPickList } from "../form/CappedPickList";
import { Combobox } from "../form/Combobox";
import combatStyles from "./Combat.module.css";

interface EldritchInvocationsPickListProps {
  choiceKey: string;
  options: { key: string; name: string; desc: string; repeatable?: boolean; cantripChoiceKey?: string }[];
  picks: (string | null)[];
  maxCount: number;
  knownCantripKeys: string[];
}

export function EldritchInvocationsPickList({
  choiceKey,
  options: allOptions,
  picks,
  maxCount,
  knownCantripKeys,
}: EldritchInvocationsPickListProps) {
  const { character, dispatch } = useCharacter();
  const { t } = useLocale();

  const levelOptions = invocationOptionsForLevel(allOptions, character.level);
  const takenNonRepeatable = new Set(
    picks.filter((pick): pick is string => {
      if (pick == null) return false;
      const option = allOptions.find((entry) => entry.key === pick);
      return option != null && !option.repeatable;
    }),
  );
  const remainingOptions = levelOptions
    .filter((option) => option.repeatable || !takenNonRepeatable.has(option.key))
    .map((option) => ({ key: option.key, label: option.name }));

  const selectedEntries = picks
    .map((pick, slotIndex) => (pick ? { key: pick, slotIndex } : null))
    .filter((entry): entry is { key: string; slotIndex: number } => entry != null);
  const selectedKeys = selectedEntries.map((entry) => entry.key);

  function addInvocation(optionKey: string) {
    const index = picks.findIndex((pick) => pick == null);
    if (index < 0) return;
    dispatch({
      type: "SET_CLASS_FEATURE_OPTION_PICK",
      choiceKey,
      index,
      optionKey,
    });
  }

  function removeInvocation(_optionKey: string, listIndex: number) {
    const entry = selectedEntries[listIndex];
    if (!entry) return;
    dispatch({
      type: "SET_CLASS_FEATURE_OPTION_PICK",
      choiceKey,
      index: entry.slotIndex,
      optionKey: null,
    });
  }

  return (
    <CappedPickList
      id="eldritch-invocation-select"
      groupLabel=""
      comboboxLabel={t("combat.invocationOption")}
      options={remainingOptions}
      selectedKeys={selectedKeys}
      maxCount={maxCount}
      onAdd={addInvocation}
      onRemove={removeInvocation}
      removeConfirmName={(key) => allOptions.find((item) => item.key === key)?.name ?? key}
      renderSelected={(key, listIndex) => {
        const entry = selectedEntries[listIndex];
        const slotIndex = entry?.slotIndex ?? listIndex;
        const option = allOptions.find((item) => item.key === key);
        if (!option) return key;

        const cantripChoiceKey = option.cantripChoiceKey
          ? invocationCantripChoiceKey(option.cantripChoiceKey, slotIndex)
          : null;
        const cantripOptions = knownCantripKeys.map((cantripKey) => {
          const spell = findSpellByKey(cantripKey);
          return { key: cantripKey, label: spell?.name ?? cantripKey };
        });

        return (
          <span className={combatStyles.maneuverPickEntry}>
            <span className={combatStyles.maneuverPickName}>{option.name}</span>
            <span className={combatStyles.maneuverPickDesc}>{option.desc}</span>
            {cantripChoiceKey && cantripOptions.length > 0 ? (
              <Combobox
                id={`eldritch-invocation-cantrip-${slotIndex}`}
                label={t("combat.invocationCantripPick")}
                value={character.classFeatureChoices[cantripChoiceKey] ?? null}
                onChange={(optionKey) =>
                  dispatch({
                    type: "SET_CLASS_FEATURE_CHOICE",
                    choiceKey: cantripChoiceKey,
                    optionKey,
                  })
                }
                options={cantripOptions}
                placeholder={t("character.choosePlaceholder")}
              />
            ) : null}
          </span>
        );
      }}
    />
  );
}
