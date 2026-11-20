import type { SkillId } from "../../data/types";
import { classFeatureSkillGrantsAtLevel, type ClassFeatureSkillGrant } from "../../domain/classFeatures";
import { buildSkillPickSources } from "../../domain/skillPickSources";
import { availableSubclassSkillOptions, takenSkillsForClassFeaturePicker } from "../../domain/skillPicks";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { Combobox } from "./Combobox";
import styles from "./Form.module.css";

function useSkillName() {
  const { t } = useLocale();
  return (id: SkillId) => t(`rules.skill.${id}`);
}

export function ClassFeatureSkillInput({ grants }: { grants: ClassFeatureSkillGrant[] }) {
  const { character, derived, dispatch } = useCharacter();
  const { t, tEntity } = useLocale();
  const skillName = useSkillName();

  if (grants.length === 0 || !derived.classData) return null;

  const sources = buildSkillPickSources(character, derived);

  return (
    <>
      {grants.map((grant) => {
        const feature = derived.classData!.features.find((entry) => entry.key === grant.featureKey);
        const featureLabel = feature
          ? tEntity("catalog.classes", `${derived.classData!.key}.feature.${grant.featureKey}`, "name", feature.name)
          : grant.featureKey;
        const picks =
          character.classFeatureSkillPicks[grant.featureKey]?.length === grant.count
            ? character.classFeatureSkillPicks[grant.featureKey]
            : Array.from({ length: grant.count }, () => null);

        return (
          <div key={grant.featureKey} className={styles.field}>
            <span className={styles.groupLabel}>
              {t("character.classFeatureSkillsChoose", { feature: featureLabel, count: grant.count })}
            </span>
            {picks.map((pick, index) => (
              <Combobox
                key={index}
                id={`class-feature-skill-${grant.featureKey}-${index}`}
                label={t("character.classFeatureSkillPick", { feature: featureLabel, index: index + 1 })}
                value={pick}
                onChange={(key) =>
                  dispatch({
                    type: "SET_CLASS_FEATURE_SKILL_PICK",
                    featureKey: grant.featureKey,
                    index,
                    skill: key as SkillId | null,
                  })
                }
                options={availableSubclassSkillOptions(
                  picks,
                  takenSkillsForClassFeaturePicker(
                    sources,
                    grant.featureKey,
                    picks,
                    character.classFeatureSkillPicks,
                    index,
                  ),
                  index,
                  grant.options,
                ).map((id) => ({
                  key: id,
                  label: skillName(id),
                }))}
              />
            ))}
          </div>
        );
      })}
    </>
  );
}

export function ClassFeatureSkillInputAtLevel({ level }: { level: number }) {
  const { derived } = useCharacter();
  const grants = classFeatureSkillGrantsAtLevel(derived.classData, level);
  return <ClassFeatureSkillInput grants={grants} />;
}
