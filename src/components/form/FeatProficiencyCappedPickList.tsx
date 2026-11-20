import type { ToolId } from "../../data/toolStats";
import type { SkillId } from "../../data/types";
import {
  availableFeatProficiencyOptions,
  compactFeatProficiencyPicks,
  decodeFeatProficiencyPick,
  encodeFeatProficiencyPick,
  featProficiencyPickSlotForEncoded,
  type FeatEffect,
  type FeatProficiencyOptionContext,
  type FeatProficiencyPick,
} from "../../domain/featEffects";
import { useLocale } from "../../i18n/LocaleContext";
import { CappedPickList } from "./CappedPickList";
import { ToolSelectedRow } from "./ToolSelectedRow";

function featPickLabel(
  encoded: string,
  skillName: (id: SkillId) => string,
  toolName: (id: ToolId) => string,
): string {
  const pick = decodeFeatProficiencyPick(encoded);
  if (!pick) return encoded;
  return pick.kind === "skill" ? skillName(pick.id) : toolName(pick.id);
}

function unionFeatProficiencyOptions(
  proficiencyPicks: (FeatProficiencyPick | null)[],
  takenSkills: SkillId[],
  takenTools: ToolId[],
  proficiencyGrant: Extract<FeatEffect, { type: "grant_skill_proficiencies" }> | null,
  context: FeatProficiencyOptionContext,
): FeatProficiencyPick[] {
  const encoded = new Set<string>();
  const options: FeatProficiencyPick[] = [];
  proficiencyPicks.forEach((_, slotIndex) => {
    if (proficiencyPicks[slotIndex] != null) return;
    for (const option of availableFeatProficiencyOptions(
      proficiencyPicks,
      takenSkills,
      takenTools,
      slotIndex,
      proficiencyGrant,
      context,
    )) {
      const key = encodeFeatProficiencyPick(option);
      if (encoded.has(key)) continue;
      encoded.add(key);
      options.push(option);
    }
  });
  return options;
}

export function FeatProficiencyCappedPickList({
  id,
  proficiencyPicks,
  maxCount,
  takenSkills,
  takenTools,
  proficiencyGrant,
  proficiencyContext,
  onPickChange,
}: {
  id: string;
  proficiencyPicks: (FeatProficiencyPick | null)[];
  maxCount: number;
  takenSkills: SkillId[];
  takenTools: ToolId[];
  proficiencyGrant: Extract<FeatEffect, { type: "grant_skill_proficiencies" }> | null;
  proficiencyContext: FeatProficiencyOptionContext;
  onPickChange: (index: number, pick: FeatProficiencyPick | null) => void;
}) {
  const { t } = useLocale();
  const skillName = (skillId: SkillId) => t(`rules.skill.${skillId}`);
  const toolName = (toolId: ToolId) => t(`rules.tool.${toolId}`);
  const selectedKeys = compactFeatProficiencyPicks(proficiencyPicks);
  const optionPicks = unionFeatProficiencyOptions(
    proficiencyPicks,
    takenSkills,
    takenTools,
    proficiencyGrant,
    proficiencyContext,
  );
  const options = optionPicks.map((option) => ({
    key: encodeFeatProficiencyPick(option),
    label: featPickLabel(encodeFeatProficiencyPick(option), skillName, toolName),
  }));

  return (
    <CappedPickList
      id={id}
      groupLabel={t("character.featProficienciesChooseCounted", {
        count: selectedKeys.length,
        max: maxCount,
      })}
      comboboxLabel={t("character.skillOrTool")}
      options={options}
      selectedKeys={selectedKeys}
      maxCount={maxCount}
      onAdd={(encoded) => {
        const pick = decodeFeatProficiencyPick(encoded);
        if (!pick) return;
        const index = proficiencyPicks.findIndex((slot, slotIndex) => {
          if (slot != null) return false;
          return availableFeatProficiencyOptions(
            proficiencyPicks,
            takenSkills,
            takenTools,
            slotIndex,
            proficiencyGrant,
            proficiencyContext,
          ).some((option) => option.kind === pick.kind && option.id === pick.id);
        });
        if (index < 0) return;
        onPickChange(index, pick);
      }}
      onRemove={(encoded) => {
        const index = featProficiencyPickSlotForEncoded(proficiencyPicks, encoded);
        if (index < 0) return;
        onPickChange(index, null);
      }}
      removeConfirmName={(encoded) => featPickLabel(encoded, skillName, toolName)}
      renderSelected={(encoded) => {
        const pick = decodeFeatProficiencyPick(encoded);
        if (!pick) return encoded;
        if (pick.kind === "tool") {
          return <ToolSelectedRow toolId={pick.id} />;
        }
        return featPickLabel(encoded, skillName, toolName);
      }}
    />
  );
}
