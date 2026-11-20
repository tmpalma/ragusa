import { describe, expect, it } from "vitest";
import { buildCombatActions } from "./combatActions";
import type { CharacterSpellEntry } from "./spellSelection";
import {
  abbreviateSpellComponents,
  buildCombatSpellCards,
  cantripDamageTier,
  castingTimeToActionTiming,
  extractSpellDamageDice,
  extractSpellSaveAbility,
  resolveCantripSpellDamage,
  resolveSpellAttackBonus,
  resolveSpellSaveDc,
  extendSpellRangeForSniper,
  parseSpellRangeFeet,
  resolveCombatSpellRange,
  spellRequiresAttackRoll,
} from "./spellCombat";

describe("castingTimeToActionTiming", () => {
  it("maps combat casting times to action economy", () => {
    expect(castingTimeToActionTiming("action")).toBe("action");
    expect(castingTimeToActionTiming("bonus-action")).toBe("bonus");
    expect(castingTimeToActionTiming("reaction")).toBe("reaction");
  });

  it("returns null for non-combat casting times", () => {
    expect(castingTimeToActionTiming("1minute")).toBeNull();
    expect(castingTimeToActionTiming("10minutes")).toBeNull();
    expect(castingTimeToActionTiming("1hour")).toBeNull();
  });
});

describe("extractSpellSaveAbility", () => {
  it("extracts the first ability saving throw from spell text", () => {
    expect(
      extractSpellSaveAbility(
        "Each creature in that Sphere must succeed on a Dexterity saving throw or take 1d6 Acid damage.",
      ),
    ).toBe("dex");
  });

  it("returns null when no specific saving throw is mentioned", () => {
    expect(
      extractSpellSaveAbility(
        "Choose up to three creatures within range. Each target's Hit Point maximum and current Hit Points increase by 5 for the duration.",
      ),
    ).toBeNull();
  });
});

describe("abbreviateSpellComponents", () => {
  it("strips material descriptions for compact combat display", () => {
    expect(abbreviateSpellComponents("V, S, M (a pinch of sand or rose petals)")).toBe("V, S, M");
    expect(abbreviateSpellComponents("S, M (a bit of fleece)")).toBe("S, M");
  });
});

describe("spellRequiresAttackRoll", () => {
  it("detects ranged and melee spell attacks in description text", () => {
    expect(spellRequiresAttackRoll("Make a ranged spell attack against the target.")).toBe(true);
    expect(spellRequiresAttackRoll("Make a melee spell attack against the target.")).toBe(true);
  });

  it("returns false when no spell attack is required", () => {
    expect(
      spellRequiresAttackRoll(
        "Each creature must succeed on a Wisdom saving throw or have the Unconscious condition.",
      ),
    ).toBe(false);
  });
});

describe("cantrip damage", () => {
  it("maps character level to cantrip damage tier", () => {
    expect(cantripDamageTier(1)).toBe(1);
    expect(cantripDamageTier(4)).toBe(1);
    expect(cantripDamageTier(5)).toBe(2);
    expect(cantripDamageTier(10)).toBe(2);
    expect(cantripDamageTier(11)).toBe(3);
    expect(cantripDamageTier(16)).toBe(3);
    expect(cantripDamageTier(17)).toBe(4);
    expect(cantripDamageTier(20)).toBe(4);
  });

  it("extracts base damage dice from spell text", () => {
    expect(
      extractSpellDamageDice("On a hit, the target takes 1d10 Fire damage."),
    ).toEqual({ count: 1, sides: 10, damageType: "Fire" });
    expect(
      extractSpellDamageDice(
        "Each creature in that Sphere must succeed on a Dexterity saving throw or take 1d6 Acid damage.",
      ),
    ).toEqual({ count: 1, sides: 6, damageType: "Acid" });
  });

  it("returns null when no damage dice are present", () => {
    expect(extractSpellDamageDice("You create a harmless sensory effect.")).toBeNull();
  });

  it("scales cantrip damage by character level", () => {
    expect(
      resolveCantripSpellDamage("fire-bolt", "On a hit, the target takes 1d10 Fire damage.", 1),
    ).toBe("1d10 Fire");
    expect(
      resolveCantripSpellDamage("fire-bolt", "On a hit, the target takes 1d10 Fire damage.", 5),
    ).toBe("2d10 Fire");
    expect(
      resolveCantripSpellDamage("fire-bolt", "On a hit, the target takes 1d10 Fire damage.", 11),
    ).toBe("3d10 Fire");
    expect(
      resolveCantripSpellDamage("fire-bolt", "On a hit, the target takes 1d10 Fire damage.", 17),
    ).toBe("4d10 Fire");
  });

  it("shows scaled base damage with an asterisk for Sorcerous Burst", () => {
    const desc =
      "On a hit, the target takes 1d8 damage of a type you choose: Acid, Cold, Fire, Lightning, Poison, Psychic, or Thunder.";
    expect(resolveCantripSpellDamage("sorcerous-burst", desc, 1)).toBe("*1d8");
    expect(resolveCantripSpellDamage("sorcerous-burst", desc, 5)).toBe("*2d8");
  });

  it("repeats Eldritch Blast beam damage instead of multiplying dice", () => {
    const desc = "On a hit, the target takes 1d10 Force damage.";
    expect(resolveCantripSpellDamage("eldritch-blast", desc, 4)).toBe("1d10 Force");
    expect(resolveCantripSpellDamage("eldritch-blast", desc, 5)).toBe("1d10 Force × 2");
    expect(resolveCantripSpellDamage("eldritch-blast", desc, 11)).toBe("1d10 Force × 3");
  });
});

