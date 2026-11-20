import { describe, expect, it } from "vitest";
import { characterReducer, INITIAL_CHARACTER } from "../../../state/characterState";
import { buildCreatureSourceContext } from "../context";
import { createCreatureSourceRegistry } from "../registry";
import { registerFindSteedSource } from "./findSteed";
import { FIND_STEED_SOURCE_KEY } from "../shared";

describe("find steed source", () => {
  const registry = createCreatureSourceRegistry();
  registerFindSteedSource(registry);

  it("scales paladin steed at slot level 2", () => {
    let paladin = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "paladin" });
    for (let i = 0; i < 4; i += 1) paladin = characterReducer(paladin, { type: "LEVEL_UP" });
    const source = registry.get(FIND_STEED_SOURCE_KEY)!;
    const ctx = buildCreatureSourceContext(paladin);
    expect(source.isAvailable(ctx)).toBe(true);
    expect(source.castSlotLevelRange(ctx)).toBeNull();
    const block = source.resolveStatBlock(ctx, {
      id: FIND_STEED_SOURCE_KEY,
      sourceKey: FIND_STEED_SOURCE_KEY,
      category: "companion",
      formKey: "otherworldly-steed",
      spiritType: "celestial",
      castSlotLevel: 2,
      currentHitPoints: null,
      temporaryHitPointsMax: null,
      temporaryHitPointsRemaining: null,
      featureUses: {},
    });
    expect(block?.ac).toBe(12);
    expect(block?.maxHitPoints).toBe(25);
  });
});