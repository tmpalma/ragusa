import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useLocale } from "../../i18n/LocaleContext";
import { flushAllPersist } from "../../platform/persistFlush";
import {
  isIdleExpired,
  readSessionIdleMs,
  shouldShowIdleWarning,
} from "../../platform/sessionIdle";
import { useSession } from "../../state/SessionContext";
import styles from "./SessionIdleMonitor.module.css";

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "touchstart", "scroll"] as const;

export function SessionIdleMonitor() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { session, endSession } = useSession();
  const idleMs = readSessionIdleMs();
  const [warningVisible, setWarningVisible] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const endingRef = useRef(false);
  const warnedRef = useRef(false);

  const touchActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setWarningVisible(false);
  }, []);

  useEffect(() => {
    if (!session) {
      setWarningVisible(false);
      return;
    }

    lastActivityRef.current = Date.now();
    endingRef.current = false;
    warnedRef.current = false;

    function onActivity() {
      if (document.visibilityState === "hidden") return;
      touchActivity();
    }

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, onActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", onActivity);

    const interval = window.setInterval(() => {
      const now = Date.now();
      const last = lastActivityRef.current;

      if (isIdleExpired(last, now, idleMs)) {
        if (endingRef.current) return;
        endingRef.current = true;
        setWarningVisible(false);
        void endSession("idle").then(() => {
          navigate("/login", { replace: true, state: { idleExpired: true } });
        });
        return;
      }

      const showWarning = shouldShowIdleWarning(last, now, idleMs);
      if (showWarning && !warnedRef.current) {
        warnedRef.current = true;
        void flushAllPersist();
      }
      if (!showWarning) {
        warnedRef.current = false;
      }
      setWarningVisible(showWarning);
    }, 1000);

    return () => {
      window.clearInterval(interval);
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, onActivity);
      }
      document.removeEventListener("visibilitychange", onActivity);
    };
  }, [session, idleMs, endSession, navigate, touchActivity]);

  useEffect(() => {
    if (!session) return;

    function onPageHide() {
      void flushAllPersist();
    }

    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [session]);

  if (!session || !warningVisible) return null;

  return (
    <div className={styles.banner} role="dialog" aria-labelledby="session-idle-title">
      <p id="session-idle-title">{t("account.sessionIdleWarning")}</p>
      <button type="button" className={styles.button} onClick={touchActivity}>
        {t("account.sessionIdleStay")}
      </button>
    </div>
  );
}
