import { describe, expect, it } from "vitest";
import { characterReducer, INITIAL_CHARACTER } from "../../../state/characterState";
import { buildCreatureSourceContext } from "../context";
import { createCreatureSourceRegistry } from "../registry";
import { registerFindFamiliarSource } from "./findFamiliar";
import { FIND_FAMILIAR_SOURCE_KEY } from "../shared";

describe("find familiar source", () => {
  const registry = createCreatureSourceRegistry();
  registerFindFamiliarSource(registry);

  it("is available with prepared find-familiar", () => {
    let wizard = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "wizard" });
    wizard = characterReducer(wizard, { type: "ADD_SPELLBOOK_PICK", spellKey: "find-familiar" });
    wizard = characterReducer(wizard, { type: "ADD_SPELL_PICK", spellKey: "find-familiar" });
    const source = registry.get(FIND_FAMILIAR_SOURCE_KEY)!;
    const ctx = buildCreatureSourceContext(wizard);
    expect(source.isAvailable(ctx)).toBe(true);
    const defaults = source.defaultInstanceFields(ctx);
    expect(defaults.formKey).toBeNull();
    expect(defaults.summoned).toBe(false);
    expect(
      source.resolveStatBlock(ctx, {
        id: FIND_FAMILIAR_SOURCE_KEY,
        sourceKey: FIND_FAMILIAR_SOURCE_KEY,
        category: "companion",
        formKey: null,
        currentHitPoints: null,
        temporaryHitPointsMax: null,
        temporaryHitPointsRemaining: null,
        featureUses: {},
      }),
    ).toBeNull();
    const block = source.resolveStatBlock(ctx, {
      id: FIND_FAMILIAR_SOURCE_KEY,
      sourceKey: FIND_FAMILIAR_SOURCE_KEY,
      category: "companion",
      formKey: "cat",
      spiritType: "celestial",
      currentHitPoints: null,
      temporaryHitPointsMax: null,
      temporaryHitPointsRemaining: null,
      featureUses: {},
    });
    expect(block?.ac).toBeGreaterThan(0);
    expect(block?.notes).toContain("companions.cannotAttack");
  });
});