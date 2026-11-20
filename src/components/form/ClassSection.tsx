import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import { CLASSES, findByKey } from "../../data";
import type { ClassData } from "../../data/types";
import {
  classFeaturesAtLevel,
  classFeatureChoiceGrantsAtLevel,
  collectClassFeatureContributions,
  weaponMasteryCountIncreasesAtLevel,
} from "../../domain/classFeatures";
import { MAX_CHARACTER_LEVEL } from "../../domain/characterLevel";
import { effectiveLevelPath, levelPathFromClassKeyAndLevel } from "../../domain/classLevels";
import { xpRemainingForNextLevel, xpThresholdForNextLevel } from "../../domain/experience";
import {
  evaluateMulticlassAction,
  primaryAbilityFromCatalog,
  type MulticlassActionResult,
} from "../../domain/multiclass";
import { derivedAbilityScores } from "../../domain/featEffects";
import { findSubclass, subclassesForClass } from "../../domain/subclasses";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import type { Character } from "../../state/characterState";
import { useTableRules } from "../../state/TableRulesContext";
import { useToast } from "../toast/ToastContext";
import { AbilityScoresInput } from "./AbilityScoresInput";
import { Combobox } from "./Combobox";
import styles from "./Form.module.css";
import { ClassSkillsInput, MulticlassClassSkillsInput } from "./SkillsInput";
import { ClassToolsInput } from "./ToolsInput";
import { ExpertiseInput } from "./ExpertiseInput";
import { SubclassChoicesInput } from "./SubclassChoicesInput";
import { ClassFeatureSkillInputAtLevel } from "./ClassFeatureSkillInput";
import { ClassFeatureChoicesInputAtLevel } from "./ClassFeatureChoicesInput";
import { WeaponMasteryInput } from "./WeaponMasteryInput";
import { ClassGrantedFeatInputAtLevel } from "./ClassGrantedFeatInput";
import { FightingStyleFeatInputAtLevel } from "./FightingStyleFeatInput";
import { ArtificerPlansInput } from "./ArtificerPlansInput";

interface LevelBlockInfo {
  characterLevel: number;
  classKey: string;
  classLevel: number;
}

function buildLevelBlocksFromPath(levelPath: string[]): LevelBlockInfo[] {
  const counts = new Map<string, number>();
  return levelPath.map((classKey, index) => {
    const classLevel = (counts.get(classKey) ?? 0) + 1;
    counts.set(classKey, classLevel);
    return {
      characterLevel: index + 1,
      classKey,
      classLevel,
    };
  });
}

/** Level panes for committed character levels only (no next-level preview). */
function levelBlocksForCharacter(character: Character): LevelBlockInfo[] {
  if (character.levelPath.length > 0) {
    return buildLevelBlocksFromPath(character.levelPath.slice(0, character.level));
  }
  if (character.classKey && character.level >= 1) {
    return buildLevelBlocksFromPath(
      levelPathFromClassKeyAndLevel(character.classKey, character.level),
    );
  }
  return [{ characterLevel: 1, classKey: "", classLevel: 1 }];
}

function resolveMulticlassClassRecord(classKey: string, minimum: number) {
  const classData = findByKey(CLASSES, classKey);
  if (!classData) return null;
  return {
    key: classData.key,
    primaryAbility: primaryAbilityFromCatalog(classData.primaryAbility, minimum),
  };
}

function LevelFeatureList({
  classData,
  classLevel,
  subclassKey,
}: {
  classData: ClassData;
  classLevel: number;
  subclassKey: string | null;
}) {
  const { tEntity } = useLocale();
  const subclass = findSubclass(classData.key, subclassKey);
  const features = classFeaturesAtLevel(classData, classLevel, subclass);

  if (features.length === 0) return null;

  return (
    <ul className={styles.featureList}>
      {features.map((feature) => {
        const isSubclassFeature = subclass?.features.some((entry) => entry.key === feature.key) ?? false;
        const entityKey = isSubclassFeature
          ? `${classData.key}.subclass.${subclass!.key}.feature.${feature.key}`
          : `${classData.key}.feature.${feature.key}`;
        return (
          <li key={feature.key}>
            {tEntity("catalog.classes", entityKey, "name", feature.name)}
          </li>
        );
      })}
    </ul>
  );
}

