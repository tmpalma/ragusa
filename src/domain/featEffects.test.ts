import { describe, expect, it } from "vitest";
import { CLASSES, FEATS, WEAPONS, findByKey } from "../data";
import type { FeatData } from "../data/types";
import { INITIAL_CHARACTER, characterReducer } from "../state/characterState";
import { computeDerivedStats } from "./deriveCharacter";
import {
  FEAT_DEFINITIONS,
  collectFeatContributions,
  findFeatDefinition,
  initialFeatChoicesForFeat,
  buildFeatSpellUseTrackers,
  buildFeatSpellcastingEntries,
  buildFeatSpecialFeatureCards,
  buildFeatUseTrackers,
  featFixedToolIds,
  allFeatSkillPicksForCharacter,
  applyFeatProficiencyPick,
  featExpertiseSkillIds,
  availableFeatProficiencyOptions,
  availableFeatSpellOptions,
  featGrantedSpellKeysFromChoices,
  hitPointBonusFromFeats,
  isRangedWeapon,
  originFeats,
  validateAbilityIncreases,
  featMechanicsSummary,
  EMPTY_FEAT_CHOICES,
} from "./featEffects";
import { buildCombatActions } from "./combatActions";
import { applyRest } from "./rest";
import { buildFeatGrantedSpells } from "./spellSelection";
import { evaluateFeatPrerequisites } from "./featPrerequisites";
import { computeInitiative } from "./initiative";
import { computeArmorClass } from "./armorClass";
import { computeWeaponAttack } from "./weaponAttack";
import { mergeSkillProficiencies } from "./skillPicks";

function featStub(key: string, name = key, desc = ""): FeatData {
  return { key, name, category: "General", desc, srd: false, book: "XPHB" };
}

const MYTHAL_TABLE_DESC = [
  "You gain the following benefits.",
  "Mythal Ward:",
  "Roll on the table.",
  ["Mythal-Touched Magic", "1d20 | Effect", "1-2 | Alpha", "3-4 | Beta", "5-6 | Gamma", "7-8 | Delta", "9-10 | Epsilon", "11-19 | Zeta", "20 | Omega"].join(
    "\n",
  ),
].join("\n\n");

describe("FEAT_DEFINITIONS", () => {
  it("covers every catalog feat", () => {
    for (const feat of FEATS) {
      expect(findFeatDefinition(feat.key)).not.toBeNull();
    }
    expect(FEAT_DEFINITIONS.length).toBeGreaterThanOrEqual(FEATS.length);
  });
});

describe("collectFeatContributions", () => {
  it("adds Alert initiative bonus", () => {
    const contributions = collectFeatContributions(["alert"], () => INITIAL_CHARACTER.featChoices, INITIAL_CHARACTER.abilityScores, []);
    expect(contributions.initiativeAddProficiency).toBe(true);
  });

  it("adds Defense AC bonus when wearing body armor", () => {
    const leather = {
      key: "leather-armor",
      name: "Leather Armor",
      category: "light",
      acBase: 11,
      acAddDexMod: true,
      acCapDexMod: null,
      strengthScoreRequired: null,
      grantsStealthDisadvantage: false,
      weightLb: 10,
      cost: { amount: 10, denomination: "gp" as const },
      srd: true,
      book: "XPHB",
    };
    const contributions = collectFeatContributions(["defense"], () => INITIAL_CHARACTER.featChoices, INITIAL_CHARACTER.abilityScores, [leather]);
    expect(contributions.acBonus).toBe(1);
  });

  it("ignores Defense AC bonus with no body armor", () => {
    const contributions = collectFeatContributions(["defense"], () => INITIAL_CHARACTER.featChoices, INITIAL_CHARACTER.abilityScores, []);
    expect(contributions.acBonus).toBe(0);
  });

  it("adds Archery ranged attack bonus", () => {
    const contributions = collectFeatContributions(["archery"], () => INITIAL_CHARACTER.featChoices, INITIAL_CHARACTER.abilityScores, []);
    expect(contributions.rangedAttackBonus).toBe(2);
  });

  it("sets Two-Weapon Fighting light extra attack flag", () => {
    const contributions = collectFeatContributions(
      ["two-weapon-fighting"],
      () => INITIAL_CHARACTER.featChoices,
      INITIAL_CHARACTER.abilityScores,
      [],
    );
    expect(contributions.lightExtraAttackAddsAbilityMod).toBe(true);
  });

  it("applies Skilled ability increases from choices", () => {
    const contributions = collectFeatContributions(
      ["grappler"],
      () => ({ ...EMPTY_FEAT_CHOICES, abilityIncreases: { str: 1 } }),
      INITIAL_CHARACTER.abilityScores,
      [],
    );
    expect(contributions.abilityScoreBonuses.str).toBe(1);
  });

  it("grants Resilient save proficiency for the increased ability", () => {
    const contributions = collectFeatContributions(
      ["resilient"],
      () => ({ ...EMPTY_FEAT_CHOICES, abilityIncreases: { wis: 1 } }),
      INITIAL_CHARACTER.abilityScores,
      [],
    );
    expect(contributions.abilityScoreBonuses.wis).toBe(1);
    expect(contributions.savingThrowProficiencies).toEqual(["wis"]);
  });
});

