import { describe, expect, it } from "vitest";
import { CLASSES, WEAPONS, findByKey } from "../data";
import type { ClassFeatureData, SubclassData } from "../data/types";
import { computeArmorClass } from "./armorClass";
import {
  battleMasterManeuverSaveDc,
  bardicInspirationDieSides,
  buildClassFeatureActionCards,
  buildClassFeatureCards,
  buildClassFeaturePoolTrackers,
  buildClassFeatureUseTrackers,
  buildMasteryRiderCards,
  buildWeaponMasteryEmptyPrompt,
  classFeatureOptionPickGrantsForSurface,
  classHasWeaponProficiency,
  collectClassFeatureContributions,
  collectMulticlassClassFeatureContributions,
  flattenWeaponMasteryPicks,
  weaponMasteryCountIncreasesAtLevel,
  effectiveSpellSlotsByLevel,
  fightingStyleFeatOptionsForClass,
  fightingStyleGrantedAtLevel,
  FONT_OF_MAGIC_FEATURE_KEY,
  mergeDarkvisionFeet,
  resolveHitPointPoolMax,
  resolveLimitedUses,
  uniqueMasteriesFromPicks,
  weaponEligibleForMastery,
} from "./classFeatures";
import { applyRest } from "./rest";
import { buildCombatActions } from "./combatActions";
import { computeDerivedStats } from "./deriveCharacter";
import { evaluateFeatPrerequisites } from "./featPrerequisites";
import { resolvedClassLevels } from "./classLevels";
import { findSubclass, subclassFeatureChoiceOptions, subclassFeatureOptionPickGrants } from "./subclasses";
import { hydrateCharacter } from "./characterFile";
import { INITIAL_CHARACTER, characterReducer } from "../state/characterState";

function mechanismSubclass(classKey: string, key: string, features: ClassFeatureData[]): SubclassData {
  return {
    key,
    classKey,
    name: key,
    desc: "Mechanism fixture.",
    srd: false,
    book: "XPHB",
    features,
  };
}

function armorModelFixture(): SubclassData {
  return mechanismSubclass("fighter", "armor-model-fixture", [
    feature("armor-model", "Armor Model", "Choose a model.", {
      effects: [
        {
          type: "choose_feature_option",
          choiceKey: "armor-model",
          options: [
            {
              key: "guardian",
              name: "Guardian",
              desc: "Thunder Pulse",
              combatCards: [
                {
                  key: "thunder-pulse",
                  name: "Thunder Pulse",
                  desc: "A pulse.",
                  attack: { damageDice: "1d8", damageType: "Thunder", ability: "int" },
                },
                { key: "defensive-field", name: "Defensive Field", desc: "Temporary Hit Points.", actionTiming: "bonus" },
              ],
            },
            {
              key: "infiltrator",
              name: "Infiltrator",
              desc: "Advantage on Dexterity (Stealth)",
              combatCards: [
                {
                  key: "lightning-launcher",
                  name: "Lightning Launcher",
                  desc: "A launcher.",
                  attack: { damageDice: "1d6", damageType: "Lightning", ability: "int" },
                },
              ],
            },
            {
              key: "dreadnaught",
              name: "Dreadnaught",
              desc: "Force Demolisher",
              combatCards: [
                {
                  key: "force-demolisher",
                  name: "Force Demolisher",
                  desc: "A demolisher.",
                  attack: { damageDice: "1d10", damageType: "Force", ability: "int" },
                },
                {
                  key: "giant-stature",
                  name: "Giant Stature",
                  desc: "You grow.",
                  actionTiming: "bonus",
                  limitedUses: { kind: "abilityMod", ability: "int" },
                },
              ],
            },
          ],
        },
      ],
    }),
  ]);
}

function cartographerFixture(): SubclassData {
  return mechanismSubclass("fighter", "cartographer-fixture", [
    feature("portal-jump", "Portal Jump", "You jump through a portal.", { combatParentName: "Mapping Magic" }),
    feature("illuminated-cartography", "Illuminated Cartography", "Your map glows.", {
      combatParentName: "Mapping Magic",
      limitedUses: { kind: "abilityMod", ability: "int" },
    }),
  ]);
}

function feature(
  key: string,
  name: string,
  desc: string,
  extra: Partial<ClassFeatureData> = {},
): ClassFeatureData {
  return {
    key,
    name,
    desc,
    grantedAtLevel: 3,
    combatSurface: true,
    effects: [{ type: "narrative" }],
    ...extra,
  };
}

describe("class feature catalog", () => {
  it("gives every class feature mechanics metadata", () => {
    for (const cls of CLASSES) {
      for (const feature of cls.features) {
        expect(feature.grantedAtLevel).toBeGreaterThanOrEqual(1);
        expect(feature.effects.length).toBeGreaterThanOrEqual(1);
        for (const effect of feature.effects) {
          expect(typeof effect.type).toBe("string");
        }
      }
    }
  });

  it("assigns 2024 level-1 weapon mastery counts", () => {
    expect(collectClassFeatureContributions("fighter", 1).weaponMasteryCount).toBe(3);
    expect(collectClassFeatureContributions("barbarian", 1).weaponMasteryCount).toBe(2);
    expect(collectClassFeatureContributions("rogue", 1).weaponMasteryCount).toBe(2);
    expect(collectClassFeatureContributions("paladin", 1).weaponMasteryCount).toBe(2);
    expect(collectClassFeatureContributions("ranger", 1).weaponMasteryCount).toBe(2);
    expect(collectClassFeatureContributions("wizard", 1).weaponMasteryCount).toBe(0);
  });

  it("assigns rogue expertise count at level 1", () => {
    expect(collectClassFeatureContributions("rogue", 1).expertiseCount).toBe(2);
    expect(collectClassFeatureContributions("fighter", 1).expertiseCount).toBe(0);
  });

  it("marks barbarian weapon mastery as melee-only", () => {
    expect(collectClassFeatureContributions("barbarian", 1).weaponMasteryMeleeOnly).toBe(true);
    expect(collectClassFeatureContributions("fighter", 1).weaponMasteryMeleeOnly).toBe(false);
  });

  it("detects weapon mastery count increases at level 4 for barbarian and fighter", () => {
    expect(weaponMasteryCountIncreasesAtLevel("barbarian", 4)).toBe(true);
    expect(weaponMasteryCountIncreasesAtLevel("fighter", 4)).toBe(true);
    expect(weaponMasteryCountIncreasesAtLevel("barbarian", 3)).toBe(false);
    expect(weaponMasteryCountIncreasesAtLevel("rogue", 4)).toBe(false);
  });
});

describe("collectClassFeatureContributions", () => {
  it("scales sneak attack dice by rogue level", () => {
    expect(collectClassFeatureContributions("rogue", 1).sneakAttackDice).toBe("1d6");
    expect(collectClassFeatureContributions("rogue", 3).sneakAttackDice).toBe("2d6");
    expect(collectClassFeatureContributions("monk", 1).martialArtsDie).toBe("1d6");
    expect(collectClassFeatureContributions("monk", 3).martialArtsDie).toBe("1d6");
  });

  it("grants fighter second wind at level 1", () => {
    const contributions = collectClassFeatureContributions("fighter", 1);
    expect(contributions.secondWindUses).toBe(2);
    expect(contributions.secondWindHealDice).toBe("1d10");
    expect(contributions.hasFightingStyleFeature).toBe(true);
  });

  it("does not grant paladin fighting style at level 1", () => {
    expect(collectClassFeatureContributions("paladin", 1).hasFightingStyleFeature).toBe(false);
  });
});

