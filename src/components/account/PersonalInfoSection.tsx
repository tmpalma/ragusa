import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useLocale } from "../../i18n/LocaleContext";
import { getLibraryClient } from "../../platform/libraryClient";
import { libraryErrorMessage } from "../../platform/libraryErrorMessage";
import { displayNameLength, MAX_DISPLAY_NAME_LENGTH } from "../../domain/libraryLimits";
import { useSession } from "../../state/SessionContext";
import styles from "../../pages/AccountPage.module.css";
import type { AccountIdentity } from "./accountSectionTypes";

export interface PersonalInfoSectionProps {
  identity: AccountIdentity;
  pending: boolean;
}

type SaveStatus = "idle" | "saving" | "saved";

/**
 * Personal Info: signed-in email, editable display name, sign out.
 * The display-name load/save state is local to this section (AccountPage passes no `run`/`onError`).
 */
export function PersonalInfoSection({ identity, pending }: PersonalInfoSectionProps) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { endSession } = useSession();
  const [loaded, setLoaded] = useState<{ email: string; displayName: string } | null>(null);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const current = loaded && loaded.email === identity.email ? loaded : null;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const player = await getLibraryClient().getPlayer(identity.email);
        if (cancelled) return;
        setLoaded({ email: identity.email, displayName: player.displayName });
        setDraft(player.displayName);
        setStatus("idle");
        setError(null);
      } catch (caught) {
        if (!cancelled) setError(libraryErrorMessage(caught, t));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [identity.email, t]);

  function signOut() {
    void endSession("manual").then(() => {
      navigate("/login", { replace: true });
    });
  }

  function changeDraft(value: string) {
    setDraft(value);
    setError(null);
    if (status === "saved") setStatus("idle");
  }

  async function saveDisplayName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!current || status === "saving") return;
    const name = draft.trim();
    if (!name) {
      setError(t("account.displayNameRequired"));
      return;
    }
    // The input's maxLength keeps this from happening in practice; the server rejects it too.
    if (displayNameLength(name) > MAX_DISPLAY_NAME_LENGTH) return;
    setError(null);
    setStatus("saving");
    try {
      const player = await getLibraryClient().updatePlayer(identity.email, { displayName: name });
      setLoaded({ email: identity.email, displayName: player.displayName });
      setDraft(player.displayName);
      setStatus("saved");
    } catch (caught) {
      setError(libraryErrorMessage(caught, t));
      setStatus("idle");
    }
  }

  const saving = status === "saving";
  const unchanged = current != null && draft.trim() === current.displayName;
  const saveLabel = saving
    ? t("account.personalInfoSaving")
    : status === "saved" && unchanged
      ? t("account.personalInfoSaved")
      : t("account.personalInfoSave");

  return (
    <section className={styles.section} aria-labelledby="account-identity-heading">
      <h2 id="account-identity-heading">{t("account.identityTitle")}</h2>
      <p className={styles.note}>{t("account.signedInAs", { email: identity.email })}</p>
      <form className={styles.form} onSubmit={(event) => void saveDisplayName(event)} noValidate>
        <div className={styles.field}>
          <label htmlFor="account-display-name">{t("account.displayName")}</label>
          <input
            id="account-display-name"
            type="text"
            autoComplete="nickname"
            value={draft}
            maxLength={MAX_DISPLAY_NAME_LENGTH}
            onChange={(event) => changeDraft(event.target.value)}
            disabled={!current || saving}
            aria-describedby="account-display-name-hint"
            aria-invalid={error ? true : undefined}
          />
          <p id="account-display-name-hint" className={styles.hint}>
            {t("account.displayNameHint")}
          </p>
        </div>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <div className={styles.actions}>
          <button type="submit" className={styles.button} disabled={!current || saving || unchanged} aria-live="polite">
            {saveLabel}
          </button>
        </div>
      </form>
      <div className={styles.actions}>
        <button type="button" className={styles.buttonSecondary} onClick={signOut} disabled={pending}>
          {t("app.sidebar.signOut")}
        </button>
      </div>
    </section>
  );
}
