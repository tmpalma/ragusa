import type { ReactNode } from "react";
import styles from "./Form.module.css";

export function NumericStepper({
  id,
  value,
  min = 0,
  max,
  onChange,
  decreaseLabel,
  increaseLabel,
  currentLabel,
  suffix,
  controlsClassName,
  stepperClassName,
  inputClassName,
  disabled = false,
  decreaseDisabled,
  increaseDisabled,
  hideDecrease = false,
}: {
  id?: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  decreaseLabel: string;
  increaseLabel: string;
  currentLabel: string;
  suffix?: ReactNode;
  controlsClassName?: string;
  stepperClassName?: string;
  inputClassName?: string;
  disabled?: boolean;
  decreaseDisabled?: boolean;
  increaseDisabled?: boolean;
  hideDecrease?: boolean;
}) {
  const boundedMax = max != null;

  function commitValue(nextValue: number) {
    if (disabled) return;
    let clamped = Math.max(min, Math.floor(nextValue));
    if (boundedMax && max != null) clamped = Math.min(clamped, max);
    if (clamped !== value) onChange(clamped);
  }

  const canDecrease = decreaseDisabled ?? (disabled || value <= min);
  const canIncrease = increaseDisabled ?? (disabled || (boundedMax && max != null && value >= max));

  return (
    <div className={controlsClassName}>
      <div className={`${styles.abilityStepper} ${stepperClassName ?? ""}`.trim()}>
        {hideDecrease ? null : (
          <button
            type="button"
            className={styles.abilityStepperBtn}
            aria-label={decreaseLabel}
            disabled={canDecrease}
            onClick={() => commitValue(value - 1)}
          >
            −
          </button>
        )}
        <input
          id={id}
          className={inputClassName}
          type="number"
          inputMode="numeric"
          min={min}
          {...(boundedMax ? { max } : {})}
          aria-label={currentLabel}
          value={value}
          disabled={disabled}
          onChange={(event) => {
            if (disabled) return;
            const parsed = Number(event.target.value);
            if (!Number.isFinite(parsed)) return;
            commitValue(parsed);
          }}
        />
        <button
          type="button"
          className={styles.abilityStepperBtn}
          aria-label={increaseLabel}
          disabled={canIncrease}
          onClick={() => commitValue(value + 1)}
        >
          +
        </button>
      </div>
      {suffix}
    </div>
  );
}