describe("buildClassFeatureCards", () => {
  const defaultAbilityModifiers = { str: 0, dex: 0, con: 0, int: 0, wis: 2, cha: 0 };
  const fighterInput = {
    classData: findByKey(CLASSES, "fighter")!,
    level: 1,
    weaponMasteryPicks: [] as string[],
    contributions: collectClassFeatureContributions("fighter", 1),
    abilityModifiers: defaultAbilityModifiers,
    formatMeta: (key: string, params?: Record<string, string | number>) => `${key}:${JSON.stringify(params ?? {})}`,
    weaponLabel: (_key: string, fallback: string) => fallback,
    masteryLabel: (mastery: string) => mastery,
  };

  it("excludes second wind from the class features block but keeps tactical mind", () => {
    const cards = buildClassFeatureCards(fighterInput);
    expect(cards.some((card) => card.featureKey === "second-wind")).toBe(false);
    expect(cards.some((card) => card.featureKey === "weapon-mastery")).toBe(false);
    expect(cards.some((card) => card.featureKey === "spellcasting")).toBe(false);
    expect(cards.some((card) => card.featureKey === "tactical-mind")).toBe(false);
  });

  it("includes Tactical Mind for a level 2 fighter without a separate uses tracker", () => {
    const cards = buildClassFeatureCards({
      ...fighterInput,
      level: 2,
      contributions: collectClassFeatureContributions("fighter", 2),
    });
    const tacticalMind = cards.find((card) => card.featureKey === "tactical-mind");
    expect(tacticalMind?.catalogEntityKey).toBe("fighter.feature.tactical-mind");
    expect(tacticalMind?.description).toContain("Second Wind");
    expect(tacticalMind?.description).toContain("isn't expended");

    const fighter = findByKey(CLASSES, "fighter")!;
    const trackers = buildClassFeatureUseTrackers(fighter, 2, {
      str: 0,
      dex: 0,
      con: 0,
      int: 0,
      wis: 0,
      cha: 0,
    });
    expect(trackers.some((tracker) => tracker.featureKey === "tactical-mind")).toBe(false);
  });

  it("excludes timed features from the class features block unless classFeatureCard is set", () => {
    const cleric = findByKey(CLASSES, "cleric")!;
    const barbarian = findByKey(CLASSES, "barbarian")!;
    const paladin = findByKey(CLASSES, "paladin")!;
    const sorcerer = findByKey(CLASSES, "sorcerer")!;
    const cardInput = (classData: typeof cleric, level: number) => ({
      classData,
      level,
      weaponMasteryPicks: [] as string[],
      contributions: collectClassFeatureContributions(classData.key, level),
      abilityModifiers: defaultAbilityModifiers,
      formatMeta: (key: string, params?: Record<string, string | number>) =>
        `${key}:${JSON.stringify(params ?? {})}`,
      weaponLabel: (_key: string, fallback: string) => fallback,
      masteryLabel: (mastery: string) => mastery,
    });

    const clericCards = buildClassFeatureCards(cardInput(cleric, 2));
    expect(clericCards.some((card) => card.featureKey === "channel-divinity")).toBe(false);

    const barbarianCards = buildClassFeatureCards(cardInput(barbarian, 1));
    expect(barbarianCards.some((card) => card.featureKey === "rage")).toBe(false);

    const paladinCards = buildClassFeatureCards(cardInput(paladin, 3));
    expect(paladinCards.some((card) => card.featureKey === "channel-divinity")).toBe(false);

    const sorcererCards = buildClassFeatureCards(cardInput(sorcerer, 1));
    expect(sorcererCards.some((card) => card.featureKey === "innate-sorcery")).toBe(false);

    const sorcererTrackers = buildClassFeatureUseTrackers(sorcerer, 1, defaultAbilityModifiers);
    expect(sorcererTrackers.some((tracker) => tracker.featureKey === "innate-sorcery")).toBe(true);

    const sorcererActions = buildClassFeatureActionCards(cardInput(sorcerer, 1));
    expect(sorcererActions.bonus.some((card) => card.traitSlug === "innate-sorcery")).toBe(true);
  });

  it("embeds Paladin's Smite tracker on the bonus action card at level 2", () => {
    const paladin = findByKey(CLASSES, "paladin")!;
    const input = {
      classData: paladin,
      level: 2,
      weaponMasteryPicks: [] as string[],
      contributions: collectClassFeatureContributions("paladin", 2),
      abilityModifiers: defaultAbilityModifiers,
      formatMeta: (key: string, params?: Record<string, string | number>) =>
        `${key}:${JSON.stringify(params ?? {})}`,
      weaponLabel: (_key: string, fallback: string) => fallback,
      masteryLabel: (mastery: string) => mastery,
    };

    expect(buildClassFeatureCards(input).some((card) => card.featureKey === "paladins-smite")).toBe(false);
    expect(
      buildClassFeatureUseTrackers(paladin, 2, defaultAbilityModifiers).some(
        (tracker) => tracker.featureKey === "paladins-smite" && tracker.maxUses === 1,
      ),
    ).toBe(true);
    const smiteAction = buildClassFeatureActionCards(input).bonus.find(
      (card) => card.traitSlug === "paladins-smite",
    );
    expect(smiteAction).toBeDefined();
    expect(smiteAction?.useTrackerClassFeatureKey).toBe("paladins-smite");
    expect(
      buildClassFeatureUseTrackers(paladin, 2, defaultAbilityModifiers, null, "combat", {}, {
        excludeEmbeddedOnCard: true,
      }).some((tracker) => tracker.featureKey === "paladins-smite"),
    ).toBe(false);
  });

  it("shows barbarian danger sense and reckless attack on the class features block", () => {
    const barbarian = findByKey(CLASSES, "barbarian")!;
    const cards = buildClassFeatureCards({
      classData: barbarian,
      level: 2,
      weaponMasteryPicks: [],
      contributions: collectClassFeatureContributions("barbarian", 2),
      abilityModifiers: defaultAbilityModifiers,
      formatMeta: (key, params) => `${key}:${JSON.stringify(params ?? {})}`,
      weaponLabel: (_key, fallback) => fallback,
      masteryLabel: (mastery) => mastery,
    });
    expect(cards.some((card) => card.featureKey === "danger-sense")).toBe(true);
    expect(cards.some((card) => card.featureKey === "reckless-attack")).toBe(true);
    expect(
      buildClassFeatureActionCards({
        classData: barbarian,
        level: 2,
        weaponMasteryPicks: [],
        contributions: collectClassFeatureContributions("barbarian", 2),
        abilityModifiers: defaultAbilityModifiers,
        formatMeta: (key, params) => `${key}:${JSON.stringify(params ?? {})}`,
        weaponLabel: (_key, fallback) => fallback,
        masteryLabel: (mastery) => mastery,
      }).bonus.some((card) => card.traitSlug === "reckless-attack"),
    ).toBe(false);
  });

  it("excludes action-only features without limited uses from the class features block", () => {
    const bard = findByKey(CLASSES, "bard")!;
    const lore = findSubclass("bard", "college-of-lore")!;
    const cards = buildClassFeatureCards({
      classData: bard,
      subclassData: lore,
      level: 3,
      weaponMasteryPicks: [],
      contributions: collectClassFeatureContributions("bard", 3, "college-of-lore"),
      abilityModifiers: defaultAbilityModifiers,
      formatMeta: (key, params) => `${key}:${JSON.stringify(params ?? {})}`,
      weaponLabel: (_key, fallback) => fallback,
      masteryLabel: (mastery) => mastery,
    });
    expect(cards.some((card) => card.featureKey === "cutting-words")).toBe(false);
  });

  it("builds Hunter's Prey with option choice metadata", () => {
    const ranger = findByKey(CLASSES, "ranger")!;
    const hunter = findSubclass("ranger", "hunter")!;
    const cards = buildClassFeatureCards({
      classData: ranger,
      subclassData: hunter,
      level: 3,
      subclassFeatureChoices: { "hunters-prey": "colossus-slayer" },
      weaponMasteryPicks: [],
      contributions: collectClassFeatureContributions("ranger", 3, "hunter"),
      abilityModifiers: defaultAbilityModifiers,
      formatMeta: (key, params) => `${key}:${JSON.stringify(params ?? {})}`,
      weaponLabel: (_key, fallback) => fallback,
      masteryLabel: (mastery) => mastery,
    });
    const prey = cards.find((card) => card.featureKey === "hunters-prey");
    expect(prey?.catalogEntityKey).toBe("ranger.subclass.hunter.feature.hunters-prey");
    expect(prey?.choice?.selectedOptionKey).toBe("colossus-slayer");
    expect(prey?.description).toContain("1d8");
  });

  it("includes Second-Story Work for a level 3 Thief rogue", () => {
    const rogue = findByKey(CLASSES, "rogue")!;
    const thief = findSubclass("rogue", "thief")!;
    const cards = buildClassFeatureCards({
      classData: rogue,
      subclassData: thief,
      level: 3,
      subclassFeatureChoices: {},
      weaponMasteryPicks: [],
      contributions: collectClassFeatureContributions("rogue", 3, "thief"),
      abilityModifiers: defaultAbilityModifiers,
      formatMeta: (key, params) => `${key}:${JSON.stringify(params ?? {})}`,
      weaponLabel: (_key, fallback) => fallback,
      masteryLabel: (mastery) => mastery,
    });
    const secondStory = cards.find((card) => card.featureKey === "second-story-work");
    expect(secondStory?.catalogEntityKey).toBe("rogue.subclass.thief.feature.second-story-work");
    expect(secondStory?.description).toContain("Climb Speed equal to your Speed");
    expect(secondStory?.description).toContain("Dexterity rather than your Strength");
    expect(cards.some((card) => card.featureKey === "fast-hands")).toBe(false);
  });

  it("splits College of Valor Combat Inspiration across class features and reactions", () => {
    const bard = findByKey(CLASSES, "bard")!;
    const valor = mechanismSubclass("bard", "college-of-valor", [
      feature("combat-inspiration-offense", "Combat Inspiration", "Add the roll to damage.", {}),
      feature("combat-inspiration-defense", "Combat Inspiration", "Add the roll to AC.", {
        actionTiming: "reaction",
      }),
    ]);
    const cardInput = {
      classData: bard,
      subclassData: valor,
      level: 3,
      weaponMasteryPicks: [] as string[],
      contributions: collectClassFeatureContributions("bard", 3),
      abilityModifiers: defaultAbilityModifiers,
      formatMeta: (key: string, params?: Record<string, string | number>) =>
        `${key}:${JSON.stringify(params ?? {})}`,
      weaponLabel: (_key: string, fallback: string) => fallback,
      masteryLabel: (mastery: string) => mastery,
    };

    const cards = buildClassFeatureCards(cardInput);
    const offense = cards.find((card) => card.featureKey === "combat-inspiration-offense");
    expect(offense?.catalogEntityKey).toBe("bard.subclass.college-of-valor.feature.combat-inspiration-offense");
    expect(offense?.description).toContain("damage");
    expect(cards.some((card) => card.featureKey === "combat-inspiration-defense")).toBe(false);

    const actions = buildClassFeatureActionCards(cardInput);
    const defense = actions.reaction.find((card) => card.traitSlug === "combat-inspiration-defense");
    expect(defense?.description).toContain("AC");
    expect(actions.reaction.some((card) => card.traitSlug === "combat-inspiration-offense")).toBe(false);
  });

  it("excludes Land's Aid from the class features block but keeps it in Actions", () => {
    const druid = findByKey(CLASSES, "druid")!;
    const land = findSubclass("druid", "circle-of-the-land")!;
    const cardInput = {
      classData: druid,
      subclassData: land,
      level: 3,
      subclassFeatureChoices: {},
      weaponMasteryPicks: [],
      contributions: collectClassFeatureContributions("druid", 3, "circle-of-the-land"),
      abilityModifiers: { str: 0, dex: 0, con: 0, int: 0, wis: 2, cha: 0 },
      formatMeta: (key: string, params?: Record<string, string | number>) => `${key}:${JSON.stringify(params ?? {})}`,
      weaponLabel: (_key: string, fallback: string) => fallback,
      masteryLabel: (mastery: string) => mastery,
    };
    const cards = buildClassFeatureCards(cardInput);
    expect(cards.some((card) => card.featureKey === "lands-aid")).toBe(false);

    const actions = buildClassFeatureActionCards(cardInput);
    const landsAid = actions.action.find((card) => card.traitSlug === "lands-aid");
    expect(landsAid?.description).toContain("Wild Shape");
  });

  it("shows Wild Shape and Wild Companion on the right combat surfaces for a level 2 druid", () => {
    const druid = findByKey(CLASSES, "druid")!;
    const cardInput = {
      classData: druid,
      level: 2,
      weaponMasteryPicks: [],
      contributions: collectClassFeatureContributions("druid", 2),
      abilityModifiers: { str: 0, dex: 0, con: 0, int: 0, wis: 2, cha: 0 },
      formatMeta: (key: string, params?: Record<string, string | number>) => `${key}:${JSON.stringify(params ?? {})}`,
      weaponLabel: (_key: string, fallback: string) => fallback,
      masteryLabel: (mastery: string) => mastery,
    };
    const cards = buildClassFeatureCards(cardInput);
    expect(cards.some((card) => card.featureKey === "wild-shape")).toBe(true);

    const actions = buildClassFeatureActionCards(cardInput);
    expect(actions.action.some((card) => card.traitSlug === "wild-companion")).toBe(true);
    expect(actions.bonus.some((card) => card.traitSlug === "wild-shape")).toBe(true);
  });

  it("excludes Wrath of the Sea from class features but keeps it in Bonus Actions", () => {
    const druid = findByKey(CLASSES, "druid")!;
    const sea = mechanismSubclass("druid", "circle-of-the-sea", [
      feature("wrath-of-the-sea", "Wrath of the Sea", "A bonus action.", { actionTiming: "bonus" }),
    ]);
    const cardInput = {
      classData: druid,
      subclassData: sea,
      level: 3,
      subclassFeatureChoices: {},
      weaponMasteryPicks: [],
      contributions: collectClassFeatureContributions("druid", 3),
      abilityModifiers: { str: 0, dex: 0, con: 0, int: 0, wis: 2, cha: 0 },
      formatMeta: (key: string, params?: Record<string, string | number>) => `${key}:${JSON.stringify(params ?? {})}`,
      weaponLabel: (_key: string, fallback: string) => fallback,
      masteryLabel: (mastery: string) => mastery,
    };
    expect(buildClassFeatureCards(cardInput).some((card) => card.featureKey === "wrath-of-the-sea")).toBe(false);
    expect(
      buildClassFeatureActionCards(cardInput).bonus.some((card) => card.traitSlug === "wrath-of-the-sea"),
    ).toBe(true);
  });

  it("builds Star Map and Starry Form combat cards with map-form and constellation pickers", () => {
    const druid = findByKey(CLASSES, "druid")!;
    const stars = mechanismSubclass("druid", "circle-of-stars", [
      feature("star-map", "Star Map", "You can cast Guiding Bolt.", {
        effects: [
          {
            type: "choose_feature_option",
            choiceKey: "star-map-form",
            options: ["scroll", "stone-tablet", "owlbear-hide", "map-collection", "crystal", "glass-disk"].map(
              (key) => ({ key, name: key, desc: key === "crystal" ? "Guiding Bolt" : key }),
            ),
          },
        ],
      }),
      feature("starry-form", "Starry Form", "A constellation.", {
        effects: [
          {
            type: "choose_feature_option",
            choiceKey: "starry-form",
            options: [
              { key: "archer", name: "Archer", desc: "Radiant damage" },
              { key: "chalice", name: "Chalice", desc: "Healing" },
              { key: "dragon", name: "Dragon", desc: "Flight" },
            ],
          },
        ],
      }),
    ]);
    const cardInput = {
      classData: druid,
      subclassData: stars,
      level: 3,
      subclassFeatureChoices: { "star-map-form": "crystal", "starry-form": "archer" },
      weaponMasteryPicks: [],
      contributions: collectClassFeatureContributions("druid", 3),
      abilityModifiers: { str: 0, dex: 0, con: 0, int: 0, wis: 2, cha: 0 },
      formatMeta: (key: string, params?: Record<string, string | number>) => `${key}:${JSON.stringify(params ?? {})}`,
      weaponLabel: (_key: string, fallback: string) => fallback,
      masteryLabel: (mastery: string) => mastery,
    };
    const starMap = buildClassFeatureCards(cardInput).find((card) => card.featureKey === "star-map");
    expect(starMap?.choice?.choiceKey).toBe("star-map-form");
    expect(starMap?.choice?.options.map((option) => option.key)).toEqual([
      "scroll",
      "stone-tablet",
      "owlbear-hide",
      "map-collection",
      "crystal",
      "glass-disk",
    ]);
    expect(starMap?.description).toContain("Guiding Bolt");

    const starryForm = buildClassFeatureCards(cardInput).find((card) => card.featureKey === "starry-form");
    expect(starryForm?.choice?.choiceKey).toBe("starry-form");
    expect(starryForm?.choice?.selectedOptionKey).toBe("archer");
    expect(starryForm?.description).toContain("Radiant damage");
    expect(subclassFeatureChoiceOptions(stars, "starry-form").length).toBeGreaterThan(0);
    expect(
      subclassFeatureChoiceOptions(stars, "starry-form").every(
        (option) => option.key === "archer" || option.key === "chalice" || option.key === "dragon",
      ),
    ).toBe(true);
  });

  it("includes monk class feature cards with save DC and martial arts die meta", () => {
    const monk = findByKey(CLASSES, "monk")!;
    const cards = buildClassFeatureCards({
      classData: monk,
      level: 2,
      weaponMasteryPicks: [],
      contributions: collectClassFeatureContributions("monk", 2),
      abilityModifiers: defaultAbilityModifiers,
      formatMeta: (key, params) => `${key}:${JSON.stringify(params ?? {})}`,
      weaponLabel: (_key, fallback) => fallback,
      masteryLabel: (mastery) => mastery,
    });
    expect(cards.some((card) => card.featureKey === "martial-arts")).toBe(true);
    expect(cards.some((card) => card.featureKey === "unarmored-defense")).toBe(true);
    expect(cards.some((card) => card.featureKey === "monks-focus")).toBe(true);
    expect(cards.some((card) => card.featureKey === "uncanny-metabolism")).toBe(true);
    expect(cards.find((card) => card.featureKey === "martial-arts")?.meta).toContain("1d6");
    expect(cards.find((card) => card.featureKey === "monks-focus")?.meta).toContain("12");
    expect(cards.some((card) => card.featureKey === "flurry-of-blows")).toBe(false);
    expect(cards.some((card) => card.featureKey === "patient-defense")).toBe(false);
    expect(cards.some((card) => card.featureKey === "step-of-the-wind")).toBe(false);

    const trackers = buildClassFeatureUseTrackers(monk, 2, defaultAbilityModifiers);
    expect(trackers.find((tracker) => tracker.featureKey === "monks-focus")?.maxUses).toBe(2);
    expect(trackers.find((tracker) => tracker.featureKey === "monks-focus")?.restRecovery).toBe("short");
    expect(trackers.find((tracker) => tracker.featureKey === "uncanny-metabolism")?.maxUses).toBe(1);

    const monksFocusCard = cards.find((card) => card.featureKey === "monks-focus");
    expect(monksFocusCard?.useTrackerClassFeatureKey).toBe("monks-focus");
    expect(
      buildClassFeatureUseTrackers(monk, 2, defaultAbilityModifiers, null, "combat", {}, {
        excludeEmbeddedOnCard: true,
      }).some((tracker) => tracker.featureKey === "monks-focus"),
    ).toBe(false);

    const actions = buildClassFeatureActionCards({
      classData: monk,
      level: 2,
      weaponMasteryPicks: [],
      contributions: collectClassFeatureContributions("monk", 2),
      abilityModifiers: defaultAbilityModifiers,
      formatMeta: (key, params) => `${key}:${JSON.stringify(params ?? {})}`,
      weaponLabel: (_key, fallback) => fallback,
      masteryLabel: (mastery) => mastery,
    });
    expect(actions.bonus.map((card) => card.traitSlug)).toEqual(
      expect.arrayContaining(["flurry-of-blows", "patient-defense", "step-of-the-wind"]),
    );
    expect(actions.bonus.some((card) => card.traitSlug === "monks-focus")).toBe(false);

    const level1Actions = buildClassFeatureActionCards({
      classData: monk,
      level: 1,
      weaponMasteryPicks: [],
      contributions: collectClassFeatureContributions("monk", 1),
      abilityModifiers: defaultAbilityModifiers,
      formatMeta: (key, params) => `${key}:${JSON.stringify(params ?? {})}`,
      weaponLabel: (_key, fallback) => fallback,
      masteryLabel: (mastery) => mastery,
    });
    expect(level1Actions.bonus.some((card) => card.traitSlug === "flurry-of-blows")).toBe(false);
  });
});

