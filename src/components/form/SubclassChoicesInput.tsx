import type { ClassFeatureEffect, SkillId, SubclassData } from "../../data/types";
import type { ToolId } from "../../data/toolStats";
import { resolveClassFeatureOptionPickCount } from "../../domain/classFeatures";
import { allFeatProficiencyPicksForCharacter } from "../../domain/featEffects";
import { buildSkillPickSources } from "../../domain/skillPickSources";
import { availableSubclassSkillOptions, takenSkillsForSubclassPicker } from "../../domain/skillPicks";
import {
  availableToolOptions,
  compactToolPicks,
  firstValidEmptyToolPickSlot,
  mergeProficientTools,
  toolPickSlotForId,
} from "../../domain/toolPicks";
import {
  isSubclassSingleCharacterChoice,
  subclassFeatureChoiceOptions,
  subclassFeatureOptionPickCount,
  subclassFeatureOptionPickOptions,
  subclassSkillGrants,
  subclassSkillProficiencyCount,
  subclassToolChooseCount,
  subclassToolGrants,
  subclassToolPickOptionsForSlot,
  suggestedSubclassToolId,
} from "../../domain/subclasses";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { Combobox } from "./Combobox";
import styles from "./Form.module.css";
import { ToolCappedPickList } from "./ToolCappedPickList";

function useSkillName() {
  const { t } = useLocale();
  return (id: SkillId) => t(`rules.skill.${id}`);
}

function subclassChoiceEffects(subclass: SubclassData): ClassFeatureEffect[] {
  const effects: ClassFeatureEffect[] = [];
  for (const feature of subclass.features) {
    effects.push(...feature.effects);
  }
  return effects;
}

function isSubclassMultiCharacterOptionPick(effect: ClassFeatureEffect, level: number): boolean {
  if (effect.type !== "choose_feature_option") return false;
  const count = resolveClassFeatureOptionPickCount(effect, level);
  const surface = effect.uiSurface ?? "character";
  return count > 1 && surface === "character";
}

