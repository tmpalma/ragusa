import type { AbilityId } from "../src/data/types.js";

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

/** SRD 5.2.1 Tools section — hand-curated. */
export const TOOL_STATS: Record<ToolId, ToolData> = {
  "alchemists-supplies": { id: "alchemists-supplies", category: "artisan", ability: "int" },
  "brewers-supplies": { id: "brewers-supplies", category: "artisan", ability: "int" },
  "calligraphers-supplies": { id: "calligraphers-supplies", category: "artisan", ability: "dex" },
  "carpenters-tools": { id: "carpenters-tools", category: "artisan", ability: "str" },
  "cartographers-tools": { id: "cartographers-tools", category: "artisan", ability: "wis" },
  "cobblers-tools": { id: "cobblers-tools", category: "artisan", ability: "dex" },
  "cooks-utensils": { id: "cooks-utensils", category: "artisan", ability: "wis" },
  "disguise-kit": { id: "disguise-kit", category: "other", ability: "cha" },
  "forgery-kit": { id: "forgery-kit", category: "other", ability: "dex" },
  "glassblowers-tools": { id: "glassblowers-tools", category: "artisan", ability: "int" },
  "herbalism-kit": { id: "herbalism-kit", category: "other", ability: "int" },
  "jewelers-tools": { id: "jewelers-tools", category: "artisan", ability: "int" },
  "leatherworkers-tools": { id: "leatherworkers-tools", category: "artisan", ability: "dex" },
  "masons-tools": { id: "masons-tools", category: "artisan", ability: "str" },
  "navigators-tools": { id: "navigators-tools", category: "other", ability: "wis" },
  "painters-supplies": { id: "painters-supplies", category: "artisan", ability: "wis" },
  "poisoners-kit": { id: "poisoners-kit", category: "other", ability: "int" },
  "potters-tools": { id: "potters-tools", category: "artisan", ability: "int" },
  "smiths-tools": { id: "smiths-tools", category: "artisan", ability: "str" },
  "thieves-tools": { id: "thieves-tools", category: "other", ability: "dex" },
  "tinkers-tools": { id: "tinkers-tools", category: "artisan", ability: "dex" },
  "weavers-tools": { id: "weavers-tools", category: "artisan", ability: "dex" },
  "woodcarvers-tools": { id: "woodcarvers-tools", category: "artisan", ability: "dex" },
  "gaming-set-dice": { id: "gaming-set-dice", category: "gamingSet", ability: "wis" },
  "gaming-set-dragonchess": { id: "gaming-set-dragonchess", category: "gamingSet", ability: "wis" },
  "gaming-set-playing-cards": { id: "gaming-set-playing-cards", category: "gamingSet", ability: "wis" },
  "gaming-set-three-dragon-ante": { id: "gaming-set-three-dragon-ante", category: "gamingSet", ability: "wis" },
  "musical-instrument-bagpipes": { id: "musical-instrument-bagpipes", category: "musicalInstrument", ability: "cha" },
  "musical-instrument-drum": { id: "musical-instrument-drum", category: "musicalInstrument", ability: "cha" },
  "musical-instrument-dulcimer": { id: "musical-instrument-dulcimer", category: "musicalInstrument", ability: "cha" },
  "musical-instrument-flute": { id: "musical-instrument-flute", category: "musicalInstrument", ability: "cha" },
  "musical-instrument-horn": { id: "musical-instrument-horn", category: "musicalInstrument", ability: "cha" },
  "musical-instrument-lute": { id: "musical-instrument-lute", category: "musicalInstrument", ability: "cha" },
  "musical-instrument-lyre": { id: "musical-instrument-lyre", category: "musicalInstrument", ability: "cha" },
  "musical-instrument-pan-flute": { id: "musical-instrument-pan-flute", category: "musicalInstrument", ability: "cha" },
  "musical-instrument-shawm": { id: "musical-instrument-shawm", category: "musicalInstrument", ability: "cha" },
  "musical-instrument-viol": { id: "musical-instrument-viol", category: "musicalInstrument", ability: "cha" },
};

export const TOOL_IDS: ToolId[] = Object.keys(TOOL_STATS) as ToolId[];

export function toolsInCategories(categories: readonly ToolCategory[]): ToolId[] {
  const categorySet = new Set(categories);
  return TOOL_IDS.filter((id) => categorySet.has(TOOL_STATS[id].category));
}

export function toolAbility(id: ToolId): AbilityId {
  return TOOL_STATS[id].ability;
}