describe("resolveLimitedUses", () => {
  const mods = { str: 0, dex: 0, con: 0, int: 0, wis: 2, cha: -1 };

  it("resolves fixed uses", () => {
    expect(resolveLimitedUses({ kind: "fixed", uses: 2 }, { level: 1, abilityModifiers: mods })).toBe(2);
  });

  it("resolves ability-mod uses with a minimum of 1", () => {
    expect(resolveLimitedUses({ kind: "abilityMod", ability: "cha" }, { level: 1, abilityModifiers: mods })).toBe(1);
    expect(
      resolveLimitedUses({ kind: "abilityMod", ability: "cha", plus: 1 }, { level: 1, abilityModifiers: mods }),
    ).toBe(1);
  });

  it("resolves level-times uses", () => {
    expect(resolveLimitedUses({ kind: "levelTimes", multiplier: 5 }, { level: 1, abilityModifiers: mods })).toBe(5);
  });
});

describe("bardicInspirationDieSides", () => {
  it("scales with bard level", () => {
    expect(bardicInspirationDieSides(1)).toBe(6);
    expect(bardicInspirationDieSides(4)).toBe(6);
    expect(bardicInspirationDieSides(5)).toBe(8);
    expect(bardicInspirationDieSides(9)).toBe(8);
    expect(bardicInspirationDieSides(10)).toBe(10);
    expect(bardicInspirationDieSides(14)).toBe(10);
    expect(bardicInspirationDieSides(15)).toBe(12);
    expect(bardicInspirationDieSides(20)).toBe(12);
  });
});

