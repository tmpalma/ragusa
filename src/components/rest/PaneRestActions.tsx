import { useState, type ReactNode } from "react";
import { ConfirmDialog } from "../confirm/ConfirmDialog";
import { isInitialCharacter } from "../../domain/characterFile";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { useToast } from "../toast/ToastContext";
import styles from "./Rest.module.css";

type RestKind = "short" | "long";

export function PaneRestActions() {
  const { dispatch } = useCharacter();
  const { t } = useLocale();
  const { showToast } = useToast();

  function applyRest(kind: RestKind) {
    dispatch({ type: "APPLY_REST", kind });
    showToast(t(kind === "short" ? "app.shortRestComplete" : "app.longRestComplete"), "info");
  }

  return (
    <div className={styles.restActions}>
      <button
        type="button"
        className={styles.restButton}
        aria-label={t("app.shortRestAriaLabel")}
        onClick={() => applyRest("short")}
      >
        {t("app.shortRest")}
      </button>
      <button
        type="button"
        className={styles.restButton}
        aria-label={t("app.longRestAriaLabel")}
        onClick={() => applyRest("long")}
      >
        {t("app.longRest")}
      </button>
    </div>
  );
}

export function NewCharacterAction() {
  const { character, dispatch } = useCharacter();
  const { t } = useLocale();
  const { showToast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleNew() {
    if (!isInitialCharacter(character)) {
      setConfirmOpen(true);
      return;
    }
    dispatch({ type: "NEW_CHARACTER" });
    showToast(t("app.newCharacterComplete"), "info");
  }

  function confirmNew() {
    dispatch({ type: "NEW_CHARACTER" });
    showToast(t("app.newCharacterComplete"), "info");
    setConfirmOpen(false);
  }

  return (
    <>
      <div className={styles.restActions}>
        <button
          type="button"
          className={styles.restButton}
          aria-label={t("app.newAriaLabel")}
          onClick={handleNew}
        >
          {t("app.new")}
        </button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        message={t("app.newCharacterConfirmReplace")}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmNew}
      />
    </>
  );
}

export function PaneHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className={styles.paneHeader}>
      <h2>{title}</h2>
      {actions}
    </div>
  );
}
