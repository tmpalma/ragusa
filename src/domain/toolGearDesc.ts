import { ADVENTURING_GEAR, findByKey } from "../data";
import type { AdventuringGearCategory } from "../data/types";
import { TOOL_STATS, type ToolCategory, type ToolId } from "../data/toolStats";
import {
  hasStructuredGearDesc,
  parseStructuredGearDesc,
  type StructuredGearDescParts,
} from "./adventuringGear";

const TOOL_CATEGORY_TO_GEAR_CATEGORY: Record<ToolCategory, AdventuringGearCategory> = {
  artisan: "artisans-tools",
  gamingSet: "gaming-set",
  musicalInstrument: "instrument",
  other: "tool",
};

const GAMING_SET_GEAR_ALIASES: Record<string, string> = {
  dice: "dice-set",
};

export function gearKeyForToolId(toolId: ToolId): string | null {
  if (findByKey(ADVENTURING_GEAR, toolId)) return toolId;

  if (toolId.startsWith("musical-instrument-")) {
    const key = toolId.slice("musical-instrument-".length);
    if (findByKey(ADVENTURING_GEAR, key)) return key;
  }

  if (toolId.startsWith("gaming-set-")) {
    const suffix = toolId.slice("gaming-set-".length);
    const key = GAMING_SET_GEAR_ALIASES[suffix] ?? suffix;
    if (findByKey(ADVENTURING_GEAR, key)) return key;
  }

  return null;
}

function structuredPartsFromGearDesc(desc: string): StructuredGearDescParts | null {
  if (!hasStructuredGearDesc(desc)) return null;
  const parts = parseStructuredGearDesc(desc);
  return parts.ability || parts.utilize || parts.craft ? parts : null;
}

function categoryFallbackParts(toolCategory: ToolCategory): StructuredGearDescParts | null {
  const gearCategory = TOOL_CATEGORY_TO_GEAR_CATEGORY[toolCategory];
  for (const item of ADVENTURING_GEAR) {
    if (item.category !== gearCategory) continue;
    const parts = structuredPartsFromGearDesc(item.desc);
    if (parts) return parts;
  }
  return null;
}

export function structuredDescPartsForTool(toolId: ToolId): StructuredGearDescParts | null {
  const gearKey = gearKeyForToolId(toolId);
  if (gearKey) {
    const gear = findByKey(ADVENTURING_GEAR, gearKey);
    const parts = gear ? structuredPartsFromGearDesc(gear.desc) : null;
    if (parts) return parts;
  }

  const toolCategory = TOOL_STATS[toolId]?.category;
  if (!toolCategory) return null;
  return categoryFallbackParts(toolCategory);
}
