import { CLASSES, findByKey } from "../../data";
import { backgroundDisplayName } from "../../domain/background";
import { effectiveLevelPath, formatClassLevelLine, resolvedClassLevels } from "../../domain/classLevels";
import { findSubclass } from "../../domain/subclasses";
import type { DerivedStats } from "../../domain/deriveCharacter";
import { overviewHitPointsDisplay } from "../../domain/hitPoints";
import { formatModifier } from "../../domain/modifiers";
import { lineageDisplayName } from "../../domain/speciesFeatures";
import { InitiativeStepper } from "../form/InitiativeStepper";
import { useLocale } from "../../i18n/LocaleContext";
import type { Character } from "../../state/characterState";
import styles from "./Sheet.module.css";

export function OverviewHeaderStats({
  character,
  derived,
  trackedInitiative,
  onTrackedInitiativeChange,
}: {
  character: Character;
  derived: DerivedStats;
  trackedInitiative?: number | null;
  onTrackedInitiativeChange?: (value: number | null) => void;
}) {
  const { t, tEntity } = useLocale();

  const speciesName = derived.speciesData
    ? tEntity("catalog.species", derived.speciesData.key, "name", derived.speciesData.name)
    : t("rules.emDash");
  const lineageName = lineageDisplayName(derived.speciesData, character.speciesLineageKey);
  const speciesSubtitle = lineageName ? `${speciesName} (${lineageName})` : speciesName;
  const backgroundName = derived.backgroundData
    ? backgroundDisplayName(
        character,
        derived.backgroundData,
        t("character.customBackground"),
        tEntity("catalog.backgrounds", derived.backgroundData.key, "name", derived.backgroundData.name),
      )
    : t("rules.emDash");
  const subclassNameForClass = (classKey: string): string | null => {
    const subclassKey = character.subclassByClass[classKey] ?? null;
    if (!subclassKey) return null;
    const subclass = findSubclass(classKey, subclassKey);
    if (!subclass) return null;
    return tEntity(
      "catalog.classes",
      `${classKey}.subclass.${subclassKey}`,
      "name",
      subclass.name,
    );
  };
  const className = derived.classData
    ? formatClassLevelLine(
        resolvedClassLevels(effectiveLevelPath(character)),
        (classKey) => {
          const classData = findByKey(CLASSES, classKey);
          return tEntity("catalog.classes", classKey, "name", classData?.name ?? classKey);
        },
        (name, level, classKey) => {
          const subclassName = subclassNameForClass(classKey);
          if (subclassName) {
            return t("sheet.classLevelSegmentWithSubclass", {
              className: name,
              level,
              subclassName,
            });
          }
          return t("sheet.classLevelSegment", { className: name, level });
        },
      )
    : t("rules.emDash");
  const overviewHp = overviewHitPointsDisplay({
    maxHitPoints: derived.hitPoints,
    currentHitPoints: character.currentHitPoints,
    temporaryHitPointsMax: character.temporaryHitPointsMax,
    temporaryHitPointsRemaining: character.temporaryHitPointsRemaining,
  });

  return (
    <div className={styles.headerStats}>
      <p className={styles.subtitle}>
        {className} · {backgroundName} · {speciesSubtitle}
      </p>

      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>{t("sheet.armorClass")}</p>
          <p className={styles.statValue}>{derived.armorClass}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>{t("sheet.hitPoints")}</p>
          <p className={styles.statValue}>
            {overviewHp
              ? t("sheet.hitPointsOverview", {
                  current: overviewHp.current,
                  max: overviewHp.max,
                  temp: overviewHp.tempSuffix,
                })
              : t("rules.emDash")}
          </p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>{t("sheet.initiative")}</p>
          {onTrackedInitiativeChange ? (
            <InitiativeStepper
              value={trackedInitiative ?? null}
              onChange={onTrackedInitiativeChange}
              ariaLabel={t("sheet.initiative")}
              stepperClassName={styles.initiativeStepper}
            />
          ) : (
            <p className={styles.statValue}>{formatModifier(derived.initiative)}</p>
          )}
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>{t("sheet.proficiencyBonus")}</p>
          <p className={styles.statValue}>{formatModifier(derived.proficiencyBonus)}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>{t("sheet.passivePerception")}</p>
          <p className={styles.statValue}>{10 + derived.skillBonuses.perception}</p>
        </div>
      </div>
    </div>
  );
}
