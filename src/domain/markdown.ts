import { backgroundDisplayName } from "./background";
import { SKILLS } from "../data/skills";
import { toolAbility } from "../data/toolStats";
import { PROFICIENCY_BONUS } from "./proficiency";
import { lineageDisplayName } from "./speciesFeatures";
import { toolBonus } from "./toolBonuses";
import type { DerivedStats } from "./deriveCharacter";
import { formatModifier } from "./modifiers";
import type { Character } from "../state/characterState";
import {
  buildTrainingSummary,
  formatTrainingArmorLine,
  formatTrainingWeaponsLine,
} from "./training";

export type MarkdownTranslateFn = (
  key: string,
  params?: Record<string, string | number>,
  fallback?: string,
) => string;

function skillMarker(state: Character["skills"][keyof Character["skills"]]): string {
  if (state === "expert") return "**";
  if (state === "proficient") return "*";
  return "";
}

/**
 * Produces the Markdown character sheet in the exact structure specified for v1:
 * name/class/background/species, ability score table, proficiency bonus, feats,
 * armor class, hit points, saving throws table, skills table. Backstory, alignment description,
 * and starting equipment are on-screen only and intentionally not included here.
 */
export function generateCharacterMarkdown(
  character: Character,
  derived: DerivedStats,
  t: MarkdownTranslateFn,
  entityName: (catalog: string, key: string | null | undefined, fallback?: string) => string,
): string {
  const lines: string[] = [];

  lines.push(t("sheet.exportName", { name: character.name }));
  lines.push(t("sheet.exportClass", { name: entityName("catalog.classes", derived.classData?.key, "") }));
  lines.push(
    t("sheet.exportBackground", {
      name: backgroundDisplayName(
        character,
        derived.backgroundData,
        t("character.customBackground"),
        entityName("catalog.backgrounds", derived.backgroundData?.key, ""),
      ),
    }),
  );
  const lineage = lineageDisplayName(derived.speciesData, character.speciesLineageKey);
  const speciesExportName = lineage
    ? `${entityName("catalog.species", derived.speciesData?.key, "")} (${lineage})`
    : entityName("catalog.species", derived.speciesData?.key, "");
  lines.push(t("sheet.exportSpecies", { name: speciesExportName }));

  lines.push(t("sheet.exportAttributeTableHeader"));
  const abilityIds = ["str", "dex", "con", "int", "wis", "cha"] as const;
  for (const id of abilityIds) {
    const abilityLabel = t(`rules.ability.${id}`);
    lines.push(
      `    | ${abilityLabel} | ${derived.abilityScores[id]} | ${formatModifier(derived.abilityModifiers[id])} |`,
    );
  }

  lines.push(t("sheet.exportProficiencyBonus", { value: formatModifier(PROFICIENCY_BONUS) }));

  lines.push(t("sheet.exportFeatsHeader"));
  for (const feat of derived.feats) {
    lines.push(`    ${entityName("catalog.feats", feat.key, feat.name)}`);
  }

  lines.push(t("sheet.exportArmorClass", { value: derived.armorClass }));
  lines.push(t("sheet.exportHitPoints", { value: derived.hitPoints ?? "" }));

  const training = buildTrainingSummary({
    classData: derived.classData,
    level: character.level,
    classFeatureChoices: character.classFeatureChoices,
    subclassKey: character.subclassKey,
    featContributions: derived.featContributions,
  });
  lines.push(
    t("sheet.exportTrainingArmor", {
      value: formatTrainingArmorLine(training, t),
    }),
  );
  lines.push(
    t("sheet.exportTrainingWeapons", {
      value: formatTrainingWeaponsLine(training, t),
    }),
  );

  lines.push(t("sheet.exportSavingThrowsHeader"));
  lines.push(t("sheet.exportSavingThrowsTableHeader"));
  for (const id of abilityIds) {
    const savingThrow = derived.savingThrows[id];
    const abilityLabel = t(`rules.ability.${id}`);
    lines.push(
      `    | ${abilityLabel} | ${savingThrow.proficient ? t("sheet.exportProficientMark") : ""} | ${formatModifier(savingThrow.modifier)} |`,
    );
  }

  lines.push(t("sheet.exportSkillsHeader"));
  lines.push(t("sheet.exportSkillsTableHeader"));
  for (const skill of SKILLS) {
    const proficiencyState = character.skills[skill.id];
    const abilityMod = derived.abilityModifiers[skill.ability];
    const bonus = derived.skillBonuses[skill.id];
    const abilityName = t(`rules.ability.${skill.ability}`);
    const skillName = t(`rules.skill.${skill.id}`);
    lines.push(
      `    | ${skillName}${skillMarker(proficiencyState)} | ${abilityName} | ${formatModifier(abilityMod)} | ${formatModifier(bonus)} |`,
    );
  }

  if (character.proficientTools.length > 0) {
    lines.push(t("sheet.exportToolsHeader"));
    lines.push(t("sheet.exportToolsTableHeader"));
    for (const toolId of character.proficientTools) {
      const ability = toolAbility(toolId);
      const abilityName = t(`rules.ability.${ability}`);
      const toolName = t(`rules.tool.${toolId}`);
      lines.push(
        `    | ${toolName} | ${abilityName} | ${formatModifier(toolBonus(derived.abilityModifiers, toolId))} |`,
      );
    }
  }

  return lines.join("\n");
}
