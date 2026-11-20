import { DEATH_SAVE_MAX } from "../../domain/deathSaves";
import { NumericStepper } from "../form/NumericStepper";
import { useLocale } from "../../i18n/LocaleContext";
import styles from "./Combat.module.css";

interface DeathSavesBlockProps {
  successes: number;
  failures: number;
  onSuccessesChange: (value: number) => void;
  onFailuresChange: (value: number) => void;
  onReset: () => void;
}

function DeathSaveTrack({
  id,
  label,
  value,
  decreaseLabel,
  increaseLabel,
  currentLabel,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  decreaseLabel: string;
  increaseLabel: string;
  currentLabel: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className={styles.deathSaveTrack}>
      <p className={styles.deathSaveTrackLabel}>{label}</p>
      <NumericStepper
        id={id}
        value={value}
        max={DEATH_SAVE_MAX}
        decreaseLabel={decreaseLabel}
        increaseLabel={increaseLabel}
        currentLabel={currentLabel}
        onChange={onChange}
        controlsClassName={styles.hpControls}
        stepperClassName={styles.combatStepper}
        suffix={<span className={styles.hpMax}>/ {DEATH_SAVE_MAX}</span>}
      />
    </div>
  );
}

export function DeathSavesBlock({
  successes,
  failures,
  onSuccessesChange,
  onFailuresChange,
  onReset,
}: DeathSavesBlockProps) {
  const { t } = useLocale();
  const canReset = successes > 0 || failures > 0;

  return (
    <div className={styles.statCard}>
      <div className={styles.deathSavesGrid}>
        <DeathSaveTrack
          id="death-save-successes"
          label={t("combat.deathSaveSuccesses")}
          value={successes}
          decreaseLabel={t("combat.decreaseDeathSaveSuccesses")}
          increaseLabel={t("combat.increaseDeathSaveSuccesses")}
          currentLabel={t("combat.currentDeathSaveSuccesses")}
          onChange={onSuccessesChange}
        />
        <DeathSaveTrack
          id="death-save-failures"
          label={t("combat.deathSaveFailures")}
          value={failures}
          decreaseLabel={t("combat.decreaseDeathSaveFailures")}
          increaseLabel={t("combat.increaseDeathSaveFailures")}
          currentLabel={t("combat.currentDeathSaveFailures")}
          onChange={onFailuresChange}
        />
      </div>
      {successes >= DEATH_SAVE_MAX ? (
        <p className={styles.deathSaveStatus}>{t("combat.deathSavesStable")}</p>
      ) : failures >= DEATH_SAVE_MAX ? (
        <p className={styles.deathSaveStatus}>{t("combat.deathSavesDead")}</p>
      ) : null}
      <button
        type="button"
        className={styles.deathSavesResetButton}
        aria-label={t("combat.resetDeathSaves")}
        disabled={!canReset}
        onClick={onReset}
      >
        {t("combat.deathSavesReset")}
      </button>
    </div>
  );
}