function MulticlassPrereqBanner({ result }: { result: MulticlassActionResult }) {
  const { t } = useLocale();
  if (!result.messageKey) return null;
  if (result.ok && result.enforcement !== "warn") return null;
  return (
    <p className={styles.warning} role={result.enforcement === "warn" ? "status" : "alert"}>
      {t(result.messageKey)}
    </p>
  );
}

function LevelBlockContent({ block }: { block: LevelBlockInfo }) {
  const { character, dispatch } = useCharacter();
  const { t, tEntity, locale } = useLocale();
  const tableRules = useTableRules();
  const { showToast } = useToast();

  const classData = findByKey(CLASSES, block.classKey);
  const isPrimaryClass = block.classKey === character.classKey;
  const isCurrentLevel = block.characterLevel === character.level;
  const isEditableClassLevel = isCurrentLevel && block.characterLevel > 1;
  const subclassKey = character.subclassByClass[block.classKey] ?? null;
  const selectedSubclass = findSubclass(block.classKey, subclassKey);

  const levelPath = effectiveLevelPath(character);
  const pathBeforeLevel = levelPath.slice(0, block.characterLevel - 1);

  const abilityScores = useMemo(
    () => derivedAbilityScores(character.abilityScores, character.abilityScoreIncreases),
    [character.abilityScoreIncreases, character.abilityScores],
  );

  const [prereqError, setPrereqError] = useState<MulticlassActionResult | null>(null);

  useEffect(() => {
    setPrereqError(null);
  }, [block.classKey, block.characterLevel]);

  const classOptions = CLASSES.map((c) => ({
    key: c.key,
    label: tEntity("catalog.classes", c.key, "name", c.name),
  })).sort((a, b) => a.label.localeCompare(b.label, locale));

  const subclassOptions = subclassesForClass(block.classKey)
    .map((subclass) => ({
      key: subclass.key,
      label: tEntity("catalog.classes", `${subclass.classKey}.subclass.${subclass.key}`, "name", subclass.name),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, locale));

  const subclassLocked = Boolean(subclassKey);
  const showSubclassCombobox =
    block.classLevel >= 3 &&
    subclassOptions.length > 0 &&
    (block.classLevel === 3 || !subclassKey);
  const showSubclassReadOnly = block.classLevel >= 4 && selectedSubclass != null;

  const pendingLevel1FeatureChoices =
    classData != null &&
    classFeatureChoiceGrantsAtLevel(classData, 1).some(
      (grant) => !character.classFeatureChoices[grant.choiceKey],
    );

  const handleLevelClassChange = (nextClassKey: string | null) => {
    if (!nextClassKey || nextClassKey === block.classKey) return;

    const result = evaluateMulticlassAction(tableRules, {
      targetClassKey: nextClassKey,
      currentLevelPath: pathBeforeLevel,
      abilityScores,
      resolveClass: (key) =>
        resolveMulticlassClassRecord(key, tableRules.abilityPrerequisite.minimum),
    });

    if (!result.ok && result.enforcement !== "warn") {
      setPrereqError(result);
      showToast(t(result.messageKey), "error");
      return;
    }

    setPrereqError(null);
    dispatch({ type: "CHANGE_LAST_LEVEL_CLASS", classKey: nextClassKey });
    if (result.enforcement === "warn" && result.messageKey) {
      setPrereqError(result);
    }
  };

  if (block.characterLevel === 1) {
    return (
      <>
        <Combobox
          id="class-select"
          label={t("character.class")}
          value={character.classKey}
          onChange={(key) => dispatch({ type: "SET_CLASS", key })}
          options={classOptions}
        />
        <ClassSkillsInput />
        <ClassToolsInput />
        <ExpertiseInput levelBlock={1} />
        {character.classKey ? (
          <WeaponMasteryInput classKey={character.classKey} classLevel={1} />
        ) : null}
        <FightingStyleFeatInputAtLevel level={1} />
        <ClassFeatureChoicesInputAtLevel level={1} />
        {classData ? (
          <LevelFeatureList classData={classData} classLevel={1} subclassKey={subclassKey} />
        ) : null}
        <h4>{t("character.section.abilityScores")}</h4>
        <AbilityScoresInput />
      </>
    );
  }

  const classLabel = classData
    ? tEntity("catalog.classes", classData.key, "name", classData.name)
    : block.classKey;

  return (
    <>
      <Combobox
        id={`class-select-level-${block.characterLevel}`}
        label={t("character.class")}
        value={block.classKey || null}
        onChange={isEditableClassLevel ? handleLevelClassChange : () => {}}
        options={
          isEditableClassLevel
            ? classOptions
            : classOptions.map((option) => ({
                ...option,
                disabled: option.key !== block.classKey,
              }))
        }
        disabled={!isEditableClassLevel}
      />
      {showSubclassReadOnly ? (
        <p>
          {t("character.multiclass.subclassLockedLine", {
            className: classLabel,
            subclassName: tEntity(
              "catalog.classes",
              `${selectedSubclass.classKey}.subclass.${selectedSubclass.key}`,
              "name",
              selectedSubclass.name,
            ),
          })}
        </p>
      ) : null}
      {prereqError ? <MulticlassPrereqBanner result={prereqError} /> : null}

      {block.classLevel === 1 ? <MulticlassClassSkillsInput classKey={block.classKey} /> : null}

      {classData ? (
        <LevelFeatureList classData={classData} classLevel={block.classLevel} subclassKey={subclassKey} />
      ) : null}

      {isPrimaryClass && block.classLevel === 2 ? <ExpertiseInput levelBlock={2} /> : null}

      {isPrimaryClass ? <FightingStyleFeatInputAtLevel level={block.classLevel} /> : null}
      {isPrimaryClass ? <ClassGrantedFeatInputAtLevel level={block.classLevel} /> : null}

      {(block.classLevel === 1 &&
        collectClassFeatureContributions(block.classKey, block.classLevel).weaponMasteryCount > 0) ||
      weaponMasteryCountIncreasesAtLevel(block.classKey, block.classLevel) ? (
        <WeaponMasteryInput classKey={block.classKey} classLevel={block.classLevel} />
      ) : null}

      {isPrimaryClass && block.classLevel >= 2 && pendingLevel1FeatureChoices ? (
        <ClassFeatureChoicesInputAtLevel level={1} />
      ) : null}

      {showSubclassCombobox ? (
        <>
          <Combobox
            id={`subclass-select-${block.classKey}`}
            label={t("character.multiclass.subclassForClass", { className: classLabel })}
            value={subclassKey}
            onChange={(key) =>
              dispatch({ type: "SET_SUBCLASS", key, classKey: block.classKey })
            }
            options={subclassOptions}
            placeholder={t("character.choosePlaceholder")}
            disabled={subclassLocked}
          />
          {isPrimaryClass && selectedSubclass ? (
            <SubclassChoicesInput subclass={selectedSubclass} />
          ) : null}
        </>
      ) : null}

      {isPrimaryClass ? <ClassFeatureSkillInputAtLevel level={block.classLevel} /> : null}
      {isPrimaryClass && block.classLevel === 2 && block.classKey === "artificer" ? (
        <ArtificerPlansInput />
      ) : null}
    </>
  );
}

function LevelBlock({
  block,
  showRevert,
  open,
  onToggle,
}: {
  block: LevelBlockInfo;
  showRevert: boolean;
  open: boolean;
  onToggle: (characterLevel: number, nextOpen: boolean) => void;
}) {
  const { dispatch } = useCharacter();
  const { t, tEntity } = useLocale();

  const classData = findByKey(CLASSES, block.classKey);
  const className = classData
    ? tEntity("catalog.classes", classData.key, "name", classData.name)
    : block.classKey;
  const summaryLabel = classData
    ? t("character.classLevelHeading", { className, level: block.classLevel })
    : t("character.levelHeading", { level: block.characterLevel });

  const handleToggle = (event: SyntheticEvent<HTMLDetailsElement>) => {
    onToggle(block.characterLevel, event.currentTarget.open);
  };

  return (
    <details className={styles.levelPane} open={open} onToggle={handleToggle}>
      <summary className={styles.levelPaneSummary}>
        <span className={styles.levelPaneHeading}>{summaryLabel}</span>
        {showRevert ? (
          <button
            type="button"
            className={`${styles.textButton} ${styles.revertLevelButton}`}
            onClick={(event) => {
              event.preventDefault();
              dispatch({ type: "REVERT_LAST_LEVEL" });
            }}
          >
            {t("character.revertLastLevel")}
          </button>
        ) : null}
      </summary>
      <div className={styles.levelPaneBody}>
        <LevelBlockContent block={block} />
      </div>
    </details>
  );
}

function ExperienceTracker({
  canLevelUp,
  onLevelUp,
}: {
  canLevelUp: boolean;
  onLevelUp: () => void;
}) {
  const { character, dispatch } = useCharacter();
  const { t } = useLocale();
  const [xpDraft, setXpDraft] = useState(String(character.experiencePoints));

  useEffect(() => {
    setXpDraft(String(character.experiencePoints));
  }, [character.experiencePoints]);

  const nextThreshold = xpThresholdForNextLevel(character.level);
  const remaining = xpRemainingForNextLevel(character.level, character.experiencePoints);

  const commitXp = () => {
    const trimmed = xpDraft.trim();
    if (!/^\d+$/.test(trimmed)) {
      setXpDraft(String(character.experiencePoints));
      return;
    }
    dispatch({ type: "SET_EXPERIENCE_POINTS", value: Number(trimmed) });
  };

  return (
    <div className={styles.xpTracker}>
      <table className={`${styles.skillsTable} ${styles.xpTable}`}>
        <thead>
          <tr>
            <th scope="col">{t("character.xpCurrent")}</th>
            <th scope="col">{t("character.xpNextLevel")}</th>
            <th scope="col">{t("character.xpRemaining")}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <input
                id="experience-points"
                type="number"
                min={0}
                className={styles.xpInput}
                value={xpDraft}
                onChange={(event) => setXpDraft(event.target.value)}
                onBlur={commitXp}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
              />
            </td>
            <td className={styles.xpStatCell}>{nextThreshold ?? "—"}</td>
            <td className={styles.xpStatCell}>{remaining ?? "—"}</td>
          </tr>
        </tbody>
      </table>
      <div className={styles.xpLevelUpRow}>
        <button
          type="button"
          className={styles.levelUpButton}
          disabled={!canLevelUp}
          onClick={onLevelUp}
        >
          {t("character.levelUp")}
        </button>
      </div>
    </div>
  );
}

export function ClassSection() {
  const { character, dispatch } = useCharacter();
  const { t } = useLocale();
  const { showToast } = useToast();

  const levelBlocks = levelBlocksForCharacter(character);
  const blocksNewestFirst = [...levelBlocks].reverse();

  const canLevelUp =
    Boolean(character.classKey) && character.level < MAX_CHARACTER_LEVEL;

  const [openLevels, setOpenLevels] = useState<Set<number>>(
    () => new Set([character.level]),
  );

  useEffect(() => {
    setOpenLevels(new Set([character.level]));
  }, [character.level]);

  const handleLevelToggle = (characterLevel: number, nextOpen: boolean) => {
    setOpenLevels((current) => {
      const next = new Set(current);
      if (nextOpen) next.add(characterLevel);
      else next.delete(characterLevel);
      return next;
    });
  };

  const handleLevelUp = () => {
    if (!canLevelUp) return;
    dispatch({ type: "LEVEL_UP" });
    showToast(t("character.levelUpToast"), "info");
  };

  return (
    <section className={styles.section}>
      <h3>{t("character.section.class")}</h3>

      <ExperienceTracker canLevelUp={canLevelUp} onLevelUp={handleLevelUp} />

      {blocksNewestFirst.map((block) => (
        <LevelBlock
          key={block.characterLevel}
          block={block}
          showRevert={block.characterLevel === character.level && character.level > 1}
          open={openLevels.has(block.characterLevel)}
          onToggle={handleLevelToggle}
        />
      ))}
    </section>
  );
}