describe("featMechanicsSummary", () => {
  const t = (key: string, params?: Record<string, string | number>) => {
    if (key === "character.featMechanicsAbilityIncrease" && params) {
      return `+${params.points} to ${params.abilities}`;
    }
    if (key === "character.featMechanicsAbilityIncreaseAny" && params) {
      return `+${params.points} to any ability`;
    }
    if (key === "character.featMechanicsSaveProficiency") return "save proficiency";
    if (key === "character.featMechanicsSkillProficiencies" && params) {
      return `${params.count} proficiencies`;
    }
    if (key.startsWith("rules.ability.")) return key.slice("rules.ability.".length).toUpperCase();
    return key;
  };

  it("summarizes allowed ability increases", () => {
    expect(featMechanicsSummary("chef", t)).toContain("+1 to CON");
  });

  it("summarizes any-ability increases and resilient save proficiency", () => {
    expect(featMechanicsSummary("resilient", t)).toBe("+1 to any ability · save proficiency");
  });

  it("summarizes skilled proficiency grants", () => {
    expect(featMechanicsSummary("skilled", t)).toBe("3 proficiencies");
  });
});

describe("initialFeatChoicesForFeat", () => {
  it("pre-fills ability increases when only one ability is allowed", () => {
    expect(initialFeatChoicesForFeat("shield-master").abilityIncreases).toEqual({ str: 1 });
    expect(initialFeatChoicesForFeat("durable").abilityIncreases).toEqual({ con: 1 });
    expect(initialFeatChoicesForFeat("actor").abilityIncreases).toEqual({ cha: 1 });
  });

  it("leaves ability increases empty when multiple abilities are allowed", () => {
    expect(initialFeatChoicesForFeat("chef").abilityIncreases).toEqual({ con: 1 });
    expect(initialFeatChoicesForFeat("skill-expert").abilityIncreases).toEqual({});
    expect(initialFeatChoicesForFeat("resilient").abilityIncreases).toEqual({});
  });
});

describe("allFeatSkillPicksForCharacter", () => {
  it("includes class-granted proficiency picks but not expertise slots", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "fighter" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "SET_CLASS_GRANTED_FEAT", level: 4, key: "skill-expert" });
    state = characterReducer(state, {
      type: "SET_CLASS_GRANTED_FEAT_PROFICIENCY_PICK",
      level: 4,
      pickIndex: 0,
      pick: { kind: "skill", id: "investigation" },
    });
    state = characterReducer(state, {
      type: "SET_CLASS_GRANTED_FEAT_PROFICIENCY_PICK",
      level: 4,
      pickIndex: 1,
      pick: { kind: "skill", id: "investigation" },
    });
    expect(allFeatSkillPicksForCharacter(state)).toEqual(["investigation"]);
    expect(
      featExpertiseSkillIds(
        ["skill-expert"],
        () => state.classGrantedFeatChoices[4]!,
        state.abilityScores,
      ),
    ).toEqual(["investigation"]);
  });
});

