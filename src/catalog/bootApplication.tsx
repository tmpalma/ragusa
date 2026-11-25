import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { markUsedCachedCatalogOnBoot } from "./bootState";
import { readCatalogCache, saveCatalogCache } from "./catalogCache";
import { fetchCatalogFromSupabase } from "./fetchCatalog";
import { installCatalog } from "./installCatalog";

function renderLoading(root: HTMLElement): void {
  root.innerHTML =
    '<div style="font-family:system-ui,sans-serif;padding:2rem;color:#e8e8e8;background:#121212;min-height:100vh;box-sizing:border-box">Loading rules catalog…</div>';
}

function renderError(root: HTMLElement, message: string): void {
  root.innerHTML = `<div style="font-family:system-ui,sans-serif;padding:2rem;color:#e8e8e8;background:#121212;min-height:100vh;box-sizing:border-box"><h1 style="font-size:1.25rem;margin:0 0 0.75rem">Could not load catalog</h1><p style="margin:0;line-height:1.5">${message}</p></div>`;
}

export async function bootApplication(): Promise<void> {
  const rootEl = document.getElementById("root");
  if (!rootEl) throw new Error("Missing #root element");

  renderLoading(rootEl);

  let payload = null;
  let fromCache = false;

  try {
    payload = await fetchCatalogFromSupabase();
  } catch {
    payload = await readCatalogCache();
    fromCache = payload !== null;
  }

  if (payload && !fromCache) {
    try {
      await saveCatalogCache(payload);
    } catch {
      /* use fresh payload either way */
    }
  }

  if (!payload) {
    renderError(
      rootEl,
      "The rules catalog could not be downloaded and no cached copy is available on this device. Check your network connection and Supabase configuration, then reload.",
    );
    return;
  }

  installCatalog(payload);
  if (fromCache) markUsedCachedCatalogOnBoot();

  const [{ default: App }, { LocaleProvider }, { MeasurementProvider }, { ToastProvider }, { setupNativeShell }] =
    await Promise.all([
      import("../App.tsx"),
      import("../i18n/LocaleContext.tsx"),
      import("../platform/measurementSystem.tsx"),
      import("../components/toast/ToastContext.tsx"),
      import("../platform/nativeSetup.ts"),
    ]);

  await setupNativeShell();

  createRoot(rootEl).render(
    <StrictMode>
      <LocaleProvider>
        <MeasurementProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </MeasurementProvider>
      </LocaleProvider>
    </StrictMode>,
  );
}
