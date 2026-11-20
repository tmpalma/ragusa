import { SKILLS } from "../data/skills";
import { SUBCLASSES, findByKey } from "../data";
import type {
  ClassFeatureData,
  ClassFeatureEffect,
  FeatureOptionCombatCard,
  SkillId,
  SubclassData,
  ToolCategory,
} from "../data/types";
import { TOOL_STATS, toolsInCategories, type ToolId } from "../data/toolStats";
import { resolveClassFeatureOptionPickCount } from "./classFeatures/optionPicks";
import { spellKeyFromName } from "./spellSelection";

const ALL_SKILL_IDS = SKILLS.map((skill) => skill.id);

export interface SubclassSkillGrant {
  featureKey: string;
  count: number;
  options: SkillId[];
}

export interface SubclassToolGrant {
  featureKey: string;
  fixedTools: ToolId[];
  /** Independent choose slots (e.g. Student of War artisan tool). */
  choose?: { count: number; categories: ToolCategory[] };
  /** Replacement choose per fixed tool the character already knows. */
  replacementChoose?: { categories: ToolCategory[] };
}

export interface SubclassFeatureOptionPickGrant {
  choiceKey: string;
  featureKey: string;
  featureName: string;
  count: number;
  grantedAtLevel: number;
  uiSurface: "character" | "spells" | "combat" | "reference";
  options: { key: string; name: string; desc: string; repeatable?: boolean }[];
}

const REPLACEMENT_TOOL_SUGGESTIONS: Partial<Record<string, ToolId[]>> = {
  alchemist: ["brewers-supplies", "glassblowers-tools", "potters-tools", "smiths-tools", "carpenters-tools"],
  armorer: ["leatherworkers-tools", "tinkers-tools", "masons-tools", "woodcarvers-tools"],
  artillerist: ["tinkers-tools", "smiths-tools", "painters-supplies", "jewelers-tools"],
  cartographer: ["painters-supplies", "jewelers-tools", "glassblowers-tools", "weavers-tools"],
};

function isBattleSmithArtisanChoose(
  subclass: SubclassData | null,
  grant: SubclassToolGrant,
): boolean {
  return (
    subclass?.key === "battle-smith" &&
    grant.choose?.count === 1 &&
    grant.choose.categories.length === 1 &&
    grant.choose.categories[0] === "artisan" &&
    grant.fixedTools.length === 0 &&
    !grant.replacementChoose
  );
}

export function suggestedSubclassToolId(
  subclass: SubclassData | null,
  grant: SubclassToolGrant,
  toolsBeforeSubclassGrants: readonly ToolId[] = [],
): ToolId | null {
  if (!isBattleSmithArtisanChoose(subclass, grant)) return null;
  if (toolsBeforeSubclassGrants.includes("smiths-tools")) return null;
  return "smiths-tools";
}

/** Picker lists omit Ravenloft subclasses; findSubclass still resolves them. */
export function subclassListedForPicker(subclass: Pick<SubclassData, "book">): boolean {
  return subclass.book !== "RHW";
}

export function subclassesForClass(classKey: string | null): SubclassData[] {
  if (!classKey) return [];
  return SUBCLASSES.filter(
    (subclass) => subclass.classKey === classKey && subclassListedForPicker(subclass),
  );
}

export function findSubclass(classKey: string | null, subclassKey: string | null): SubclassData | null {
  if (!classKey || !subclassKey) return null;
  const match = findByKey(SUBCLASSES, subclassKey);
  if (!match || match.classKey !== classKey) return null;
  return match;
}

export function subclassFixedSkills(subclass: SubclassData | null): SkillId[] {
  if (!subclass) return [];
  const skills: SkillId[] = [];
  for (const feature of subclass.features) {
    for (const effect of feature.effects) {
      if (effect.type === "grant_skill_proficiencies" && effect.fixedSkills) {
        skills.push(...effect.fixedSkills);
      }
    }
  }
  return [...new Set(skills)];
}