describe("applyFeatProficiencyPick", () => {
  it("allows Skill Expert expertise in the same skill as the proficiency pick", () => {
    const picks = [{ kind: "skill" as const, id: "athletics" as const }, null];
    const next = applyFeatProficiencyPick(
      picks,
      1,
      { kind: "skill", id: "athletics" },
      [],
      [],
      { featKey: "skill-expert" },
    );
    expect(next).toEqual([
      { kind: "skill", id: "athletics" },
      { kind: "skill", id: "athletics" },
    ]);
  });
});

describe("buildFeatSpecialFeatureCards", () => {
  it("lists Great Weapon Master benefits as reference options", () => {
    const gwm = featStub("great-weapon-master", "Great Weapon Master");
    expect(gwm).toBeTruthy();
    const cards = buildFeatSpecialFeatureCards({ feats: [gwm!] });
    expect(cards).toHaveLength(1);
    expect(cards[0]?.featKey).toBe("great-weapon-master");
    expect(cards[0]?.description).toBe("You gain the following benefits.");
    expect(cards[0]?.referenceOptions?.map((option) => option.key)).toEqual([
      "heavy-weapon-mastery",
      "hew",
    ]);
    expect(cards[0]?.referenceOptions?.[1]?.name).toBe("Hew");
  });

  it("includes Great Weapon Fighting as a reminder card", () => {
    const gwf = findByKey(FEATS, "great-weapon-fighting");
    expect(gwf).toBeTruthy();
    const cards = buildFeatSpecialFeatureCards({ feats: [gwf!] });
    expect(cards).toHaveLength(1);
    expect(cards[0]?.featKey).toBe("great-weapon-fighting");
    expect(cards[0]?.referenceOptions).toBeUndefined();
  });

  it("lists Spell Resistant Magical Resilience and Magic Resistant as separate reference options", () => {
    const spellResistant = featStub("spell-resistant", "Spell Resistant");
    expect(spellResistant).toBeTruthy();
    const cards = buildFeatSpecialFeatureCards({ feats: [spellResistant!] });
    expect(cards).toHaveLength(1);
    expect(cards[0]?.referenceOptions?.map((option) => option.key)).toEqual([
      "magical-resilience",
      "magic-resistant",
    ]);
    expect(cards[0]?.referenceOptions?.[0]?.desc).toContain("Resistance to one of the following damage types");
    expect(cards[0]?.referenceOptions?.[1]?.desc).toContain("roll 1d6");
    expect(cards[0]?.useTrackerFeatKey).toBe("spell-resistant");
  });

  it("includes Savage Attacker as a reminder card", () => {
    const savageAttacker = findByKey(FEATS, "savage-attacker");
    expect(savageAttacker).toBeTruthy();
    const cards = buildFeatSpecialFeatureCards({ feats: [savageAttacker!] });
    expect(cards).toHaveLength(1);
    expect(cards[0]?.featKey).toBe("savage-attacker");
  });

  it("includes multiple reminder feats", () => {
    const gwf = findByKey(FEATS, "great-weapon-fighting");
    const savageAttacker = findByKey(FEATS, "savage-attacker");
    expect(gwf && savageAttacker).toBeTruthy();
    const cards = buildFeatSpecialFeatureCards({ feats: [gwf!, savageAttacker!] });
    expect(cards.map((card) => card.featKey)).toEqual(["great-weapon-fighting", "savage-attacker"]);
  });

  it("excludes feats without combatSurface", () => {
    const alert = findByKey(FEATS, "alert");
    expect(alert).toBeTruthy();
    expect(buildFeatSpecialFeatureCards({ feats: [alert!] })).toHaveLength(0);
  });
});

describe("computeInitiative", () => {
  it("equals the Dexterity modifier", () => {
    expect(computeInitiative(3, false)).toBe(3);
  });

  it("adds proficiency bonus when Alert applies", () => {
    expect(computeInitiative(2, true)).toBe(4);
    expect(computeInitiative(2, true, 3)).toBe(5);
  });
});

