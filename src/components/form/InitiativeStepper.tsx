import { useState } from "react";
import { useLocale } from "../../i18n/LocaleContext";
import styles from "./Form.module.css";

function parseInitiativeDraft(raw: string, allowIncomplete: boolean): number | null {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "-") return allowIncomplete ? null : 0;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return allowIncomplete ? null : 0;
  return Math.trunc(parsed);
}

export function InitiativeStepper({
  id,
  value,
  onChange,
  ariaLabel,
  stepperClassName,
}: {
  id?: string;
  value: number | null;
  onChange: (initiative: number | null) => void;
  ariaLabel: string;
  stepperClassName?: string;
}) {
  const { t } = useLocale();
  const [draft, setDraft] = useState(value === null ? "" : String(value));
  const [committed, setCommitted] = useState(value);

  if (value !== committed) {
    setCommitted(value);
    setDraft(value === null ? "" : String(value));
  }

  function commitValue(nextValue: number | null) {
    setDraft(nextValue === null ? "" : String(nextValue));
    if (nextValue !== value) onChange(nextValue);
  }

  function step(delta: number) {
    const parsed = parseInitiativeDraft(draft, true);
    const base = parsed ?? (delta > 0 ? 0 : -1);
    commitValue(base + delta);
  }

  return (
    <div className={`${styles.abilityStepper} ${stepperClassName ?? ""}`.trim()}>
      <button
        type="button"
        className={styles.abilityStepperBtn}
        aria-label={t("equipment.decreaseQuantity")}
        onClick={() => step(-1)}
      >
        −
      </button>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        aria-label={ariaLabel}
        value={draft}
        onChange={(event) => {
          const raw = event.target.value;
          setDraft(raw);
          const parsed = parseInitiativeDraft(raw, true);
          if (parsed !== value) onChange(parsed);
        }}
        onBlur={() => {
          const parsed = parseInitiativeDraft(draft, true);
          if (parsed === null) {
            setDraft("");
            if (value !== null) onChange(null);
            return;
          }
          setDraft(String(parsed));
          if (parsed !== value) onChange(parsed);
        }}
      />
      <button
        type="button"
        className={styles.abilityStepperBtn}
        aria-label={t("equipment.increaseQuantity")}
        onClick={() => step(1)}
      >
        +
      </button>
    </div>
  );
}
