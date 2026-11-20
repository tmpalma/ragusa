import type { ActionTiming } from "../../data/types";
import type { CombatCard } from "../combatActions";
import {
  ELDRITCH_INVOCATIONS_CHOICE_KEY,
  selectedClassFeatureOptionPicks,
} from "./optionPicks";
import type { ClassData } from "../../data/types";

export function buildInvocationActionCards(input: {
  classData: ClassData | null;
  level: number;
  classFeatureOptionPicks: Record<string, (string | null)[]>;
}): Record<ActionTiming, CombatCard[]> {
  const cards: Record<ActionTiming, CombatCard[]> = { action: [], bonus: [], reaction: [] };
  if (!input.classData) return cards;

  const selected = selectedClassFeatureOptionPicks(
    input.classData,
    ELDRITCH_INVOCATIONS_CHOICE_KEY,
    input.level,
    input.classFeatureOptionPicks,
  );

  for (const option of selected) {
    if (!option.actionTiming) continue;
    cards[option.actionTiming].push({
      id: `invocation-${option.key}`,
      kind: "class-feature",
      entityKey: input.classData.key,
      traitSlug: option.key,
      name: option.name,
      description: option.desc,
    });
  }

  return cards;
}
