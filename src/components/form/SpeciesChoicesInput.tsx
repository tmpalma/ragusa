import { findByKey, SPECIES } from "../../data";
import { SKILLS } from "../../data/skills";
import type { AbilityId } from "../../data/types";
import type { ToolId } from "../../data/toolStats";
import {
  availableSpeciesSkillOptions,
  collectSpeciesFeatureContributions,
  speciesSkillPickCount,
  speciesToolPickCount,
} from "../../domain/speciesFeatures";
import { buildSkillPickSources } from "../../domain/skillPickSources";
import {
  compactSkillPicks,
  firstEmptySkillPickSlot,
  skillPickSlotForId,
  takenSkillsForSpeciesPicker,
} from "../../domain/skillPicks";
import {
  ALL_TOOL_OPTIONS,
  availableToolOptions,
  compactToolPicks,
  firstEmptyToolPickSlot,
  toolPickSlotForId,
} from "../../domain/toolPicks";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import type { SpeciesSizeChoice } from "../../state/characterState";
import { Combobox } from "./Combobox";
import { SkillCappedPickList } from "./SkillCappedPickList";
import styles from "./Form.module.css";
import { ToolCappedPickList } from "./ToolCappedPickList";

const SPELLCASTING_ABILITIES: AbilityId[] = ["int", "wis", "cha"];
const SIZE_OPTIONS: SpeciesSizeChoice[] = ["medium", "small"];

export function SpeciesChoicesInput() {
  const { character, dispatch, derived } = useCharacter();
  const { t, tEntity } = useLocale();

  const speciesData = findByKey(SPECIES, character.speciesKey);
  if (!speciesData) return null;

  const contributions = collectSpeciesFeatureContributions(
    speciesData,
    character.speciesLineageKey,
    character.level,
  );
  const skillPickCount = speciesSkillPickCount(contributions);
  const toolPickCount = speciesToolPickCount(contributions);
  const sources = buildSkillPickSources(character, derived);

  return (
    <div className={styles.field}>
      {speciesData.choice ? (
        <Combobox
          id="species-lineage-select"
          label={t(`character.speciesChoice.${speciesData.choice.key}`)}
          value={character.speciesLineageKey}
          onChange={(key) => dispatch({ type: "SET_SPECIES_LINEAGE", key })}
          options={speciesData.choice.options.map((option) => ({
            key: option.key,
            label: tEntity(
              "catalog.species",
              `${speciesData.key}.lineage.${option.key}`,
              "name",
              option.name,
            ),
          }))}
        />
      ) : null}

      {speciesData.hasSizeChoice ? (
        <Combobox
          id="species-size-select"
          label={t("character.speciesSize")}
          value={character.speciesSize}
          onChange={(key) => dispatch({ type: "SET_SPECIES_SIZE", size: key as SpeciesSizeChoice | null })}
          options={SIZE_OPTIONS.map((size) => ({
            key: size,
            label: t(`character.speciesSize.${size}`),
          }))}
        />
      ) : null}

      {speciesData.choice?.requiresSpellcastingAbility && character.speciesLineageKey ? (
        <Combobox
          id="species-spellcasting-ability-select"
          label={t("character.speciesSpellcastingAbility")}
          value={character.speciesSpellcastingAbility}
          onChange={(key) =>
            dispatch({ type: "SET_SPECIES_SPELLCASTING_ABILITY", ability: key as AbilityId | null })
          }
          options={SPELLCASTING_ABILITIES.map((ability) => ({
            key: ability,
            label: t(`rules.ability.${ability}`),
          }))}
        />
      ) : null}

      {skillPickCount > 0 ? (() => {
        const picks =
          character.speciesSkillPicks.length === skillPickCount
            ? character.speciesSkillPicks
            : Array.from({ length: skillPickCount }, () => null);
        const selectedKeys = compactSkillPicks(picks);
        const skillOptions = contributions.skillPickOptions ?? SKILLS.map((skill) => skill.id);

        return (
          <SkillCappedPickList
            id="species-skill-select"
            groupLabel={t("character.speciesSkillsChooseCounted", {
              count: selectedKeys.length,
              max: skillPickCount,
            })}
            comboboxLabel={t("character.skill")}
            selectedKeys={selectedKeys}
            maxCount={skillPickCount}
            options={availableSpeciesSkillOptions(
              skillOptions,
              picks,
              takenSkillsForSpeciesPicker(sources, -1),
              -1,
            )}
            onAdd={(skillId) => {
              const index = firstEmptySkillPickSlot(picks);
              if (index < 0) return;
              dispatch({ type: "SET_SPECIES_SKILL_PICK", index, skill: skillId });
            }}
            onRemove={(skillId) => {
              const index = skillPickSlotForId(picks, skillId);
              if (index < 0) return;
              dispatch({ type: "SET_SPECIES_SKILL_PICK", index, skill: null });
            }}
          />
        );
      })() : null}

      {toolPickCount > 0 ? (
        <ToolCappedPickList
          id="species-tool-select"
          groupLabel={t("character.speciesToolsChoose", { count: toolPickCount })}
          comboboxLabel={t("character.speciesToolPick", { index: 1 })}
          selectedKeys={compactToolPicks(character.speciesToolPicks)}
          maxCount={toolPickCount}
          options={availableToolOptions(
            ALL_TOOL_OPTIONS,
            character.speciesToolPicks,
            [
              ...character.backgroundToolPicks.filter((pick): pick is ToolId => pick != null),
              ...character.classToolPicks.filter((pick): pick is ToolId => pick != null),
            ],
            -1,
          )}
          onAdd={(toolId) => {
            const index = firstEmptyToolPickSlot(character.speciesToolPicks);
            if (index < 0) return;
            dispatch({ type: "SET_SPECIES_TOOL_PICK", index, tool: toolId });
          }}
          onRemove={(toolId) => {
            const index = toolPickSlotForId(character.speciesToolPicks, toolId);
            if (index < 0) return;
            dispatch({ type: "SET_SPECIES_TOOL_PICK", index, tool: null });
          }}
        />
      ) : null}
    </div>
  );
}