export function subclassSkillGrants(subclass: SubclassData | null): SubclassSkillGrant[] {
  if (!subclass) return [];
  const grants: SubclassSkillGrant[] = [];
  for (const feature of subclass.features) {
    for (const effect of feature.effects) {
      if (effect.type === "grant_skill_proficiencies") {
        if (effect.count <= 0) continue;
        grants.push({
          featureKey: feature.key,
          count: effect.count,
          options: effect.options ?? ALL_SKILL_IDS,
        });
      }
    }
  }
  return grants;
}

export function subclassSkillProficiencyCount(subclass: SubclassData | null): number {
  return subclassSkillGrants(subclass).reduce((total, grant) => total + grant.count, 0);
}

export function subclassFeatureChoiceKeys(subclass: SubclassData | null): string[] {
  if (!subclass) return [];
  const keys: string[] = [];
  for (const feature of subclass.features) {
    for (const effect of feature.effects) {
      if (effect.type === "choose_feature_option") {
        keys.push(effect.choiceKey);
      }
    }
  }
  return keys;
}

export function initialSubclassSkillPicks(subclass: SubclassData | null): (SkillId | null)[] {
  const count = subclassSkillProficiencyCount(subclass);
  return Array.from({ length: count }, () => null);
}

export function initialSubclassFeatureChoices(_subclass: SubclassData | null): Record<string, string> {
  return {};
}

export function activeSubclassFeatures(subclass: SubclassData | null, level: number): ClassFeatureData[] {
  if (!subclass) return [];
  return subclass.features.filter((feature) => feature.grantedAtLevel <= level);
}

export function subclassFeaturesAtLevel(subclass: SubclassData | null, level: number): ClassFeatureData[] {
  if (!subclass) return [];
  return subclass.features.filter((feature) => feature.grantedAtLevel === level);
}

export function alwaysPreparedSpellNamesFromSubclass(
  subclass: SubclassData | null,
  level: number,
  subclassFeatureChoices: Record<string, string> = {},
): string[] {
  if (!subclass) return [];
  const names: string[] = [];
  for (const feature of activeSubclassFeatures(subclass, level)) {
    for (const effect of feature.effects) {
      if (effect.type === "always_prepared_spells") {
        names.push(...effect.spellNames);
      }
      if (effect.type === "choose_feature_option") {
        const selectedKey = subclassFeatureChoices[effect.choiceKey];
        if (!selectedKey) continue;
        const option = effect.options.find((entry) => entry.key === selectedKey);
        if (option?.spellNames) names.push(...option.spellNames);
      }
    }
  }
  return names;
}

export function alwaysPreparedSpellKeysFromSubclass(
  subclass: SubclassData | null,
  level: number,
  subclassFeatureChoices: Record<string, string> = {},
): string[] {
  return alwaysPreparedSpellNamesFromSubclass(subclass, level, subclassFeatureChoices)
    .map((name) => spellKeyFromName(name))
    .filter((key): key is string => key != null);
}

export interface SubclassSpellbookPickGrant {
  count: number;
  school: string;
  maxSpellLevel: number;
}

export function subclassSpellbookPickGrants(subclass: SubclassData | null, level: number): SubclassSpellbookPickGrant[] {
  if (!subclass) return [];
  const grants: SubclassSpellbookPickGrant[] = [];
  for (const feature of activeSubclassFeatures(subclass, level)) {
    for (const effect of feature.effects) {
      if (effect.type === "grant_spellbook_picks") {
        grants.push({
          count: effect.count,
          school: effect.school,
          maxSpellLevel: effect.maxSpellLevel,
        });
      }
    }
  }
  return grants;
}

export function subclassSpellbookPickCount(subclass: SubclassData | null, level: number): number {
  return subclassSpellbookPickGrants(subclass, level).reduce((total, grant) => total + grant.count, 0);
}

/** Single combat-surface option that only exists to attach attack cards — no player pick. */
export function isImplicitSingleCombatOption(
  effect: Extract<ClassFeatureEffect, { type: "choose_feature_option" }>,
): boolean {
  return (
    (effect.uiSurface ?? "character") === "combat" &&
    effect.options.length === 1 &&
    (effect.options[0]?.combatCards?.length ?? 0) > 0
  );
}

