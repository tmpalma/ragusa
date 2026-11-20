import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { LanguageSwitcher } from "../components/nav/LanguageSwitcher";
import { MeasurementSwitcher } from "../components/nav/MeasurementSwitcher";
import { consumeReturnPath } from "../platform/authSessionStorage";
import { isValidEmail, normalizeEmail } from "../platform/claimedIdentity";
import { useLocale } from "../i18n/LocaleContext";
import { useSession } from "../state/SessionContext";
import accountStyles from "./AccountPage.module.css";
import styles from "./LoginPage.module.css";

export function LoginPage() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { status, session, signIn } = useSession();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    document.title = `${t("account.loginTitle")} — ${t("app.pageTitle")}`;
  }, [t]);

  useEffect(() => {
    if (status === "loading") return;
    if (session) {
      navigate(consumeReturnPath(), { replace: true });
    }
  }, [status, session, navigate]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextEmail = normalizeEmail(email);
    if (!isValidEmail(nextEmail)) {
      setError(t("account.emailInvalid"));
      return;
    }

    setError(null);
    setPending(true);
    try {
      await signIn(nextEmail);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("account.loginError"));
    } finally {
      setPending(false);
    }
  }

  if (status === "loading" || session) {
    return (
      <div className={styles.page} role="status">
        {t("account.loginLoading")}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>{t("account.loginTitle")}</h1>
        <p>{t("account.loginSubtitle")}</p>
      </header>

      {error ? (
        <p className={accountStyles.error} role="alert">
          {error}
        </p>
      ) : null}

      <form className={accountStyles.form} onSubmit={(event) => void submit(event)}>
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
            />
          </div>
        </div>
        <div className={accountStyles.actions}>
          <button type="submit" className={accountStyles.button} disabled={pending}>
            {t("account.loginContinue")}
          </button>
        </div>
      </form>

      <footer className={styles.footer}>
        <LanguageSwitcher />
        <MeasurementSwitcher />
      </footer>
    </div>
  );
}
