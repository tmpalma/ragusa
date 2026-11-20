import { useEffect, useRef } from "react";
import { concentrationSaveDc } from "../../domain/hitPoints";
import { findSpellByKey } from "../../domain/spellSelection";
import { formatModifier } from "../../domain/modifiers";
import { useLocale } from "../../i18n/LocaleContext";
import { useBackOverlay } from "../../platform/useBackOverlay";
import confirmStyles from "../confirm/ConfirmDialog.module.css";
import styles from "./ConcentrationCheckDialog.module.css";

export interface ConcentrationCheckDialogProps {
  open: boolean;
  spellKey: string | null;
  damageTaken: number;
  constitutionSaveModifier: number;
  hasWarCaster: boolean;
  onDismiss: () => void;
}

export function ConcentrationCheckDialog({
  open,
  spellKey,
  damageTaken,
  constitutionSaveModifier,
  hasWarCaster,
  onDismiss,
}: ConcentrationCheckDialogProps) {
  const { t, tEntity } = useLocale();
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

  useBackOverlay(open, onDismiss);

  const spell = spellKey == null ? null : findSpellByKey(spellKey);
  const spellName =
    spellKey == null
      ? ""
      : tEntity("catalog.spells", spellKey, "name", spell?.name ?? spellKey);
  const dc = concentrationSaveDc(damageTaken);

  function handleDismiss() {
    onDismiss();
  }

  return (
    <dialog
      ref={dialogRef}
      className={confirmStyles.dialog}
      onCancel={handleDismiss}
      onClose={handleDismiss}
      aria-labelledby="concentration-check-dialog-title"
    >
      <div className={confirmStyles.content}>
        <h2 id="concentration-check-dialog-title" className={styles.title}>
          {t("combat.concentrationCheckTitle")}
        </h2>
        <p className={styles.body}>
          {t("combat.concentrationCheckBody", {
            spell: spellName,
            damage: damageTaken,
          })}
        </p>
        <dl className={styles.stats}>
          <div className={styles.statRow}>
            <dt>{t("combat.concentrationCheckDc")}</dt>
            <dd>{dc}</dd>
          </div>
          <div className={styles.statRow}>
            <dt>{t("combat.concentrationCheckConSave")}</dt>
            <dd>{formatModifier(constitutionSaveModifier)}</dd>
          </div>
        </dl>
        <p className={styles.hint}>{t("spells.concentrationSaveDcRule")}</p>
        {hasWarCaster ? (
          <p className={styles.warCasterHighlight}>
            {t(
              "combat.concentrationCheckWarCaster",
              undefined,
              "War Caster: you have Advantage on this check",
            )}
          </p>
        ) : null}
        <div className={confirmStyles.actions}>
          <button type="button" className={confirmStyles.button} onClick={handleDismiss}>
            {t("combat.concentrationCheckDismiss")}
          </button>
        </div>
      </div>
    </dialog>
  );
}
