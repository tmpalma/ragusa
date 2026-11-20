import type { AbilityId } from "../../data/types";
import type { DerivedStats } from "../../domain/deriveCharacter";
import { formatModifier } from "../../domain/modifiers";
import { useLocale } from "../../i18n/LocaleContext";
import styles from "./Combat.module.css";

const SAVE_ABILITY_IDS: AbilityId[] = ["str", "dex", "con", "int", "wis", "cha"];

export function SavingThrowsBlock({ derived }: { derived: DerivedStats }) {
  const { t } = useLocale();

  return (
    <ul className={styles.savingThrowsGrid}>
      {SAVE_ABILITY_IDS.map((id) => {
        const savingThrow = derived.savingThrows[id];
        return (
          <li key={id} className={styles.savingThrowItem}>
            <span className={styles.savingThrowAbility}>{t(`rules.ability.${id}`)}</span>
            <span className={styles.savingThrowValue}>
              {formatModifier(savingThrow.modifier)}
              {savingThrow.proficient ? (
                <span aria-label={t("sheet.proficient")} className={styles.savingThrowProficient}>
                  *
                </span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
