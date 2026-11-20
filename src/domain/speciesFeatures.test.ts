import { describe, expect, it } from "vitest";
import { findByKey, SPECIES } from "../data";
import {
  buildSpeciesFeatureActionCards,
  buildSpeciesFeatureCards,
  formatSpeciesFeatureCombatTitle,
} from "./speciesFeatures/cards";
import {
  buildSpeciesFeatureUseTrackers,
  collectSpeciesFeatureContributions,
} from "./speciesFeatures/contributions";
import { INITIAL_CHARACTER, characterReducer } from "../state/characterState";

describe("species character state", () => {
  it("clears lineage and uses when species changes", () => {
    const withElf = characterReducer(INITIAL_CHARACTER, { type: "SET_SPECIES", key: "elf" });
    const withLineage = characterReducer(withElf, { type: "SET_SPECIES_LINEAGE", key: "high-elf" });
    const afterRest = characterReducer(withLineage, { type: "APPLY_REST", kind: "long" });
    const withCantrip = characterReducer(afterRest, {
      type: "SET_SPECIES_FEATURE_CHOICE",
      choiceKey: "high-elf-cantrip",
      spellKey: "fire-bolt",
    });
    const withUses = characterReducer(withCantrip, {
      type: "SET_SPECIES_FEATURE_USES",
      featureKey: "breath-weapon",
      value: 1,
    });
    const switched = characterReducer(withUses, { type: "SET_SPECIES", key: "dwarf" });

    expect(switched.speciesKey).toBe("dwarf");
    expect(switched.speciesLineageKey).toBeNull();
    expect(switched.speciesFeatureChoices).toEqual({});
    expect(switched.speciesFeatureUses).toEqual({});
    expect(switched.speciesSpellcastingAbility).toBeNull();
  });

  it("clears species feature uses when lineage changes", () => {
    const elf = characterReducer(INITIAL_CHARACTER, { type: "SET_SPECIES", key: "goliath" });
    const cloud = characterReducer(elf, { type: "SET_SPECIES_LINEAGE", key: "cloud" });
    const spent = characterReducer(cloud, {
      type: "SET_SPECIES_FEATURE_USES",
      featureKey: "clouds-jaunt",
      value: 0,
    });
    const fire = characterReducer(spent, { type: "SET_SPECIES_LINEAGE", key: "fire" });

    expect(fire.speciesLineageKey).toBe("fire");
    expect(fire.speciesFeatureUses).toEqual({});
    expect(fire.speciesFeatureChoices).toEqual({});
  });

  it("swaps high elf cantrip after a long rest and clears on lineage change", () => {
    const elf = characterReducer(INITIAL_CHARACTER, { type: "SET_SPECIES", key: "elf" });
    const highElf = characterReducer(elf, { type: "SET_SPECIES_LINEAGE", key: "high-elf" });
    expect(
      characterReducer(highElf, {
        type: "SET_SPECIES_FEATURE_CHOICE",
        choiceKey: "high-elf-cantrip",
        spellKey: "mage-hand",
      }),
    ).toBe(highElf);

    const afterRest = characterReducer(highElf, { type: "APPLY_REST", kind: "long" });
    expect(afterRest.speciesCantripSwapAvailable).toEqual({ "high-elf-cantrip": true });

    const swapped = characterReducer(afterRest, {
      type: "SET_SPECIES_FEATURE_CHOICE",
      choiceKey: "high-elf-cantrip",
      spellKey: "mage-hand",
    });
    expect(swapped.speciesFeatureChoices).toEqual({ "high-elf-cantrip": "mage-hand" });
    expect(swapped.speciesCantripSwapAvailable).toEqual({ "high-elf-cantrip": false });
    expect(
      collectSpeciesFeatureContributions(
        findByKey(SPECIES, "elf"),
        "high-elf",
        1,
        swapped.speciesFeatureChoices,
      ).cantrips,
    ).toEqual(["Mage Hand"]);

    const drow = characterReducer(swapped, { type: "SET_SPECIES_LINEAGE", key: "drow" });
    expect(drow.speciesFeatureChoices).toEqual({});
  });

  it("grants keen senses skill pick for elf", () => {
    const elf = characterReducer(INITIAL_CHARACTER, { type: "SET_SPECIES", key: "elf" });
    expect(elf.speciesSkillPicks).toHaveLength(1);
  });

  it("applies species skill pick to skills", () => {
    const elf = characterReducer(INITIAL_CHARACTER, { type: "SET_SPECIES", key: "elf" });
    const picked = characterReducer(elf, {
      type: "SET_SPECIES_SKILL_PICK",
      index: 0,
      skill: "perception",
    });
    expect(picked.skills.perception).toBe("proficient");
  });
});