describe("computeDerivedStats feat integration", () => {
  it("adds Alert from the Criminal origin feat", () => {
    const dex14 = {
      ...INITIAL_CHARACTER,
      abilityScores: { ...INITIAL_CHARACTER.abilityScores, dex: 14 },
    };
    expect(computeDerivedStats(dex14).initiative).toBe(2);

    const criminal = { ...dex14, backgroundKey: "criminal", featKey: "alert" };
    expect(computeDerivedStats(criminal).initiative).toBe(4);
  });

  it("merges Skilled picks into skill bonuses", () => {
    const skilled = {
      ...INITIAL_CHARACTER,
      classKey: "fighter",
      featKey: "skilled",
      featChoices: {
        ...EMPTY_FEAT_CHOICES,
        proficiencyPicks: [
          { kind: "skill" as const, id: "arcana" as const },
          { kind: "skill" as const, id: "history" as const },
          { kind: "skill" as const, id: "religion" as const },
        ],
      },
      skills: mergeSkillProficiencies([], [], ["arcana", "history", "religion"]),
    };
    const derived = computeDerivedStats(skilled);
    expect(skilled.skills.arcana).toBe("proficient");
    expect(derived.skillBonuses.arcana).toBe(2);
  });

  it("applies Grappler ability increase to derived scores without changing stored scores", () => {
    const grappler = {
      ...INITIAL_CHARACTER,
      classKey: "fighter",
      featKey: "grappler",
      abilityScores: { ...INITIAL_CHARACTER.abilityScores, str: 13 },
      featChoices: { ...EMPTY_FEAT_CHOICES, abilityIncreases: { str: 1 } },
    };
    const derived = computeDerivedStats(grappler);
    expect(grappler.abilityScores.str).toBe(13);
    expect(derived.abilityScores.str).toBe(14);
    expect(derived.abilityModifiers.str).toBe(2);
  });

  it("applies Resilient save proficiency when the chosen ability is not a class save", () => {
    const resilient = {
      ...INITIAL_CHARACTER,
      classKey: "wizard",
      level: 4,
      classGrantedFeats: { 4: "resilient" },
      classGrantedFeatChoices: {
        4: { ...EMPTY_FEAT_CHOICES, abilityIncreases: { wis: 1 } },
      },
    };
    const derived = computeDerivedStats(resilient);
    expect(derived.savingThrows.wis.proficient).toBe(true);
    expect(derived.savingThrows.wis.modifier).toBe(2);
    expect(derived.savingThrows.int.proficient).toBe(true);
  });

  it("applies post-generation extras before feat ability increases", () => {
    const grappler = {
      ...INITIAL_CHARACTER,
      classKey: "fighter",
      featKey: "grappler",
      abilityScores: { ...INITIAL_CHARACTER.abilityScores, str: 13 },
      abilityScoreIncreases: { ...INITIAL_CHARACTER.abilityScoreIncreases, str: 2 },
      featChoices: { ...EMPTY_FEAT_CHOICES, abilityIncreases: { str: 1 } },
    };
    const derived = computeDerivedStats(grappler);
    expect(grappler.abilityScores.str).toBe(13);
    expect(grappler.abilityScoreIncreases.str).toBe(2);
    expect(derived.abilityScores.str).toBe(16);
    expect(derived.abilityModifiers.str).toBe(3);
  });
});

describe("isRangedWeapon", () => {
  it("treats ammunition weapons and darts as ranged", () => {
    const longbow = findByKey(WEAPONS, "longbow");
    expect(longbow).not.toBeNull();
    expect(isRangedWeapon("longbow", longbow!.properties)).toBe(true);
    expect(isRangedWeapon("dart", ["Finesse", "Thrown (Range 20/60)", "Vex"])).toBe(true);
  });

  it("does not treat thrown melee weapons as ranged", () => {
    const dagger = findByKey(WEAPONS, "dagger");
    expect(dagger).not.toBeNull();
    expect(isRangedWeapon("dagger", dagger!.properties)).toBe(false);
  });
});

describe("computeWeaponAttack with Archery", () => {
  it("adds extra attack bonus when provided for ranged weapons", () => {
    const longbow = findByKey(WEAPONS, "longbow");
    const dagger = findByKey(WEAPONS, "dagger");
    expect(longbow).not.toBeNull();
    expect(dagger).not.toBeNull();
    const modifiers = { str: 2, dex: 3, con: 0, int: 0, wis: 0, cha: 0 };
    const bowAttack = computeWeaponAttack(longbow!, modifiers, 2, 2);
    const daggerAttack = computeWeaponAttack(dagger!, modifiers, 2, 0);
    expect(bowAttack.attackBonus).toBe(7);
    expect(daggerAttack.attackBonus).toBe(5);
  });
});

