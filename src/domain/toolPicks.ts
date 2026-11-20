import { TOOL_IDS, TOOL_STATS, toolsInCategories, type ToolCategory, type ToolId } from "../data/toolStats";
import type { BackgroundData, ClassData, ToolProficiencyGrant } from "../data/types";
import type { FeatProficiencyPick } from "./featEffects";

export function fixedToolsFromGrants(grants: readonly ToolProficiencyGrant[]): ToolId[] {
  const result: ToolId[] = [];
  for (const grant of grants) {
    if (grant.kind === "fixed" && grant.toolId in TOOL_STATS) {
      result.push(grant.toolId as ToolId);
    }
  }
  return result;
}

export function chooseCountFromGrants(grants: readonly ToolProficiencyGrant[]): number {
  return grants
    .filter((grant): grant is Extract<ToolProficiencyGrant, { kind: "choose" }> => grant.kind === "choose")
    .reduce((sum, grant) => sum + grant.count, 0);
}

export function chooseCategoriesFromGrants(grants: readonly ToolProficiencyGrant[]): ToolProficiencyGrant[] {
  return grants.filter((grant): grant is Extract<ToolProficiencyGrant, { kind: "choose" }> => grant.kind === "choose");
}

export function backgroundFixedTool(background: BackgroundData | null): ToolId | null {
  if (!background?.toolProficiency || background.toolProficiency.kind !== "fixed") return null;
  const id = background.toolProficiency.toolId;
  return id in TOOL_STATS ? (id as ToolId) : null;
}

export function backgroundToolChooseCount(background: BackgroundData | null): number {
  if (!background?.toolProficiency || background.toolProficiency.kind !== "choose") return 0;
  return background.toolProficiency.count;
}

export function backgroundToolChooseCategories(background: BackgroundData | null) {
  if (!background?.toolProficiency || background.toolProficiency.kind !== "choose") return [];
  return background.toolProficiency.categories;
}

export function classFixedTools(classData: ClassData | null): ToolId[] {
  return fixedToolsFromGrants(classData?.toolProficiencies ?? []);
}

export function classToolChooseCount(classData: ClassData | null): number {
  return chooseCountFromGrants(classData?.toolProficiencies ?? []);
}

export function classToolChooseCategories(classData: ClassData | null) {
  return chooseCategoriesFromGrants(classData?.toolProficiencies ?? []) as Extract<
    ToolProficiencyGrant,
    { kind: "choose" }
  >[];
}

export function toolOptionsForGrant(grant: Extract<ToolProficiencyGrant, { kind: "choose" }>): ToolId[] {
  return toolsInCategories(grant.categories);
}

export function allToolOptionsForGrants(grants: readonly Extract<ToolProficiencyGrant, { kind: "choose" }>[]): ToolId[] {
  const seen = new Set<ToolId>();
  const result: ToolId[] = [];
  for (const grant of grants) {
    for (const id of toolOptionsForGrant(grant)) {
      if (!seen.has(id)) {
        seen.add(id);
        result.push(id);
      }
    }
  }
  return result;
}

export function backgroundToolSlotCount(background: BackgroundData | null): number {
  if (!background?.toolProficiency) return 0;
  if (background.toolProficiency.kind === "fixed") return 1;
  return background.toolProficiency.count;
}

export function classToolSlotCount(classData: ClassData | null): number {
  if (!classData) return 0;
  return fixedToolsFromGrants(classData.toolProficiencies).length + chooseCountFromGrants(classData.toolProficiencies);
}

/** Every SRD tool — used when a grant allows all categories (e.g. custom background). */
export const ALL_TOOL_OPTIONS: ToolId[] = TOOL_IDS;

export type ToolGrantLabelProfile =
  | "generic"
  | "musicalInstrument"
  | "artisan"
  | "gamingSet"
  | "artisanOrMusicalInstrument";

export function toolGrantLabelProfile(categories: readonly ToolCategory[]): ToolGrantLabelProfile {
  const unique = [...new Set(categories)];
  if (unique.length === 1) {
    if (unique[0] === "musicalInstrument") return "musicalInstrument";
    if (unique[0] === "artisan") return "artisan";
    if (unique[0] === "gamingSet") return "gamingSet";
  }
  if (
    unique.length === 2 &&
    unique.includes("artisan") &&
    unique.includes("musicalInstrument")
  ) {
    return "artisanOrMusicalInstrument";
  }
  return "generic";
}

export function classToolGrantLabelProfile(classData: ClassData | null): ToolGrantLabelProfile {
  const grants = classToolChooseCategories(classData);
  if (grants.length === 0) return "generic";
  return toolGrantLabelProfile(grants.flatMap((grant) => grant.categories));
}

export function backgroundToolGrantLabelProfile(background: BackgroundData | null): ToolGrantLabelProfile {
  if (!background?.toolProficiency || background.toolProficiency.kind !== "choose") return "generic";
  return toolGrantLabelProfile(background.toolProficiency.categories);
}

export function suggestedBackgroundTools(background: BackgroundData | null): (ToolId | null)[] {
  const count = backgroundToolSlotCount(background);
  if (count === 0) return [];
  const fixed = backgroundFixedTool(background);
  if (fixed) return [fixed];
  const categoryDefault = backgroundToolOptions(background)[0] ?? null;
  return Array.from({ length: count }, (_, index) => (index === 0 ? categoryDefault : null));
}

export function suggestedClassTools(classData: ClassData | null): (ToolId | null)[] {
  const count = classToolSlotCount(classData);
  if (count === 0) return [];
  const fixed = classFixedTools(classData);
  const picks: (ToolId | null)[] = [...fixed];
  while (picks.length < count) picks.push(null);
  return picks.slice(0, count);
}

