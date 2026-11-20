import { SKILLS } from "../../data/skills";
import { CLASSES, findByKey } from "../../data";
import type { SkillId } from "../../data/types";
import { effectiveLevelPath } from "../../domain/classLevels";
import { isCustomBackground } from "../../domain/background";
import { buildSkillPickSources } from "../../domain/skillPickSources";
import { multiclassSkillChoiceGrantForClass } from "../../domain/training";
import {
  availableClassSkillOptions,
  compactSkillPicks,
  firstEmptySkillPickSlot,
  skillPickSlotForId,
  takenSkillsForBackgroundPicker,
  takenSkillsForClassPicker,
} from "../../domain/skillPicks";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { useTableRules } from "../../state/TableRulesContext";
import { SkillCappedPickList } from "./SkillCappedPickList";
import styles from "./Form.module.css";

function useSkillName() {
  const { t } = useLocale();
  return (id: SkillId) => t(`rules.skill.${id}`);
}

const ALL_SKILL_IDS = SKILLS.map((skill) => skill.id);

export function BackgroundSkillsDisplay() {
  const { character, derived, dispatch } = useCharacter();
  const { t } = useLocale();
  const skillName = useSkillName();
  const backgroundSkills = derived.backgroundData?.skillProficiencies ?? [];
  const isCustom = isCustomBackground(character.backgroundKey);
  const sources = buildSkillPickSources(character, derived);

  if (isCustom) {
    const maxCount = 2;
    const picks =
      character.backgroundSkillPicks.length === maxCount
        ? character.backgroundSkillPicks
        : Array.from({ length: maxCount }, () => null);
    const selectedKeys = compactSkillPicks(picks);

    return (
      <SkillCappedPickList
        id="background-skill-select"
        groupLabel={t("character.backgroundSkillsChooseCounted", {
          count: selectedKeys.length,
          max: maxCount,
        })}
        comboboxLabel={t("character.skill")}
        selectedKeys={selectedKeys}
        maxCount={maxCount}
        options={availableClassSkillOptions(
          ALL_SKILL_IDS,
          picks,
          takenSkillsForBackgroundPicker(sources, picks, -1),
          -1,
        )}
        onAdd={(skillId) => {
          const index = firstEmptySkillPickSlot(picks);
          if (index < 0) return;
          dispatch({ type: "SET_BACKGROUND_SKILL_PICK", index, skill: skillId });
        }}
        onRemove={(skillId) => {
          const index = skillPickSlotForId(picks, skillId);
          if (index < 0) return;
          dispatch({ type: "SET_BACKGROUND_SKILL_PICK", index, skill: null });
        }}
      />
    );
  }

  return (
    <div className={styles.field}>
      <span className={styles.groupLabel}>{t("character.backgroundSkills")}</span>
      {backgroundSkills.length === 0 ? (
        <p className={styles.hint}>{t("character.chooseBackgroundForSkills")}</p>
      ) : (
        <ul className={styles.itemList}>
          {backgroundSkills.map((id) => (
            <li key={id}>{skillName(id)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ClassSkillsInput() {
  const { character, dispatch, derived } = useCharacter();
  const { t } = useLocale();
  const sources = buildSkillPickSources(character, derived);
  const skillChoice = derived.classData?.skillChoice ?? null;

  if (!skillChoice) {
    return (
      <div className={styles.field}>
        <span className={styles.groupLabel}>{t("character.classSkills")}</span>
        <p className={styles.hint}>{t("character.chooseClassForSkills")}</p>
      </div>
    );
  }

  const picks =
    character.classSkillPicks.length === skillChoice.count
      ? character.classSkillPicks
      : Array.from({ length: skillChoice.count }, () => null);
  const selectedKeys = compactSkillPicks(picks);

  return (
    <SkillCappedPickList
      id="class-skill-select"
      groupLabel={t("character.classSkillsChooseCounted", {
        count: selectedKeys.length,
        max: skillChoice.count,
      })}
      comboboxLabel={t("character.skill")}
      selectedKeys={selectedKeys}
      maxCount={skillChoice.count}
      options={availableClassSkillOptions(
        skillChoice.options,
        picks,
        takenSkillsForClassPicker(sources, -1),
        -1,
      )}
      onAdd={(skillId) => {
        const index = firstEmptySkillPickSlot(picks);
        if (index < 0) return;
        dispatch({ type: "SET_CLASS_SKILL_PICK", index, skill: skillId });
      }}
      onRemove={(skillId) => {
        const index = skillPickSlotForId(picks, skillId);
        if (index < 0) return;
        dispatch({ type: "SET_CLASS_SKILL_PICK", index, skill: null });
      }}
    />
  );
}

export function MulticlassClassSkillsInput({ classKey }: { classKey: string }) {
  const { character, dispatch, derived } = useCharacter();
  const { t, tEntity } = useLocale();
  const tableRules = useTableRules();
  const sources = buildSkillPickSources(character, derived);
  const levelPath = effectiveLevelPath(character);
  const skillChoice = multiclassSkillChoiceGrantForClass(tableRules, levelPath, classKey, (key) =>
    findByKey(CLASSES, key),
  );

  if (!skillChoice) return null;

  const classData = findByKey(CLASSES, classKey);
  const className = classData
    ? tEntity("catalog.classes", classData.key, "name", classData.name)
    : classKey;

  const picks =
    character.classSkillPicksByClass[classKey]?.length === skillChoice.count
      ? character.classSkillPicksByClass[classKey]!
      : Array.from({ length: skillChoice.count }, () => null);
  const selectedKeys = compactSkillPicks(picks);

  return (
    <SkillCappedPickList
      id={`multiclass-class-skill-select-${classKey}`}
      groupLabel={t("character.multiclass.classSkillsChooseCounted", {
        count: selectedKeys.length,
        max: skillChoice.count,
        className,
      })}
      comboboxLabel={t("character.skill")}
      selectedKeys={selectedKeys}
      maxCount={skillChoice.count}
      options={availableClassSkillOptions(
        skillChoice.options,
        picks,
        takenSkillsForClassPicker(sources, -1),
        -1,
      )}
      onAdd={(skillId) => {
        const index = firstEmptySkillPickSlot(picks);
        if (index < 0) return;
        dispatch({ type: "SET_CLASS_SKILL_PICK_BY_CLASS", classKey, index, skill: skillId });
      }}
      onRemove={(skillId) => {
        const index = skillPickSlotForId(picks, skillId);
        if (index < 0) return;
        dispatch({ type: "SET_CLASS_SKILL_PICK_BY_CLASS", classKey, index, skill: null });
      }}
    />
  );
}
