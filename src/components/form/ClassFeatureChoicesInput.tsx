import type { ClassFeatureChoiceGrant } from "../../domain/classFeatures";
import {
  classFeatureChoiceGrantsAtLevel,
  classFeatureChoiceOptions,
  selectedClassFeatureOption,
} from "../../domain/classFeatures";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { Combobox } from "./Combobox";
import styles from "./Form.module.css";

export function ClassFeatureChoicesInput({ grants }: { grants: ClassFeatureChoiceGrant[] }) {
  const { character, derived, dispatch } = useCharacter();
  const { t, tEntity } = useLocale();

  if (grants.length === 0 || !derived.classData) return null;

  return (
    <>
      {grants.map((grant) => {
        const selected = selectedClassFeatureOption(
          derived.classData,
          grant.choiceKey,
          character.classFeatureChoices,
        );
        const skillCheckBonus = selected?.skillCheckBonus;
        const skillChoiceKey = skillCheckBonus?.choiceKey;
        return (
          <div key={grant.choiceKey} className={styles.field}>
            <Combobox
              id={`class-feature-choice-${grant.featureKey}-${grant.choiceKey}`}
              label={tEntity(
                "catalog.classes",
                `${derived.classData!.key}.feature.${grant.featureKey}`,
                "name",
                grant.featureName,
              )}
              value={character.classFeatureChoices[grant.choiceKey] ?? null}
              onChange={(key) =>
                dispatch({
                  type: "SET_CLASS_FEATURE_CHOICE",
                  choiceKey: grant.choiceKey,
                  optionKey: key,
                })
              }
              options={classFeatureChoiceOptions(derived.classData, grant.choiceKey).map((option) => ({
                key: option.key,
                label: option.name,
              }))}
              placeholder={t("character.choosePlaceholder")}
            />
            {selected ? <p className={styles.hint}>{selected.desc}</p> : null}
            {skillChoiceKey ? (
              <Combobox
                id={`class-feature-skill-check-${skillChoiceKey}`}
                label={t("character.classFeatureSkillCheckChoose")}
                value={character.classFeatureChoices[skillChoiceKey] ?? null}
                onChange={(key) =>
                  dispatch({
                    type: "SET_CLASS_FEATURE_CHOICE",
                    choiceKey: skillChoiceKey,
                    optionKey: key,
                  })
                }
                options={skillCheckBonus.skills.map((skill) => ({
                  key: skill,
                  label: t(`rules.skill.${skill}`),
                }))}
                placeholder={t("character.choosePlaceholder")}
              />
            ) : null}
          </div>
        );
      })}
    </>
  );
}

export function ClassFeatureChoicesInputAtLevel({ level }: { level: number }) {
  const { derived } = useCharacter();
  const grants = classFeatureChoiceGrantsAtLevel(derived.classData, level);
  return <ClassFeatureChoicesInput grants={grants} />;
}