describe("species catalog wiring", () => {
  it("loads features and choices for all srd species", () => {
    for (const species of SPECIES) {
      expect(species.features.length).toBeGreaterThan(0);
    }
    expect(findByKey(SPECIES, "elf")?.choice?.options).toHaveLength(3);
    expect(findByKey(SPECIES, "tiefling")?.choice?.options).toHaveLength(3);
    expect(findByKey(SPECIES, "gnome")?.choice?.options).toHaveLength(2);
    expect(findByKey(SPECIES, "goliath")?.choice?.options).toHaveLength(6);
    expect(findByKey(SPECIES, "dragonborn")?.choice?.options).toHaveLength(10);
  });
});

describe("buildSpeciesFeatureCards", () => {
  const formatMeta = (key: string) => {
    if (key === "combat.speciesFeature.elvenLineageLevel1") return "Elven Lineage - Level 1";
    if (key === "combat.speciesFeature.fiendishLegacyLevel1") return "Fiendish Legacy - Level 1";
    return key;
  };

  const baseInput = {
    level: 1,
    contributions: {
      walkSpeedFeet: null,
      darkvisionFeet: 0,
      damageResistances: [],
      hpPerLevel: 0,
      skillPickCount: 0,
      skillPickOptions: null,
      cantrips: [],
      preparedSpells: [],
      carryingSizeIncrease: 0,
      toolPickCount: 0,
      acBonus: 0,
    },
    spellcastingAbility: null,
    formatMeta,
  };

  it("embeds relentless endurance on the description card and omits it from Special Traits trackers", () => {
    const orc = findByKey(SPECIES, "orc")!;
    const abilityModifiers = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
    const descriptionCards = buildSpeciesFeatureCards({ ...baseInput, speciesData: orc, lineageKey: null });
    const relentless = descriptionCards.find((card) => card.featureKey === "relentless-endurance");
    expect(relentless?.useTrackerSpeciesFeatureKey).toBe("relentless-endurance");

    const allTrackers = buildSpeciesFeatureUseTrackers(orc, null, 1, abilityModifiers);
    const statRowTrackers = buildSpeciesFeatureUseTrackers(orc, null, 1, abilityModifiers, {
      excludeEmbeddedOnCard: true,
    });
    expect(allTrackers.some((tracker) => tracker.featureKey === "relentless-endurance")).toBe(true);
    expect(statRowTrackers.some((tracker) => tracker.featureKey === "relentless-endurance")).toBe(false);
    expect(allTrackers.find((tracker) => tracker.featureKey === "relentless-endurance")?.restRecovery).toBe("long");
  });

  it("embeds stonecunning uses on the bonus action card and omits it from Special Traits trackers", () => {
    const dwarf = findByKey(SPECIES, "dwarf")!;
    const abilityModifiers = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
    const actionCards = buildSpeciesFeatureActionCards({ ...baseInput, speciesData: dwarf, lineageKey: null });
    const stonecunning = actionCards.bonus.find((card) => card.traitSlug === "stonecunning");
    expect(stonecunning?.useTrackerSpeciesFeatureKey).toBe("stonecunning");

    const allTrackers = buildSpeciesFeatureUseTrackers(dwarf, null, 1, abilityModifiers);
    const statRowTrackers = buildSpeciesFeatureUseTrackers(dwarf, null, 1, abilityModifiers, {
      excludeEmbeddedOnCard: true,
    });
    expect(allTrackers.some((tracker) => tracker.featureKey === "stonecunning")).toBe(true);
    expect(statRowTrackers.some((tracker) => tracker.featureKey === "stonecunning")).toBe(false);
  });

  it("excludes action-timing traits from description cards", () => {
    const dwarf = findByKey(SPECIES, "dwarf");
    const dragonborn = findByKey(SPECIES, "dragonborn");
    const orc = findByKey(SPECIES, "orc");
    const goliath = findByKey(SPECIES, "goliath");

    expect(
      buildSpeciesFeatureCards({ ...baseInput, speciesData: dwarf, lineageKey: null }).some(
        (card) => card.featureKey === "stonecunning",
      ),
    ).toBe(false);
    expect(
      buildSpeciesFeatureCards({ ...baseInput, speciesData: dragonborn, lineageKey: "red" }).some(
        (card) => card.featureKey === "breath-weapon",
      ),
    ).toBe(false);
    expect(
      buildSpeciesFeatureCards({ ...baseInput, speciesData: orc, lineageKey: null }).some(
        (card) => card.featureKey === "adrenaline-rush",
      ),
    ).toBe(false);
    expect(
      buildSpeciesFeatureCards({ ...baseInput, speciesData: goliath, lineageKey: "cloud" }).some(
        (card) => card.featureKey === "clouds-jaunt",
      ),
    ).toBe(false);
    expect(
      buildSpeciesFeatureCards({ ...baseInput, speciesData: goliath, lineageKey: "stone" }).some(
        (card) => card.featureKey === "stones-endurance",
      ),
    ).toBe(false);
  });

  it("labels elf and tiefling level 1 lineage cantrips without repeating the spell name", () => {
    const elf = findByKey(SPECIES, "elf");
    const tiefling = findByKey(SPECIES, "tiefling");

    const highElfCard = buildSpeciesFeatureCards({
      ...baseInput,
      speciesData: elf,
      lineageKey: "high-elf",
      speciesFeatureChoices: { "high-elf-cantrip": "fire-bolt" },
      speciesCantripSwapAvailable: { "high-elf-cantrip": true },
    }).find((card) => card.featureKey === "high-elf-cantrip");
    const infernalCard = buildSpeciesFeatureCards({
      ...baseInput,
      speciesData: tiefling,
      lineageKey: "infernal",
    }).find((card) => card.featureKey === "infernal-cantrip");

    expect(highElfCard?.name).toBe("Elven Lineage - Level 1");
    expect(highElfCard?.cantripChoice?.selectedSpellKey).toBe("fire-bolt");
    expect(infernalCard?.name).toBe("Fiendish Legacy - Level 1");
  });
});

describe("formatSpeciesFeatureCombatTitle", () => {
  const t = (key: string, params?: Record<string, string | number>, fallback?: string) => {
    if (key === "combat.speciesFeatureCardTitle" && params) {
      return `${params.speciesName} ${params.speciesFeatureLabel} - ${params.featureName}`;
    }
    if (key === "combat.speciesFeatureLabel") return "Feature";
    return fallback ?? key;
  };
  const tEntity = (catalog: string, key: string, field: string, fallback?: string) => {
    if (catalog === "catalog.species" && key === "goliath" && field === "name") return "Goliath";
    return fallback ?? key;
  };

  it("prefixes species feature cards with species name", () => {
    expect(
      formatSpeciesFeatureCombatTitle("goliath", "stones-endurance", "Stone's Endurance", t, tEntity),
    ).toBe("Goliath Feature - Stone's Endurance");
  });
});
