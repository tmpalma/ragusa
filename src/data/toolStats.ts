import type { AbilityId } from "./types";

export type ToolCategory = "artisan" | "gamingSet" | "musicalInstrument" | "other";

export type ToolId =
  | "alchemists-supplies"
  | "brewers-supplies"
  | "calligraphers-supplies"
  | "carpenters-tools"
  | "cartographers-tools"
  | "cobblers-tools"
  | "cooks-utensils"
  | "disguise-kit"
  | "forgery-kit"
  | "glassblowers-tools"
  | "herbalism-kit"
  | "jewelers-tools"
  | "leatherworkers-tools"
  | "masons-tools"
  | "navigators-tools"
  | "painters-supplies"
  | "poisoners-kit"
  | "potters-tools"
  | "smiths-tools"
  | "thieves-tools"
  | "tinkers-tools"
  | "weavers-tools"
  | "woodcarvers-tools"
  | "gaming-set-dice"
  | "gaming-set-dragonchess"
  | "gaming-set-playing-cards"
  | "gaming-set-three-dragon-ante"
  | "musical-instrument-bagpipes"
  | "musical-instrument-drum"
  | "musical-instrument-dulcimer"
  | "musical-instrument-flute"
  | "musical-instrument-horn"
  | "musical-instrument-lute"
  | "musical-instrument-lyre"
  | "musical-instrument-pan-flute"
  | "musical-instrument-shawm"
  | "musical-instrument-viol";

export interface ToolData {
  id: ToolId;
  category: ToolCategory;
  ability: AbilityId;
}

/** Populated from get_catalog() during app boot. */
export const TOOL_STATS = {} as Record<ToolId, ToolData>;

export const TOOL_IDS = [] as ToolId[];

export function toolsInCategories(categories: readonly ToolCategory[]): ToolId[] {
  const categorySet = new Set(categories);
  return TOOL_IDS.filter((id) => categorySet.has(TOOL_STATS[id].category));
}

export function toolAbility(id: ToolId): AbilityId {
  return TOOL_STATS[id].ability;
}