describe("computeArmorClass with Defense", () => {
  it("adds an AC bonus when one is provided", () => {
    const leather = {
      key: "leather-armor",
      name: "Leather Armor",
      category: "light",
      acBase: 11,
      acAddDexMod: true,
      acCapDexMod: null,
      strengthScoreRequired: null,
      grantsStealthDisadvantage: false,
      weightLb: 10,
      cost: { amount: 10, denomination: "gp" as const },
      srd: true,
      book: "XPHB",
    };
    expect(computeArmorClass(2, [leather], 1)).toBe(14);
    expect(computeArmorClass(2, [], 1)).toBe(13);
  });
});

describe("evaluateFeatPrerequisites", () => {
  it("warns when a Wizard takes Archery", () => {
    const wizard = { ...INITIAL_CHARACTER, classKey: "wizard", featKey: "archery" };
    const result = evaluateFeatPrerequisites("archery", wizard, findByKey(CLASSES, "wizard"));
    expect(result.met).toBe(false);
  });

  it("passes for a Fighter with Archery", () => {
    const fighter = { ...INITIAL_CHARACTER, classKey: "fighter", featKey: "archery" };
    const result = evaluateFeatPrerequisites("archery", fighter, findByKey(CLASSES, "fighter"));
    expect(result.met).toBe(true);
  });

  it("warns for Grappler at level 1", () => {
    const grappler = {
      ...INITIAL_CHARACTER,
      featKey: "grappler",
      abilityScores: { ...INITIAL_CHARACTER.abilityScores, str: 13 },
    };
    const result = evaluateFeatPrerequisites("grappler", grappler, null);
    expect(result.met).toBe(false);
  });

  it("requires armor training for armor mastery feats", () => {
    const warlock = {
      ...INITIAL_CHARACTER,
      classKey: "warlock",
      level: 4,
    };
    const warlockClass = findByKey(CLASSES, "warlock");

    expect(evaluateFeatPrerequisites("moderately-armored", warlock, warlockClass).met).toBe(true);
    expect(evaluateFeatPrerequisites("medium-armor-master", warlock, warlockClass).met).toBe(false);
    expect(evaluateFeatPrerequisites("heavily-armored", warlock, warlockClass).met).toBe(false);
    expect(evaluateFeatPrerequisites("heavy-armor-master", warlock, warlockClass).met).toBe(false);
  });

  it("counts feat-granted armor training toward later armor feats", () => {
    const wizard = {
      ...INITIAL_CHARACTER,
      classKey: "wizard",
      level: 4,
      classGrantedFeats: { 4: "moderately-armored" },
    };
    const wizardClass = findByKey(CLASSES, "wizard");

    expect(evaluateFeatPrerequisites("heavily-armored", wizard, wizardClass).met).toBe(true);
  });
});

describe("validateAbilityIncreases", () => {
  const asiEffect = findFeatDefinition("ability-score-improvement")!.effects.find(
    (effect): effect is Extract<(typeof FEAT_DEFINITIONS)[number]["effects"][number], { type: "ability_score_increase" }> =>
      effect.type === "ability_score_increase",
  )!;

  it("accepts +2 to one ability", () => {
    expect(
      validateAbilityIncreases(asiEffect, INITIAL_CHARACTER.abilityScores, { str: 2 }),
    ).toEqual({ str: 2 });
  });

  it("accepts +1 to two abilities", () => {
    expect(
      validateAbilityIncreases(asiEffect, INITIAL_CHARACTER.abilityScores, { str: 1, dex: 1 }),
    ).toEqual({ str: 1, dex: 1 });
  });

  it("rejects spending more than allowed points", () => {
    expect(
      validateAbilityIncreases(asiEffect, INITIAL_CHARACTER.abilityScores, { str: 2, dex: 1 }),
    ).toBeNull();
  });

  it("resets feat choices when changing feats via reducer", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_FEAT", key: "skilled" });
    expect(state.featChoices.proficiencyPicks).toHaveLength(3);
    state = characterReducer(state, {
      type: "SET_FEAT_PROFICIENCY_PICK",
      index: 0,
      pick: { kind: "skill", id: "arcana" },
    });
    expect(state.skills.arcana).toBe("proficient");
    state = characterReducer(state, { type: "SET_FEAT", key: "alert" });
    expect(state.featChoices.proficiencyPicks).toHaveLength(0);
    expect(state.skills.arcana).toBe("none");
  });

  it("updates max HP when a feat increases CON", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "fighter" });
    state = characterReducer(state, { type: "SET_FEAT", key: "ability-score-improvement" });
    state = characterReducer(state, {
      type: "SET_FEAT_ABILITY_INCREASES",
      abilityIncreases: { con: 2 },
    });
    expect(computeDerivedStats(state).hitPoints).toBe(11);
    expect(state.abilityScores.con).toBe(10);
    expect(computeDerivedStats(state).abilityScores.con).toBe(12);
  });
});

