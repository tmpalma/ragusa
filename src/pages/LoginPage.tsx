import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { LanguageSwitcher } from "../components/nav/LanguageSwitcher";
import { MeasurementSwitcher } from "../components/nav/MeasurementSwitcher";
import { AuthFlowError } from "../platform/authBackend";
import { consumeReturnPath } from "../platform/authSessionStorage";
import { isValidEmail, normalizeEmail } from "../platform/email";
import { useLocale } from "../i18n/LocaleContext";
import { useSession } from "../state/SessionContext";
import accountStyles from "./AccountPage.module.css";
import styles from "./LoginPage.module.css";

/** Seconds before "Resend email" is enabled again after a send. */
const RESEND_COOLDOWN_SECONDS = 30;
const OTP_LENGTH = 6;

type Busy = "send" | "verify" | "resend" | null;

export function LoginPage() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { status, session, authMode, endReason, requestOtp, verifyOtp } = useSession();
  const [email, setEmail] = useState("");
  /** Email the code was sent to; non-null means step 2 ("check your inbox"). */
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    document.title = `${t("account.loginTitle")} — ${t("app.pageTitle")}`;
  }, [t]);

  useEffect(() => {
    if (status === "loading") return;
    if (session) {
      navigate(consumeReturnPath(), { replace: true });
    }
  }, [status, session, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  function requestErrorMessage(caught: unknown): string {
    if (caught instanceof AuthFlowError && caught.code === "invalid_email") return t("account.emailInvalid");
    return t("account.loginError");
  }

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextEmail = normalizeEmail(email);
    if (!isValidEmail(nextEmail)) {
      setError(t("account.emailInvalid"));
      return;
    }

    setError(null);
    setNotice(null);
    setBusy("send");
    try {
      const result = await requestOtp(nextEmail);
      if (result === "code_sent") {
        setSentTo(nextEmail);
        setCode("");
        setCooldown(RESEND_COOLDOWN_SECONDS);
      }
    } catch (caught) {
      setError(requestErrorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sentTo) return;
    const token = code.replace(/\D/g, "");
    if (token.length !== OTP_LENGTH) {
      setError(t("account.loginCodeInvalid"));
      return;
    }

    setError(null);
    setNotice(null);
    setBusy("verify");
    try {
      await verifyOtp(sentTo, token);
    } catch (caught) {
      const invalid = caught instanceof AuthFlowError && caught.code === "invalid_code";
      setError(invalid ? t("account.loginCodeInvalid") : t("account.loginError"));
    } finally {
      setBusy(null);
    }
  }

  async function resend() {
    if (!sentTo || cooldown > 0) return;
    setError(null);
    setNotice(null);
    setBusy("resend");
    try {
      await requestOtp(sentTo);
      setNotice(t("account.loginResent"));
      setCode("");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (caught) {
      setError(requestErrorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  function changeEmail() {
    setSentTo(null);
    setCode("");
    setError(null);
    setNotice(null);
    setCooldown(0);
  }

  if (status === "loading" || session) {
    return (
      <div className={styles.page} role="status">
        {t("account.loginLoading")}
      </div>
    );
  }

  const endNotice =
    endReason === "expired"
      ? t("account.sessionExpired")
      : endReason === "idle"
        ? t("account.sessionIdleExpired")
        : null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>{sentTo ? t("account.loginCheckInbox") : t("account.loginTitle")}</h1>
        <p>
          {sentTo
            ? t("account.loginCheckInboxHint", { email: sentTo })
            : authMode === "supabase"
              ? t("account.loginSubtitleOtp")
              : t("account.loginSubtitle")}
        </p>
      </header>

      {endNotice && !sentTo ? (
        <p className={accountStyles.note} role="status">
          {endNotice}
        </p>
      ) : null}

      {error ? (
        <p className={accountStyles.error} role="alert">
          {error}
        </p>
      ) : null}

      {notice ? (
        <p className={accountStyles.note} role="status">
          {notice}
        </p>
      ) : null}

      {sentTo ? (
        <form className={accountStyles.form} onSubmit={(event) => void submitCode(event)}>
          <div className={accountStyles.fields}>
            <div className={accountStyles.field}>
              <label htmlFor="login-code">{t("account.loginCodeLabel")}</label>
              <input
                id="login-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={OTP_LENGTH}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
                disabled={busy === "verify"}
                autoFocus
              />
            </div>
          </div>
          <div className={accountStyles.actions}>
            <button type="submit" className={accountStyles.button} disabled={busy != null}>
              {busy === "verify" ? t("account.loginVerifying") : t("account.loginVerify")}
            </button>
            <button
              type="button"
              className={accountStyles.buttonSecondary}
              onClick={() => void resend()}
              disabled={busy != null || cooldown > 0}
            >
              {busy === "resend" ? t("account.loginSending") : t("account.loginResend")}
            </button>
            <button
              type="button"
              className={accountStyles.buttonSecondary}
              onClick={changeEmail}
              disabled={busy != null}
            >
              {t("account.loginUseDifferentEmail")}
            </button>
          </div>
        </form>
      ) : (
        <form className={accountStyles.form} onSubmit={(event) => void submitEmail(event)}>
          <div className={accountStyles.fields}>
            <div className={accountStyles.field}>
              <label htmlFor="login-email">{t("account.email")}</label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={busy === "send"}
              />
            </div>
          </div>
          <div className={accountStyles.actions}>
            <button type="submit" className={accountStyles.button} disabled={busy != null}>
              {authMode === "supabase"
                ? busy === "send"
                  ? t("account.loginSending")
                  : t("account.loginSendLink")
                : t("account.loginContinue")}
            </button>
          </div>
        </form>
      )}

      <footer className={styles.footer}>
        <LanguageSwitcher />
        <MeasurementSwitcher />
      </footer>
    </div>
  );
}