describe("buildClassFeatureUseTrackers", () => {
  it("includes second wind for a fighter", () => {
    const fighter = findByKey(CLASSES, "fighter")!;
    const trackers = buildClassFeatureUseTrackers(fighter, 1, {
      str: 0,
      dex: 0,
      con: 0,
      int: 0,
      wis: 0,
      cha: 0,
    });
    expect(trackers.some((tracker) => tracker.featureKey === "second-wind" && tracker.maxUses === 2)).toBe(true);
  });

  it("gives fighter three second wind uses at level 4", () => {
    const fighter = findByKey(CLASSES, "fighter")!;
    const trackers = buildClassFeatureUseTrackers(fighter, 4, {
      str: 0,
      dex: 0,
      con: 0,
      int: 0,
      wis: 0,
      cha: 0,
    });
    expect(trackers.find((tracker) => tracker.featureKey === "second-wind")?.maxUses).toBe(3);
    expect(collectClassFeatureContributions("fighter", 4).secondWindUses).toBe(3);
  });

  it("grants three rage uses to a level 3 barbarian", () => {
    const barbarian = findByKey(CLASSES, "barbarian")!;
    const trackers = buildClassFeatureUseTrackers(barbarian, 3, {
      str: 0,
      dex: 0,
      con: 0,
      int: 0,
      wis: 0,
      cha: 0,
    });
    expect(trackers.find((tracker) => tracker.featureKey === "rage")?.maxUses).toBe(3);
  });

  it("includes Hunter's Prey for a level 3 Hunter ranger", () => {
    const ranger = findByKey(CLASSES, "ranger")!;
    const hunter = findSubclass("ranger", "hunter")!;
    const trackers = buildClassFeatureUseTrackers(
      ranger,
      3,
      { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
      hunter,
    );
    const prey = trackers.find((tracker) => tracker.featureKey === "hunters-prey");
    expect(prey?.maxUses).toBe(1);
    expect(prey?.catalogEntityKey).toBe("ranger.subclass.hunter.feature.hunters-prey");
  });

  it("includes channel divinity for a level 2 cleric", () => {
    const cleric = findByKey(CLASSES, "cleric")!;
    const trackers = buildClassFeatureUseTrackers(cleric, 2, {
      str: 0,
      dex: 0,
      con: 0,
      int: 0,
      wis: 0,
      cha: 0,
    });
    const channelDivinity = trackers.find((tracker) => tracker.featureKey === "channel-divinity");
    expect(channelDivinity?.maxUses).toBe(2);
  });
});

describe("mastery riders", () => {
  it("deduplicates masteries from picks", () => {
    expect(uniqueMasteriesFromPicks(["shortsword", "scimitar"])).toEqual(["Vex", "Nick"]);
  });

  it("builds rider cards without the generic weapon mastery feature card", () => {
    const rogue = findByKey(CLASSES, "rogue")!;
    const cards = buildClassFeatureCards({
      classData: rogue,
      level: 1,
      weaponMasteryPicks: ["shortsword", "scimitar"],
      contributions: collectClassFeatureContributions("rogue", 1),
      abilityModifiers: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
      formatMeta: (key, params) => `${key}:${JSON.stringify(params ?? {})}`,
      weaponLabel: (_key, fallback) => fallback,
      masteryLabel: (mastery) => mastery,
    });
    expect(cards.some((card) => card.featureKey === "weapon-mastery")).toBe(false);
    expect(cards.some((card) => card.featureKey === "sneak-attack")).toBe(true);

    const riders = buildMasteryRiderCards(
      ["shortsword", "scimitar"],
      (mastery) => mastery,
      (mastery) => `${mastery} rider`,
    );
    expect(riders.map((card) => card.mastery)).toEqual(["Vex", "Nick"]);
    expect(riders.every((card) => card.description.endsWith(" rider"))).toBe(true);
  });

  it("shows an empty prompt when mastery slots are unfilled", () => {
    const prompt = buildWeaponMasteryEmptyPrompt(
      ["fighter"],
      ["", "", ""],
      collectMulticlassClassFeatureContributions({
        classLevels: resolvedClassLevels(["fighter"]),
      }),
    );
    expect(prompt).toEqual({ count: 3 });
  });
});

describe("buildClassFeatureActionCards", () => {
  it("places monk slow fall in reactions at level 4", () => {
    const monk = findByKey(CLASSES, "monk")!;
    const cards = buildClassFeatureActionCards({
      classData: monk,
      level: 4,
      weaponMasteryPicks: [],
      contributions: collectClassFeatureContributions("monk", 4),
      abilityModifiers: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
      formatMeta: (key, params) => `${key}:${JSON.stringify(params ?? {})}`,
      weaponLabel: (_key, fallback) => fallback,
      masteryLabel: (mastery) => mastery,
    });
    expect(cards.reaction.some((card) => card.traitSlug === "slow-fall")).toBe(true);
  });

  it("places second wind in bonus actions for a fighter", () => {
    const fighter = findByKey(CLASSES, "fighter")!;
    const abilityModifiers = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
    const cards = buildClassFeatureActionCards({
      classData: fighter,
      level: 1,
      weaponMasteryPicks: [],
      contributions: collectClassFeatureContributions("fighter", 1),
      abilityModifiers,
      formatMeta: (key, params) => `${key}:${JSON.stringify(params ?? {})}`,
      weaponLabel: (_key, fallback) => fallback,
      masteryLabel: (mastery) => mastery,
    });
    const secondWind = cards.bonus.find((card) => card.traitSlug === "second-wind");
    expect(secondWind?.useTrackerClassFeatureKey).toBe("second-wind");
    expect(cards.action).toHaveLength(0);

    const trackers = buildClassFeatureUseTrackers(fighter, 1, abilityModifiers);
    expect(trackers.find((tracker) => tracker.featureKey === "second-wind")?.restRecovery).toBe("shortOne");
    expect(
      buildClassFeatureUseTrackers(fighter, 1, abilityModifiers, null, "combat", {}, {
        excludeEmbeddedOnCard: true,
      }).some((tracker) => tracker.featureKey === "second-wind"),
    ).toBe(false);
  });

  it("embeds lay on hands on the bonus action card for a paladin", () => {
    const paladin = findByKey(CLASSES, "paladin")!;
    const abilityModifiers = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
    const cards = buildClassFeatureActionCards({
      classData: paladin,
      level: 3,
      weaponMasteryPicks: [],
      contributions: collectClassFeatureContributions("paladin", 3),
      abilityModifiers,
      formatMeta: (key, params) => `${key}:${JSON.stringify(params ?? {})}`,
      weaponLabel: (_key, fallback) => fallback,
      masteryLabel: (mastery) => mastery,
    });
    const layOnHands = cards.bonus.find((card) => card.traitSlug === "lay-on-hands");
    expect(layOnHands?.useTrackerClassFeatureKey).toBe("lay-on-hands");

    const trackers = buildClassFeatureUseTrackers(paladin, 3, abilityModifiers);
    expect(trackers.find((tracker) => tracker.featureKey === "lay-on-hands")?.maxUses).toBe(15);
    expect(trackers.find((tracker) => tracker.featureKey === "lay-on-hands")?.restRecovery).toBe("long");
    expect(
      buildClassFeatureUseTrackers(paladin, 3, abilityModifiers, null, "combat", {}, {
        excludeEmbeddedOnCard: true,
      }).some((tracker) => tracker.featureKey === "lay-on-hands"),
    ).toBe(false);
  });

  it("embeds action surge on the bonus action card at fighter level 2", () => {
    const fighter = findByKey(CLASSES, "fighter")!;
    const abilityModifiers = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
    const cards = buildClassFeatureActionCards({
      classData: fighter,
      level: 2,
      weaponMasteryPicks: [],
      contributions: collectClassFeatureContributions("fighter", 2),
      abilityModifiers,
      formatMeta: (key, params) => `${key}:${JSON.stringify(params ?? {})}`,
      weaponLabel: (_key, fallback) => fallback,
      masteryLabel: (mastery) => mastery,
    });
    const actionSurge = cards.bonus.find((card) => card.traitSlug === "action-surge");
    expect(actionSurge?.useTrackerClassFeatureKey).toBe("action-surge");
    expect(
      buildClassFeatureUseTrackers(fighter, 2, abilityModifiers, null, "combat", {}, {
        excludeEmbeddedOnCard: true,
      }).some((tracker) => tracker.featureKey === "action-surge"),
    ).toBe(false);
  });
});

describe("buildCombatActions class features", () => {
  it("includes second wind in bonus actions for a fighter", () => {
    const fighter = findByKey(CLASSES, "fighter")!;
    const input = {
      classData: fighter,
      level: 1,
      weaponMasteryPicks: [] as string[],
      contributions: collectClassFeatureContributions("fighter", 1),
      abilityModifiers: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
      formatMeta: (key: string) => key,
      weaponLabel: (_key: string, fallback: string) => fallback,
      masteryLabel: (mastery: string) => mastery,
    };
    const actions = buildCombatActions({
      speciesKey: null,
      weapons: [{ id: "w1", key: "dagger" }],
      abilityModifiers: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
      feats: [],
      speciesFeatureActions: { action: [], bonus: [], reaction: [] },
      classFeatureActions: buildClassFeatureActionCards(input),
    });
    expect(actions.bonusActions.some((card) => card.traitSlug === "second-wind")).toBe(true);
    const bonusIds = actions.bonusActions.map((card) => card.id);
    expect(bonusIds.indexOf("class-feature-fighter-second-wind")).toBeLessThan(bonusIds.indexOf("light-extra-attack"));
  });
});

describe("fighting style feat prerequisites", () => {
  it("allows archery for fighter at level 1", () => {
    const character = { ...INITIAL_CHARACTER, classKey: "fighter", level: 1 };
    const classData = findByKey(CLASSES, "fighter");
    expect(evaluateFeatPrerequisites("archery", character, classData).met).toBe(true);
  });

  it("blocks archery for paladin at level 1", () => {
    const character = { ...INITIAL_CHARACTER, classKey: "paladin", level: 1 };
    const classData = findByKey(CLASSES, "paladin");
    expect(evaluateFeatPrerequisites("archery", character, classData).met).toBe(false);
  });
});

describe("fighting style feat options", () => {
  it("lists class-specific fighting style feats", () => {
    const fighterStyles = fightingStyleFeatOptionsForClass("fighter");
    expect(fighterStyles).toEqual(
      expect.arrayContaining(["archery", "defense", "great-weapon-fighting", "two-weapon-fighting"]),
    );
    expect(fighterStyles).not.toContain("blessed-warrior");
    expect(fighterStyles).not.toContain("druidic-warrior");

    const paladinStyles = fightingStyleFeatOptionsForClass("paladin");
    expect(paladinStyles).toEqual(
      expect.arrayContaining(["defense", "great-weapon-fighting", "two-weapon-fighting", "blessed-warrior"]),
    );
    expect(paladinStyles).not.toContain("druidic-warrior");

    const rangerStyles = fightingStyleFeatOptionsForClass("ranger");
    expect(rangerStyles).toEqual(
      expect.arrayContaining(["archery", "defense", "two-weapon-fighting", "druidic-warrior"]),
    );
  });

  it("reports the level fighting style is granted", () => {
    expect(fightingStyleGrantedAtLevel("fighter")).toBe(1);
    expect(fightingStyleGrantedAtLevel("paladin")).toBe(2);
    expect(fightingStyleGrantedAtLevel("ranger")).toBe(2);
  });
});

describe("unarmored defense", () => {
  it("raises barbarian AC without armor", () => {
    const ac = computeArmorClass(2, [], 0, ["con"], { str: 0, dex: 2, con: 3, int: 0, wis: 0, cha: 0 });
    expect(ac).toBe(15);
  });

  it("raises monk AC without armor or shield", () => {
    const ac = computeArmorClass(3, [], 0, ["wis"], { str: 0, dex: 3, con: 0, int: 0, wis: 2, cha: 0 });
    expect(ac).toBe(15);
  });
});

describe("weapon proficiency and mastery eligibility", () => {
  const longbow = WEAPONS.find((weapon) => weapon.key === "longbow")!;
  const greataxe = WEAPONS.find((weapon) => weapon.key === "greataxe")!;
  const dagger = WEAPONS.find((weapon) => weapon.key === "dagger")!;
  const battleaxe = WEAPONS.find((weapon) => weapon.key === "battleaxe")!;
  const fighter = findByKey(CLASSES, "fighter")!;
  const barbarian = findByKey(CLASSES, "barbarian")!;
  const rogue = findByKey(CLASSES, "rogue")!;
  const wizard = findByKey(CLASSES, "wizard")!;

  it("grants fighter proficiency in martial ranged weapons", () => {
    expect(classHasWeaponProficiency(fighter, longbow)).toBe(true);
  });

  it("allows fighter to master a martial ranged weapon", () => {
    expect(weaponEligibleForMastery(longbow, fighter, false)).toBe(true);
  });

  it("blocks barbarian from mastering martial ranged weapons", () => {
    expect(classHasWeaponProficiency(barbarian, longbow)).toBe(true);
    expect(weaponEligibleForMastery(longbow, barbarian, true)).toBe(false);
  });

  it("allows barbarian to master martial melee weapons", () => {
    expect(weaponEligibleForMastery(greataxe, barbarian, true)).toBe(true);
  });

  it("allows rogue to master simple weapons", () => {
    expect(weaponEligibleForMastery(dagger, rogue, false)).toBe(true);
  });

  it("blocks rogue from mastering non-finesse non-light martial weapons", () => {
    expect(classHasWeaponProficiency(rogue, battleaxe)).toBe(false);
    expect(weaponEligibleForMastery(battleaxe, rogue, false)).toBe(false);
  });

  it("gives wizard simple weapon proficiency but no weapon mastery feature", () => {
    expect(classHasWeaponProficiency(wizard, dagger)).toBe(true);
    expect(collectClassFeatureContributions("wizard", 1).weaponMasteryCount).toBe(0);
  });
});

describe("wizard class feature cards", () => {
  const wizard = findByKey(CLASSES, "wizard")!;
  const cardInput = {
    classData: wizard,
    level: 1,
    weaponMasteryPicks: [] as string[],
    contributions: collectClassFeatureContributions("wizard", 1),
    abilityModifiers: { str: 0, dex: 0, con: 0, int: 3, wis: 0, cha: 0 },
    formatMeta: (key: string, params?: Record<string, string | number>) => `${key}:${JSON.stringify(params ?? {})}`,
    weaponLabel: (_key: string, fallback: string) => fallback,
    masteryLabel: (mastery: string) => mastery,
  };

  it("shows Ritual Adept and Arcane Recovery on the Combat Class Features tab at level 1", () => {
    const cards = buildClassFeatureCards(cardInput);
    expect(cards.some((card) => card.featureKey === "ritual-adept")).toBe(true);
    expect(cards.some((card) => card.featureKey === "arcane-recovery")).toBe(true);
  });

  it("tracks Arcane Recovery uses once per long rest at level 1", () => {
    const trackers = buildClassFeatureUseTrackers(wizard, 1, cardInput.abilityModifiers);
    expect(trackers.some((tracker) => tracker.featureKey === "arcane-recovery" && tracker.maxUses === 1)).toBe(
      true,
    );
  });

  it("embeds Arcane Recovery uses on the feature card instead of the stat row", () => {
    const card = buildClassFeatureCards(cardInput).find((entry) => entry.featureKey === "arcane-recovery");
    expect(card?.useTrackerClassFeatureKey).toBe("arcane-recovery");
    expect(
      buildClassFeatureUseTrackers(wizard, 1, cardInput.abilityModifiers, null, "combat", {}, {
        excludeEmbeddedOnCard: true,
      }).some((tracker) => tracker.featureKey === "arcane-recovery"),
    ).toBe(false);
  });

  it("shows Potent Cantrip for a level 3 Evoker", () => {
    const evoker = findSubclass("wizard", "evoker");
    const cards = buildClassFeatureCards({
      ...cardInput,
      level: 3,
      subclassData: evoker,
      contributions: collectClassFeatureContributions("wizard", 3, "evoker"),
    });
    expect(cards.some((card) => card.featureKey === "potent-cantrip")).toBe(true);
  });
});

describe("bard class feature cards", () => {
  const bard = findByKey(CLASSES, "bard")!;
  const cardInput = {
    classData: bard,
    level: 5,
    weaponMasteryPicks: [] as string[],
    contributions: collectClassFeatureContributions("bard", 5),
    abilityModifiers: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 3 },
    formatMeta: (key: string, params?: Record<string, string | number>) => `${key}:${JSON.stringify(params ?? {})}`,
    weaponLabel: (_key: string, fallback: string) => fallback,
    masteryLabel: (mastery: string) => mastery,
  };

  it("omits Bardic Inspiration from the class features description block", () => {
    const cards = buildClassFeatureCards(cardInput);
    expect(cards.some((card) => card.featureKey === "bardic-inspiration")).toBe(false);
  });

  it("embeds Bardic Inspiration uses on the bonus action card instead of the stat row", () => {
    const bonusCard = buildClassFeatureActionCards(cardInput).bonus.find(
      (card) => card.traitSlug === "bardic-inspiration",
    );
    expect(bonusCard).toBeDefined();
    expect(bonusCard?.useTrackerClassFeatureKey).toBe("bardic-inspiration");
    expect(
      buildClassFeatureUseTrackers(bard, 5, cardInput.abilityModifiers, null, "combat", {}, {
        excludeEmbeddedOnCard: true,
      }).some((tracker) => tracker.featureKey === "bardic-inspiration"),
    ).toBe(false);
  });
});

