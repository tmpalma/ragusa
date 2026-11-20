import { describe, expect, it } from "vitest";
import { CLASSES, findByKey } from "../../data";
import {
  classFeatureOptionPickCount,
  classFeatureOptionPickGrantsForSurface,
  invocationCantripChoiceKey,
  invocationOptionsForLevel,
  isValidClassFeatureOptionPick,
  isValidInvocationCantripChoice,
  parseInvocationCantripChoiceKey,
  PACT_OF_THE_TOME_KEY,
  resolveClassFeatureOptionPickCount,
  selectedClassFeatureOptionPicks,
} from "./optionPicks";

describe("eldritch invocation option picks", () => {
  const warlock = findByKey(CLASSES, "warlock")!;

  it("reads pact of the tome from a shorter stored invocation array at level 2", () => {
    const selected = selectedClassFeatureOptionPicks(
      warlock,
      "eldritch-invocations",
      2,
      { "eldritch-invocations": ["pact-of-the-tome"] },
    );
    expect(selected.map((option) => option.key)).toEqual([PACT_OF_THE_TOME_KEY]);
  });

  it("grants one combat pick at level 1 and three at level 2", () => {
    expect(classFeatureOptionPickCount(warlock, "eldritch-invocations", 1)).toBe(1);
    expect(classFeatureOptionPickCount(warlock, "eldritch-invocations", 2)).toBe(3);
    expect(classFeatureOptionPickGrantsForSurface(warlock, 1, "combat")).toHaveLength(1);
  });

  it("filters level 2 invocations at level 1", () => {
    const options = invocationOptionsForLevel(
      classFeatureOptionPickGrantsForSurface(warlock, 2, "combat")[0]!.options,
      1,
    );
    expect(options.map((option) => option.key)).toEqual([
      "armor-of-shadows",
      "eldritch-mind",
      "pact-of-the-blade",
      "pact-of-the-chain",
      "pact-of-the-tome",
    ]);
  });

  it("allows repeatable invocation keys in multiple slots", () => {
    const effect = warlock.features
      .find((feature) => feature.key === "eldritch-invocations")
      ?.effects.find((entry) => entry.type === "choose_feature_option");
    expect(effect?.type).toBe("choose_feature_option");
    if (effect?.type !== "choose_feature_option") return;
    expect(resolveClassFeatureOptionPickCount(effect, 2)).toBe(3);
    expect(
      isValidClassFeatureOptionPick(warlock, "eldritch-invocations", 2, ["agonizing-blast", "agonizing-blast", null], 1, "agonizing-blast"),
    ).toBe(true);
    expect(
      isValidClassFeatureOptionPick(warlock, "eldritch-invocations", 2, ["pact-of-the-blade", null, null], 1, "pact-of-the-blade"),
    ).toBe(false);
  });

  it("parses invocation cantrip choice keys with dashed option keys", () => {
    expect(parseInvocationCantripChoiceKey("agonizing-blast-0")).toEqual({
      cantripChoiceKey: "agonizing-blast",
      pickIndex: 0,
    });
    expect(parseInvocationCantripChoiceKey("divine-order-skill")).toBeNull();
  });

  it("accepts known cantrip picks for a selected invocation", () => {
    const choiceKey = invocationCantripChoiceKey("agonizing-blast", 0);
    expect(
      isValidInvocationCantripChoice(
        warlock,
        2,
        { "eldritch-invocations": ["agonizing-blast", null, null] },
        ["eldritch-blast"],
        choiceKey,
        "eldritch-blast",
      ),
    ).toBe(true);
    expect(
      isValidInvocationCantripChoice(
        warlock,
        2,
        { "eldritch-invocations": ["agonizing-blast", null, null] },
        ["eldritch-blast"],
        choiceKey,
        "fire-bolt",
      ),
    ).toBe(false);
    expect(
      isValidInvocationCantripChoice(
        warlock,
        2,
        { "eldritch-invocations": [null, null, null] },
        ["eldritch-blast"],
        choiceKey,
        "eldritch-blast",
      ),
    ).toBe(false);
  });
});