export function selectedSubclassOptionCombatCards(
  subclass: SubclassData | null,
  subclassFeatureChoices: Record<string, string> = {},
): FeatureOptionCombatCard[] {
  if (!subclass) return [];
  const cards: FeatureOptionCombatCard[] = [];
  for (const feature of subclass.features) {
    for (const effect of feature.effects) {
      if (effect.type !== "choose_feature_option") continue;
      if (isImplicitSingleCombatOption(effect)) {
        cards.push(...(effect.options[0]?.combatCards ?? []));
        continue;
      }
      const selectedKey = subclassFeatureChoices[effect.choiceKey];
      if (!selectedKey) continue;
      const option = effect.options.find((entry) => entry.key === selectedKey);
      if (option?.combatCards) cards.push(...option.combatCards);
    }
  }
  return cards;
}

export function subclassFeatureChoiceOptions(
  subclass: SubclassData | null,
  choiceKey: string,
): { key: string; name: string; desc: string }[] {
  if (!subclass) return [];
  for (const feature of subclass.features) {
    for (const effect of feature.effects) {
      if (effect.type === "choose_feature_option" && effect.choiceKey === choiceKey) {
        return effect.options;
      }
    }
  }
  return [];
}

function isToolId(value: string): value is ToolId {
  return value in TOOL_STATS;
}

export function subclassToolGrants(subclass: SubclassData | null): SubclassToolGrant[] {
  if (!subclass) return [];
  const grants: SubclassToolGrant[] = [];
  for (const feature of subclass.features) {
    for (const effect of feature.effects) {
      if (effect.type !== "grant_tool_proficiencies") continue;
      grants.push({
        featureKey: feature.key,
        fixedTools: effect.fixedTools.filter(isToolId),
        choose: effect.choose,
        replacementChoose: effect.replacementChoose,
      });
    }
  }
  return grants;
}

export function subclassFixedTools(subclass: SubclassData | null): ToolId[] {
  const seen = new Set<ToolId>();
  const result: ToolId[] = [];
  for (const grant of subclassToolGrants(subclass)) {
    for (const toolId of grant.fixedTools) {
      if (!seen.has(toolId)) {
        seen.add(toolId);
        result.push(toolId);
      }
    }
  }
  return result;
}

export function subclassToolReplacementChooseCount(
  grant: SubclassToolGrant,
  toolsBeforeSubclassGrants: readonly ToolId[],
): number {
  if (!grant.replacementChoose) return 0;
  return grant.fixedTools.filter((toolId) => toolsBeforeSubclassGrants.includes(toolId)).length;
}

export function subclassToolIndependentChooseCount(grant: SubclassToolGrant): number {
  return grant.choose?.count ?? 0;
}

export function subclassToolChooseCount(
  grant: SubclassToolGrant,
  toolsBeforeSubclassGrants: readonly ToolId[],
): number {
  return (
    subclassToolReplacementChooseCount(grant, toolsBeforeSubclassGrants) +
    subclassToolIndependentChooseCount(grant)
  );
}

export function subclassToolPickCount(
  subclass: SubclassData | null,
  toolsBeforeSubclassGrants: readonly ToolId[],
): number {
  return subclassToolGrants(subclass).reduce(
    (total, grant) => total + subclassToolChooseCount(grant, toolsBeforeSubclassGrants),
    0,
  );
}

function replacementToolPickOptions(grant: SubclassToolGrant): ToolId[] {
  if (!grant.replacementChoose) return [];
  const blocked = new Set(grant.fixedTools);
  return toolsInCategories(grant.replacementChoose.categories).filter((toolId) => !blocked.has(toolId));
}

function independentToolPickOptions(
  grant: SubclassToolGrant,
  subclass: SubclassData | null = null,
  toolsBeforeSubclassGrants: readonly ToolId[] = [],
): ToolId[] {
  if (!grant.choose) return [];
  const options = toolsInCategories(grant.choose.categories);
  if (isBattleSmithArtisanChoose(subclass, grant) && toolsBeforeSubclassGrants.includes("smiths-tools")) {
    return options.filter((toolId) => toolId !== "smiths-tools");
  }
  return options;
}

