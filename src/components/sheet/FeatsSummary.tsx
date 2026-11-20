import type { DerivedStats } from "../../domain/deriveCharacter";
import { useLocale } from "../../i18n/LocaleContext";
import { CollapsiblePane } from "../CollapsiblePane";
import styles from "./Sheet.module.css";

export function FeatsSummary({
  derived,
  defaultOpen = true,
}: {
  derived: DerivedStats;
  defaultOpen?: boolean;
}) {
  const { t, tEntity } = useLocale();

  return (
    <CollapsiblePane title={t("sheet.feats")} defaultOpen={defaultOpen}>
      {derived.feats.length === 0 ? (
        <p className={styles.hint}>{t("rules.emDash")}</p>
      ) : (
        <ul>
          {derived.feats.map((feat) => {
            const name = tEntity("catalog.feats", feat.key, "name", feat.name);
            const category = t(`character.featCategory.${feat.category}`, undefined, feat.category);
            return (
              <li key={feat.key}>
                {t("sheet.featWithCategory", { name, category })}
              </li>
            );
          })}
        </ul>
      )}
    </CollapsiblePane>
  );
}
