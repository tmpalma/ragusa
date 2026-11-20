import { NumericStepper } from "../form/NumericStepper";
import styles from "./Combat.module.css";

interface ResourceCounterProps {
  id?: string;
  label: string;
  current: number;
  /** When omitted, the counter has no upper cap and hides the max display. */
  max?: number;
  decreaseLabel: string;
  increaseLabel: string;
  currentLabel: string;
  onChange: (value: number) => void;
  inputClassName?: string;
}

export function ResourceCounter({
  id,
  label,
  current,
  max,
  decreaseLabel,
  increaseLabel,
  currentLabel,
  onChange,
  inputClassName,
}: ResourceCounterProps) {
  const bounded = max != null;

  return (
    <div className={styles.statCard}>
      <p className={styles.statLabel}>{label}</p>
      <NumericStepper
        id={id}
        value={current}
        max={max}
        decreaseLabel={decreaseLabel}
        increaseLabel={increaseLabel}
        currentLabel={currentLabel}
        onChange={onChange}
        controlsClassName={styles.hpControls}
        stepperClassName={styles.combatStepper}
        inputClassName={inputClassName}
        suffix={bounded ? <span className={styles.hpMax}>/ {max}</span> : undefined}
      />
    </div>
  );
}
