import {
  classFeatureOptionPickGrantsForSurface,
  classFeatureOptionPickOptions,
  classFeatureOptionPicksForLevel,
} from "../../domain/classFeatures";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { EldritchInvocationsPickList } from "./EldritchInvocationsPickList";
import styles from "./Combat.module.css";

export function EldritchInvocationsSection() {
  const { character, derived } = useCharacter();
  const { t, tEntity } = useLocale();

  if (character.classKey !== "warlock" || !derived.classData) return null;

  const grants = classFeatureOptionPickGrantsForSurface(derived.classData, character.level, "combat");
  if (grants.length === 0) return null;

  const knownCantripKeys = character.cantripPicks;

  return (
    <>
      {grants.map((grant) => {
        const picks = classFeatureOptionPicksForLevel(
          derived.classData,
          grant.choiceKey,
          character.level,
          character.classFeatureOptionPicks,
        );
        const allOptions = classFeatureOptionPickOptions(derived.classData, grant.choiceKey);
        const chosenCount = picks.filter((pick) => pick != null).length;
        const featureName = tEntity(
          "catalog.classes",
          `${derived.classData!.key}.feature.${grant.featureKey}`,
          "name",
          grant.featureName,
        );

        return (
          <div key={grant.choiceKey} className={styles.invocationSection}>
            <p className={styles.groupLabel}>
              {t("combat.eldritchInvocationsTitle", {
                name: featureName,
                chosen: chosenCount,
                max: grant.count,
              })}
            </p>
            <EldritchInvocationsPickList
              choiceKey={grant.choiceKey}
              options={allOptions}
              picks={picks}
              maxCount={grant.count}
              knownCantripKeys={knownCantripKeys}
            />
          </div>
        );
      })}
    </>
  );
}
