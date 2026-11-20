import { describe, expect, it } from "vitest";
import { characterReducer, INITIAL_CHARACTER } from "../../../state/characterState";
import { buildCreatureSourceContext } from "../context";
import { createCreatureSourceRegistry } from "../registry";
import { registerSteelDefenderSource } from "./steelDefender";
import { STEEL_DEFENDER_SOURCE_KEY } from "../shared";

describe("steel defender source", () => {
  const registry = createCreatureSourceRegistry();
  registerSteelDefenderSource(registry);

  it("scales defender for artificer 3", () => {
    let artificer = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "artificer" });
    for (let i = 0; i < 2; i += 1) artificer = characterReducer(artificer, { type: "LEVEL_UP" });
    artificer = characterReducer(artificer, { type: "SET_SUBCLASS", key: "battle-smith" });
    artificer = { ...artificer, abilityScores: { ...artificer.abilityScores, int: 16 } };
    const source = registry.get(STEEL_DEFENDER_SOURCE_KEY)!;
    const ctx = buildCreatureSourceContext(artificer);
    const block = source.resolveStatBlock(ctx, {
      id: STEEL_DEFENDER_SOURCE_KEY,
      sourceKey: STEEL_DEFENDER_SOURCE_KEY,
      category: "companion",
      formKey: "steel-defender",
      currentHitPoints: null,
      temporaryHitPointsMax: null,
      temporaryHitPointsRemaining: null,
      featureUses: { repair: 3 },
    });
    expect(block?.maxHitPoints).toBe(20);
    expect(block?.ac).toBe(15);
    expect(block?.useTrackers[0]?.maxUses).toBe(3);
  });
});