export function SubclassChoicesInput({ subclass }: { subclass: SubclassData }) {
  const { character, derived, dispatch } = useCharacter();
  const { t, tEntity } = useLocale();
  const skillName = useSkillName();

  const skillGrants = subclassSkillGrants(subclass);
  const skillCount = subclassSkillProficiencyCount(subclass);
  const picks =
    character.subclassSkillPicks.length === skillCount
      ? character.subclassSkillPicks
      : Array.from({ length: skillCount }, () => null);

  const sources = buildSkillPickSources(character, derived);

  const choiceEffects = subclassChoiceEffects(subclass).filter((effect) =>
    isSubclassSingleCharacterChoice(effect, character.level),
  );
  const optionPickEffects = subclassChoiceEffects(subclass).filter((effect) =>
    isSubclassMultiCharacterOptionPick(effect, character.level),
  );

  const featProficiencyPicks = allFeatProficiencyPicksForCharacter(character);
  const toolsBeforeSubclass = mergeProficientTools(
    character.backgroundToolPicks,
    character.classToolPicks,
    featProficiencyPicks,
    character.speciesToolPicks,
  );
  const toolGrants = subclassToolGrants(subclass);

  let skillOffset = 0;

  return (
    <>
      {toolGrants.map((grant) => {
        const count = subclassToolChooseCount(grant, toolsBeforeSubclass);
        if (count <= 0) return null;
        const feature = subclass.features.find((entry) => entry.key === grant.featureKey);
        const featureLabel = feature
          ? tEntity(
              "catalog.classes",
              `${subclass.classKey}.subclass.${subclass.key}.feature.${grant.featureKey}`,
              "name",
              feature.name,
            )
          : grant.featureKey;
        const grantPicks =
          character.subclassToolPicks[grant.featureKey]?.length === count
            ? character.subclassToolPicks[grant.featureKey]!
            : Array.from({ length: count }, () => null);
        const takenTools: ToolId[] = [
          ...toolsBeforeSubclass,
          ...Object.entries(character.subclassToolPicks)
            .filter(([featureKey]) => featureKey !== grant.featureKey)
            .flatMap(([, grantPicks]) => grantPicks)
            .filter((pick): pick is ToolId => pick != null),
        ];

        const slotOptions = (index: number) =>
          subclassToolPickOptionsForSlot(grant, index, toolsBeforeSubclass, subclass);
        const suggestedToolId = suggestedSubclassToolId(subclass, grant, toolsBeforeSubclass);
        const allOptions = Array.from(
          new Set(Array.from({ length: count }, (_, index) => slotOptions(index)).flat()),
        );

        return (
          <ToolCappedPickList
            key={grant.featureKey}
            id={`subclass-tool-${subclass.key}-${grant.featureKey}-select`}
            groupLabel={t("character.subclassToolsChoose", { count, feature: featureLabel })}
            comboboxLabel={t("character.subclassToolPick", { index: 1 })}
            selectedKeys={compactToolPicks(grantPicks)}
            maxCount={count}
            options={availableToolOptions(allOptions, grantPicks, takenTools, -1)}
            onAdd={(toolId) => {
              const index = firstValidEmptyToolPickSlot(grantPicks, toolId, slotOptions);
              if (index < 0) return;
              dispatch({
                type: "SET_SUBCLASS_TOOL_PICK",
                featureKey: grant.featureKey,
                index,
                tool: toolId,
              });
            }}
            onRemove={(toolId) => {
              const index = toolPickSlotForId(grantPicks, toolId);
              if (index < 0) return;
              dispatch({
                type: "SET_SUBCLASS_TOOL_PICK",
                featureKey: grant.featureKey,
                index,
                tool: null,
              });
            }}
            suggestedToolId={suggestedToolId}
          />
        );
      })}

      {skillGrants.map((grant) => {
        const feature = subclass.features.find((entry) => entry.key === grant.featureKey);
        const featureLabel = feature
          ? tEntity(
              "catalog.classes",
              `${subclass.classKey}.subclass.${subclass.key}.feature.${grant.featureKey}`,
              "name",
              feature.name,
            )
          : grant.featureKey;
        const grantPicks = picks.slice(skillOffset, skillOffset + grant.count);
        skillOffset += grant.count;

        return (
          <div key={grant.featureKey} className={styles.field}>
            <span className={styles.groupLabel}>
              {t("character.subclassSkillsChoose", { count: grant.count })}
              {skillGrants.length > 1 ? ` (${featureLabel})` : ""}
            </span>
            {grantPicks.map((pick, index) => {
              const slotIndex = skillOffset - grant.count + index;
              return (
                <Combobox
                  key={index}
                  id={`subclass-skill-${subclass.key}-${grant.featureKey}-${index}`}
                  label={t("character.subclassSkillPick", { index: index + 1 })}
                  value={pick}
                  onChange={(key) =>
                    dispatch({ type: "SET_SUBCLASS_SKILL_PICK", index: slotIndex, skill: key as SkillId | null })
                  }
                  options={availableSubclassSkillOptions(
                    grantPicks,
                    takenSkillsForSubclassPicker(sources, slotIndex),
                    index,
                    grant.options,
                  ).map((id) => ({
                    key: id,
                    label: skillName(id),
                  }))}
                />
              );
            })}
          </div>
        );
      })}

      {choiceEffects.map((effect) =>
        effect.type === "choose_feature_option" ? (
          <Combobox
            key={effect.choiceKey}
            id={`subclass-choice-${subclass.key}-${effect.choiceKey}`}
            label={t("character.subclassFeatureChoice")}
            value={character.subclassFeatureChoices[effect.choiceKey] ?? null}
            onChange={(key) =>
              dispatch({
                type: "SET_SUBCLASS_FEATURE_CHOICE",
                choiceKey: effect.choiceKey,
                optionKey: key,
              })
            }
            options={subclassFeatureChoiceOptions(subclass, effect.choiceKey).map((option) => ({
              key: option.key,
              label: option.name,
            }))}
          />
        ) : null,
      )}

      {optionPickEffects.map((effect) => {
        if (effect.type !== "choose_feature_option") return null;
        const count = subclassFeatureOptionPickCount(subclass, effect.choiceKey, character.level);
        const options = subclassFeatureOptionPickOptions(subclass, effect.choiceKey, character.level);
        const grantPicks =
          character.subclassFeatureOptionPicks[effect.choiceKey]?.length === count
            ? character.subclassFeatureOptionPicks[effect.choiceKey]!
            : Array.from({ length: count }, () => null);

        return (
          <div key={effect.choiceKey} className={styles.field}>
            <span className={styles.groupLabel}>{t("character.subclassFeatureChoice")}</span>
            {grantPicks.map((pick, index) => {
              const taken = grantPicks.filter((entry, entryIndex) => entryIndex !== index && entry != null);
              const availableOptions = options.filter((option) => {
                if (option.repeatable) return true;
                return !taken.includes(option.key);
              });
              const selectedOption = options.find((option) => option.key === pick);
              const comboboxOptions =
                pick && selectedOption && !availableOptions.some((option) => option.key === pick)
                  ? [...availableOptions, selectedOption]
                  : availableOptions;

              return (
                <Combobox
                  key={index}
                  id={`subclass-option-pick-${subclass.key}-${effect.choiceKey}-${index}`}
                  label={t("character.subclassFeatureOptionPick", { index: index + 1 })}
                  value={pick}
                  onChange={(optionKey) =>
                    dispatch({
                      type: "SET_SUBCLASS_FEATURE_OPTION_PICK",
                      choiceKey: effect.choiceKey,
                      index,
                      optionKey,
                    })
                  }
                  options={comboboxOptions.map((option) => ({
                    key: option.key,
                    label: option.name,
                  }))}
                  placeholder={t("character.choosePlaceholder")}
                />
              );
            })}
          </div>
        );
      })}
    </>
  );
}