export function subclassToolPickOptionsForSlot(
  grant: SubclassToolGrant,
  slotIndex: number,
  toolsBeforeSubclassGrants: readonly ToolId[],
  subclass: SubclassData | null = null,
): ToolId[] {
  const replacementCount = subclassToolReplacementChooseCount(grant, toolsBeforeSubclassGrants);
  if (slotIndex < replacementCount) return replacementToolPickOptions(grant);
  const options = independentToolPickOptions(grant, subclass, toolsBeforeSubclassGrants);
  if (isBattleSmithArtisanChoose(subclass, grant)) {
    return options.filter((toolId) => !toolsBeforeSubclassGrants.includes(toolId));
  }
  return options;
}

export function subclassToolPickOptions(grant: SubclassToolGrant): ToolId[] {
  return [...replacementToolPickOptions(grant), ...independentToolPickOptions(grant)];
}

export function suggestedSubclassToolPicks(
  subclass: SubclassData | null,
  grant: SubclassToolGrant,
  count: number,
  toolsBeforeSubclassGrants: readonly ToolId[] = [],
): (ToolId | null)[] {
  if (count <= 0) return [];
  const picks: (ToolId | null)[] = [];
  for (let index = 0; index < count; index += 1) {
    if (index === 0 && isBattleSmithArtisanChoose(subclass, grant)) {
      picks.push(suggestedSubclassToolId(subclass, grant, toolsBeforeSubclassGrants));
      continue;
    }
    const options = subclassToolPickOptionsForSlot(grant, index, toolsBeforeSubclassGrants, subclass);
    const preferred = subclass ? REPLACEMENT_TOOL_SUGGESTIONS[subclass.key] : undefined;
    const suggestions = (preferred ?? options).filter((toolId) => options.includes(toolId));
    const suggestion = suggestions.find((toolId) => !picks.includes(toolId)) ?? null;
    picks.push(suggestion);
  }
  return picks;
}

export function initialSubclassToolPicks(
  subclass: SubclassData | null,
  toolsBeforeSubclassGrants: readonly ToolId[],
): Record<string, (ToolId | null)[]> {
  const picks: Record<string, (ToolId | null)[]> = {};
  for (const grant of subclassToolGrants(subclass)) {
    const count = subclassToolChooseCount(grant, toolsBeforeSubclassGrants);
    if (count <= 0) continue;
    picks[grant.featureKey] = suggestedSubclassToolPicks(subclass, grant, count, toolsBeforeSubclassGrants);
  }
  return picks;
}

function usesSubclassOptionPickStorage(
  effect: Extract<ClassFeatureEffect, { type: "choose_feature_option" }>,
  level: number,
): boolean {
  const count = resolveClassFeatureOptionPickCount(effect, level);
  const surface = effect.uiSurface ?? "character";
  return count > 1 || surface === "spells";
}

export function isSubclassCharacterOptionPick(
  effect: ClassFeatureEffect,
  level: number,
): boolean {
  if (effect.type !== "choose_feature_option") return false;
  const count = resolveClassFeatureOptionPickCount(effect, level);
  const surface = effect.uiSurface ?? "character";
  return count > 1 && surface === "character";
}

export function isSubclassSingleCharacterChoice(
  effect: ClassFeatureEffect,
  level: number,
): boolean {
  if (effect.type !== "choose_feature_option") return false;
  const count = resolveClassFeatureOptionPickCount(effect, level);
  const surface = effect.uiSurface ?? "character";
  return count === 1 && surface === "character";
}

export function subclassFeatureOptionPickGrants(
  subclass: SubclassData | null,
  level: number,
  uiSurface?: "character" | "spells" | "combat" | "reference",
): SubclassFeatureOptionPickGrant[] {
  if (!subclass) return [];
  const grants: SubclassFeatureOptionPickGrant[] = [];
  for (const feature of activeSubclassFeatures(subclass, level)) {
    for (const effect of feature.effects) {
      if (effect.type !== "choose_feature_option") continue;
      if (!usesSubclassOptionPickStorage(effect, level)) continue;
      if (uiSurface != null && (effect.uiSurface ?? "character") !== uiSurface) continue;
      grants.push({
        choiceKey: effect.choiceKey,
        featureKey: feature.key,
        featureName: feature.name,
        count: resolveClassFeatureOptionPickCount(effect, level),
        grantedAtLevel: feature.grantedAtLevel,
        uiSurface: effect.uiSurface ?? "character",
        options: effect.options,
      });
    }
  }
  return grants;
}

