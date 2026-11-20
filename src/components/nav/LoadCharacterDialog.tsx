import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import {
  loadCharacterFromFile,
  pickCharacterFileFromDisk,
  pickCharacterFilesFromDisk,
} from "../../domain/characterFileIo";
import type { Character } from "../../state/characterState";
import { useLocale } from "../../i18n/LocaleContext";
import { useBackOverlay } from "../../platform/useBackOverlay";
import { useToast } from "../toast/ToastContext";
import styles from "./LoadCharacterDialog.module.css";

interface LoadCharacterDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (characters: Character[]) => boolean | void;
  multiple?: boolean;
  titleKey?: string;
}

export function LoadCharacterDialog({
  open,
  onClose,
  onImport,
  multiple = false,
  titleKey = "app.loadCharacterDialogTitle",
}: LoadCharacterDialogProps) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      setDragActive(false);
      return;
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function handleDialogClose() {
    setDragActive(false);
    onClose();
  }

  useBackOverlay(open, handleDialogClose);

  async function importFiles(files: File[]) {
    if (files.length === 0) return;

    const imported: Character[] = [];
    for (const file of files) {
      try {
        imported.push(await loadCharacterFromFile(file));
      } catch (error) {
        console.error("Character load failed", error);
        showToast(t("app.loadCharacterInvalidFile"), "error");
      }
    }

    if (imported.length === 0) return;

    const shouldClose = onImport(imported);
    if (shouldClose !== false) {
      handleDialogClose();
    }
  }

  async function handleChooseFileClick() {
    try {
      if (multiple) {
        const picked = await pickCharacterFilesFromDisk(true);
        if (picked.length > 0) {
          await importFiles(picked);
          return;
        }
      } else {
        const picked = await pickCharacterFileFromDisk();
        if (picked) {
          await importFiles([picked]);
          return;
        }
      }
      fileInputRef.current?.click();
    } catch (error) {
      console.error("Character file picker failed", error);
      showToast(t("app.loadCharacterInvalidFile"), "error");
    }
  }

  async function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    await importFiles(multiple ? files : files.slice(0, 1));
  }

  function handleDragEnter(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  }

  function handleDragOver(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  }

  async function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const files = Array.from(event.dataTransfer.files);
    await importFiles(multiple ? files : files.slice(0, 1));
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      onCancel={handleDialogClose}
      onClose={handleDialogClose}
    >
      <div className={styles.content}>
        <h2 className={styles.title}>{t(titleKey)}</h2>

        <button
          type="button"
          className={dragActive ? `${styles.dropZone} ${styles.dropZoneActive}` : styles.dropZone}
          onClick={handleChooseFileClick}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <p className={styles.dropHint}>{t("app.loadCharacterDropHint")}</p>
          <p className={styles.dropSubhint}>{t("app.loadCharacterDropSubhint")}</p>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          multiple={multiple}
          hidden
          onChange={handleFileInputChange}
        />

        <div className={styles.actions}>
          <button type="button" className={styles.buttonSecondary} onClick={handleDialogClose}>
            {t("app.loadCharacterCancel")}
          </button>
          <button type="button" className={styles.button} onClick={handleChooseFileClick}>
            {t("app.loadCharacterChooseFile")}
          </button>
        </div>
      </div>
    </dialog>
  );
}
