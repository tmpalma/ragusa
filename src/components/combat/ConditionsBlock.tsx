import { useMemo } from "react";
import { CONDITIONS, findByKey } from "../../data";
import { EXHAUSTION_CONDITION_KEY, EXHAUSTION_LEVEL_MAX } from "../../domain/conditions";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { ConfirmRemoveButton } from "../confirm/ConfirmRemoveButton";
import { CollapsiblePane } from "../CollapsiblePane";
import { CappedPickList } from "../form/CappedPickList";
import { ConditionPickDescription } from "./ConditionPickDescription";
import { ResourceCounter } from "./ResourceCounter";
import styles from "./Combat.module.css";

export function ConditionsBlock() {
  const { character, dispatch } = useCharacter();
  const { t, tEntity } = useLocale();

  const pickedSet = useMemo(() => new Set(character.conditionKeys), [character.conditionKeys]);

  const options = useMemo(
    () =>
      CONDITIONS.filter((condition) => !pickedSet.has(condition.key)).map((condition) => ({
        key: condition.key,
        label: tEntity("catalog.conditions", condition.key, "name", condition.name),
      })),
    [pickedSet, tEntity],
  );

  return (
    <div className={styles.conditionsBlock}>
      <CappedPickList
        id="combat-condition-select"
        groupLabel=""
        comboboxLabel={t("combat.condition")}
        placeholder={t("combat.conditionPlaceholder")}
        options={options}
        selectedKeys={character.conditionKeys}
        showSelectedList={false}
        onAdd={(conditionKey) => dispatch({ type: "ADD_CONDITION", conditionKey })}
        onRemove={() => {}}
        renderSelected={() => null}
      />
      {character.conditionKeys.length > 0 ? (
        <div className={styles.cards}>
          {character.conditionKeys.map((key) => {
            const condition = findByKey(CONDITIONS, key);
            if (!condition) return null;

            const name = tEntity("catalog.conditions", key, "name", condition.name);
            const desc = tEntity("catalog.conditions", key, "desc", condition.desc);

            return (
              <CollapsiblePane
                key={key}
                variant="nested"
                defaultOpen={false}
                title={name}
                summaryActions={
                  <ConfirmRemoveButton
                    className={styles.conditionPickRemove}
                    stopPropagation
                    itemName={name}
                    onConfirm={() => dispatch({ type: "REMOVE_CONDITION", conditionKey: key })}
                  />
                }
              >
                <div className={styles.conditionPickEntry}>
                  <ConditionPickDescription description={desc} />
                  {key === EXHAUSTION_CONDITION_KEY ? (
                    <div className={styles.conditionTracker}>
                      <ResourceCounter
                        id="condition-exhaustion-level"
                        label={t("combat.exhaustionLevel")}
                        current={character.exhaustionLevel}
                        max={EXHAUSTION_LEVEL_MAX}
                        decreaseLabel={t("combat.decreaseExhaustionLevel")}
                        increaseLabel={t("combat.increaseExhaustionLevel")}
                        currentLabel={t("combat.currentExhaustionLevel")}
                        onChange={(value) => dispatch({ type: "SET_EXHAUSTION_LEVEL", value })}
                      />
                    </div>
                  ) : (
                    <div className={styles.conditionTracker}>
                      <ResourceCounter
                        id={`condition-rounds-${key}`}
                        label={t("combat.conditionRoundsRemaining")}
                        current={character.conditionRoundsRemaining[key] ?? 0}
                        decreaseLabel={t("combat.decreaseConditionRounds", { condition: name })}
                        increaseLabel={t("combat.increaseConditionRounds", { condition: name })}
                        currentLabel={t("combat.currentConditionRounds", { condition: name })}
                        onChange={(value) =>
                          dispatch({ type: "SET_CONDITION_ROUNDS", conditionKey: key, value })
                        }
                      />
                    </div>
                  )}
                </div>
              </CollapsiblePane>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
