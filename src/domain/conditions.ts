import { CONDITIONS, findByKey } from "../data";

export const EXHAUSTION_CONDITION_KEY = "exhaustion";
export const EXHAUSTION_LEVEL_MIN = 1;
export const EXHAUSTION_LEVEL_MAX = 6;

export interface ConditionState {
  conditionKeys: string[];
  conditionRoundsRemaining: Record<string, number>;
  exhaustionLevel: number;
}

export function initialConditionState(): ConditionState {
  return {
    conditionKeys: [],
    conditionRoundsRemaining: {},
    exhaustionLevel: 0,
  };
}

export function isKnownConditionKey(conditionKey: string): boolean {
  return findByKey(CONDITIONS, conditionKey) != null;
}

export function clampExhaustionLevel(level: number): number {
  return Math.min(EXHAUSTION_LEVEL_MAX, Math.max(0, Math.floor(level)));
}

export function clampConditionRounds(value: number): number {
  return Math.max(0, Math.floor(value));
}

export function addCondition(state: ConditionState, conditionKey: string): ConditionState | null {
  if (!isKnownConditionKey(conditionKey)) return null;
  if (state.conditionKeys.includes(conditionKey)) return null;

  const conditionKeys = [...state.conditionKeys, conditionKey];
  if (conditionKey === EXHAUSTION_CONDITION_KEY) {
    return {
      ...state,
      conditionKeys,
      exhaustionLevel: state.exhaustionLevel > 0 ? state.exhaustionLevel : EXHAUSTION_LEVEL_MIN,
    };
  }

  return { ...state, conditionKeys };
}

export function removeCondition(state: ConditionState, conditionKey: string): ConditionState | null {
  if (!state.conditionKeys.includes(conditionKey)) return null;

  const conditionKeys = state.conditionKeys.filter((key) => key !== conditionKey);
  const { [conditionKey]: _removed, ...conditionRoundsRemaining } = state.conditionRoundsRemaining;
  const next: ConditionState = { ...state, conditionKeys, conditionRoundsRemaining };

  if (conditionKey === EXHAUSTION_CONDITION_KEY) {
    next.exhaustionLevel = 0;
  }

  return next;
}

export function setConditionRounds(
  state: ConditionState,
  conditionKey: string,
  value: number,
): ConditionState | null {
  if (!state.conditionKeys.includes(conditionKey)) return null;
  if (conditionKey === EXHAUSTION_CONDITION_KEY) return null;

  const rounds = clampConditionRounds(value);
  if ((state.conditionRoundsRemaining[conditionKey] ?? 0) === rounds) return null;

  return {
    ...state,
    conditionRoundsRemaining: {
      ...state.conditionRoundsRemaining,
      [conditionKey]: rounds,
    },
  };
}

export function setExhaustionLevel(state: ConditionState, level: number): ConditionState | null {
  const nextLevel = clampExhaustionLevel(level);
  if (nextLevel === state.exhaustionLevel) return null;

  if (nextLevel === 0) {
    return removeCondition(state, EXHAUSTION_CONDITION_KEY);
  }

  const hasExhaustion = state.conditionKeys.includes(EXHAUSTION_CONDITION_KEY);
  return {
    ...state,
    conditionKeys: hasExhaustion ? state.conditionKeys : [...state.conditionKeys, EXHAUSTION_CONDITION_KEY],
    exhaustionLevel: nextLevel,
  };
}

/** Long Rest: reduce Exhaustion by 1 per condition text; remove when it reaches 0. */
export function reduceExhaustionAfterLongRest(state: ConditionState): ConditionState | null {
  if (state.exhaustionLevel <= 0) return null;
  return setExhaustionLevel(state, state.exhaustionLevel - 1);
}
