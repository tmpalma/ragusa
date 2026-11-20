import { useEffect } from "react";
import { Link } from "react-router";
import { useLocale } from "../i18n/LocaleContext";
import styles from "./WelcomePage.module.css";

export function WelcomePage() {
  const { t } = useLocale();

  useEffect(() => {
    document.title = t("app.pageTitle");
  }, [t]);

  return (
    <div className={styles.welcome}>
      <h1>{t("app.welcomeTitle")}</h1>
      <p className={styles.subtitle}>{t("app.welcomeSubtitle")}</p>
      <div className={styles.cards}>
        <Link to="/character" className={styles.card}>
          <span className={styles.cardTitle}>{t("app.mode.character")}</span>
          <span className={styles.cardDescription}>{t("app.mode.characterDescription")}</span>
        </Link>
        <Link to="/campaign" className={styles.card}>
          <span className={styles.cardTitle}>{t("app.mode.campaign")}</span>
          <span className={styles.cardDescription}>{t("app.mode.campaignDescription")}</span>
        </Link>
        <Link to="/account" className={styles.card}>
          <span className={styles.cardTitle}>{t("account.welcomeCardTitle")}</span>
          <span className={styles.cardDescription}>{t("account.welcomeCardDescription")}</span>
        </Link>
      </div>
    </div>
  );
}
