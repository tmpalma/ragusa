import { useState, type FormEvent } from "react";
import { useLocale } from "../../i18n/LocaleContext";
import {
  clearClaimedIdentity,
  isValidEmail,
  normalizeEmail,
  saveClaimedIdentity,
  type ClaimedIdentity,
} from "../../platform/claimedIdentity";
import { loadPlayerLastCampaign, loadPlayerLastCharacter } from "../../platform/characterPersist";
import {
  clearLibraryCharacterBinding,
  getLibraryClient,
  setLibraryCampaignBinding,
} from "../../platform/libraryClient";
import { useCampaign } from "../../state/CampaignContext";
import { INITIAL_CHARACTER } from "../../state/characterState";
import { useCharacter } from "../../state/CharacterContext";
import styles from "../../pages/AccountPage.module.css";
import type { RunAccountAction } from "./accountSectionTypes";

export interface PersonalInfoSectionProps {
  identity: ClaimedIdentity | null;
  pending: boolean;
  run: RunAccountAction;
  onError: (message: string | null) => void;
  /** Called after the claimed identity is saved (next) or forgotten (null). */
  onIdentityChange: (next: ClaimedIdentity | null) => void;
}

export function PersonalInfoSection({ identity, pending, run, onError, onIdentityChange }: PersonalInfoSectionProps) {
  const { t } = useLocale();
  const { dispatch: characterDispatch } = useCharacter();
  const { dispatch: campaignDispatch } = useCampaign();
  const [editing, setEditing] = useState(() => identity == null);
  const [email, setEmail] = useState(() => identity?.email ?? "");

  async function restoreLocalPlay(forEmail: string): Promise<void> {
    const [storedCharacter, storedMembers] = await Promise.all([
      loadPlayerLastCharacter(forEmail),
      loadPlayerLastCampaign(forEmail),
    ]);
    clearLibraryCharacterBinding();
    setLibraryCampaignBinding(null);
    characterDispatch({
      type: "LOAD_CHARACTER",
      character: storedCharacter ?? INITIAL_CHARACTER,
    });
    campaignDispatch({ type: "HYDRATE_MEMBERS", members: storedMembers });
  }

  function submitIdentity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextEmail = normalizeEmail(email);
    if (!isValidEmail(nextEmail)) {
      onError(t("account.emailInvalid"));
      return;
    }
    const nextIdentity = { email: nextEmail };
    void run(async () => {
      const previous = identity;
      saveClaimedIdentity(nextIdentity);
      await getLibraryClient().ensurePlayer(nextIdentity.email);
      if (previous && previous.email !== nextIdentity.email) {
        await restoreLocalPlay(nextIdentity.email);
      }
      onIdentityChange(nextIdentity);
      setEditing(false);
    });
  }

  function forgetIdentity() {
    void run(async () => {
      const previousEmail = identity?.email;
      clearClaimedIdentity();
      if (previousEmail) {
        await restoreLocalPlay(previousEmail);
      } else {
        clearLibraryCharacterBinding();
        setLibraryCampaignBinding(null);
        characterDispatch({ type: "LOAD_CHARACTER", character: INITIAL_CHARACTER });
        campaignDispatch({ type: "HYDRATE_MEMBERS", members: [] });
      }
      onIdentityChange(null);
      setEditing(true);
      setEmail("");
    });
  }

  return (
    <section className={styles.section} aria-labelledby="account-identity-heading">
      <h2 id="account-identity-heading">{t("account.identityTitle")}</h2>
      {identity && !editing ? (
        <>
          <p className={styles.note}>
            {t("account.claimedAs", { email: identity.email })}
          </p>
          <div className={styles.actions}>
            <button type="button" className={styles.buttonSecondary} onClick={() => setEditing(true)} disabled={pending}>
              {t("account.changeIdentity")}
            </button>
            <button type="button" className={styles.buttonSecondary} onClick={forgetIdentity} disabled={pending}>
              {t("account.forget")}
            </button>
          </div>
          <p className={styles.hint}>{t("account.forgetHint")}</p>
        </>
      ) : (
        <form className={styles.form} onSubmit={submitIdentity}>
          <div className={styles.fields}>
            <div className={styles.field}>
              <label htmlFor="account-email">{t("account.email")}</label>
              <input
                id="account-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </div>
          <div className={styles.actions}>
            <button type="submit" className={styles.button} disabled={pending}>
              {t("account.continue")}
            </button>
            {identity ? (
              <button
                type="button"
                className={styles.buttonSecondary}
                disabled={pending}
                onClick={() => {
                  setEmail(identity.email);
                  setEditing(false);
                  onError(null);
                }}
              >
                {t("account.cancel")}
              </button>
            ) : null}
          </div>
        </form>
      )}
    </section>
  );
}
