import { useEffect, useRef } from "react";
import { useLocale } from "../../i18n/LocaleContext";
import { useBackOverlay } from "../../platform/useBackOverlay";
import styles from "./ConfirmDialog.module.css";

export interface ConfirmDialogProps {
  open: boolean;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** When `cancel`, Cancel is accent-filled and trailing (for accidental-click flows). */
  primaryAction?: "confirm" | "cancel";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  message,
  confirmLabel,
  cancelLabel,
  primaryAction = "confirm",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useLocale();
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      return;
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function handleCancel() {
    onCancel();
  }

  function handleConfirm() {
    onConfirm();
  }

  useBackOverlay(open, handleCancel);

  const cancelLabelResolved = cancelLabel ?? t("app.loadCharacterCancel");
  const confirmLabelResolved = confirmLabel ?? t("app.confirmAction");
  const cancelIsPrimary = primaryAction === "cancel";

  const cancelButton = (
    <button
      type="button"
      className={cancelIsPrimary ? styles.button : styles.buttonSecondary}
      onClick={handleCancel}
    >
      {cancelLabelResolved}
    </button>
  );
  const confirmButton = (
    <button
      type="button"
      className={cancelIsPrimary ? styles.buttonSecondary : styles.button}
      onClick={handleConfirm}
    >
      {confirmLabelResolved}
    </button>
  );

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      onCancel={handleCancel}
      onClose={handleCancel}
      aria-labelledby="confirm-dialog-message"
    >
      <div className={styles.content}>
        <p id="confirm-dialog-message" className={styles.message}>{message}</p>
        <div className={styles.actions}>
          {cancelIsPrimary ? (
            <>
              {confirmButton}
              {cancelButton}
            </>
          ) : (
            <>
              {cancelButton}
              {confirmButton}
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
