import { buildDeityFactRows } from "../../domain/deityFacts";
import type { DeityData } from "../../data/types";
import { useLocale } from "../../i18n/LocaleContext";
import styles from "./DeityFacts.module.css";

interface DeityFactsProps {
  deity: DeityData;
}

export function DeityFacts({ deity }: DeityFactsProps) {
  const { t, tEntity } = useLocale();
  const rows = buildDeityFactRows(deity, t, tEntity);

  if (rows.length === 0) return null;

  return (
    <dl className={styles.deityFacts}>
      {rows.map((row) => (
        <div key={row.labelKey} className={styles.deityFactRow}>
          <dt>{t(row.labelKey)}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
