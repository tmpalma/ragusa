import { useState } from "react";
import { ABILITIES } from "../../data/skills";
import {
  ABILITY_SCORE_INCREASE_BUDGET,
  abilityScoresAfterIncreases,
  maxAbilityScoreIncreaseForAbility,
  totalAbilityScoreIncreases,
} from "../../domain/abilityScoreIncreases";
import { abilityModifier, formatModifier } from "../../domain/modifiers";
import { MAX_POINT_BUY_SCORE, MIN_POINT_BUY_SCORE, totalPointBuyCost } from "../../domain/pointBuy";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { useToast } from "../toast/ToastContext";
import type { AbilityScoreMethod } from "../../state/characterState";
import { AbilityIncreaseInput } from "./AbilityIncreaseInput";
import styles from "./Form.module.css";

const MIN_CUSTOM_SCORE = 1;
const MAX_CUSTOM_SCORE = 30;

function parseAbilityScore(
  raw: string,
  min: number,
  max: number,
  clampOutOfRange: boolean,
): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (clampOutOfRange) {
    return Math.min(max, Math.max(min, n));
  }
  if (n < min || n > max) return null;
  return n;
}

function AbilityScoreInput({
  id,
  value,
  min,
  max,
  onCommit,
}: {
  id: string;
  value: number;
  min: number;
  max: number;
  onCommit: (value: number) => void;
}) {
  const { t } = useLocale();
  const [draft, setDraft] = useState(String(value));
  const [committed, setCommitted] = useState(value);
  if (value !== committed) {
    setCommitted(value);
    setDraft(String(value));
  }

  function commitValue(nextValue: number) {
    const clamped = Math.min(max, Math.max(min, nextValue));
    setDraft(String(clamped));
    if (clamped !== value) onCommit(clamped);
  }

  function step(delta: number) {
    const parsed = parseAbilityScore(draft, min, max, true);
    commitValue((parsed ?? value) + delta);
  }

  const current = parseAbilityScore(draft, min, max, true) ?? value;

  return (
    <div className={styles.abilityStepper}>
      <button
        type="button"
        className={styles.abilityStepperBtn}
        aria-label={t("equipment.decreaseQuantity")}
        disabled={current <= min}
        onClick={() => step(-1)}
      >
        −
      </button>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={draft}
        onChange={(event) => {
          const raw = event.target.value;
          setDraft(raw);
          const parsed = parseAbilityScore(raw, min, max, false);
          if (parsed !== null && parsed !== value) onCommit(parsed);
        }}
        onBlur={() => {
          const parsed = parseAbilityScore(draft, min, max, true);
          if (parsed === null) {
            setDraft(String(value));
            return;
          }
          setDraft(String(parsed));
          if (parsed !== value) onCommit(parsed);
        }}
      />
      <button
        type="button"
        className={styles.abilityStepperBtn}
        aria-label={t("equipment.increaseQuantity")}
        disabled={current >= max}
        onClick={() => step(1)}
      >
        +
      </button>
    </div>
  );
}

const SCORE_METHODS: { id: AbilityScoreMethod; labelKey: string }[] = [
  { id: "custom", labelKey: "character.method.custom" },
  { id: "standardArray", labelKey: "character.method.standardArray" },
  { id: "pointBuy", labelKey: "character.method.pointBuy" },
];

export function AbilityScoresInput() {
  const { character, dispatch } = useCharacter();
  const { t } = useLocale();
  const { showToast } = useToast();
  const hasClass = character.classKey !== null;
  const isPointBuy = character.abilityScoreMethod === "pointBuy";
  const min = isPointBuy ? MIN_POINT_BUY_SCORE : MIN_CUSTOM_SCORE;
  const max = isPointBuy ? MAX_POINT_BUY_SCORE : MAX_CUSTOM_SCORE;
  const scoresBeforeFeats = abilityScoresAfterIncreases(character.abilityScores, character.abilityScoreIncreases);
  const extraPointsSpent = totalAbilityScoreIncreases(character.abilityScoreIncreases);

  return (
    <div className={styles.field}>
      <div className={styles.methodGroup} role="radiogroup" aria-label={t("character.abilityScoreMethodAriaLabel")}>
        {SCORE_METHODS.map(({ id, labelKey }) => (
          <label key={id} className={styles.wornLabel}>
            <input
              type="radio"
              name="ability-score-method"
              value={id}
              checked={character.abilityScoreMethod === id}
              onChange={() => {
                if (id === "standardArray" && !hasClass) {
                  showToast(t("character.chooseClassFirst"), "error");
                  return;
                }
                dispatch({ type: "SET_ABILITY_SCORE_METHOD", method: id });
              }}
            />
            {t(labelKey)}
          </label>
        ))}
      </div>
      {!hasClass && <p className={styles.hint}>{t("character.chooseClassForStandardArray")}</p>}
      <p className={styles.hint}>
        {t("character.extraPointsUsed", { spent: extraPointsSpent, total: ABILITY_SCORE_INCREASE_BUDGET })}
      </p>
      <table className={`${styles.skillsTable} ${styles.abilityTable}`}>
        <thead>
          <tr>
            <th scope="col">{t("character.abilityColumn")}</th>
            <th scope="col">{t("character.scoreColumn")}</th>
            <th scope="col">{t("character.extraColumn")}</th>
            <th scope="col">{t("character.valueColumn")}</th>
            <th scope="col" className={styles.abilityModifierCol}>
              {t("character.modifierColumn")}
            </th>
          </tr>
        </thead>
        <tbody>
          {ABILITIES.map(({ id }) => {
            const score = character.abilityScores[id];
            const extra = character.abilityScoreIncreases[id];
            const value = scoresBeforeFeats[id];
            const modifier = formatModifier(abilityModifier(value));
            const maxExtra = maxAbilityScoreIncreaseForAbility(character.abilityScoreIncreases, id);

            return (
              <tr key={id}>
                <th scope="row">{t(`rules.ability.${id}`)}</th>
                <td>
                  <AbilityScoreInput
                    id={`ability-${id}`}
                    value={score}
                    min={min}
                    max={max}
                    onCommit={(nextValue) => dispatch({ type: "SET_ABILITY_SCORE", ability: id, value: nextValue })}
                  />
                </td>
                <td>
                  <AbilityIncreaseInput
                    id={`ability-extra-${id}`}
                    ability={id}
                    value={extra}
                    max={maxExtra}
                    onCommit={(ability, nextValue) =>
                      dispatch({
                        type: "SET_ABILITY_SCORE_INCREASES",
                        abilityScoreIncreases: {
                          ...character.abilityScoreIncreases,
                          [ability]: nextValue,
                        },
                      })
                    }
                  />
                </td>
                <td className={styles.abilityValueCell}>{value}</td>
                <td className={`${styles.abilityModifierCell} ${styles.abilityModifierCol}`}>{modifier}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {isPointBuy && (
        <p className={styles.hint}>{t("character.pointsUsed", { count: totalPointBuyCost(character.abilityScores) })}</p>
      )}
    </div>
  );
}
