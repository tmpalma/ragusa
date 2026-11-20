import { useLocale } from "../../i18n/LocaleContext";
import styles from "./LanguageSwitcher.module.css";

export function LanguageSwitcher() {
  const { locale, supportedLocales, setLocale, t } = useLocale();
  if (supportedLocales.length <= 1) return null;

  return (
    <label className={styles.languageSwitcher}>
      <span className={styles.languageLabel}>{t("app.languageLabel")}</span>
      <select value={locale} onChange={(event) => setLocale(event.target.value)}>
        {supportedLocales.map((code) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </select>
    </label>
  );
}