describe("spell range for Spell Sniper", () => {
  it("parses feet-based spell ranges", () => {
    expect(parseSpellRangeFeet("120 feet")).toBe(120);
    expect(parseSpellRangeFeet("10 feet")).toBe(10);
    expect(parseSpellRangeFeet("Self")).toBeNull();
    expect(parseSpellRangeFeet("Touch")).toBeNull();
    expect(parseSpellRangeFeet("Self (10-foot Emanation)")).toBeNull();
    expect(parseSpellRangeFeet("Sight")).toBeNull();
    expect(parseSpellRangeFeet("Special")).toBeNull();
  });

  it("extends qualifying ranges by 60 feet", () => {
    expect(extendSpellRangeForSniper("120 feet")).toBe("180 feet");
    expect(extendSpellRangeForSniper("10 feet")).toBe("70 feet");
    expect(extendSpellRangeForSniper("5 feet")).toBeNull();
    expect(extendSpellRangeForSniper("Touch")).toBeNull();
  });

  it("only extends attack-roll spells when Spell Sniper is active", () => {
    const fireBoltDesc =
      "You hurl a mote of fire at a creature or an object within range. Make a ranged spell attack against the target.";
    const acidSplashDesc =
      "Each creature in that Sphere must succeed on a Dexterity saving throw or take 1d6 Acid damage.";

    expect(resolveCombatSpellRange("120 feet", fireBoltDesc, true)).toBe("180 feet");
    expect(resolveCombatSpellRange("120 feet", fireBoltDesc, false)).toBe("120 feet");
    expect(resolveCombatSpellRange("30 feet", acidSplashDesc, true)).toBe("30 feet");
    expect(resolveCombatSpellRange("Touch", fireBoltDesc, true)).toBe("Touch");
  });
});

