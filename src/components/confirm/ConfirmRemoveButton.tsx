import { useState, type MouseEvent, type ReactNode } from "react";
import { useLocale } from "../../i18n/LocaleContext";
import { ConfirmDialog } from "./ConfirmDialog";

export interface ConfirmRemoveButtonProps {
  itemName: string;
  onConfirm: () => void;
  className?: string;
  stopPropagation?: boolean;
  children?: ReactNode;
}

export function ConfirmRemoveButton({
  itemName,
  onConfirm,
  className,
  stopPropagation = false,
  children,
}: ConfirmRemoveButtonProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (stopPropagation) {
      event.preventDefault();
      event.stopPropagation();
    }
    setOpen(true);
  }

  function handleConfirm() {
    onConfirm();
    setOpen(false);
  }

  return (
    <>
      <button type="button" className={className} onClick={handleClick}>
        {children ?? t("character.remove")}
      </button>
      <ConfirmDialog
        open={open}
        primaryAction="cancel"
        message={t(
          "character.removeConfirm",
          { item: itemName },
          "Are you sure you want to remove {item}?",
        )}
        onCancel={() => setOpen(false)}
        onConfirm={handleConfirm}
      />
    </>
  );
}