describe("Magic Initiate feats", () => {
  it("initializes spell choice slots for each variant", () => {
    for (const featKey of ["magic-initiate-wizard", "magic-initiate-cleric", "magic-initiate-druid"] as const) {
      const choices = initialFeatChoicesForFeat(featKey);
      expect(choices.cantripPicks).toHaveLength(2);
      expect(choices.spellPicks).toHaveLength(1);
      expect(choices.spellcastingAbility).toBeNull();
    }
  });

  it("prevents duplicate spell picks across feats", () => {
    const taken = featGrantedSpellKeysFromChoices(
      ["magic-initiate-wizard", "magic-initiate-cleric"],
      (featKey) =>
        featKey === "magic-initiate-wizard"
          ? {
              ...EMPTY_FEAT_CHOICES,
              cantripPicks: ["acid-splash", "blade-ward"],
              spellPicks: ["burning-hands"],
            }
          : EMPTY_FEAT_CHOICES,
      "magic-initiate-cleric",
    );
    expect(taken.has("acid-splash")).toBe(true);
    expect(taken.has("burning-hands")).toBe(true);

    const options = availableFeatSpellOptions(
      ["acid-splash", "blade-ward", "fire-bolt"],
      [null, null],
      0,
      taken,
    );
    expect(options).toEqual(["fire-bolt"]);
  });

  it("excludes spells the character already knows from feat pickers", () => {
    const owned = new Set(["sleep", "charm-person"]);
    const options = availableFeatSpellOptions(
      ["sleep", "charm-person", "disguise-self"],
      [null],
      0,
      new Set(),
      owned,
    );
    expect(options).toEqual(["disguise-self"]);
  });

  it("keeps the current feat spell pick even when it is already known elsewhere", () => {
    const owned = new Set(["sleep"]);
    const options = availableFeatSpellOptions(["sleep", "charm-person"], ["sleep"], 0, new Set(), owned);
    expect(options).toEqual(["sleep", "charm-person"]);
  });

  it("builds granted spells and use trackers from choices", () => {
    const choices = {
      ...EMPTY_FEAT_CHOICES,
      spellcastingAbility: "int" as const,
      cantripPicks: ["fire-bolt", "light"],
      spellPicks: ["burning-hands"],
    };
    const granted = buildFeatGrantedSpells({
      activeFeatKeys: ["magic-initiate-wizard"],
      featChoicesFor: () => choices,
    });
    expect(granted).toHaveLength(3);
    expect(granted.every((entry) => entry.source === "feat" && entry.locked)).toBe(true);

    const trackers = buildFeatSpellUseTrackers({
      activeFeatKeys: ["magic-initiate-wizard"],
      featChoicesFor: () => choices,
    });
    expect(trackers).toHaveLength(1);
    expect(trackers[0]?.spellKey).toBe("burning-hands");
    expect(trackers[0]?.maxUses).toBe(1);
  });

  it("builds separate free-cast trackers per Magic Connoisseur spell pick", () => {
    const choices = {
      ...EMPTY_FEAT_CHOICES,
      spellPicks: ["shield", "misty-step"],
    };
    const trackers = buildFeatSpellUseTrackers({
      activeFeatKeys: ["magic-initiate-wizard", "magic-connoisseur"],
      featChoicesFor: (featKey) => (featKey === "magic-connoisseur" ? choices : EMPTY_FEAT_CHOICES),
    });
    expect(trackers.map((tracker) => tracker.spellKey).sort()).toEqual(["misty-step", "shield"]);
  });

  it("builds feat spellcasting summary when ability is chosen", () => {
    const entries = buildFeatSpellcastingEntries({
      activeFeatKeys: ["magic-initiate-wizard"],
      featChoicesFor: () => ({
        ...EMPTY_FEAT_CHOICES,
        spellcastingAbility: "int",
      }),
      abilityModifiers: { str: 0, dex: 0, con: 0, int: 3, wis: 0, cha: 0 },
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.summary.attackBonus).toBe(5);
    expect(entries[0]?.summary.saveDc).toBe(13);
  });

  it("scales feat spell attack and DC with proficiency bonus", () => {
    const entries = buildFeatSpellcastingEntries({
      activeFeatKeys: ["magic-initiate-wizard"],
      featChoicesFor: () => ({
        ...EMPTY_FEAT_CHOICES,
        spellcastingAbility: "int",
      }),
      abilityModifiers: { str: 0, dex: 0, con: 0, int: 3, wis: 0, cha: 0 },
      proficiencyBonus: 3,
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.summary.attackBonus).toBe(6);
    expect(entries[0]?.summary.saveDc).toBe(14);
  });
});

describe("origin and PHB feat mechanics", () => {
  it("lists twelve origin feat catalog entries (Magic Initiate split by list)", () => {
    const origin = originFeats(FEATS).map((feat) => feat.key).sort();
    expect(origin).toEqual(
      [
        "alert",
        "magic-initiate-cleric",
        "magic-initiate-druid",
        "magic-initiate-wizard",
        "savage-attacker",
        "skilled",
      ].sort(),
    );
  });

  it("adds Tough hit points per level", () => {
    expect(hitPointBonusFromFeats(["tough"], 3)).toBe(6);
  });

  it("limits Crafter proficiency picks to artisan tools", () => {
    const options = availableFeatProficiencyOptions([], [], [], 0, findFeatDefinition("crafter")!.effects[0] as never);
    expect(options.every((option) => option.kind === "tool")).toBe(true);
    expect(options.some((option) => option.kind === "tool" && option.id === "carpenters-tools")).toBe(true);
    expect(options.some((option) => option.kind === "skill")).toBe(false);
  });

  it("builds Lucky feat use trackers from proficiency bonus", () => {
    const trackers = buildFeatUseTrackers({ activeFeatKeys: ["lucky"], proficiencyBonus: 2 });
    expect(trackers).toHaveLength(1);
    expect(trackers[0]?.maxUses).toBe(2);
    const higherLevel = buildFeatUseTrackers({ activeFeatKeys: ["lucky"], proficiencyBonus: 4 });
    expect(higherLevel[0]?.maxUses).toBe(4);
  });

  it("routes Lucky limited uses to the Combat Special Traits card", () => {
    const lucky = featStub("lucky", "Lucky");
    expect(lucky).toBeTruthy();
    const standalone = buildFeatUseTrackers({
      activeFeatKeys: ["lucky"],
      excludeEmbeddedOnCard: true,
      proficiencyBonus: 2,
    });
    expect(standalone).toHaveLength(0);
    const cards = buildFeatSpecialFeatureCards({ feats: [lucky!] });
    expect(cards).toHaveLength(1);
    expect(cards[0]?.useTrackerFeatKey).toBe("lucky");
  });

  it("grants Chef fixed Cook's Utensils and a Bolstering Treats tracker label", () => {
    expect(featFixedToolIds(["chef"])).toEqual(["cooks-utensils"]);
    const trackers = buildFeatUseTrackers({ activeFeatKeys: ["chef"], proficiencyBonus: 2 });
    expect(trackers[0]?.labelKey).toBe("combat.featChefBolsteringTreats");
  });

  it("routes Genie Magic limited uses to the Combat Special Traits card", () => {
    const combat = buildFeatUseTrackers({ activeFeatKeys: ["genie-magic"], uiSurface: "combat" });
    const standalone = buildFeatUseTrackers({ activeFeatKeys: ["genie-magic"], excludeEmbeddedOnCard: true });
    const spells = buildFeatUseTrackers({ activeFeatKeys: ["genie-magic"], uiSurface: "spells" });
    expect(combat).toHaveLength(1);
    expect(combat[0]?.maxUses).toBe(1);
    expect(standalone).toHaveLength(0);
    expect(spells).toHaveLength(0);
    const cards = buildFeatSpecialFeatureCards({ feats: [featStub("genie-magic", "Genie Magic")] });
    expect(cards[0]?.referenceOptions?.[0]?.name).toBe("Wish Magic");
    expect(cards[0]?.useTrackerFeatKey).toBe("genie-magic");
  });

  it("embeds Love Bites limited uses on the Endearing Pain bonus card", () => {
    const loveBites = featStub("love-bites", "Love Bites");
    expect(loveBites).toBeTruthy();
    const lists = buildCombatActions({
      speciesKey: null,
      weapons: [],
      abilityModifiers: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
      feats: [loveBites!],
    });
    const card = lists.bonusActions.find((entry) => entry.id === "feat-love-bites-endearing-pain");
    expect(card?.useTrackerFeatKey).toBe("love-bites");
    expect(buildFeatUseTrackers({ activeFeatKeys: ["love-bites"], excludeEmbeddedOnCard: true })).toHaveLength(0);
  });

  it("parses Mythal Touched table rows on the Reaction action card", () => {
    const mythal = featStub("mythal-touched", "Mythal Touched", MYTHAL_TABLE_DESC);
    expect(mythal).toBeTruthy();
    const lists = buildCombatActions({
      speciesKey: null,
      weapons: [],
      abilityModifiers: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
      feats: [mythal!],
    });
    const ward = lists.reactions.find((card) => card.id === "feat-mythal-touched-mythal-ward");
    expect(ward?.referenceTable?.length).toBeGreaterThanOrEqual(7);
    expect(ward?.referenceTableTitle).toBe("Mythal-Touched Magic");
    expect(ward?.useTrackerFeatKey).toBe("mythal-touched");
    expect(buildFeatSpecialFeatureCards({ feats: [mythal!] })).toHaveLength(0);
  });

  it("computes Inspiring Leader temp HP from level and ASI ability", () => {
    const inspiring = featStub("inspiring-leader", "Inspiring Leader");
    expect(inspiring).toBeTruthy();
    const cards = buildFeatSpecialFeatureCards({
      feats: [inspiring!],
      level: 4,
      abilityModifiers: { str: 0, dex: 0, con: 0, int: 0, wis: 2, cha: 0 },
      featChoicesFor: () => ({
        ...EMPTY_FEAT_CHOICES,
        abilityIncreases: { wis: 1 },
      }),
    });
    expect(cards[0]?.meta).toBe("6");
  });

  it("applies Tavern Brawler unarmed damage die in combat actions", () => {
    const lists = buildCombatActions({
      speciesKey: "human",
      weapons: [],
      abilityModifiers: { str: 2, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
      feats: [featStub("tavern-brawler", "Tavern Brawler")],
      unarmedDamageDie: "1d4",
    });
    const unarmed = lists.actions.find((card) => card.id === "unarmed-strike");
    expect(unarmed?.attackMeta?.damage).toContain("1d4");
  });

  it("initializes Blessed Warrior with cleric cantrip picks and Charisma casting", () => {
    const choices = initialFeatChoicesForFeat("blessed-warrior");
    expect(choices.cantripPicks).toHaveLength(2);
    expect(choices.spellcastingAbility).toBe("cha");
    expect(choices.spellPicks).toHaveLength(0);
  });

  it("clears Lucky feat uses on long rest", () => {
    let character = characterReducer(INITIAL_CHARACTER, { type: "SET_FEAT", key: "lucky" });
    character = characterReducer(character, { type: "SET_FEAT_SPELL_USES", featKey: "lucky", value: 0 });
    expect(character.featSpellUses.lucky).toBe(0);
    const rested = applyRest(character, "long");
    expect(rested.featSpellUses.lucky).toBeUndefined();
  });
});
