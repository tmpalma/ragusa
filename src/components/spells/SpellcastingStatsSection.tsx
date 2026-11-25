import type { SpellListMode } from "../../data/types";
import type { SpellcastingSummary } from "../../domain/spellcasting";
import { formatModifier } from "../../domain/modifiers";
import { useLocale } from "../../i18n/LocaleContext";
import combatStyles from "../combat/Combat.module.css";
import sheetStyles from "../sheet/Sheet.module.css";
import styles from "./Spells.module.css";

export interface SpellcastingStatsSectionProps {
  classDisplayName: string;
  summary: SpellcastingSummary;
  cantripCount: number;
  cantripMax: number;
  spellPickCount: number;
  spellPickMax: number;
  listMode: SpellListMode | null;
}

export function SpellcastingStatsSection({
  classDisplayName,
  summary,
  cantripCount,
  cantripMax,
  spellPickCount,
  spellPickMax,
  listMode,
}: SpellcastingStatsSectionProps) {
  const { t } = useLocale();
  const preparedLabel =
    listMode === "known" ? t("spells.spellsKnown") : t("spells.spellsPrepared");

  return (
    <section className={`${styles.section} ${styles.spellcastingStatsSection}`}>
      <h3>{t("spells.spellcastingStats", { className: classDisplayName })}</h3>
      <div className={combatStyles.statRow}>
        <div className={sheetStyles.statCard}>
          <p className={sheetStyles.statLabel}>
            {t("spells.abilityModifier", { ability: t(`rules.ability.${summary.ability}`) })}
          </p>
          <p className={sheetStyles.statValue}>{formatModifier(summary.abilityModifier)}</p>
        </div>
        <div className={sheetStyles.statCard}>
          <p className={sheetStyles.statLabel}>{t("spells.spellAttack")}</p>
          <p className={sheetStyles.statValue}>{formatModifier(summary.attackBonus)}</p>
        </div>
        <div className={sheetStyles.statCard}>
          <p className={sheetStyles.statLabel}>{t("spells.saveDc")}</p>
          <p className={sheetStyles.statValue}>{summary.saveDc}</p>
        </div>
        {cantripMax > 0 ? (
          <div className={sheetStyles.statCard}>
            <p className={sheetStyles.statLabel}>{t("spells.levelPaneCantrips")}</p>
            <p
              className={`${sheetStyles.statValue} ${
                cantripCount < cantripMax ? sheetStyles.statValueIncomplete : ""
              }`}
            >
              {cantripCount} / {cantripMax}
            </p>
          </div>
        ) : null}
        {spellPickMax > 0 ? (
          <div className={sheetStyles.statCard}>
            <p className={sheetStyles.statLabel}>{preparedLabel}</p>
            <p
              className={`${sheetStyles.statValue} ${
                spellPickCount < spellPickMax ? sheetStyles.statValueIncomplete : ""
              }`}
            >
              {spellPickCount} / {spellPickMax}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}