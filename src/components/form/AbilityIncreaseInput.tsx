import type { AbilityId } from "../../data/types";
import { useLocale } from "../../i18n/LocaleContext";
import styles from "./Form.module.css";

export function AbilityIncreaseInput({
  id,
  ability,
  value,
  max,
  disabled = false,
  onCommit,
}: {
  id: string;
  ability: AbilityId;
  value: number;
  max: number;
  disabled?: boolean;
  onCommit: (ability: AbilityId, value: number) => void;
}) {
  const { t } = useLocale();
  const locked = disabled || max <= 0;

  function commitValue(nextValue: number) {
    if (locked) return;
    const clamped = Math.max(0, Math.min(max, Math.floor(nextValue)));
    if (clamped !== value) onCommit(ability, clamped);
  }

  return (
    <div className={styles.abilityStepper}>
      <button
        type="button"
        className={styles.abilityStepperBtn}
        aria-label={t("equipment.decreaseQuantity")}
        disabled={locked || value <= 0}
        onClick={() => commitValue(value - 1)}
      >
        −
      </button>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        value={value}
        disabled={locked}
        onChange={(event) => {
          if (locked) return;
          const parsed = Number(event.target.value);
          const nextValue = Number.isFinite(parsed) ? Math.max(0, Math.min(max, Math.floor(parsed))) : 0;
          if (nextValue !== value) onCommit(ability, nextValue);
        }}
      />
      <button
        type="button"
        className={styles.abilityStepperBtn}
        aria-label={t("equipment.increaseQuantity")}
        disabled={locked || value >= max}
        onClick={() => commitValue(value + 1)}
      >
        +
      </button>
    </div>
  );
}
