import { useLocale } from "../../i18n/LocaleContext";
import styles from "./Form.module.css";

export function CurrencyStepper({
  id,
  value,
  onCommit,
}: {
  id: string;
  value: number;
  onCommit: (value: number) => void;
}) {
  const { t } = useLocale();

  function commitValue(nextValue: number) {
    const clamped = Math.max(0, Math.floor(nextValue));
    if (clamped !== value) onCommit(clamped);
  }

  return (
    <div className={`${styles.abilityStepper} ${styles.currencyStepper}`}>
      <button
        type="button"
        className={styles.abilityStepperBtn}
        aria-label={t("equipment.decreaseQuantity")}
        disabled={value <= 0}
        onClick={() => commitValue(value - 1)}
      >
        −
      </button>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        value={value}
        onChange={(event) => {
          const parsed = Number(event.target.value);
          commitValue(Number.isFinite(parsed) ? parsed : 0);
        }}
      />
      <button
        type="button"
        className={styles.abilityStepperBtn}
        aria-label={t("equipment.increaseQuantity")}
        onClick={() => commitValue(value + 1)}
      >
        +
      </button>
    </div>
  );
}