describe("weapon mastery picks", () => {
  function withScores(state: typeof INITIAL_CHARACTER, overrides: Partial<Record<string, number>>) {
    let next = state;
    for (const [ability, value] of Object.entries(overrides)) {
      if (value === undefined) continue;
      next = characterReducer(next, {
        type: "SET_ABILITY_SCORE",
        ability: ability as "str",
        value,
      });
    }
    return next;
  }

  it("resets mastery picks when class changes", () => {
    const withFighter = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "fighter" });
    expect(withFighter.weaponMasteryPicks).toHaveLength(3);
    const withRogue = characterReducer(withFighter, { type: "SET_CLASS", key: "rogue" });
    expect(withRogue.weaponMasteryPicks).toHaveLength(2);
    const withWizard = characterReducer(withRogue, { type: "SET_CLASS", key: "wizard" });
    expect(withWizard.weaponMasteryPicks).toHaveLength(0);
  });

  it("scales fighter weapon mastery to four picks at level 4", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "fighter" });
    for (let level = 1; level < 4; level += 1) {
      state = characterReducer(state, { type: "LEVEL_UP" });
    }
    expect(collectClassFeatureContributions("fighter", 4).weaponMasteryCount).toBe(4);
    expect(state.weaponMasteryPicks).toHaveLength(4);
  });

  it("scales barbarian weapon mastery to three picks at level 4", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "barbarian" });
    for (let level = 1; level < 4; level += 1) {
      state = characterReducer(state, { type: "LEVEL_UP" });
    }
    expect(collectClassFeatureContributions("barbarian", 4).weaponMasteryCount).toBe(3);
    expect(state.weaponMasteryPicks).toHaveLength(3);
    expect(state.weaponMasteryPicksByClass.barbarian).toHaveLength(3);
  });

  it("allocates per-class weapon mastery picks when multiclassing fighter 2 / barbarian 1", () => {
    let state = withScores(characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "fighter" }), {
      str: 15,
    });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "LEVEL_UP_CLASS", classKey: "barbarian" });
    expect(state.weaponMasteryPicksByClass.fighter).toHaveLength(3);
    expect(state.weaponMasteryPicksByClass.barbarian).toHaveLength(2);
    expect(state.weaponMasteryPicks).toHaveLength(5);
  });

  it("applies barbarian melee-only restriction only to barbarian mastery slots", () => {
    let state = withScores(characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "fighter" }), {
      str: 15,
    });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "LEVEL_UP_CLASS", classKey: "barbarian" });
    state = characterReducer(state, {
      type: "SET_WEAPON_MASTERY_PICK",
      classKey: "barbarian",
      index: 0,
      weaponKey: "longbow",
    });
    expect(state.weaponMasteryPicksByClass.barbarian[0]).toBe("");
    state = characterReducer(state, {
      type: "SET_WEAPON_MASTERY_PICK",
      classKey: "fighter",
      index: 0,
      weaponKey: "longbow",
    });
    expect(state.weaponMasteryPicksByClass.fighter[0]).toBe("longbow");
  });

  it("does not melee-lock fighter slots when barbarian is the primary class", () => {
    let state = withScores(characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "barbarian" }), {
      str: 15,
    });
    state = characterReducer(state, { type: "LEVEL_UP_CLASS", classKey: "fighter" });
    state = characterReducer(state, {
      type: "SET_WEAPON_MASTERY_PICK",
      classKey: "fighter",
      index: 0,
      weaponKey: "longbow",
    });
    expect(state.weaponMasteryPicksByClass.fighter[0]).toBe("longbow");
  });

  it("drops dipped class mastery picks on REVERT_LAST_LEVEL", () => {
    let state = withScores(characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "fighter" }), {
      str: 15,
    });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "LEVEL_UP_CLASS", classKey: "barbarian" });
    state = characterReducer(state, {
      type: "SET_WEAPON_MASTERY_PICK",
      classKey: "barbarian",
      index: 0,
      weaponKey: "greataxe",
    });
    state = characterReducer(state, { type: "REVERT_LAST_LEVEL" });
    expect(state.weaponMasteryPicksByClass.barbarian).toBeUndefined();
    expect(state.weaponMasteryPicks).toHaveLength(3);
  });

  it("hydrates legacy weaponMasteryPicks into the primary class bucket", () => {
    const hydrated = hydrateCharacter({
      classKey: "rogue",
      level: 1,
      weaponMasteryPicks: ["dagger", "shortsword"],
    });
    expect(hydrated.weaponMasteryPicksByClass.rogue).toEqual(["dagger", "shortsword"]);
  });

  it("flattens per-class pick slots in level-path order", () => {
    const flattened = flattenWeaponMasteryPicks(["fighter", "barbarian"], {
      fighter: ["longsword", "", "rapier"],
      barbarian: ["greataxe", "handaxe"],
    });
    expect(flattened).toEqual(["longsword", "", "rapier", "greataxe", "handaxe"]);
    expect(flattened.filter(Boolean)).toEqual(["longsword", "rapier", "greataxe", "handaxe"]);
  });
});

describe("computeDerivedStats class features", () => {
  it("derives sneak attack for rogue", () => {
    const derived = computeDerivedStats({ ...INITIAL_CHARACTER, classKey: "rogue" });
    expect(derived.classFeatureContributions.sneakAttackDice).toBe("1d6");
    expect(derived.activeClassFeatures.some((feature) => feature.key === "sneak-attack")).toBe(true);
  });

  it("merges species darkvision and grant-or-increase", () => {
    const human = computeDerivedStats({ ...INITIAL_CHARACTER, speciesKey: "human", classKey: "monk", level: 3 });
    expect(human.darkvisionFeet).toBe(0);

    const tiefling = computeDerivedStats({
      ...INITIAL_CHARACTER,
      speciesKey: "tiefling",
      classKey: "monk",
      level: 3,
    });
    expect(tiefling.darkvisionFeet).toBe(60);

    expect(mergeDarkvisionFeet(0, 0, 60)).toBe(60);
    expect(mergeDarkvisionFeet(60, 0, 60)).toBe(120);
  });

  it("adds Aura of Protection to all saving throws at paladin level 6", () => {
    const base = {
      ...INITIAL_CHARACTER,
      classKey: "paladin",
      abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 14 },
    };
    const atFive = computeDerivedStats({ ...base, level: 5 });
    const atSix = computeDerivedStats({ ...base, level: 6 });
    for (const id of ["str", "dex", "con", "int", "wis", "cha"] as const) {
      expect(atSix.savingThrows[id].modifier).toBe(atFive.savingThrows[id].modifier + 2);
    }
  });

  it("adds Roving walk bonus and climb/swim equal to walk", () => {
    const derived = computeDerivedStats({
      ...INITIAL_CHARACTER,
      speciesKey: "human",
      classKey: "ranger",
      level: 6,
    });
    expect(derived.speeds.find((speed) => speed.type === "walk")?.feet).toBe(40);
    expect(derived.speeds.find((speed) => speed.type === "climb")?.feet).toBe(40);
    expect(derived.speeds.find((speed) => speed.type === "swim")?.feet).toBe(40);
  });
});

describe("buildCombatActions weapon mastery", () => {
  it("annotates mastered owned weapons", () => {
    const actions = buildCombatActions({
      speciesKey: null,
      weapons: [{ id: "w1", key: "dagger" }],
      abilityModifiers: { str: 0, dex: 2, con: 0, int: 0, wis: 0, cha: 0 },
      feats: [],
      speciesFeatureActions: { action: [], bonus: [], reaction: [] },
      weaponMasteryPicks: ["dagger"],
    });
    const daggerCard = actions.actions.find((card) => card.entityKey === "dagger");
    expect(daggerCard?.description).toContain("Mastery: Nick");
  });
});

describe("sorcerer spell surfaces", () => {
  const defaultAbilityModifiers = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 2 };
  const sorcerer = findByKey(CLASSES, "sorcerer")!;

  it("shows Font of Magic on Spells trackers only and as a Combat description card", () => {
    const cards = buildClassFeatureCards({
      classData: sorcerer,
      level: 2,
      weaponMasteryPicks: [],
      contributions: collectClassFeatureContributions("sorcerer", 2),
      abilityModifiers: defaultAbilityModifiers,
      formatMeta: (key, params) => `${key}:${JSON.stringify(params ?? {})}`,
      weaponLabel: (_key, fallback) => fallback,
      masteryLabel: (mastery) => mastery,
    });
    expect(cards.some((card) => card.featureKey === FONT_OF_MAGIC_FEATURE_KEY)).toBe(true);

    const combatTrackers = buildClassFeatureUseTrackers(sorcerer, 2, defaultAbilityModifiers, null, "combat");
    const spellTrackers = buildClassFeatureUseTrackers(sorcerer, 2, defaultAbilityModifiers, null, "spells");
    expect(combatTrackers.some((tracker) => tracker.featureKey === FONT_OF_MAGIC_FEATURE_KEY)).toBe(false);
    expect(spellTrackers.find((tracker) => tracker.featureKey === FONT_OF_MAGIC_FEATURE_KEY)?.maxUses).toBe(2);
  });

  it("exposes metamagic multi-picks on the Spells surface", () => {
    const grants = classFeatureOptionPickGrantsForSurface(sorcerer, 2, "spells");
    expect(grants).toHaveLength(1);
    expect(grants[0]?.choiceKey).toBe("metamagic");
    expect(grants[0]?.count).toBe(2);
    expect(grants[0]?.options.length).toBe(10);
  });

  it("includes Draconic Resilience as a subclass class feature card", () => {
    const draconic = findSubclass("sorcerer", "draconic-sorcery")!;
    const cards = buildClassFeatureCards({
      classData: sorcerer,
      subclassData: draconic,
      level: 3,
      weaponMasteryPicks: [],
      contributions: collectClassFeatureContributions("sorcerer", 3, "draconic-sorcery"),
      abilityModifiers: defaultAbilityModifiers,
      formatMeta: (key, params) => `${key}:${JSON.stringify(params ?? {})}`,
      weaponLabel: (_key, fallback) => fallback,
      masteryLabel: (mastery) => mastery,
    });
    const resilience = cards.find((card) => card.featureKey === "draconic-resilience");
    expect(resilience?.catalogEntityKey).toBe("sorcerer.subclass.draconic-sorcery.feature.draconic-resilience");
    expect(resilience?.description).toContain("Charisma");
  });

  it("creates and converts Font of Magic slots", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "sorcerer" });
    state = characterReducer(state, { type: "LEVEL_UP" });

    const created = characterReducer(state, { type: "CREATE_SPELL_SLOT_FROM_SORCERY", spellLevel: 1 });
    expect(created.createdSpellSlots[1]).toBe(1);
    expect(created.classFeatureUses[FONT_OF_MAGIC_FEATURE_KEY]).toBe(0);
    expect(effectiveSpellSlotsByLevel(findByKey(CLASSES, "sorcerer"), 2, created.createdSpellSlots)[1]).toBe(4);

    const spent = characterReducer(created, { type: "SET_SPELL_SLOT_REMAINING", spellLevel: 1, value: 3 });
    const converted = characterReducer(spent, { type: "CONVERT_SPELL_SLOT_TO_SORCERY", spellLevel: 1 });
    expect(converted.classFeatureUses[FONT_OF_MAGIC_FEATURE_KEY]).toBe(1);

    const afterLongRest = applyRest(converted, "long");
    expect(afterLongRest.createdSpellSlots).toEqual({});
    expect(afterLongRest.classFeatureUses).toEqual({});
  });

  it("stores metamagic picks without duplicates", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "sorcerer" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, {
      type: "SET_CLASS_FEATURE_OPTION_PICK",
      choiceKey: "metamagic",
      index: 0,
      optionKey: "quickened-spell",
    });
    const rejected = characterReducer(state, {
      type: "SET_CLASS_FEATURE_OPTION_PICK",
      choiceKey: "metamagic",
      index: 1,
      optionKey: "quickened-spell",
    });
    expect(rejected.classFeatureOptionPicks.metamagic?.[1]).toBeNull();
    const accepted = characterReducer(state, {
      type: "SET_CLASS_FEATURE_OPTION_PICK",
      choiceKey: "metamagic",
      index: 1,
      optionKey: "subtle-spell",
    });
    expect(accepted.classFeatureOptionPicks.metamagic).toEqual(["quickened-spell", "subtle-spell"]);
  });
});

