import { useState } from "react";
import { ConfirmDialog } from "../confirm/ConfirmDialog";
import { isInitialCharacter } from "../../domain/characterFile";
import { saveCharacterToDisk } from "../../domain/characterFileIo";
import { buildSheetPayload } from "../../domain/pdfSheet/buildSheetPayload";
import { fieldMapForLocale } from "../../domain/pdfSheet/fieldMaps";
import type { Character } from "../../state/characterState";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { useToast } from "../toast/ToastContext";
import { LoadCharacterDialog } from "./LoadCharacterDialog";
import styles from "./CharacterToolbar.module.css";

export function CharacterToolbar() {
  const { character, derived, dispatch } = useCharacter();
  const { locale, t, tEntity } = useLocale();
  const { showToast } = useToast();
  const [pdfBusy, setPdfBusy] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<Character | null>(null);

  function entityName(catalog: string, key: string | null | undefined, fallback?: string) {
    return tEntity(catalog, key ?? "", "name", fallback);
  }

  async function handleDownloadPdf() {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      const { fetchCharacterSheetTemplate, fillCharacterSheetPdf, downloadFilledCharacterPdf } =
        await import("../../domain/pdfSheet/fillCharacterSheetPdf");
      const template = await fetchCharacterSheetTemplate(locale);
      const payload = buildSheetPayload(character, derived, t, entityName, tEntity);
      const filled = await fillCharacterSheetPdf(template, payload, fieldMapForLocale(locale));
      const filename = `${character.name.trim() || "character"}.pdf`;
      await downloadFilledCharacterPdf(filled, filename);
    } catch (error) {
      console.error("PDF download failed", error);
      showToast(t("sheet.downloadPdfFailed"), "error");
    } finally {
      setPdfBusy(false);
    }
  }

  async function handleSave() {
    if (!character.name.trim()) {
      showToast(t("character.nameRequired"), "error");
      return;
    }
    try {
      await saveCharacterToDisk(character);
    } catch (error) {
      console.error("Character save failed", error);
    }
  }

  return (
    <div className={styles.toolbar} aria-label={t("app.menuActions")}>
      <button type="button" className={styles.action} onClick={handleDownloadPdf} disabled={pdfBusy}>
        {pdfBusy ? t("sheet.downloadPdfBusy") : t("sheet.downloadPdf")}
      </button>
      <button type="button" className={styles.action} onClick={handleSave}>
        {t("app.save")}
      </button>
      <button type="button" className={styles.action} onClick={() => setLoadDialogOpen(true)}>
        {t("app.load")}
      </button>
      <LoadCharacterDialog
        open={loadDialogOpen}
        onClose={() => setLoadDialogOpen(false)}
        onImport={(characters) => {
          const imported = characters[0];
          if (!imported) return false;
          if (!isInitialCharacter(character)) {
            setPendingImport(imported);
            setReplaceConfirmOpen(true);
            return false;
          }
          dispatch({ type: "LOAD_CHARACTER", character: imported });
        }}
      />
      <ConfirmDialog
        open={replaceConfirmOpen}
        message={t("app.loadCharacterConfirmReplace")}
        onCancel={() => {
          setReplaceConfirmOpen(false);
          setPendingImport(null);
        }}
        onConfirm={() => {
          if (pendingImport) {
            dispatch({ type: "LOAD_CHARACTER", character: pendingImport });
          }
          setReplaceConfirmOpen(false);
          setPendingImport(null);
          setLoadDialogOpen(false);
        }}
      />
    </div>
  );
}
