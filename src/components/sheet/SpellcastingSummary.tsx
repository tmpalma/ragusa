import { formatModifier } from "../../domain/modifiers";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import styles from "./Sheet.module.css";

interface StatBlock {
  label: string;
  value: string;
  valueClassName?: string;
}

export function SpellcastingSummary() {
  const { derived, character } = useCharacter();
  const { t, tEntity } = useLocale();
  const { spellcasting } = derived;
  const castingClasses = derived.perClassSpellcasting.filter((entry) => entry.summary);
  if (!spellcasting || castingClasses.length === 0) return null;

  const classLabel = (classKey: string) =>
    tEntity("catalog.classes", classKey, "name", classKey);

  const isMulticlass = castingClasses.length >= 2;

  const singleClassStatBlocks: StatBlock[] = [
    {
      label: t("sheet.spellcastingAbility"),
      value: t(`rules.ability.${spellcasting.ability}`),
    },
    {
      label: t("sheet.spellAttackBonus"),
      value: formatModifier(spellcasting.attackBonus),
    },
    {
      label: t("sheet.spellSaveDc"),
      value: String(spellcasting.saveDc),
    },
  ];

  if (spellcasting.spellsPreparedOrKnown > 0 && !isMulticlass) {
    const preparedLabel =
      spellcasting.listMode === "known" ? t("spells.spellsKnown") : t("spells.spellsPrepared");
    const spellsIncomplete = character.spellPicks.length < spellcasting.spellsPreparedOrKnown;
    singleClassStatBlocks.push({
      label: preparedLabel,
      value: `${character.spellPicks.length} / ${spellcasting.spellsPreparedOrKnown}`,
      valueClassName: spellsIncomplete ? styles.statValueIncomplete : undefined,
    });
  }

  function statCards(blocks: StatBlock[]) {
    return blocks.map((stat) => (
      <div key={stat.label} className={styles.statCard}>
        <p className={styles.statLabel}>{stat.label}</p>
        <p className={`${styles.statValue} ${stat.valueClassName ?? ""}`}>{stat.value}</p>
      </div>
    ));
  }

  return (
    <section className={styles.section}>
      <h3>{t("sheet.spellcasting")}</h3>
      {isMulticlass ? (
        <div className={styles.spellcastingClassGroups}>
          {castingClasses.map(({ classKey, classLevel, summary }) => {
            if (!summary) return null;
            const blocks: StatBlock[] = [
              {
                label: t("sheet.spellcastingAbility"),
                value: t(`rules.ability.${summary.ability}`),
              },
              {
                label: t("sheet.spellAttackBonus"),
                value: formatModifier(summary.attackBonus),
              },
              {
                label: t("sheet.spellSaveDc"),
                value: String(summary.saveDc),
              },
            ];
            return (
              <div key={classKey} className={styles.spellcastingClassGroup}>
                <p className={styles.spellcastingClassCaption}>
                  {t("spells.classAtLevel", { className: classLabel(classKey), level: classLevel })}
                </p>
                <div className={styles.spellcastingClassStatGrid}>{statCards(blocks)}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.statGrid}>{statCards(singleClassStatBlocks)}</div>
      )}
    </section>
  );
}
