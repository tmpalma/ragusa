import { describe, expect, it } from "vitest";
import { CONDITIONS } from "../data";
import { parseCharacterFile, serializeCharacterFile } from "./characterFile";
import { parseFeatDescriptionReference } from "./featDescription";
import { applyRest } from "./rest";
import { INITIAL_CHARACTER, characterReducer } from "../state/characterState";
import {
  EXHAUSTION_CONDITION_KEY,
  addCondition,
  initialConditionState,
  reduceExhaustionAfterLongRest,
  removeCondition,
  setConditionRounds,
  setExhaustionLevel,
} from "./conditions";

describe("condition descriptions", () => {
  it("parses catalog prose into intro and named effect blocks", () => {
    const poisoned = CONDITIONS.find((condition) => condition.key === "poisoned");
    expect(poisoned).toBeDefined();

    const parsed = parseFeatDescriptionReference(poisoned!.desc);
    expect(parsed?.intro).toContain("Poisoned condition");
    expect(parsed?.options.map((option) => option.name)).toEqual(["Ability Checks and Attacks Affected"]);
    expect(parsed?.options[0]?.desc).toContain("Disadvantage");
  });
});

describe("conditions", () => {
  const base = initialConditionState();

  it("adds a known condition and rejects duplicates", () => {
    const withPoisoned = addCondition(base, "poisoned");
    expect(withPoisoned?.conditionKeys).toEqual(["poisoned"]);
    expect(addCondition(withPoisoned!, "poisoned")).toBeNull();
    expect(addCondition(base, "not-a-condition")).toBeNull();
  });

  it("adds Exhaustion at level 1", () => {
    const withExhaustion = addCondition(base, EXHAUSTION_CONDITION_KEY);
    expect(withExhaustion?.conditionKeys).toEqual([EXHAUSTION_CONDITION_KEY]);
    expect(withExhaustion?.exhaustionLevel).toBe(1);
  });

  it("removes a condition and clears its rounds", () => {
    const active = {
      ...base,
      conditionKeys: ["poisoned"],
      conditionRoundsRemaining: { poisoned: 3 },
    };
    const cleared = removeCondition(active, "poisoned");
    expect(cleared?.conditionKeys).toEqual([]);
    expect(cleared?.conditionRoundsRemaining).toEqual({});
  });

  it("tracks rounds for non-Exhaustion conditions", () => {
    const active = addCondition(base, "poisoned")!;
    const withRounds = setConditionRounds(active, "poisoned", 4);
    expect(withRounds?.conditionRoundsRemaining.poisoned).toBe(4);
    expect(setConditionRounds(active, EXHAUSTION_CONDITION_KEY, 2)).toBeNull();
  });

  it("sets Exhaustion level and removes the condition at 0", () => {
    const active = addCondition(base, EXHAUSTION_CONDITION_KEY)!;
    const levelThree = setExhaustionLevel(active, 3);
    expect(levelThree?.exhaustionLevel).toBe(3);
    expect(levelThree?.conditionKeys).toContain(EXHAUSTION_CONDITION_KEY);

    const cleared = setExhaustionLevel(levelThree!, 0);
    expect(cleared?.exhaustionLevel).toBe(0);
    expect(cleared?.conditionKeys).not.toContain(EXHAUSTION_CONDITION_KEY);
  });

  it("reduces Exhaustion by 1 on long rest", () => {
    const active = setExhaustionLevel(base, 2)!;
    const afterRest = reduceExhaustionAfterLongRest(active);
    expect(afterRest?.exhaustionLevel).toBe(1);
    expect(afterRest?.conditionKeys).toContain(EXHAUSTION_CONDITION_KEY);

    const cleared = reduceExhaustionAfterLongRest(afterRest!);
    expect(cleared?.exhaustionLevel).toBe(0);
    expect(cleared?.conditionKeys).not.toContain(EXHAUSTION_CONDITION_KEY);
  });
});

describe("conditions persistence and rest integration", () => {
  it("persists condition state through character files", () => {
    let character = characterReducer(INITIAL_CHARACTER, { type: "ADD_CONDITION", conditionKey: "poisoned" });
    character = characterReducer(character, { type: "SET_CONDITION_ROUNDS", conditionKey: "poisoned", value: 5 });
    character = characterReducer(character, { type: "ADD_CONDITION", conditionKey: EXHAUSTION_CONDITION_KEY });
    character = characterReducer(character, { type: "SET_EXHAUSTION_LEVEL", value: 2 });

    const parsed = parseCharacterFile(serializeCharacterFile(character));
    expect(parsed.conditionKeys).toEqual(["poisoned", EXHAUSTION_CONDITION_KEY]);
    expect(parsed.conditionRoundsRemaining.poisoned).toBe(5);
    expect(parsed.exhaustionLevel).toBe(2);
  });

  it("applies long-rest Exhaustion reduction through applyRest", () => {
    let character = characterReducer(INITIAL_CHARACTER, { type: "ADD_CONDITION", conditionKey: EXHAUSTION_CONDITION_KEY });
    character = characterReducer(character, { type: "SET_EXHAUSTION_LEVEL", value: 2 });

    const afterLongRest = applyRest(character, "long");
    expect(afterLongRest.exhaustionLevel).toBe(1);
    expect(afterLongRest.conditionKeys).toContain(EXHAUSTION_CONDITION_KEY);
    expect(afterLongRest.conditionKeys).not.toContain("poisoned");
  });
});
