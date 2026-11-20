import { useMeasurementSystem } from "../../platform/measurementSystem";
import { useLocale } from "../../i18n/LocaleContext";
import styles from "./LanguageSwitcher.module.css";

export function MeasurementSwitcher() {
  const { t } = useLocale();
  const { system, setSystem } = useMeasurementSystem();

  return (
    <label className={styles.languageSwitcher}>
      <span className={styles.languageLabel}>{t("app.measurementLabel")}</span>
      <select
        value={system}
        aria-label={t("app.measurementLabel")}
        onChange={(event) => setSystem(event.target.value === "metric" ? "metric" : "imperial")}
      >
        <option value="imperial">{t("app.measurement.imperial")}</option>
        <option value="metric">{t("app.measurement.metric")}</option>
      </select>
    </label>
  );
}
