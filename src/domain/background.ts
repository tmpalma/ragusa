import { BACKGROUNDS, findByKey } from "../data";
import type { BackgroundData, SkillId, ToolCategory } from "../data/types";
import type { Character } from "../state/characterState";

export const CUSTOM_BACKGROUND_KEY = "custom";

const CUSTOM_TOOL_CATEGORIES: ToolCategory[] = [
  "artisan",
  "gamingSet",
  "musicalInstrument",
  "other",
];

export function isCustomBackground(backgroundKey: string | null): boolean {
  return backgroundKey === CUSTOM_BACKGROUND_KEY;
}

export function backgroundSkillIdsForCharacter(
  character: Pick<Character, "backgroundKey" | "backgroundSkillPicks">,
): SkillId[] {
  if (isCustomBackground(character.backgroundKey)) {
    return character.backgroundSkillPicks.filter((pick): pick is SkillId => pick != null);
  }
  return findByKey(BACKGROUNDS, character.backgroundKey)?.skillProficiencies ?? [];
}

export function resolveBackgroundData(
  character: Pick<Character, "backgroundKey" | "customBackgroundName" | "backgroundSkillPicks">,
): BackgroundData | null {
  if (!character.backgroundKey) return null;
  if (isCustomBackground(character.backgroundKey)) {
    return {
      key: CUSTOM_BACKGROUND_KEY,
      name: character.customBackgroundName.trim(),
      skillProficiencies: backgroundSkillIdsForCharacter(character),
      toolProficiency: { kind: "choose", count: 1, categories: CUSTOM_TOOL_CATEGORIES },
      featKey: null,
      startingEquipment: [],
      srd: false,
      book: "XPHB",
    };
  }
  return findByKey(BACKGROUNDS, character.backgroundKey) ?? null;
}

export function backgroundDisplayName(
  character: Pick<Character, "customBackgroundName">,
  backgroundData: BackgroundData | null,
  customLabel: string,
  catalogName = "",
): string {
  if (!backgroundData) return "";
  if (isCustomBackground(backgroundData.key)) {
    return character.customBackgroundName.trim() || customLabel;
  }
  return catalogName || backgroundData.name;
}
