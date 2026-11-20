import type { ClassData, ClassFeatureEffect, FeatureOptionData } from "../../data/types";

export const ELDRITCH_INVOCATIONS_CHOICE_KEY = "eldritch-invocations";
export const PACT_OF_THE_TOME_KEY = "pact-of-the-tome";
export const PACT_OF_THE_TOME_SPELL_PICKS_KEY = "pact-of-the-tome";

export interface ClassFeatureOptionPickGrant {
  choiceKey: string;
  featureKey: string;
  featureName: string;
  count: number;
  grantedAtLevel: number;
  uiSurface: "character" | "spells" | "combat" | "reference";
  options: FeatureOptionData[];
}

function chooseFeatureOptionEffects(classData: ClassData | null, level: number) {
  if (!classData) return [];
  const effects: Extract<ClassFeatureEffect, { type: "choose_feature_option" }>[] = [];
  for (const feature of classData.features) {
    if (feature.grantedAtLevel > level) continue;
    for (const effect of feature.effects) {
      if (effect.type === "choose_feature_option") {
        effects.push(effect);
      }
    }
  }
  return effects;
}

export function resolveClassFeatureOptionPickCount(
  effect: Extract<ClassFeatureEffect, { type: "choose_feature_option" }>,
  level: number,
): number {
  if (effect.countByLevel) {
    const entries = Object.entries(effect.countByLevel)
      .map(([entryLevel, count]) => [Number(entryLevel), count] as const)
      .filter(([entryLevel]) => entryLevel <= level)
      .sort((a, b) => b[0] - a[0]);
    if (entries.length > 0) return entries[0]![1] ?? effect.count ?? 1;
  }
  return effect.count ?? 1;
}

function usesOptionPickStorage(
  effect: Extract<ClassFeatureEffect, { type: "choose_feature_option" }>,
  level: number,
): boolean {
  const count = resolveClassFeatureOptionPickCount(effect, level);
  const surface = effect.uiSurface ?? "character";
  return count > 1 || surface === "spells" || surface === "combat";
}

