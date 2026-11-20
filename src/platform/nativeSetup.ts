import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Keyboard, KeyboardResize } from "@capacitor/keyboard";
import { StatusBar, Style } from "@capacitor/status-bar";
import { handleHardwareBack } from "./backHandler";

/** One-time native shell setup (StatusBar, Keyboard, hardware back). No-op on web. */
export async function setupNativeShell(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setStyle({ style: Style.Dark });
  } catch (error) {
    console.warn("StatusBar setup failed", error);
  }

  try {
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
  } catch (error) {
    console.warn("Keyboard setup failed", error);
  }

  try {
    await App.addListener("backButton", () => {
      if (!handleHardwareBack()) {
        void App.minimizeApp();
      }
    });
  } catch (error) {
    console.warn("Hardware back setup failed", error);
  }
}
