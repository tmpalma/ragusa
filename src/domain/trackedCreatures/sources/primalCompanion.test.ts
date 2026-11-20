import { describe, expect, it } from "vitest";
import { characterReducer, INITIAL_CHARACTER } from "../../../state/characterState";
import { buildCreatureSourceContext } from "../context";
import { createCreatureSourceRegistry } from "../registry";
import { registerPrimalCompanionSource } from "./primalCompanion";
import { PRIMAL_COMPANION_SOURCE_KEY } from "../shared";

describe("primal companion source", () => {
  const registry = createCreatureSourceRegistry();
  registerPrimalCompanionSource(registry);

  it("scales land beast for ranger 3", () => {
    let ranger = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "ranger" });
    for (let i = 0; i < 2; i += 1) ranger = characterReducer(ranger, { type: "LEVEL_UP" });
    ranger = characterReducer(ranger, { type: "SET_SUBCLASS", key: "beast-master" });
    ranger = { ...ranger, abilityScores: { ...ranger.abilityScores, wis: 16 } };
    const source = registry.get(PRIMAL_COMPANION_SOURCE_KEY)!;
    const ctx = buildCreatureSourceContext(ranger);
    const block = source.resolveStatBlock(ctx, {
      id: PRIMAL_COMPANION_SOURCE_KEY,
      sourceKey: PRIMAL_COMPANION_SOURCE_KEY,
      category: "companion",
      formKey: "beast-of-the-land",
      currentHitPoints: null,
      temporaryHitPointsMax: null,
      temporaryHitPointsRemaining: null,
      featureUses: {},
    });
    expect(block?.maxHitPoints).toBe(20);
    expect(block?.ac).toBe(16);
  });
});