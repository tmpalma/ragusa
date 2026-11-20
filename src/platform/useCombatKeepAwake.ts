import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { KeepAwake } from "@capacitor-community/keep-awake";
import { loadCombatKeepAwakeEnabled, saveCombatKeepAwakeEnabled } from "./deviceSettings";

/** Combat screen keep-awake preference (device storage, not character JSON). */
export function useCombatKeepAwake(visible: boolean) {
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadCombatKeepAwakeEnabled().then((value) => {
      if (!cancelled) {
        setEnabled(value);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setKeepAwakeEnabled = useCallback(async (value: boolean) => {
    setEnabled(value);
    await saveCombatKeepAwakeEnabled(value);
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !loaded) return;

    let appActive = true;

    async function applyKeepAwake() {
      if (visible && enabled && appActive) {
        await KeepAwake.keepAwake();
      } else {
        await KeepAwake.allowSleep();
      }
    }

    void applyKeepAwake();

    const pauseHandle = App.addListener("pause", () => {
      appActive = false;
      void KeepAwake.allowSleep();
    });
    const resumeHandle = App.addListener("resume", () => {
      appActive = true;
      void applyKeepAwake();
    });

    return () => {
      void KeepAwake.allowSleep();
      void pauseHandle.then((listener) => listener.remove());
      void resumeHandle.then((listener) => listener.remove());
    };
  }, [visible, enabled, loaded]);

  return { enabled, setKeepAwakeEnabled, loaded };
}
