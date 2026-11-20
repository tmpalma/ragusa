import { useEffect, useId, useRef, useState } from "react";
import { displayHitPointsAfterBulkChange } from "../../domain/hitPoints";
import { useLocale } from "../../i18n/LocaleContext";
import { useBackOverlay } from "../../platform/useBackOverlay";
import confirmStyles from "../confirm/ConfirmDialog.module.css";
import styles from "./HitPointsAdjustDialog.module.css";

export type HitPointsAdjustMode = "damage" | "heal";

export interface HitPointsAdjustDialogProps {
  open: boolean;
  displayCurrent: number;
  displayCap: number;
  onConfirm: (mode: HitPointsAdjustMode, amount: number) => void;
  onCancel: () => void;
}

export function HitPointsAdjustDialog({
  open,
  displayCurrent,
  displayCap,
  onConfirm,
  onCancel,
}: HitPointsAdjustDialogProps) {
  const { t } = useLocale();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const amountId = useId();
  const [mode, setMode] = useState<HitPointsAdjustMode>("damage");
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      setMode("damage");
      setAmount(0);
      return;
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useBackOverlay(open, onCancel);

  const parsedAmount = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
  const preview = displayHitPointsAfterBulkChange({
    displayCurrent,
    displayCap,
    mode,
    amount: parsedAmount,
  });

  function handleCancel() {
    onCancel();
  }

  function handleConfirm() {
    if (parsedAmount <= 0) return;
    onConfirm(mode, parsedAmount);
  }

  return (
    <dialog
      ref={dialogRef}
      className={confirmStyles.dialog}
      onCancel={handleCancel}
      onClose={handleCancel}
      aria-labelledby="hp-adjust-dialog-title"
    >
      <div className={confirmStyles.content}>
        <h2 id="hp-adjust-dialog-title" className={styles.title}>
          {t("combat.hpAdjustTitle")}
        </h2>

        <div className={styles.modeRow} role="radiogroup" aria-label={t("combat.hpAdjustModeLabel")}>
          <label className={styles.modeOption}>
            <input
              type="radio"
              name="hp-adjust-mode"
              value="damage"
              checked={mode === "damage"}
              onChange={() => setMode("damage")}
            />
            <span>{t("combat.hpAdjustDamage")}</span>
          </label>
          <label className={styles.modeOption}>
            <input
              type="radio"
              name="hp-adjust-mode"
              value="heal"
              checked={mode === "heal"}
              onChange={() => setMode("heal")}
            />
            <span>{t("combat.hpAdjustHeal")}</span>
          </label>
        </div>

        <label className={styles.amountField} htmlFor={amountId}>
          {t("combat.hpAdjustAmount")}
          <input
            id={amountId}
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={amount === 0 ? "" : amount}
            placeholder="0"
            onChange={(event) => {
              const next = event.target.value === "" ? 0 : Number(event.target.value);
              setAmount(Number.isFinite(next) ? next : 0);
            }}
          />
        </label>

        <p className={styles.preview}>
          {t("combat.hpAdjustPreview", {
            current: displayCurrent,
            next: preview,
          })}
        </p>

        <div className={confirmStyles.actions}>
          <button type="button" className={confirmStyles.buttonSecondary} onClick={handleCancel}>
            {t("combat.hpAdjustCancel")}
          </button>
          <button
            type="button"
            className={confirmStyles.button}
            disabled={parsedAmount <= 0}
            onClick={handleConfirm}
          >
            {t("combat.hpAdjustConfirm")}
          </button>
        </div>
      </div>
    </dialog>
  );
}