describe("buildCombatSpellCards", () => {
  it("routes spells to the correct action columns and omits long casting times", () => {
    const entries: CharacterSpellEntry[] = [
      { spellKey: "fire-bolt", locked: false, source: "pick" },
      { spellKey: "healing-word", locked: false, source: "pick" },
      { spellKey: "shield", locked: false, source: "pick" },
      { spellKey: "alarm", locked: false, source: "pick" },
    ];

    const cards = buildCombatSpellCards(entries);

    expect(cards.action.map((card) => card.id)).toEqual(["spell-fire-bolt"]);
    expect(cards.bonus.map((card) => card.id)).toEqual(["spell-healing-word"]);
    expect(cards.reaction.map((card) => card.id)).toEqual(["spell-shield"]);
  });

  it("includes scaled cantrip damage for save-based cantrips", () => {
    const cards = buildCombatSpellCards(
      [{ spellKey: "acid-splash", locked: false, source: "pick" }],
      {
        classSaveDc: 13,
        abilityModifiers: { str: 0, dex: 0, con: 0, int: 3, wis: 0, cha: 0 },
        characterLevel: 5,
      },
    );

    expect(cards.action[0]?.spellMeta).toMatchObject({
      saveAbility: "dex",
      saveDc: 13,
      spellDamage: "2d6 Acid",
    });
    expect(cards.action[0]?.spellMeta?.spellAttackBonus).toBeUndefined();
  });

  it("omits cantrip damage when character level is unavailable", () => {
    const cards = buildCombatSpellCards([{ spellKey: "fire-bolt", locked: false, source: "pick" }]);

    expect(cards.action[0]?.spellMeta?.spellDamage).toBeUndefined();
  });

  it("omits damage for non-cantrip spells", () => {
    const cards = buildCombatSpellCards(
      [{ spellKey: "magic-missile", locked: false, source: "pick" }],
      { characterLevel: 5, abilityModifiers: { str: 0, dex: 0, con: 0, int: 3, wis: 0, cha: 0 } },
    );

    expect(cards.action[0]?.spellMeta?.spellDamage).toBeUndefined();
  });

  it("shows asterisk damage for Sorcerous Burst", () => {
    const cards = buildCombatSpellCards(
      [{ spellKey: "sorcerous-burst", locked: false, source: "pick" }],
      {
        classAttackBonus: 5,
        abilityModifiers: { str: 0, dex: 0, con: 0, int: 3, wis: 0, cha: 0 },
        characterLevel: 1,
      },
    );

    expect(cards.action[0]?.spellMeta?.spellDamage).toBe("*1d8");
  });

  it("includes save DC from class spellcasting when available", () => {
    const cards = buildCombatSpellCards(
      [{ spellKey: "vicious-mockery", locked: false, source: "pick" }],
      { classSaveDc: 13, abilityModifiers: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 3 } },
    );

    expect(cards.action[0]?.spellMeta).toMatchObject({
      saveAbility: "wis",
      saveDc: 13,
    });
  });

  it("includes spell attack bonus when the spell requires an attack roll", () => {
    const cards = buildCombatSpellCards(
      [{ spellKey: "starry-wisp", locked: false, source: "pick" }],
      { classAttackBonus: 5, abilityModifiers: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 3 }, characterLevel: 1 },
    );

    expect(cards.action[0]?.spellMeta).toMatchObject({
      spellAttackBonus: 5,
      spellDamage: "1d8 Radiant",
    });
    expect(cards.action[0]?.spellMeta?.saveAbility).toBeUndefined();
  });

  it("extends attack-roll spell range when Spell Sniper is active", () => {
    const cards = buildCombatSpellCards(
      [{ spellKey: "fire-bolt", locked: false, source: "pick" }],
      {
        classAttackBonus: 5,
        abilityModifiers: { str: 0, dex: 0, con: 0, int: 3, wis: 0, cha: 0 },
        characterLevel: 1,
        hasSpellSniper: true,
      },
    );

    expect(cards.action[0]?.spellMeta?.range).toBe("180 feet");
  });

  it("keeps save-based spell range unchanged with Spell Sniper", () => {
    const cards = buildCombatSpellCards(
      [{ spellKey: "acid-splash", locked: false, source: "pick" }],
      {
        classSaveDc: 13,
        abilityModifiers: { str: 0, dex: 0, con: 0, int: 3, wis: 0, cha: 0 },
        characterLevel: 1,
        hasSpellSniper: true,
      },
    );

    expect(cards.action[0]?.spellMeta?.range).toBe("60 feet");
  });

  it("includes both spell attack bonus and save when both apply", () => {
    const cards = buildCombatSpellCards(
      [{ spellKey: "ice-knife", locked: false, source: "pick" }],
      {
        classAttackBonus: 5,
        classSaveDc: 13,
        abilityModifiers: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 3 },
      },
    );

    expect(cards.action[0]?.spellMeta).toMatchObject({
      spellAttackBonus: 5,
      saveAbility: "dex",
      saveDc: 13,
    });
  });

  it("resolves save DC from feat spellcasting ability", () => {
    expect(
      resolveSpellSaveDc(
        { spellKey: "fire-bolt", locked: true, source: "feat", spellcastingAbility: "int" },
        { abilityModifiers: { str: 0, dex: 0, con: 0, int: 3, wis: 0, cha: 0 } },
      ),
    ).toBe(13);
  });

  it("resolves spell attack bonus from feat spellcasting ability", () => {
    expect(
      resolveSpellAttackBonus(
        { spellKey: "fire-bolt", locked: true, source: "feat", spellcastingAbility: "int" },
        { abilityModifiers: { str: 0, dex: 0, con: 0, int: 3, wis: 0, cha: 0 } },
      ),
    ).toBe(5);
  });

  it("includes level, concentration, and abbreviated components", () => {
    const sleepCards = buildCombatSpellCards([{ spellKey: "sleep", locked: false, source: "pick" }]);
    const minorIllusionCards = buildCombatSpellCards([
      { spellKey: "minor-illusion", locked: false, source: "pick" },
    ]);

    expect(sleepCards.action[0]?.spellMeta).toMatchObject({
      level: 1,
      concentration: true,
      components: "V, S, M",
      saveAbility: "wis",
    });
    expect(minorIllusionCards.action[0]?.spellMeta).toMatchObject({
      level: 0,
      concentration: false,
      components: "S, M",
    });
    expect(minorIllusionCards.action[0]?.spellMeta?.saveAbility).toBeUndefined();
  });

  it("returns empty lists when there are no picks", () => {
    const cards = buildCombatSpellCards([]);

    expect(cards.action).toEqual([]);
    expect(cards.bonus).toEqual([]);
    expect(cards.reaction).toEqual([]);
  });

  it("includes granted cantrips but not spellbook-only entries", () => {
    const cards = buildCombatSpellCards([
      { spellKey: "fire-bolt", locked: true, source: "species" },
    ]);

    expect(cards.action.map((card) => card.id)).toEqual(["spell-fire-bolt"]);
  });

  it("places granted spells in Bonus Actions when combatActionTiming is bonus", () => {
    const cards = buildCombatSpellCards([
      {
        spellKey: "minor-illusion",
        locked: true,
        source: "classFeature",
        combatActionTiming: "bonus",
      },
    ]);

    expect(cards.action).toEqual([]);
    expect(cards.bonus.map((card) => card.id)).toEqual(["spell-minor-illusion"]);
  });

  it("sorts action spells by level then English name", () => {
    const entries: CharacterSpellEntry[] = [
      { spellKey: "fireball", locked: false, source: "pick" },
      { spellKey: "fire-bolt", locked: false, source: "pick" },
      { spellKey: "magic-missile", locked: false, source: "pick" },
    ];

    const cards = buildCombatSpellCards(entries);

    expect(cards.action.map((card) => card.id)).toEqual([
      "spell-fire-bolt",
      "spell-magic-missile",
      "spell-fireball",
    ]);
  });

  it("sorts cantrips by localized display name when sort options are provided", () => {
    const ptNames: Record<string, string> = {
      "acid-splash": "Salpico Ácido",
      "fire-bolt": "Raio de Fogo",
    };
    const entries: CharacterSpellEntry[] = [
      { spellKey: "acid-splash", locked: false, source: "pick" },
      { spellKey: "fire-bolt", locked: false, source: "pick" },
    ];

    const cards = buildCombatSpellCards(entries, undefined, {
      locale: "pt-BR",
      spellName: (key, fallback) => ptNames[key] ?? fallback,
    });

    expect(cards.action.map((card) => card.id)).toEqual(["spell-fire-bolt", "spell-acid-splash"]);
  });
});

describe("buildCombatActions spell cards", () => {
  it("places spell cards after timed features and before weapons", () => {
    const spellActions = buildCombatSpellCards([
      { spellKey: "fire-bolt", locked: false, source: "pick" },
    ]);
    const classFeatureActions = {
      action: [
        {
          id: "class-second-wind",
          kind: "class-feature" as const,
          entityKey: "fighter",
          traitSlug: "second-wind",
          name: "Second Wind",
          description: "Heal yourself.",
        },
      ],
      bonus: [],
      reaction: [],
    };

    const lists = buildCombatActions({
      speciesKey: null,
      weapons: [{ id: "w1", key: "dagger" }],
      abilityModifiers: { str: 2, dex: 2, con: 0, int: 0, wis: 0, cha: 0 },
      feats: [],
      classFeatureActions,
      spellActions,
    });

    expect(lists.actions.slice(0, 3).map((card) => card.id)).toEqual([
      "class-second-wind",
      "spell-fire-bolt",
      "weapon-w1",
    ]);
  });
});