describe("warlock combat surfaces", () => {
  const warlock = findByKey(CLASSES, "warlock")!;
  const defaultAbilityModifiers = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 3 };

  it("shows Magical Cunning as a description card with its tracker", () => {
    const cards = buildClassFeatureCards({
      classData: warlock,
      level: 2,
      weaponMasteryPicks: [],
      contributions: collectClassFeatureContributions("warlock", 2),
      abilityModifiers: defaultAbilityModifiers,
      formatMeta: (key, params) => `${key}:${JSON.stringify(params ?? {})}`,
      weaponLabel: (_key, fallback) => fallback,
      masteryLabel: (mastery) => mastery,
    });
    expect(cards.some((card) => card.featureKey === "magical-cunning")).toBe(true);
    const trackers = buildClassFeatureUseTrackers(warlock, 2, defaultAbilityModifiers, null, "combat");
    expect(trackers.some((tracker) => tracker.featureKey === "magical-cunning")).toBe(true);
  });

  it("shows Dark One's Blessing meta from CHA plus level", () => {
    const fiend = findSubclass("warlock", "fiend-patron")!;
    const cards = buildClassFeatureCards({
      classData: warlock,
      subclassData: fiend,
      level: 3,
      weaponMasteryPicks: [],
      contributions: collectClassFeatureContributions("warlock", 3, "fiend-patron"),
      abilityModifiers: defaultAbilityModifiers,
      formatMeta: (key, params) => `${key}:${JSON.stringify(params ?? {})}`,
      weaponLabel: (_key, fallback) => fallback,
      masteryLabel: (mastery) => mastery,
    });
    const blessing = cards.find((card) => card.featureKey === "dark-ones-blessing");
    expect(blessing?.meta).toContain("6");
  });

  it("shows Steps of the Fey as a description card with reference options, tracker, and bonus action", () => {
    const archfey = mechanismSubclass("warlock", "archfey-patron", [
      feature("steps-of-the-fey", "Steps of the Fey", "You gain the following benefits.", {
        actionTiming: "bonus",
        classFeatureCard: true,
        limitedUses: { kind: "fixed", uses: 1 },
        effects: [
          {
            type: "choose_feature_option",
            choiceKey: "steps-of-the-fey",
            uiSurface: "reference",
            options: [
              { key: "refreshing-step", name: "Refreshing Step", desc: "Temporary Hit Points." },
              { key: "taunting-step", name: "Taunting Step", desc: "A taunt." },
            ],
          },
        ],
      }),
    ]);
    const cardInput = {
      classData: warlock,
      subclassData: archfey,
      level: 3,
      weaponMasteryPicks: [] as string[],
      contributions: collectClassFeatureContributions("warlock", 3),
      abilityModifiers: defaultAbilityModifiers,
      formatMeta: (key: string, params?: Record<string, string | number>) =>
        `${key}:${JSON.stringify(params ?? {})}`,
      weaponLabel: (_key: string, fallback: string) => fallback,
      masteryLabel: (mastery: string) => mastery,
    };
    const cards = buildClassFeatureCards(cardInput);
    const steps = cards.find((card) => card.featureKey === "steps-of-the-fey");
    expect(steps?.choice).toBeUndefined();
    expect(steps?.referenceOptions?.map((option) => option.key)).toEqual(["refreshing-step", "taunting-step"]);
    expect(steps?.description).toContain("following benefits");
    expect(steps?.description).not.toContain("1d10 Temporary Hit Points");
    expect(steps?.referenceOptions?.[0]?.name).toBe("Refreshing Step");
    expect(steps?.referenceOptions?.[1]?.name).toBe("Taunting Step");

    const trackers = buildClassFeatureUseTrackers(
      warlock,
      3,
      defaultAbilityModifiers,
      archfey,
      "combat",
    );
    expect(trackers.some((tracker) => tracker.featureKey === "steps-of-the-fey")).toBe(true);
    const stepsAction = buildClassFeatureActionCards(cardInput).bonus.find(
      (card) => card.traitSlug === "steps-of-the-fey",
    );
    expect(stepsAction).toBeDefined();
    expect(stepsAction?.useTrackerClassFeatureKey).toBeUndefined();
    expect(steps?.useTrackerClassFeatureKey).toBe("steps-of-the-fey");
  });
});

describe("college of glamour combat surfaces", () => {
  const bard = findByKey(CLASSES, "bard")!;
  const glamour = mechanismSubclass("bard", "college-of-glamour", [
    feature("beguiling-magic", "Beguiling Magic", "You charm a creature.", {
      limitedUses: { kind: "fixed", uses: 1 },
      restRecovery: "long",
    }),
  ]);
  const defaultAbilityModifiers = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 2 };
  const cardInput = {
    classData: bard,
    subclassData: glamour,
    level: 3,
    weaponMasteryPicks: [] as string[],
    contributions: collectClassFeatureContributions("bard", 3),
    abilityModifiers: defaultAbilityModifiers,
    formatMeta: (key: string, params?: Record<string, string | number>) =>
      `${key}:${JSON.stringify(params ?? {})}`,
    weaponLabel: (_key: string, fallback: string) => fallback,
    masteryLabel: (mastery: string) => mastery,
  };

  it("shows Beguiling Magic as a description card with a once-per-long-rest tracker", () => {
    const cards = buildClassFeatureCards(cardInput);
    const beguilingCard = cards.find((card) => card.featureKey === "beguiling-magic");
    expect(beguilingCard).toBeDefined();
    expect(beguilingCard?.useTrackerClassFeatureKey).toBe("beguiling-magic");

    const trackers = buildClassFeatureUseTrackers(
      bard,
      3,
      defaultAbilityModifiers,
      glamour,
      "combat",
    );
    const beguiling = trackers.find((tracker) => tracker.featureKey === "beguiling-magic");
    expect(beguiling?.maxUses).toBe(1);
    expect(beguiling?.restRecovery).toBe("long");

    expect(
      buildClassFeatureUseTrackers(bard, 3, defaultAbilityModifiers, glamour, "combat", {}, {
        excludeEmbeddedOnCard: true,
      }).some((tracker) => tracker.featureKey === "beguiling-magic"),
    ).toBe(false);
  });

  it("does not list Beguiling Magic as a standalone action card", () => {
    const actions = buildClassFeatureActionCards(cardInput);
    expect(actions.action.some((card) => card.traitSlug === "beguiling-magic")).toBe(false);
    expect(actions.bonus.some((card) => card.traitSlug === "beguiling-magic")).toBe(false);
    expect(actions.reaction.some((card) => card.traitSlug === "beguiling-magic")).toBe(false);
  });
});

