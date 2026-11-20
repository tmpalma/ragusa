import type { AbilityId } from "../../data/types";
import { SKILLS } from "../../data/skills";
import type { DerivedStats } from "../../domain/deriveCharacter";
import { formatModifier } from "../../domain/modifiers";
import { useLocale } from "../../i18n/LocaleContext";
import { CollapsiblePane } from "../CollapsiblePane";
import styles from "./Sheet.module.css";

const ABILITY_IDS: AbilityId[] = ["str", "dex", "con", "int", "wis", "cha"];

const SKILLS_BY_ABILITY = Object.fromEntries(
  ABILITY_IDS.map((ability) => [ability, SKILLS.filter((skill) => skill.ability === ability)]),
) as Record<AbilityId, (typeof SKILLS)[number][]>;

export function OverviewAttributes({
  derived,
  showSkillsByAbility = false,
  defaultOpen = true,
}: {
  derived: DerivedStats;
  showSkillsByAbility?: boolean;
  defaultOpen?: boolean;
}) {
  const { t } = useLocale();

  return (
    <CollapsiblePane title={t("sheet.attributes")} defaultOpen={defaultOpen}>
      <div className={styles.statGrid}>
        {ABILITY_IDS.map((id) => {
          const savingThrow = derived.savingThrows[id];
          const abilitySkills = SKILLS_BY_ABILITY[id];
          return (
            <div key={id} className={`${styles.statCard} ${styles.abilityCard}`}>
              <p className={styles.abilityName}>{t(`rules.ability.${id}`)}</p>
              <p className={styles.abilityScoreRow}>
                <span className={styles.abilityStatInline}>
                  <span className={styles.abilityStatLabel}>{t("sheet.value")}</span>
                  <span className={styles.abilityScore}>{derived.abilityScores[id]}</span>
                </span>
                <span className={styles.abilityStatInline}>
                  <span className={styles.abilityStatLabel}>{t("sheet.mod")}</span>
                  <span className={styles.abilityModifier}>{formatModifier(derived.abilityModifiers[id])}</span>
                </span>
              </p>
              <p className={styles.abilitySave}>
                <span className={styles.abilityStatInline}>
                  <span className={styles.abilityStatLabel}>{t("sheet.save")}</span>
                  <span className={styles.abilitySaveValue}>{formatModifier(savingThrow.modifier)}</span>
                  {savingThrow.proficient ? (
                    <span aria-label={t("sheet.proficient")} className={styles.proficientMark}>
                      *
                    </span>
                  ) : null}
                </span>
              </p>
              {showSkillsByAbility && abilitySkills.length > 0 ? (
                <table className={`${styles.table} ${styles.abilitySkillTable}`}>
                  <thead className={styles.abilitySkillTableHead}>
                    <tr>
                      <th scope="col">{t("sheet.skill")}</th>
                      <th scope="col">{t("sheet.bonus")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {abilitySkills.map((skill) => (
                      <tr key={skill.id}>
                        <td>{t(`rules.skill.${skill.id}`)}</td>
                        <td>{formatModifier(derived.skillBonuses[skill.id])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </div>
          );
        })}
      </div>
    </CollapsiblePane>
  );
}
