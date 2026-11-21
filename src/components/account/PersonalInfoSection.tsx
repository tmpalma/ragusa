import { useNavigate } from "react-router";
import { useLocale } from "../../i18n/LocaleContext";
import { useSession } from "../../state/SessionContext";
import styles from "../../pages/AccountPage.module.css";
import type { AccountIdentity } from "./accountSectionTypes";

export interface PersonalInfoSectionProps {
  identity: AccountIdentity;
  pending: boolean;
}

export function PersonalInfoSection({ identity, pending }: PersonalInfoSectionProps) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { endSession } = useSession();

  function signOut() {
    void endSession("manual").then(() => {
      navigate("/login", { replace: true });
    });
  }

  return (
    <section className={styles.section} aria-labelledby="account-identity-heading">
      <h2 id="account-identity-heading">{t("account.identityTitle")}</h2>
      <p className={styles.note}>{t("account.signedInAs", { email: identity.email })}</p>
      <div className={styles.actions}>
        <button type="button" className={styles.buttonSecondary} onClick={signOut} disabled={pending}>
          {t("app.sidebar.signOut")}
        </button>
      </div>
    </section>
  );
}
