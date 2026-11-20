import { useEffect } from "react";
import { registerBackHandler } from "./backHandler";

/** Register a hardware-back handler while `open` is true (dialogs, drawers). */
export function useBackOverlay(open: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!open) return;

    return registerBackHandler(() => {
      onClose();
      return true;
    });
  }, [open, onClose]);
}
