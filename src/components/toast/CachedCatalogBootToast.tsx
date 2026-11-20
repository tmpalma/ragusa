import { useEffect } from "react";
import { consumeCachedCatalogBootFlag } from "../../catalog/bootState";
import { useToast } from "./ToastContext";

/** Shown once when the app booted from a cached catalog after RPC failure. */
export function CachedCatalogBootToast() {
  const { showToast } = useToast();

  useEffect(() => {
    if (consumeCachedCatalogBootFlag()) {
      showToast("Using cached rules catalog. Some content may be out of date.", "info");
    }
  }, [showToast]);

  return null;
}