describe("remaining subclass L3 interactions", () => {
  const defaultAbilityModifiers = { str: 0, dex: 2, con: 0, int: 3, wis: 2, cha: 2 };
  const cardInputBase = {
    level: 3,
    weaponMasteryPicks: [] as string[],
    abilityModifiers: defaultAbilityModifiers,
    formatMeta: (key: string, params?: Record<string, string | number>) =>
      `${key}:${JSON.stringify(params ?? {})}`,
    weaponLabel: (_key: string, fallback: string) => fallback,
    masteryLabel: (mastery: string) => mastery,
  };

  it("gives monk DEX+WIS unarmored defense without a shield", () => {
    const contributions = collectClassFeatureContributions("monk", 3);
    expect(contributions.unarmoredDefenseAbilities).toEqual(["wis"]);
    expect(contributions.unarmoredDefenseDisallowShield).toBe(true);

    const ac = computeArmorClass(
      2,
      [],
      0,
      contributions.unarmoredDefenseAbilities,
      defaultAbilityModifiers,
      contributions.unarmoredDefenseDisallowShield,
    );
    expect(ac).toBe(14);
  });

  it("grants draconic resilience CHA unarmored defense with shields allowed", () => {
    const contributions = collectClassFeatureContributions("sorcerer", 3, "draconic-sorcery");
    expect(contributions.unarmoredDefenseAbilities).toEqual(["cha"]);
    expect(contributions.unarmoredDefenseDisallowShield).toBe(false);
  });

  it("lists elemental smite options on the combat card without a stored pick", () => {
    const paladin = findByKey(CLASSES, "paladin")!;
    const genies = mechanismSubclass("paladin", "elemental-smite-fixture", [
      feature("elemental-smite", "Elemental Smite", "Expend Channel Divinity.", {
        effects: [
          {
            type: "choose_feature_option",
            choiceKey: "elemental-smite",
            uiSurface: "reference",
            options: [
              { key: "daos-crush", name: "Dao's Crush", desc: "Bludgeoning." },
              { key: "djinnis-escape", name: "Djinni's Escape", desc: "Escape." },
              { key: "efreetis-fury", name: "Efreeti's Fury", desc: "Fire." },
              { key: "marids-surge", name: "Marid's Surge", desc: "Cold." },
            ],
          },
        ],
      }),
    ]);
    const cards = buildClassFeatureCards({
      ...cardInputBase,
      classData: paladin,
      subclassData: genies,
      subclassFeatureChoices: {},
      contributions: collectClassFeatureContributions("paladin", 3),
    });
    const smite = cards.find((card) => card.featureKey === "elemental-smite");
    expect(smite?.choice).toBeUndefined();
    expect(smite?.referenceOptions?.map((option) => option.key)).toEqual([
      "daos-crush",
      "djinnis-escape",
      "efreetis-fury",
      "marids-surge",
    ]);
    expect(smite?.description).toContain("Channel Divinity");
    expect(smite?.referenceOptions?.[2]?.name).toBe("Efreeti's Fury");
  });

  it("lists elemental attunement benefits on the combat card without a stored pick", () => {
    const monk = findByKey(CLASSES, "monk")!;
    const elements = mechanismSubclass("monk", "elemental-attunement-fixture", [
      feature("elemental-attunement", "Elemental Attunement", "You gain the following benefits.", {
        effects: [
          {
            type: "choose_feature_option",
            choiceKey: "elemental-attunement",
            uiSurface: "reference",
            options: [
              { key: "reach", name: "Reach", desc: "Your reach grows." },
              {
                key: "elemental-strikes",
                name: "Elemental Strikes",
                desc: "Acid, Cold, Fire, Lightning, or Thunder",
              },
            ],
          },
        ],
      }),
    ]);
    const cards = buildClassFeatureCards({
      ...cardInputBase,
      classData: monk,
      subclassData: elements,
      subclassFeatureChoices: {},
      contributions: collectClassFeatureContributions("monk", 3),
    });
    const attunement = cards.find((card) => card.featureKey === "elemental-attunement");
    expect(attunement?.choice).toBeUndefined();
    expect(attunement?.referenceOptions?.map((option) => option.key)).toEqual(["reach", "elemental-strikes"]);
    expect(attunement?.description).toContain("following benefits");
    expect(attunement?.description).not.toContain("10 feet greater");
    expect(attunement?.referenceOptions?.[0]?.name).toBe("Reach");
    expect(attunement?.referenceOptions?.[1]?.name).toBe("Elemental Strikes");
    expect(attunement?.referenceOptions?.[1]?.desc).toContain("Acid, Cold, Fire, Lightning, or Thunder");
  });

  it("lists rage of the wilds options on the combat card without a stored pick", () => {
    const barbarian = findByKey(CLASSES, "barbarian")!;
    const wildHeart = mechanismSubclass("barbarian", "rage-of-the-wilds-fixture", [
      feature("rage-of-the-wilds", "Rage of the Wilds", "When you activate your Rage, choose a form.", {
        effects: [
          {
            type: "choose_feature_option",
            choiceKey: "rage-of-the-wilds",
            uiSurface: "reference",
            options: [
              { key: "bear", name: "Bear", desc: "Resistance." },
              { key: "eagle", name: "Eagle", desc: "Disengage." },
              { key: "wolf", name: "Wolf", desc: "Knock prone." },
            ],
          },
        ],
      }),
    ]);
    const cards = buildClassFeatureCards({
      ...cardInputBase,
      classData: barbarian,
      subclassData: wildHeart,
      subclassFeatureChoices: {},
      contributions: collectClassFeatureContributions("barbarian", 3),
    });
    const rageOfTheWilds = cards.find((card) => card.featureKey === "rage-of-the-wilds");
    expect(rageOfTheWilds?.choice).toBeUndefined();
    expect(rageOfTheWilds?.referenceOptions?.map((option) => option.key)).toEqual(["bear", "eagle", "wolf"]);
    expect(rageOfTheWilds?.description).toContain("activate your Rage");
    expect(rageOfTheWilds?.referenceOptions?.[0]?.name).toBe("Bear");
  });

  it("lists primal knowledge rage benefit on the combat card without a stored pick", () => {
    const barbarian = findByKey(CLASSES, "barbarian")!;
    const berserker = mechanismSubclass("barbarian", "primal-knowledge-fixture", [
      feature("primal-knowledge", "Primal Knowledge", "You gain a benefit while you're raging.", {
        effects: [
          {
            type: "choose_feature_option",
            choiceKey: "primal-knowledge",
            uiSurface: "reference",
            options: [
              { key: "strength-substitution", name: "Strength Substitution", desc: "Acrobatics uses Strength." },
            ],
          },
        ],
      }),
    ]);
    const cards = buildClassFeatureCards({
      ...cardInputBase,
      classData: barbarian,
      subclassData: berserker,
      subclassFeatureChoices: {},
      contributions: collectClassFeatureContributions("barbarian", 3),
    });
    const primalKnowledge = cards.find((card) => card.featureKey === "primal-knowledge");
    expect(primalKnowledge?.choice).toBeUndefined();
    expect(primalKnowledge?.referenceOptions?.map((option) => option.key)).toEqual(["strength-substitution"]);
    expect(primalKnowledge?.description).toContain("while you're raging");
    expect(primalKnowledge?.referenceOptions?.[0]?.name).toBe("Strength Substitution");
    expect(primalKnowledge?.referenceOptions?.[0]?.desc).toContain("Acrobatics");
  });

  it("lists vitality of the tree benefits on the combat card without a stored pick", () => {
    const barbarian = findByKey(CLASSES, "barbarian")!;
    const worldTree = mechanismSubclass("barbarian", "vitality-fixture", [
      feature("vitality-of-the-tree", "Vitality of the Tree", "You gain the following benefits.", {
        effects: [
          {
            type: "choose_feature_option",
            choiceKey: "vitality-of-the-tree",
            uiSurface: "reference",
            options: [
              { key: "vitality-surge", name: "Vitality Surge", desc: "Temporary Hit Points." },
              { key: "life-giving-force", name: "Life-Giving Force", desc: "Healing." },
            ],
          },
        ],
      }),
    ]);
    const cards = buildClassFeatureCards({
      ...cardInputBase,
      classData: barbarian,
      subclassData: worldTree,
      subclassFeatureChoices: {},
      contributions: collectClassFeatureContributions("barbarian", 3),
    });
    const vitality = cards.find((card) => card.featureKey === "vitality-of-the-tree");
    expect(vitality?.choice).toBeUndefined();
    expect(vitality?.referenceOptions?.map((option) => option.key)).toEqual(["vitality-surge", "life-giving-force"]);
    expect(vitality?.description).toContain("following benefits");
    expect(vitality?.referenceOptions?.[0]?.name).toBe("Vitality Surge");
    expect(vitality?.referenceOptions?.[1]?.name).toBe("Life-Giving Force");
  });

  it("lists assassinate benefits on the combat card without a stored pick", () => {
    const rogue = findByKey(CLASSES, "rogue")!;
    const assassin = mechanismSubclass("rogue", "assassinate-fixture", [
      feature("assassinate", "Assassinate", "You gain the following benefits.", {
        effects: [
          {
            type: "choose_feature_option",
            choiceKey: "assassinate",
            uiSurface: "reference",
            options: [
              { key: "initiative", name: "Initiative", desc: "You roll Initiative." },
              { key: "surprising-strikes", name: "Surprising Strikes", desc: "Sneak Attack damage." },
            ],
          },
        ],
      }),
    ]);
    const cards = buildClassFeatureCards({
      ...cardInputBase,
      classData: rogue,
      subclassData: assassin,
      subclassFeatureChoices: {},
      contributions: collectClassFeatureContributions("rogue", 3),
    });
    const assassinate = cards.find((card) => card.featureKey === "assassinate");
    expect(assassinate?.choice).toBeUndefined();
    expect(assassinate?.referenceOptions?.map((option) => option.key)).toEqual([
      "initiative",
      "surprising-strikes",
    ]);
    expect(assassinate?.description).toContain("following benefits");
    expect(assassinate?.description).not.toContain("Advantage on Initiative");
    expect(assassinate?.referenceOptions?.[0]?.name).toBe("Initiative");
    expect(assassinate?.referenceOptions?.[1]?.name).toBe("Surprising Strikes");
    expect(assassinate?.referenceOptions?.[1]?.desc).toContain("Sneak Attack");
  });

  it("shows psychic blades description without a combat picker and always includes attack cards", () => {
    const rogue = findByKey(CLASSES, "rogue")!;
    const soulknife = mechanismSubclass("rogue", "psychic-blades-fixture", [
      feature("psychic-blades", "Psychic Blades", "When you take the Attack action, manifest a blade.", {
        effects: [
          {
            type: "choose_feature_option",
            choiceKey: "psychic-blades",
            uiSurface: "combat",
            options: [
              {
                key: "psychic-blade",
                name: "Psychic Blade",
                desc: "A blade.",
                combatCards: [
                  {
                    key: "psychic-blade",
                    name: "Psychic Blade",
                    desc: "Finesse, Thrown (Range 60/120), Mastery: Vex",
                    attack: { damageDice: "1d6", damageType: "Psychic", ability: "dex" },
                  },
                  {
                    key: "psychic-blade-bonus",
                    name: "Psychic Blade (Bonus)",
                    desc: "A bonus blade.",
                    attack: { damageDice: "1d4", damageType: "Psychic", ability: "dex" },
                  },
                ],
              },
            ],
          },
        ],
      }),
    ]);
    const cards = buildClassFeatureCards({
      ...cardInputBase,
      classData: rogue,
      subclassData: soulknife,
      subclassFeatureChoices: {},
      contributions: collectClassFeatureContributions("rogue", 3),
    });
    const psychicBlades = cards.find((card) => card.featureKey === "psychic-blades");
    expect(psychicBlades?.choice).toBeUndefined();
    expect(psychicBlades?.description).toContain("Attack action");

    const input = {
      classData: rogue,
      level: 3,
      subclassData: soulknife,
      subclassFeatureChoices: {},
      weaponMasteryPicks: [] as string[],
      contributions: collectClassFeatureContributions("rogue", 3),
      abilityModifiers: { str: 0, dex: 2, con: 0, int: 0, wis: 0, cha: 0 },
      formatMeta: (key: string) => key,
      weaponLabel: (_key: string, fallback: string) => fallback,
      masteryLabel: (mastery: string) => mastery,
    };
    const actions = buildCombatActions({
      speciesKey: null,
      weapons: [],
      abilityModifiers: input.abilityModifiers,
      feats: [],
      speciesFeatureActions: { action: [], bonus: [], reaction: [] },
      classFeatureActions: buildClassFeatureActionCards(input),
    });
    const psychicBlade = actions.actions.find((card) => card.name === "Psychic Blade");
    expect(psychicBlade?.description).toContain("Finesse");
    expect(psychicBlade?.description).toContain("Thrown (Range 60/120)");
    expect(psychicBlade?.description).toContain("Mastery: Vex");
    expect(actions.actions.some((card) => card.name === "Psychic Blade (Bonus)")).toBe(true);
  });

  it("builds armorer model cards with selected option description", () => {
    const artificer = findByKey(CLASSES, "wizard")!;
    const armorer = armorModelFixture();
    const cards = buildClassFeatureCards({
      ...cardInputBase,
      classData: artificer,
      subclassData: armorer,
      subclassFeatureChoices: { "armor-model": "guardian" },
      contributions: collectClassFeatureContributions("wizard", 3),
    });
    const model = cards.find((card) => card.featureKey === "armor-model");
    expect(model?.choice?.selectedOptionKey).toBe("guardian");
    expect(model?.choice?.choiceKey).toBe("armor-model");
    expect(model?.description).toContain("Thunder Pulse");
    expect(subclassFeatureOptionPickGrants(armorer, 3).some((grant) => grant.choiceKey === "armor-model")).toBe(
      false,
    );
  });

  it("builds fey wanderer blessing card with combat picker", () => {
    const ranger = findByKey(CLASSES, "ranger")!;
    const fey = mechanismSubclass("ranger", "fey-blessing-fixture", [
      feature("fey-wanderer-spells", "Fey Wanderer Spells", "A blessing.", {
        effects: [
          {
            type: "choose_feature_option",
            choiceKey: "fey-blessing",
            options: [
              { key: "butterflies", name: "Butterflies", desc: "Illusory butterflies" },
              { key: "dawn-flowers", name: "Dawn Flowers", desc: "Flowers" },
              { key: "comforting-scent", name: "Comforting Scent", desc: "Scent" },
              { key: "dancing-shadow", name: "Dancing Shadow", desc: "Shadow" },
              { key: "horns-or-antlers", name: "Horns or Antlers", desc: "Horns" },
              { key: "shifting-colors", name: "Shifting Colors", desc: "Colors" },
            ],
          },
        ],
      }),
    ]);
    const cards = buildClassFeatureCards({
      ...cardInputBase,
      classData: ranger,
      subclassData: fey,
      subclassFeatureChoices: { "fey-blessing": "butterflies" },
      contributions: collectClassFeatureContributions("ranger", 3),
    });
    const spells = cards.find((card) => card.featureKey === "fey-wanderer-spells");
    expect(spells?.choice?.choiceKey).toBe("fey-blessing");
    expect(spells?.choice?.selectedOptionKey).toBe("butterflies");
    expect(spells?.choice?.options.map((option) => option.key)).toEqual([
      "butterflies",
      "dawn-flowers",
      "comforting-scent",
      "dancing-shadow",
      "horns-or-antlers",
      "shifting-colors",
    ]);
    expect(spells?.description).toContain("Illusory butterflies");
    expect(subclassFeatureChoiceOptions(fey, "fey-blessing").some((option) => option.key === "dancing-shadow")).toBe(
      true,
    );
  });

  it("places armorer model attacks and bonus actions from the selected option", () => {
    const artificer = findByKey(CLASSES, "wizard")!;
    const armorer = armorModelFixture();
    const input = {
      ...cardInputBase,
      classData: artificer,
      subclassData: armorer,
      contributions: collectClassFeatureContributions("wizard", 3),
    };

    const infiltratorCards = buildClassFeatureCards({
      ...input,
      subclassFeatureChoices: { "armor-model": "infiltrator" },
    });
    expect(infiltratorCards.find((card) => card.featureKey === "armor-model")?.description).toMatch(/Advantage on Dexterity \(Stealth\)/);

    const guardian = buildClassFeatureActionCards({
      ...input,
      subclassFeatureChoices: { "armor-model": "guardian" },
    });
    expect(guardian.action.find((card) => card.name === "Thunder Pulse")?.attackMeta).toEqual({
      bonus: "+5",
      damage: "1d8+3 Thunder",
      ability: "int",
    });
    expect(guardian.bonus.some((card) => card.name === "Defensive Field")).toBe(true);
    expect(guardian.bonus.some((card) => card.name === "Giant Stature")).toBe(false);

    const infiltrator = buildClassFeatureActionCards({
      ...input,
      subclassFeatureChoices: { "armor-model": "infiltrator" },
    });
    expect(infiltrator.action.find((card) => card.name === "Lightning Launcher")?.attackMeta).toEqual({
      bonus: "+5",
      damage: "1d6+3 Lightning",
      ability: "int",
    });
    expect(infiltrator.bonus).toHaveLength(0);

    const dreadnaught = buildClassFeatureActionCards({
      ...input,
      subclassFeatureChoices: { "armor-model": "dreadnaught" },
    });
    expect(dreadnaught.action.find((card) => card.name === "Force Demolisher")?.attackMeta).toEqual({
      bonus: "+5",
      damage: "1d10+3 Force",
      ability: "int",
    });
    expect(dreadnaught.bonus.some((card) => card.name === "Giant Stature")).toBe(true);
    expect(
      buildClassFeatureUseTrackers(
        artificer,
        3,
        defaultAbilityModifiers,
        armorer,
        "combat",
        { "armor-model": "dreadnaught" },
      ).find((tracker) => tracker.featureKey === "giant-stature")?.maxUses,
    ).toBe(3);
  });

  it("tracks cartographer illuminated cartography by Intelligence modifier", () => {
    const artificer = findByKey(CLASSES, "wizard")!;
    const cartographer = cartographerFixture();
    const trackers = buildClassFeatureUseTrackers(
      artificer,
      3,
      defaultAbilityModifiers,
      cartographer,
      "combat",
    );
    expect(trackers.find((tracker) => tracker.featureKey === "illuminated-cartography")?.maxUses).toBe(3);
  });

  it("uses combatParentName for nested class feature card titles", () => {
    const artificer = findByKey(CLASSES, "wizard")!;
    const cartographer = cartographerFixture();
    const cards = buildClassFeatureCards({
      ...cardInputBase,
      classData: artificer,
      subclassData: cartographer,
      contributions: collectClassFeatureContributions("wizard", 3),
    });
    const portalJump = cards.find((card) => card.featureKey === "portal-jump");
    const illuminated = cards.find((card) => card.featureKey === "illuminated-cartography");
    expect(portalJump?.combatParentName).toBe("Mapping Magic");
    expect(illuminated?.combatParentName).toBe("Mapping Magic");
    expect(portalJump?.name).toBe("Portal Jump");
    expect(illuminated?.name).toBe("Illuminated Cartography");

    const battleSmith = mechanismSubclass("fighter", "battle-ready-fixture", [
      feature("weapon-crafting", "Weapon Crafting", "You craft a weapon.", {
        combatParentName: "Tools of the Trade",
      }),
      feature("battle-ready", "Battle Ready", "Your training has paid off in two ways.", {
        effects: [
          {
            type: "choose_feature_option",
            choiceKey: "battle-ready",
            uiSurface: "reference",
            options: [
              { key: "arcane-empowerment", name: "Arcane Empowerment", desc: "Intelligence attacks." },
              { key: "weapon-knowledge", name: "Weapon Knowledge", desc: "The weapon is a Spellcasting Focus." },
            ],
          },
        ],
      }),
    ]);
    const smithCards = buildClassFeatureCards({
      ...cardInputBase,
      classData: artificer,
      subclassData: battleSmith,
      contributions: collectClassFeatureContributions("wizard", 3),
    });
    expect(smithCards.some((card) => card.featureKey === "weapon-crafting")).toBe(true);
    expect(smithCards.find((card) => card.featureKey === "weapon-crafting")?.combatParentName).toBe(
      "Tools of the Trade",
    );

    const battleReady = smithCards.find((card) => card.featureKey === "battle-ready");
    expect(battleReady?.choice).toBeUndefined();
    expect(battleReady?.referenceOptions?.map((option) => option.key)).toEqual([
      "arcane-empowerment",
      "weapon-knowledge",
    ]);
    expect(battleReady?.description).toContain("paid off in two ways");
    expect(battleReady?.description).not.toContain("Intelligence modifier");
    expect(battleReady?.referenceOptions?.[0]?.name).toBe("Arcane Empowerment");
    expect(battleReady?.referenceOptions?.[1]?.name).toBe("Weapon Knowledge");
    expect(battleReady?.referenceOptions?.[1]?.desc).toContain("Spellcasting Focus");
  });

  it("does not show hollow companion or experimental elixir INT trackers", () => {
    const artificer = findByKey(CLASSES, "wizard")!;
    const alchemist = mechanismSubclass("fighter", "elixir-fixture", [
      feature("potion-crafting", "Potion Crafting", "You brew a potion."),
      feature("experimental-elixir", "Experimental Elixir", "Drink an elixir.", {
        actionTiming: "action",
        classFeatureCard: true,
        effects: [
          {
            type: "choose_feature_option",
            choiceKey: "experimental-elixir",
            count: 2,
            options: [
              { key: "healing", name: "Healing", desc: "Heal." },
              { key: "swiftness", name: "Swiftness", desc: "Speed." },
            ],
          },
        ],
      }),
    ]);
    const hollow = mechanismSubclass("ranger", "hollow-fixture", [
      feature("hollow-companion", "Hollow Companion", "A companion.", { combatSurface: false }),
      feature("wrath-of-the-wild", "Wrath of the Wild", "A bonus strike.", { actionTiming: "bonus" }),
    ]);
    const ranger = findByKey(CLASSES, "ranger")!;

    const alchemistTrackers = buildClassFeatureUseTrackers(
      artificer,
      3,
      defaultAbilityModifiers,
      alchemist,
      "combat",
    );
    expect(alchemistTrackers.some((tracker) => tracker.featureKey === "experimental-elixir")).toBe(false);

    const alchemistCards = buildClassFeatureCards({
      ...cardInputBase,
      classData: artificer,
      subclassData: alchemist,
      subclassFeatureOptionPicks: {
        "experimental-elixir": ["healing", "swiftness"],
      },
      contributions: collectClassFeatureContributions("wizard", 3),
    });
    expect(alchemistCards.some((card) => card.featureKey === "potion-crafting")).toBe(true);
    const elixirCard = alchemistCards.find((card) => card.featureKey === "experimental-elixir");
    expect(elixirCard?.optionPicks?.picks).toEqual(["healing", "swiftness"]);
    expect(buildClassFeatureActionCards({
      ...cardInputBase,
      classData: artificer,
      subclassData: alchemist,
      contributions: collectClassFeatureContributions("wizard", 3),
    }).action.some((card) => card.traitSlug === "experimental-elixir")).toBe(true);

    const hollowCards = buildClassFeatureCards({
      ...cardInputBase,
      classData: ranger,
      subclassData: hollow,
      contributions: collectClassFeatureContributions("ranger", 3),
    });
    expect(hollowCards.some((card) => card.featureKey === "hollow-companion")).toBe(false);

    const hollowActions = buildClassFeatureActionCards({
      ...cardInputBase,
      classData: ranger,
      subclassData: hollow,
      contributions: collectClassFeatureContributions("ranger", 3),
    });
    expect(hollowActions.bonus.some((card) => card.traitSlug === "wrath-of-the-wild")).toBe(true);
  });

  it("does not list inspiring smite as a standalone action card", () => {
    const paladin = findByKey(CLASSES, "paladin")!;
    const glory = mechanismSubclass("paladin", "inspiring-smite-fixture", [
      feature("inspiring-smite", "Inspiring Smite", "Allies gain temporary hit points."),
    ]);
    const actions = buildClassFeatureActionCards({
      ...cardInputBase,
      classData: paladin,
      subclassData: glory,
      contributions: collectClassFeatureContributions("paladin", 3),
    });
    expect(actions.action.some((card) => card.traitSlug === "inspiring-smite")).toBe(false);
    expect(buildClassFeatureCards({
      ...cardInputBase,
      classData: paladin,
      subclassData: glory,
      contributions: collectClassFeatureContributions("paladin", 3),
    }).some((card) => card.featureKey === "inspiring-smite")).toBe(true);
  });
});

