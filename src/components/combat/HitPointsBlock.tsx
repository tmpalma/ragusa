import { useEffect, useState } from "react";
import { overviewHitPointsDisplay } from "../../domain/hitPoints";
import { NumericStepper } from "../form/NumericStepper";
import { useLocale } from "../../i18n/LocaleContext";
import { HitPointsAdjustDialog, type HitPointsAdjustMode } from "./HitPointsAdjustDialog";
import styles from "./Combat.module.css";

interface HitPointsBlockProps {
  maxHp: number;
  currentHp: number;
  maxHpBonus: number;
  tempMax: number | null;
  tempRemaining: number | null;
  onHpChange: (displayValue: number) => void;
  onHpBulkChange?: (mode: HitPointsAdjustMode, amount: number) => void;
  onMaxHpBonusApply: (amount: number) => void;
  onMaxHpBonusClear: () => void;
  onTempChange: (max: number | null, remaining?: number | null) => void;
}

export function HitPointsBlock({
  maxHp,
  currentHp,
  maxHpBonus,
  tempMax,
  tempRemaining,
  onHpChange,
  onHpBulkChange,
  onMaxHpBonusApply,
  onMaxHpBonusClear,
  onTempChange,
}: HitPointsBlockProps) {
  const { t } = useLocale();
  const [hpAdjustOpen, setHpAdjustOpen] = useState(false);
  const tempActive = tempMax != null && tempRemaining != null && tempRemaining > 0;
  const tempCurrent = tempRemaining ?? tempMax ?? 0;
  const hpDisplay = overviewHitPointsDisplay({
    maxHitPoints: maxHp,
    currentHitPoints: currentHp === maxHp ? null : currentHp,
    temporaryHitPointsMax: tempMax,
    temporaryHitPointsRemaining: tempRemaining,
  });
  const displayCurrent = hpDisplay?.current ?? currentHp;
  const displayMax = hpDisplay?.max ?? maxHp;
  const tempSuffix = hpDisplay?.tempSuffix ?? "";
  const tempGrant = tempActive ? tempRemaining! : 0;
  const maxBonusActive = maxHpBonus > 0;
  const [pendingMaxBonus, setPendingMaxBonus] = useState(0);
  const [pendingGrant, setPendingGrant] = useState(0);

  useEffect(() => {
    if (!tempActive) {
      setPendingGrant(0);
    }
  }, [tempActive]);

  useEffect(() => {
    if (!maxBonusActive) {
      setPendingMaxBonus(0);
    }
  }, [maxBonusActive]);

  function applyPendingMaxBonus() {
    if (pendingMaxBonus <= 0) return;
    onMaxHpBonusApply(pendingMaxBonus);
  }

  function applyPendingGrant() {
    if (pendingGrant <= 0) return;
    onTempChange(pendingGrant);
  }

  return (
    <div className={`${styles.statCard} ${styles.hpBlock}`}>
      <div className={styles.hpSections}>
        <div className={styles.hpSection}>
          <p className={styles.statLabel}>{t("combat.hitPoints")}</p>
          <NumericStepper
            id="current-hit-points"
            value={displayCurrent}
            max={displayMax + tempGrant}
            decreaseLabel={t("combat.decreaseHp")}
            increaseLabel={t("combat.increaseHp")}
            currentLabel={t("combat.currentHp")}
            onChange={onHpChange}
            controlsClassName={styles.hpControls}
            stepperClassName={styles.combatStepper}
            decreaseDisabled={displayCurrent <= 0}
            suffix={
              <span className={styles.hpMax}>
                / {displayMax}
                {tempSuffix ? <span className={styles.hpTempSuffix}>{tempSuffix}</span> : null}
              </span>
            }
          />
          {onHpBulkChange ? (
            <>
              <button
                type="button"
                className={styles.applyTempHpButton}
                onClick={() => setHpAdjustOpen(true)}
              >
                {t("combat.hpAdjustOpen")}
              </button>
              <HitPointsAdjustDialog
                open={hpAdjustOpen}
                displayCurrent={displayCurrent}
                displayCap={displayMax + tempGrant}
                onConfirm={(mode, amount) => {
                  onHpBulkChange(mode, amount);
                  setHpAdjustOpen(false);
                }}
                onCancel={() => setHpAdjustOpen(false)}
              />
            </>
          ) : null}
        </div>

        <div className={styles.hpSection}>
          <p className={styles.tempHpLabel}>{t("combat.maxHpBonus")}</p>
        {maxBonusActive ? (
          <div className={styles.tempHpGrantControls}>
            <NumericStepper
              id="max-hp-bonus-active"
              value={maxHpBonus}
              min={0}
              decreaseLabel={t("combat.decreaseMaxHpBonus")}
              increaseLabel={t("combat.increaseMaxHpBonus")}
              currentLabel={t("combat.currentMaxHpBonus")}
              onChange={(next) => {
                if (next <= 0) onMaxHpBonusClear();
                else onMaxHpBonusApply(next);
              }}
              controlsClassName={styles.hpControls}
              stepperClassName={`${styles.combatStepper} ${styles.combatStepperTemp}`}
              hideDecrease={maxHpBonus <= 0}
            />
            <button
              type="button"
              className={`${styles.tempHpAddButton} ${styles.tempHpAddButtonReady}`}
              aria-label={t("combat.clearMaxHpBonus")}
              onClick={onMaxHpBonusClear}
            >
              {t("combat.clearMaxHpBonus")}
            </button>
          </div>
        ) : (
          <div className={styles.tempHpGrantControls}>
            <NumericStepper
              id="max-hp-bonus-grant"
              value={pendingMaxBonus}
              min={0}
              decreaseLabel={t("combat.decreaseMaxHpBonusGrant")}
              increaseLabel={t("combat.increaseMaxHpBonusGrant")}
              currentLabel={t("combat.maxHpBonusGrant")}
              onChange={setPendingMaxBonus}
              controlsClassName={styles.hpControls}
              stepperClassName={`${styles.combatStepper} ${styles.combatStepperTemp}`}
              hideDecrease={pendingMaxBonus <= 0}
            />
            <button
              type="button"
              className={`${styles.tempHpAddButton} ${pendingMaxBonus > 0 ? styles.tempHpAddButtonReady : ""}`}
              aria-label={t("combat.applyMaxHpBonus")}
              disabled={pendingMaxBonus <= 0}
              onClick={applyPendingMaxBonus}
            >
              {t("combat.applyMaxHpBonus")}
            </button>
          </div>
        )}
        </div>

        <div className={styles.hpSection}>
          <p className={styles.tempHpLabel}>{t("combat.tempHitPoints")}</p>
        {tempActive ? (
          <NumericStepper
            id="temp-hit-points"
            value={tempCurrent}
            min={0}
            max={tempMax ?? undefined}
            decreaseLabel={t("combat.decreaseTempHp")}
            increaseLabel={t("combat.increaseTempHp")}
            currentLabel={t("combat.currentTempHp")}
            onChange={(next) => {
              if (next <= 0) onTempChange(null);
              else onTempChange(tempMax!, next);
            }}
            controlsClassName={styles.hpControls}
            stepperClassName={`${styles.combatStepper} ${styles.combatStepperTemp}`}
            suffix={<span className={styles.hpMax}>/ {tempMax}</span>}
          />
        ) : (
          <div className={styles.tempHpGrantControls}>
            <NumericStepper
              id="temp-hit-points-grant"
              value={pendingGrant}
              min={0}
              decreaseLabel={t("combat.decreaseTempHpGrant")}
              increaseLabel={t("combat.increaseTempHpGrant")}
              currentLabel={t("combat.tempHitPointsGrant")}
              onChange={setPendingGrant}
              controlsClassName={styles.hpControls}
              stepperClassName={`${styles.combatStepper} ${styles.combatStepperTemp}`}
              hideDecrease={pendingGrant <= 0}
            />
            <button
              type="button"
              className={`${styles.tempHpAddButton} ${pendingGrant > 0 ? styles.tempHpAddButtonReady : ""}`}
              aria-label={t("combat.addTempHitPoints")}
              disabled={pendingGrant <= 0}
              onClick={applyPendingGrant}
            >
              {t("combat.addTempHitPoints")}
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