export function suggestedBackgroundTool(background: BackgroundData | null): ToolId | null {
  return suggestedBackgroundTools(background)[0] ?? null;
}

export function suggestedClassTool(classData: ClassData | null, index: number): ToolId | null {
  return suggestedClassTools(classData)[index] ?? null;
}

export function backgroundToolOptions(background: BackgroundData | null): ToolId[] {
  if (!background?.toolProficiency) return [];
  if (background.toolProficiency.kind === "fixed") {
    const fixed = backgroundFixedTool(background);
    return fixed ? [fixed] : [];
  }
  return toolOptionsForGrant(background.toolProficiency);
}

export function classToolOptions(classData: ClassData | null): ToolId[] {
  if (!classData) return [];
  const chooseOptions = allToolOptionsForGrants(classToolChooseCategories(classData));
  if (chooseOptions.length > 0) return chooseOptions;
  return classFixedTools(classData);
}

export function initialToolPicks(count: number): (ToolId | null)[] {
  return Array.from({ length: count }, () => null);
}

export function retainValidToolPicks(
  picks: readonly (ToolId | null)[],
  count: number,
  options: readonly ToolId[],
  takenTools: readonly ToolId[],
): (ToolId | null)[] {
  const optionSet = new Set(options);
  const takenSet = new Set(takenTools);
  const kept: ToolId[] = [];
  const seen = new Set<ToolId>();
  for (const pick of picks) {
    if (pick && optionSet.has(pick) && !takenSet.has(pick) && !seen.has(pick)) {
      kept.push(pick);
      seen.add(pick);
    }
  }
  return Array.from({ length: count }, (_, index) => kept[index] ?? null);
}

export function applyToolPick(
  picks: readonly (ToolId | null)[],
  index: number,
  tool: ToolId | null,
  options: readonly ToolId[],
  takenTools: readonly ToolId[],
): (ToolId | null)[] | null {
  if (index < 0 || index >= picks.length) return null;
  if (tool === null) {
    if (picks[index] === null) return null;
    const next = [...picks];
    next[index] = null;
    return next;
  }
  if (!options.includes(tool)) return null;
  if (takenTools.includes(tool)) return null;
  if (picks.some((pick, pickIndex) => pickIndex !== index && pick === tool)) return null;
  if (picks[index] === tool) return null;
  const next = [...picks];
  next[index] = tool;
  return next;
}

export function availableToolOptions(
  options: readonly ToolId[],
  picks: readonly (ToolId | null)[],
  takenTools: readonly ToolId[],
  slotIndex: number,
): ToolId[] {
  const taken = new Set<ToolId>(takenTools);
  picks.forEach((pick, index) => {
    if (pick && index !== slotIndex) taken.add(pick);
  });
  return options.filter((id) => !taken.has(id));
}

export function featToolPicks(featPicks: readonly (FeatProficiencyPick | null)[]): ToolId[] {
  return featPicks
    .filter((pick): pick is Extract<FeatProficiencyPick, { kind: "tool" }> => pick?.kind === "tool")
    .map((pick) => pick.id);
}

export function featToolPickSlotForId(
  picks: readonly (FeatProficiencyPick | null)[],
  toolId: ToolId,
): number {
  return picks.findIndex((pick) => pick?.kind === "tool" && pick.id === toolId);
}

export function compactToolPicks(picks: readonly (ToolId | null)[]): ToolId[] {
  return picks.filter((pick): pick is ToolId => pick != null);
}

export function firstEmptyToolPickSlot(picks: readonly (ToolId | null)[]): number {
  return picks.findIndex((pick) => pick === null);
}

export function firstValidEmptyToolPickSlot(
  picks: readonly (ToolId | null)[],
  toolId: ToolId,
  slotOptions: (index: number) => readonly ToolId[],
): number {
  return picks.findIndex((pick, index) => pick === null && slotOptions(index).includes(toolId));
}

export function toolPickSlotForId(picks: readonly (ToolId | null)[], toolId: ToolId): number {
  return picks.findIndex((pick) => pick === toolId);
}

export function mergeProficientTools(
  backgroundPicks: readonly (ToolId | null)[],
  classPicks: readonly (ToolId | null)[],
  featPicks: readonly (FeatProficiencyPick | null)[] = [],
  speciesPicks: readonly (ToolId | null)[] = [],
  subclassFixedTools: readonly ToolId[] = [],
  subclassToolPicks: readonly (ToolId | null)[] = [],
  featFixedTools: readonly ToolId[] = [],
): ToolId[] {
  const seen = new Set<ToolId>();
  const result: ToolId[] = [];
  const add = (id: ToolId | null | undefined) => {
    if (id && !seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  };
  for (const pick of backgroundPicks) add(pick);
  for (const pick of classPicks) add(pick);
  for (const pick of speciesPicks) add(pick);
  for (const pick of featPicks) {
    if (pick?.kind === "tool") add(pick.id);
  }
  for (const toolId of subclassFixedTools) add(toolId);
  for (const pick of subclassToolPicks) add(pick);
  for (const toolId of featFixedTools) add(toolId);
  return result;
}

export function allTakenTools(
  backgroundPicks: readonly (ToolId | null)[],
  classPicks: readonly (ToolId | null)[],
  featPicks: readonly (FeatProficiencyPick | null)[] = [],
): ToolId[] {
  return mergeProficientTools(backgroundPicks, classPicks, featPicks);
}