export function subclassFeatureOptionPickCount(
  subclass: SubclassData | null,
  choiceKey: string,
  level: number,
): number {
  if (!subclass) return 0;
  for (const feature of activeSubclassFeatures(subclass, level)) {
    for (const effect of feature.effects) {
      if (effect.type === "choose_feature_option" && effect.choiceKey === choiceKey) {
        return resolveClassFeatureOptionPickCount(effect, level);
      }
    }
  }
  return 0;
}

export function subclassFeatureOptionPickOptions(
  subclass: SubclassData | null,
  choiceKey: string,
  level: number,
): { key: string; name: string; desc: string; repeatable?: boolean }[] {
  if (!subclass) return [];
  for (const feature of activeSubclassFeatures(subclass, level)) {
    for (const effect of feature.effects) {
      if (effect.type === "choose_feature_option" && effect.choiceKey === choiceKey) {
        return effect.options;
      }
    }
  }
  return [];
}

export function isValidSubclassFeatureOptionPick(
  subclass: SubclassData | null,
  choiceKey: string,
  level: number,
  allPicks: (string | null)[],
  index: number,
  optionKey: string | null,
): boolean {
  if (!subclass) return false;
  const count = subclassFeatureOptionPickCount(subclass, choiceKey, level);
  if (index < 0 || index >= count) return false;
  if (optionKey == null) return true;
  const options = subclassFeatureOptionPickOptions(subclass, choiceKey, level);
  const option = options.find((entry) => entry.key === optionKey);
  if (!option) return false;
  if (option.repeatable) return true;
  return !allPicks.some((pick, pickIndex) => pickIndex !== index && pick === optionKey);
}

export function initialSubclassFeatureOptionPicks(
  subclass: SubclassData | null,
  level: number,
): Record<string, (string | null)[]> {
  const picks: Record<string, (string | null)[]> = {};
  for (const grant of subclassFeatureOptionPickGrants(subclass, level)) {
    picks[grant.choiceKey] = Array.from({ length: grant.count }, () => null);
  }
  return picks;
}

export function subclassFeatureOptionPickGrantForFeature(
  subclass: SubclassData | null,
  featureKey: string,
  level: number,
): SubclassFeatureOptionPickGrant | null {
  return subclassFeatureOptionPickGrants(subclass, level).find((grant) => grant.featureKey === featureKey) ?? null;
}

export function foldSubclassFeatureEffect(
  effect: ClassFeatureEffect,
  onGrantSkills: (count: number) => void,
): void {
  if (effect.type === "grant_skill_proficiencies") {
    onGrantSkills(effect.count);
  }
}

export function clearSubclassState(): {
  subclassKey: null;
  subclassSkillPicks: (SkillId | null)[];
  subclassFeatureChoices: Record<string, string>;
  subclassFeatureOptionPicks: Record<string, (string | null)[]>;
  subclassToolPicks: Record<string, (ToolId | null)[]>;
  subclassSpellbookPicks: string[];
} {
  return {
    subclassKey: null,
    subclassSkillPicks: [],
    subclassFeatureChoices: {},
    subclassFeatureOptionPicks: {},
    subclassToolPicks: {},
    subclassSpellbookPicks: [],
  };
}

export function subclassStateForSelection(
  subclass: SubclassData | null,
  level = 3,
  toolsBeforeSubclassGrants: readonly ToolId[] = [],
): {
  subclassKey: string | null;
  subclassSkillPicks: (SkillId | null)[];
  subclassFeatureChoices: Record<string, string>;
  subclassFeatureOptionPicks: Record<string, (string | null)[]>;
  subclassToolPicks: Record<string, (ToolId | null)[]>;
  subclassSpellbookPicks: string[];
} {
  if (!subclass) return clearSubclassState();
  return {
    subclassKey: subclass.key,
    subclassSkillPicks: initialSubclassSkillPicks(subclass),
    subclassFeatureChoices: initialSubclassFeatureChoices(subclass),
    subclassFeatureOptionPicks: initialSubclassFeatureOptionPicks(subclass, level),
    subclassToolPicks: initialSubclassToolPicks(subclass, toolsBeforeSubclassGrants),
    subclassSpellbookPicks: [],
  };
}
