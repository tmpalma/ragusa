import { useState, type MouseEvent } from "react";
import type { SkillId } from "../../data/types";
import { SKILLS, skillsByAbilityGroups } from "../../data/skills";
import type { DerivedStats } from "../../domain/deriveCharacter";
import type { Character } from "../../state/characterState";
import { formatModifier } from "../../domain/modifiers";
import { useLocale } from "../../i18n/LocaleContext";
import { CollapsiblePane } from "../CollapsiblePane";
import styles from "./Sheet.module.css";

function skillMarker(state: "none" | "proficient" | "expert"): string {
  if (state === "expert") return "**";
  if (state === "proficient") return "*";
  return "";
}

function SkillRow({
  skill,
  proficiencyState,
  derived,
}: {
  skill: (typeof SKILLS)[number];
  proficiencyState: Character["skills"][SkillId];
  derived: DerivedStats;
}) {
  const { t } = useLocale();

  return (
    <tr>
      <td>
        {t(`rules.skill.${skill.id}`)}
        {skillMarker(proficiencyState)}
      </td>
      <td>{t(`rules.ability.${skill.ability}`)}</td>
      <td>{formatModifier(derived.abilityModifiers[skill.ability])}</td>
      <td>{formatModifier(derived.skillBonuses[skill.id])}</td>
    </tr>
  );
}

export function OverviewSkills({
  character,
  derived,
}: {
  character: Character;
  derived: DerivedStats;
}) {
  const { t } = useLocale();
  const [groupByAbility, setGroupByAbility] = useState(false);

  const toggleLabel = groupByAbility
    ? t("sheet.skillsAlphabetical", undefined, "Alphabetical")
    : t("sheet.groupSkillsByAbility", undefined, "Group by ability");

  function handleLayoutToggle(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setGroupByAbility((prev) => !prev);
  }

  return (
    <CollapsiblePane
      title={t("sheet.skills")}
      summaryActions={
        <button
          type="button"
          className={styles.skillsLayoutButton}
          aria-pressed={groupByAbility}
          onClick={handleLayoutToggle}
        >
          {toggleLabel}
        </button>
      }
    >
      <table className={`${styles.table} ${styles.skillsTable}`}>
        <thead>
          <tr>
            <th>{t("sheet.skill")}</th>
            <th>{t("sheet.ability")}</th>
            <th>{t("sheet.modifier")}</th>
            <th>{t("sheet.bonus")}</th>
          </tr>
        </thead>
        {groupByAbility ? (
          skillsByAbilityGroups().map((group) => (
            <tbody key={group.ability}>
              <tr className={styles.skillsAbilityGroupRow}>
                <th scope="colgroup" colSpan={4}>
                  {t(`rules.ability.${group.ability}`)}
                </th>
              </tr>
              {group.skills.map((skill) => (
                <SkillRow
                  key={skill.id}
                  skill={skill}
                  proficiencyState={character.skills[skill.id]}
                  derived={derived}
                />
              ))}
            </tbody>
          ))
        ) : (
          <tbody>
            {SKILLS.map((skill) => (
              <SkillRow
                key={skill.id}
                skill={skill}
                proficiencyState={character.skills[skill.id]}
                derived={derived}
              />
            ))}
          </tbody>
        )}
      </table>
    </CollapsiblePane>
  );
}