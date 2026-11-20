import { findSpellByKey } from "../../domain/spellSelection";
import { useLocale } from "../../i18n/LocaleContext";
import { CollapsiblePane } from "../CollapsiblePane";
import styles from "./Spells.module.css";

export interface RitualSpellsSectionProps {
  spellKeys: string[];
}

export function RitualSpellsSection({ spellKeys }: RitualSpellsSectionProps) {
  const { t, tEntity } = useLocale();

  if (spellKeys.length === 0) return null;

  return (
    <section className={`${styles.section} ${styles.ritualSpellsSection}`}>
      <CollapsiblePane title={<h3>{t("spells.ritualSpells")}</h3>}>
        <ul className={styles.grantedList}>
          {spellKeys.map((spellKey) => {
            const spell = findSpellByKey(spellKey);
            return (
              <li key={spellKey}>
                {tEntity("catalog.spells", spellKey, "name", spell?.name ?? spellKey)}
              </li>
            );
          })}
        </ul>
      </CollapsiblePane>
    </section>
  );
}