function optionPickEffects(classData: ClassData | null, level: number): ClassFeatureOptionPickGrant[] {
  if (!classData) return [];
  const grants: ClassFeatureOptionPickGrant[] = [];
  for (const feature of classData.features) {
    if (feature.grantedAtLevel > level) continue;
    for (const effect of feature.effects) {
      if (effect.type !== "choose_feature_option") continue;
      if (!usesOptionPickStorage(effect, level)) continue;
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

export function classFeatureOptionPickGrantsForSurface(
  classData: ClassData | null,
  level: number,
  uiSurface: "character" | "spells" | "combat" | "reference",
): ClassFeatureOptionPickGrant[] {
  return optionPickEffects(classData, level).filter((grant) => grant.uiSurface === uiSurface);
}

export function classFeatureOptionPickCount(
  classData: ClassData | null,
  choiceKey: string,
  level: number,
): number {
  if (!classData) return 0;
  for (const feature of classData.features) {
    for (const effect of feature.effects) {
      if (effect.type === "choose_feature_option" && effect.choiceKey === choiceKey) {
        return resolveClassFeatureOptionPickCount(effect, level);
      }
    }
  }
  return 0;
}

export function classFeatureOptionPickOptions(
  classData: ClassData | null,
  choiceKey: string,
): FeatureOptionData[] {
  if (!classData) return [];
  for (const feature of classData.features) {
    for (const effect of feature.effects) {
      if (effect.type === "choose_feature_option" && effect.choiceKey === choiceKey) {
        return effect.options;
      }
    }
  }
  return [];
}

export function invocationOptionsForLevel(options: FeatureOptionData[], level: number): FeatureOptionData[] {
  return options.filter((option) => (option.minLevel ?? 1) <= level);
}

export function classFeatureOptionPicksForLevel(
  classData: ClassData | null,
  choiceKey: string,
  level: number,
  classFeatureOptionPicks: Record<string, (string | null)[]>,
): (string | null)[] {
  const count = classFeatureOptionPickCount(classData, choiceKey, level);
  if (count <= 0) return [];
  const current = classFeatureOptionPicks[choiceKey] ?? [];
  return Array.from({ length: count }, (_, index) => current[index] ?? null);
}

export function selectedClassFeatureOptionPicks(
  classData: ClassData | null,
  choiceKey: string,
  level: number,
  classFeatureOptionPicks: Record<string, (string | null)[]>,
): FeatureOptionData[] {
  const count = classFeatureOptionPickCount(classData, choiceKey, level);
  if (count <= 0) return [];
  const picks = classFeatureOptionPicksForLevel(classData, choiceKey, level, classFeatureOptionPicks);
  const options = classFeatureOptionPickOptions(classData, choiceKey);
  return picks
    .map((key) => (key ? options.find((option) => option.key === key) ?? null : null))
    .filter((option): option is FeatureOptionData => option != null);
}

export function invocationCantripChoiceKey(cantripChoiceKey: string, pickIndex: number): string {
  return `${cantripChoiceKey}-${pickIndex}`;
}

export function parseInvocationCantripChoiceKey(
  choiceKey: string,
): { cantripChoiceKey: string; pickIndex: number } | null {
  const lastDash = choiceKey.lastIndexOf("-");
  if (lastDash <= 0) return null;
  const suffix = choiceKey.slice(lastDash + 1);
  if (!/^\d+$/.test(suffix)) return null;
  return {
    cantripChoiceKey: choiceKey.slice(0, lastDash),
    pickIndex: Number.parseInt(suffix, 10),
  };
}

function invocationOptionForCantripChoiceKey(
  classData: ClassData,
  cantripChoiceKey: string,
): FeatureOptionData | null {
  for (const option of classFeatureOptionPickOptions(classData, ELDRITCH_INVOCATIONS_CHOICE_KEY)) {
    if (option.cantripChoiceKey === cantripChoiceKey) return option;
  }
  return null;
}

export function isValidInvocationCantripChoice(
  classData: ClassData | null,
  level: number,
  classFeatureOptionPicks: Record<string, (string | null)[]>,
  cantripPicks: string[],
  choiceKey: string,
  optionKey: string | null,
): boolean {
  if (!classData) return false;
  const parsed = parseInvocationCantripChoiceKey(choiceKey);
  if (!parsed) return false;
  if (!invocationOptionForCantripChoiceKey(classData, parsed.cantripChoiceKey)) return false;

  const count = classFeatureOptionPickCount(classData, ELDRITCH_INVOCATIONS_CHOICE_KEY, level);
  if (parsed.pickIndex < 0 || parsed.pickIndex >= count) return false;

  const picks = classFeatureOptionPicks[ELDRITCH_INVOCATIONS_CHOICE_KEY];
  const selectedInvocationKey = picks?.[parsed.pickIndex] ?? null;
  const selectedInvocation = selectedInvocationKey
    ? classFeatureOptionPickOptions(classData, ELDRITCH_INVOCATIONS_CHOICE_KEY).find(
        (option) => option.key === selectedInvocationKey,
      )
    : null;
  if (selectedInvocation?.cantripChoiceKey !== parsed.cantripChoiceKey) return false;
  if (optionKey == null) return true;

  return cantripPicks.some((pick) => pick === optionKey);
}

export function clearInvocationCantripChoicesAtIndex(
  classData: ClassData,
  pickIndex: number,
  classFeatureChoices: Record<string, string>,
): Record<string, string> {
  const next = { ...classFeatureChoices };
  for (const option of classFeatureOptionPickOptions(classData, ELDRITCH_INVOCATIONS_CHOICE_KEY)) {
    if (!option.cantripChoiceKey) continue;
    delete next[invocationCantripChoiceKey(option.cantripChoiceKey, pickIndex)];
  }
  return next;
}

export function initialClassFeatureOptionPicks(
  classData: ClassData | null,
  level: number,
): Record<string, (string | null)[]> {
  const picks: Record<string, (string | null)[]> = {};
  for (const grant of optionPickEffects(classData, level)) {
    picks[grant.choiceKey] = Array.from({ length: grant.count }, () => null);
  }
  return picks;
}

export function isValidClassFeatureOptionPick(
  classData: ClassData | null,
  choiceKey: string,
  level: number,
  allPicks: (string | null)[],
  index: number,
  optionKey: string | null,
): boolean {
  if (!classData) return false;
  const count = classFeatureOptionPickCount(classData, choiceKey, level);
  if (index < 0 || index >= count) return false;
  if (optionKey == null) return true;
  const options = invocationOptionsForLevel(classFeatureOptionPickOptions(classData, choiceKey), level);
  const option = options.find((entry) => entry.key === optionKey);
  if (!option) return false;
  if (option.repeatable) return true;
  return !allPicks.some((pick, pickIndex) => pickIndex !== index && pick === optionKey);
}

export function spellNamesFromClassFeatureOptionPicks(
  classData: ClassData | null,
  level: number,
  classFeatureOptionPicks: Record<string, (string | null)[]>,
): string[] {
  const names: string[] = [];
  for (const effect of chooseFeatureOptionEffects(classData, level)) {
    if (!usesOptionPickStorage(effect, level)) continue;
    const selected = selectedClassFeatureOptionPicks(
      classData,
      effect.choiceKey,
      level,
      classFeatureOptionPicks,
    );
    for (const option of selected) {
      if (option.spellNames) names.push(...option.spellNames);
    }
  }
  return names;
}