describe("hit point pool features", () => {
  const abjurerFixture: SubclassData = {
    key: "abjurer-fixture",
    classKey: "wizard",
    name: "School of Abjuration (Fixture)",
    desc: "Test-only abjurer subclass.",
    srd: false,
    book: "XPHB",
    features: [
      {
        key: "arcane-ward",
        name: "Arcane Ward",
        desc: "A protective ward of magical energy.",
        grantedAtLevel: 3,
        combatSurface: true,
        effects: [{ type: "hit_point_pool", formula: { kind: "twiceLevelPlusAbility", ability: "int" } }],
      },
    ],
  };

  const wildMagicFixture: SubclassData = {
    key: "wild-magic-fixture",
    classKey: "sorcerer",
    name: "Wild Magic (Fixture)",
    desc: "Test-only wild magic subclass.",
    srd: false,
    book: "XPHB",
    features: [
      {
        key: "wild-magic-surge",
        name: "Wild Magic Surge",
        desc: "Your magic can unleash surges.",
        grantedAtLevel: 3,
        combatSurface: true,
        effects: [
          {
            type: "choose_feature_option",
            choiceKey: "wild-magic-surge-table",
            uiSurface: "reference",
            options: [
              { key: "surge-1", name: "Surge 1", desc: "First surge effect." },
              { key: "surge-2", name: "Surge 2", desc: "Second surge effect." },
            ],
          },
        ],
      },
    ],
  };

  const defaultAbilityModifiers = {
    str: 0,
    dex: 0,
    con: 0,
    int: 3,
    wis: 0,
    cha: 0,
  };

  it("resolves arcane ward max HP from twice level plus ability modifier", () => {
    expect(
      resolveHitPointPoolMax(
        { kind: "twiceLevelPlusAbility", ability: "int" },
        { level: 3, abilityModifiers: defaultAbilityModifiers },
      ),
    ).toBe(9);

    const wizard = findByKey(CLASSES, "wizard")!;
    const contributions = collectClassFeatureContributions("wizard", 3, "abjurer-fixture");
    expect(contributions.hitPointPools).toEqual([]);
    const withSubclass = {
      ...contributions,
      hitPointPools: [{ featureKey: "arcane-ward", formula: { kind: "twiceLevelPlusAbility", ability: "int" } }],
    };
    const trackers = buildClassFeaturePoolTrackers(wizard, 3, defaultAbilityModifiers, abjurerFixture);
    expect(trackers).toHaveLength(1);
    expect(trackers[0]?.featureKey).toBe("arcane-ward");
    expect(trackers[0]?.maxHp).toBe(9);

    const cards = buildClassFeatureCards({
      classData: wizard,
      subclassData: abjurerFixture,
      level: 3,
      weaponMasteryPicks: [],
      contributions: {
        ...withSubclass,
        hitPointPools: [{ featureKey: "arcane-ward", formula: { kind: "twiceLevelPlusAbility", ability: "int" } }],
      },
      abilityModifiers: defaultAbilityModifiers,
      formatMeta: (key: string, params?: Record<string, string | number>) =>
        `${key}:${JSON.stringify(params ?? {})}`,
      weaponLabel: (_key: string, fallback: string) => fallback,
      masteryLabel: (mastery: string) => mastery,
    });
    const ward = cards.find((card) => card.featureKey === "arcane-ward");
    expect(ward?.meta).toBe('combat.classFeature.arcaneWardHp:{"max":9}');
  });

  it("lists wild magic surge reference options on the combat card", () => {
    const sorcerer = findByKey(CLASSES, "sorcerer")!;
    const cards = buildClassFeatureCards({
      classData: sorcerer,
      subclassData: wildMagicFixture,
      level: 3,
      weaponMasteryPicks: [],
      contributions: collectClassFeatureContributions("sorcerer", 3),
      abilityModifiers: defaultAbilityModifiers,
      formatMeta: (key: string, params?: Record<string, string | number>) =>
        `${key}:${JSON.stringify(params ?? {})}`,
      weaponLabel: (_key: string, fallback: string) => fallback,
      masteryLabel: (mastery: string) => mastery,
    });
    const surge = cards.find((card) => card.featureKey === "wild-magic-surge");
    expect(surge?.referenceOptions?.map((option) => option.key)).toEqual(["surge-1", "surge-2"]);
    expect(surge?.choice).toBeUndefined();
  });

  it("lists clockwork manifestations as reference options and shows restore balance card + tracker", () => {
    const sorcerer = findByKey(CLASSES, "sorcerer")!;
    const clockwork = mechanismSubclass("sorcerer", "clockwork-sorcery", [
      feature("manifestations-of-order", "Manifestations of Order", "Roll on the table.", {
        effects: [
          {
            type: "choose_feature_option",
            choiceKey: "manifestations-of-order",
            uiSurface: "reference",
            options: ["1", "2", "3", "4", "5", "6"].map((key) => ({ key, name: key, desc: key })),
          },
        ],
      }),
      feature("restore-balance", "Restore Balance", "You restore order.", {
        actionTiming: "reaction",
        classFeatureCard: true,
        limitedUses: { kind: "fixed", uses: 1 },
      }),
    ]);
    const cardInput = {
      classData: sorcerer,
      subclassData: clockwork,
      level: 3,
      weaponMasteryPicks: [] as string[],
      contributions: collectClassFeatureContributions("sorcerer", 3),
      abilityModifiers: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 3 },
      formatMeta: (key: string, params?: Record<string, string | number>) =>
        `${key}:${JSON.stringify(params ?? {})}`,
      weaponLabel: (_key: string, fallback: string) => fallback,
      masteryLabel: (mastery: string) => mastery,
    };

    const cards = buildClassFeatureCards(cardInput);
    const manifestations = cards.find((card) => card.featureKey === "manifestations-of-order");
    expect(manifestations?.referenceOptions?.map((option) => option.key)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
    ]);
    expect(manifestations?.choice).toBeUndefined();

    const restoreBalance = cards.find((card) => card.featureKey === "restore-balance");
    expect(restoreBalance).toBeDefined();

    const trackers = buildClassFeatureUseTrackers(
      sorcerer,
      3,
      cardInput.abilityModifiers,
      clockwork,
    );
    expect(trackers.some((tracker) => tracker.featureKey === "restore-balance")).toBe(true);

    const reactions = buildClassFeatureActionCards(cardInput);
    const restoreAction = reactions.reaction.find((card) => card.traitSlug === "restore-balance");
    expect(restoreAction).toBeDefined();
    expect(restoreAction?.useTrackerClassFeatureKey).toBeUndefined();
    expect(restoreBalance?.useTrackerClassFeatureKey).toBe("restore-balance");
  });

  it("tracks arcane ward remaining separately from limited uses", () => {
    let character = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "wizard" });
    character = characterReducer(character, {
      type: "SET_CLASS_FEATURE_POOL_REMAINING",
      featureKey: "arcane-ward",
      value: 5,
    });
    expect(character.classFeaturePoolRemaining).toEqual({});
    expect(character.classFeatureUses["arcane-ward"]).toBeUndefined();

    character = {
      ...character,
      classFeaturePoolRemaining: { "arcane-ward": 5 },
      classFeatureUses: { "arcane-ward": 1 },
    };
    expect(character.classFeaturePoolRemaining["arcane-ward"]).toBe(5);
    expect(character.classFeatureUses["arcane-ward"]).toBe(1);

    const afterLong = applyRest(character, "long");
    expect(afterLong.classFeaturePoolRemaining).toEqual({});
    expect(afterLong.classFeatureUses).toEqual({});
  });
});

describe("battleMasterManeuverSaveDc", () => {
  it("uses 8 + proficiency + the higher of STR or DEX", () => {
    expect(battleMasterManeuverSaveDc({ str: 3, dex: 1, con: 0, int: 0, wis: 0, cha: 0 })).toBe(13);
    expect(battleMasterManeuverSaveDc({ str: 0, dex: 4, con: 0, int: 0, wis: 0, cha: 0 })).toBe(14);
  });
});
