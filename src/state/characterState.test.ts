import { describe, expect, it } from "vitest";
import { CLASSES, GENERIC_VARIANTS, WEAPONS, findByKey } from "../data";
import { CUSTOM_BACKGROUND_KEY } from "../domain/background";
import { computeDerivedStats } from "../domain/deriveCharacter";
import {
  activeClassFeatures,
  buildClassFeatureUseTrackers,
  PACT_OF_THE_TOME_SPELL_PICKS_KEY,
} from "../domain/classFeatures";
import {
  buildAllGrantedSpells,
  buildFeatGrantedSpells,
  preparedSpellPickOptions,
  spellPickLimitsForClass,
  spellbookListKeys,
} from "../domain/spellSelection";
import { featChoicesResolverForCharacter } from "../domain/featSlots";
import { findSubclass, subclassesForClass } from "../domain/subclasses";
import { buildFeatSpellUseTrackers, EMPTY_FEAT_CHOICES } from "../domain/featEffects";
import { countAttunedSlots } from "../domain/attunement";
import { findGenericVariant, variantMatchesWeapon } from "../domain/genericVariantMatcher";
import { INITIAL_CHARACTER, activeFeatKeysFromCharacter, characterReducer } from "./characterState";

describe("characterReducer armor", () => {
  it("wears one body armor and one shield independently when added", () => {
    const withLeather = characterReducer(INITIAL_CHARACTER, {
      type: "ADD_ARMOR",
      id: "leather",
      key: "leather-armor",
    });
    const withShield = characterReducer(withLeather, {
      type: "ADD_ARMOR",
      id: "shield",
      key: "shield",
    });

    expect(withShield.armor).toEqual([
      { id: "leather", key: "leather-armor", worn: true },
      { id: "shield", key: "shield", worn: true },
    ]);
  });

  it("switches body armor without removing the worn shield", () => {
    const character = {
      ...INITIAL_CHARACTER,
      armor: [
        { id: "leather", key: "leather-armor", worn: true },
        { id: "plate", key: "plate-armor", worn: false },
        { id: "shield", key: "shield", worn: true },
      ],
    };

    const next = characterReducer(character, { type: "SET_ARMOR_WORN", id: "plate", worn: true });

    expect(next.armor).toEqual([
      { id: "leather", key: "leather-armor", worn: false },
      { id: "plate", key: "plate-armor", worn: true },
      { id: "shield", key: "shield", worn: true },
    ]);
  });

  it("toggles a shield without changing the worn body armor", () => {
    const character = {
      ...INITIAL_CHARACTER,
      armor: [
        { id: "leather", key: "leather-armor", worn: true },
        { id: "shield", key: "shield", worn: true },
      ],
    };

    const next = characterReducer(character, { type: "SET_ARMOR_WORN", id: "shield", worn: false });

    expect(next.armor).toEqual([
      { id: "leather", key: "leather-armor", worn: true },
      { id: "shield", key: "shield", worn: false },
    ]);
  });
});

describe("characterReducer skills", () => {
  function paladinWithPicks() {
    const paladin = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "paladin" });
    const withAthletics = characterReducer(paladin, {
      type: "SET_CLASS_SKILL_PICK",
      index: 0,
      skill: "athletics",
    });
    return characterReducer(withAthletics, { type: "SET_CLASS_SKILL_PICK", index: 1, skill: "insight" });
  }

  it("opens empty class skill slots and marks chosen Paladin skills proficient", () => {
    const paladin = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "paladin" });
    expect(paladin.classSkillPicks).toEqual([null, null]);
    expect(paladin.skills.athletics).toBe("none");

    const next = paladinWithPicks();
    expect(next.classSkillPicks).toEqual(["athletics", "insight"]);
    expect(next.skills.athletics).toBe("proficient");
    expect(next.skills.insight).toBe("proficient");
    expect(next.skills.medicine).toBe("none");
  });

  it("ignores a duplicate class skill pick", () => {
    const paladin = paladinWithPicks();
    const next = characterReducer(paladin, { type: "SET_CLASS_SKILL_PICK", index: 1, skill: "athletics" });
    expect(next).toBe(paladin);
  });

  it("applies Soldier skills and rejects overlapping Paladin picks", () => {
    const soldier = characterReducer(INITIAL_CHARACTER, { type: "SET_BACKGROUND", key: "soldier" });
    expect(soldier.skills.athletics).toBe("proficient");
    expect(soldier.skills.intimidation).toBe("proficient");

    const paladin = characterReducer(soldier, { type: "SET_CLASS", key: "paladin" });
    const rejected = characterReducer(paladin, { type: "SET_CLASS_SKILL_PICK", index: 0, skill: "athletics" });
    expect(rejected).toBe(paladin);

    const next = characterReducer(paladin, { type: "SET_CLASS_SKILL_PICK", index: 0, skill: "medicine" });
    expect(next.skills.athletics).toBe("proficient");
    expect(next.skills.intimidation).toBe("proficient");
    expect(next.skills.medicine).toBe("proficient");
  });

  it("clears overlapping class picks when a catalog background is chosen", () => {
    const paladin = paladinWithPicks();
    const soldier = characterReducer(paladin, { type: "SET_BACKGROUND", key: "soldier" });
    expect(soldier.classSkillPicks).toEqual([null, "insight"]);
    expect(soldier.skillConflictNotice).toEqual(["athletics"]);
    expect(soldier.skills.athletics).toBe("proficient");
    expect(soldier.skills.insight).toBe("proficient");
    expect(soldier.skills.intimidation).toBe("proficient");
  });

  it("clears overlapping bard class picks when Criminal is chosen", () => {
    let bard = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "bard" });
    bard = characterReducer(bard, { type: "SET_CLASS_SKILL_PICK", index: 0, skill: "stealth" });
    bard = characterReducer(bard, { type: "SET_CLASS_SKILL_PICK", index: 1, skill: "persuasion" });
    bard = characterReducer(bard, { type: "SET_CLASS_SKILL_PICK", index: 2, skill: "deception" });
    const criminal = characterReducer(bard, { type: "SET_BACKGROUND", key: "criminal" });
    expect(criminal.classSkillPicks).toEqual([null, "persuasion", "deception"]);
    expect(criminal.skillConflictNotice).toEqual(["stealth"]);
    expect(criminal.skills.stealth).toBe("proficient");
    expect(criminal.skills.sleightOfHand).toBe("proficient");
  });

  it("keeps Insight and drops Athletics when switching Paladin to Wizard", () => {
    const wizard = characterReducer(paladinWithPicks(), { type: "SET_CLASS", key: "wizard" });
    expect(wizard.classSkillPicks).toEqual(["insight", null]);
    expect(wizard.skills.athletics).toBe("none");
    expect(wizard.skills.insight).toBe("proficient");
  });

  it("trims Rogue picks to two valid Paladin skills", () => {
    let rogue = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "rogue" });
    expect(rogue.classSkillPicks).toEqual([null, null, null, null]);
    rogue = characterReducer(rogue, { type: "SET_CLASS_SKILL_PICK", index: 0, skill: "athletics" });
    rogue = characterReducer(rogue, { type: "SET_CLASS_SKILL_PICK", index: 1, skill: "deception" });
    rogue = characterReducer(rogue, { type: "SET_CLASS_SKILL_PICK", index: 2, skill: "insight" });
    rogue = characterReducer(rogue, { type: "SET_CLASS_SKILL_PICK", index: 3, skill: "stealth" });

    const paladin = characterReducer(rogue, { type: "SET_CLASS", key: "paladin" });
    expect(paladin.classSkillPicks).toEqual(["athletics", "insight"]);
    expect(paladin.skills.deception).toBe("none");
    expect(paladin.skills.stealth).toBe("none");
  });

  it("supports three distinct Bard picks while excluding Soldier skills", () => {
    let bard = characterReducer(INITIAL_CHARACTER, { type: "SET_BACKGROUND", key: "soldier" });
    bard = characterReducer(bard, { type: "SET_CLASS", key: "bard" });
    expect(bard.classSkillPicks).toEqual([null, null, null]);

    const rejected = characterReducer(bard, { type: "SET_CLASS_SKILL_PICK", index: 0, skill: "athletics" });
    expect(rejected).toBe(bard);

    bard = characterReducer(bard, { type: "SET_CLASS_SKILL_PICK", index: 0, skill: "arcana" });
    bard = characterReducer(bard, { type: "SET_CLASS_SKILL_PICK", index: 1, skill: "deception" });
    bard = characterReducer(bard, { type: "SET_CLASS_SKILL_PICK", index: 2, skill: "performance" });
    expect(bard.classSkillPicks).toEqual(["arcana", "deception", "performance"]);
    expect(bard.skills.athletics).toBe("proficient");
    expect(bard.skills.intimidation).toBe("proficient");
    expect(bard.skills.arcana).toBe("proficient");
    expect(bard.skills.deception).toBe("proficient");
    expect(bard.skills.performance).toBe("proficient");
  });

  it("excludes species skill picks from Bard class skill options", () => {
    let bard = characterReducer(INITIAL_CHARACTER, { type: "SET_SPECIES", key: "human" });
    bard = characterReducer(bard, { type: "SET_CLASS", key: "bard" });
    bard = characterReducer(bard, { type: "SET_SPECIES_SKILL_PICK", index: 0, skill: "persuasion" });

    const rejectedPersuasion = characterReducer(bard, {
      type: "SET_CLASS_SKILL_PICK",
      index: 0,
      skill: "persuasion",
    });
    expect(rejectedPersuasion).toBe(bard);

    bard = characterReducer(bard, { type: "SET_CLASS_SKILL_PICK", index: 0, skill: "arcana" });
    bard = characterReducer(bard, { type: "SET_CLASS_SKILL_PICK", index: 1, skill: "deception" });
    bard = characterReducer(bard, { type: "SET_CLASS_SKILL_PICK", index: 2, skill: "performance" });
    expect(bard.classSkillPicks).toEqual(["arcana", "deception", "performance"]);
    expect(bard.skills.persuasion).toBe("proficient");
  });

  it("rejects a species skill that overlaps an existing class pick", () => {
    let bard = characterReducer(INITIAL_CHARACTER, { type: "SET_SPECIES", key: "human" });
    bard = characterReducer(bard, { type: "SET_CLASS", key: "bard" });
    bard = characterReducer(bard, { type: "SET_CLASS_SKILL_PICK", index: 0, skill: "persuasion" });
    bard = characterReducer(bard, { type: "SET_CLASS_SKILL_PICK", index: 1, skill: "deception" });

    const rejected = characterReducer(bard, { type: "SET_SPECIES_SKILL_PICK", index: 0, skill: "persuasion" });
    expect(rejected).toBe(bard);
    expect(rejected.classSkillPicks).toEqual(["persuasion", "deception", null]);
    expect(rejected.skills.persuasion).toBe("proficient");
    expect(rejected.skills.deception).toBe("proficient");
  });

  it("removes only class proficiencies when the class is cleared", () => {
    const soldier = characterReducer(paladinWithPicks(), { type: "SET_BACKGROUND", key: "soldier" });
    const cleared = characterReducer(soldier, { type: "SET_CLASS", key: null });
    expect(cleared.classSkillPicks).toEqual([]);
    expect(cleared.skills.athletics).toBe("proficient");
    expect(cleared.skills.intimidation).toBe("proficient");
    expect(cleared.skills.insight).toBe("none");
  });

  it("removes only background proficiencies when the background is cleared", () => {
    const soldier = characterReducer(INITIAL_CHARACTER, { type: "SET_BACKGROUND", key: "soldier" });
    const paladin = characterReducer(soldier, { type: "SET_CLASS", key: "paladin" });
    const withMedicine = characterReducer(paladin, { type: "SET_CLASS_SKILL_PICK", index: 0, skill: "medicine" });
    const cleared = characterReducer(withMedicine, { type: "SET_BACKGROUND", key: null });
    expect(cleared.skills.athletics).toBe("none");
    expect(cleared.skills.intimidation).toBe("none");
    expect(cleared.skills.medicine).toBe("proficient");
  });
});

describe("characterReducer expertise", () => {
  function rogueWithSkills() {
    let rogue = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "rogue" });
    expect(rogue.expertiseSkillPicks).toEqual([null, null]);
    rogue = characterReducer(rogue, { type: "SET_CLASS_SKILL_PICK", index: 0, skill: "stealth" });
    rogue = characterReducer(rogue, { type: "SET_CLASS_SKILL_PICK", index: 1, skill: "deception" });
    rogue = characterReducer(rogue, { type: "SET_CLASS_SKILL_PICK", index: 2, skill: "insight" });
    rogue = characterReducer(rogue, { type: "SET_CLASS_SKILL_PICK", index: 3, skill: "perception" });
    return rogue;
  }

  it("opens two expertise slots for Rogue and marks chosen skills expert", () => {
    const rogue = rogueWithSkills();
    const withExpertise = characterReducer(rogue, { type: "SET_EXPERTISE_SKILL_PICK", index: 0, skill: "stealth" });
    const next = characterReducer(withExpertise, { type: "SET_EXPERTISE_SKILL_PICK", index: 1, skill: "deception" });

    expect(next.expertiseSkillPicks).toEqual(["stealth", "deception"]);
    expect(next.skills.stealth).toBe("expert");
    expect(next.skills.deception).toBe("expert");
    expect(next.skills.insight).toBe("proficient");

    const derived = computeDerivedStats(next);
    expect(derived.skillBonuses.stealth).toBe(derived.abilityModifiers.dex + 4);
    expect(derived.skillBonuses.deception).toBe(derived.abilityModifiers.cha + 4);
  });

  it("clears expertise when the underlying class skill is removed", () => {
    const rogue = rogueWithSkills();
    const withExpertise = characterReducer(rogue, { type: "SET_EXPERTISE_SKILL_PICK", index: 0, skill: "stealth" });
    const cleared = characterReducer(withExpertise, { type: "SET_CLASS_SKILL_PICK", index: 0, skill: null });

    expect(cleared.expertiseSkillPicks).toEqual([null, null]);
    expect(cleared.skills.stealth).toBe("none");
  });

  it("drops expertise when switching away from Rogue", () => {
    const rogue = rogueWithSkills();
    const withExpertise = characterReducer(rogue, { type: "SET_EXPERTISE_SKILL_PICK", index: 0, skill: "stealth" });
    withExpertise.expertiseSkillPicks = ["stealth", "deception"];
    const fighter = characterReducer(
      characterReducer(withExpertise, { type: "SET_EXPERTISE_SKILL_PICK", index: 1, skill: "deception" }),
      { type: "SET_CLASS", key: "fighter" },
    );

    expect(fighter.expertiseSkillPicks).toEqual([]);
    expect(fighter.skills.stealth).toBe("none");
    expect(fighter.skills.deception).toBe("none");
  });

  it("rejects expertise in a skill that is not proficient", () => {
    const rogue = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "rogue" });
    const rejected = characterReducer(rogue, { type: "SET_EXPERTISE_SKILL_PICK", index: 0, skill: "medicine" });
    expect(rejected).toBe(rogue);
  });
});

describe("characterReducer feats", () => {
  it("suggests the background origin feat until the player picks a different one", () => {
    const soldier = characterReducer(INITIAL_CHARACTER, { type: "SET_BACKGROUND", key: "soldier" });
    expect(soldier.featKey).toBe("savage-attacker");
    expect(soldier.featTouched).toBe(false);

    const criminal = characterReducer(soldier, { type: "SET_BACKGROUND", key: "criminal" });
    expect(criminal.featKey).toBe("alert");
    expect(criminal.featTouched).toBe(false);
  });

  it("keeps a player-chosen feat when the background changes", () => {
    const soldier = characterReducer(INITIAL_CHARACTER, { type: "SET_BACKGROUND", key: "soldier" });
    const custom = characterReducer(soldier, { type: "SET_FEAT", key: "magic-initiate-wizard" });
    expect(custom.featKey).toBe("magic-initiate-wizard");
    expect(custom.featTouched).toBe(true);

    const criminal = characterReducer(custom, { type: "SET_BACKGROUND", key: "criminal" });
    expect(criminal.featKey).toBe("magic-initiate-wizard");
    expect(criminal.featTouched).toBe(true);
  });

  it("allows choosing a feat with no background selected", () => {
    const next = characterReducer(INITIAL_CHARACTER, { type: "SET_FEAT", key: "alert" });
    expect(next.featKey).toBe("alert");
    expect(next.backgroundKey).toBeNull();
  });

  it("clears the suggested feat when the background is cleared and the player has not chosen one", () => {
    const soldier = characterReducer(INITIAL_CHARACTER, { type: "SET_BACKGROUND", key: "soldier" });
    const cleared = characterReducer(soldier, { type: "SET_BACKGROUND", key: null });
    expect(cleared.featKey).toBeNull();
  });
});

describe("characterReducer human versatile feat", () => {
  it("grants a recommended skilled origin feat when human is selected", () => {
    const human = characterReducer(INITIAL_CHARACTER, { type: "SET_SPECIES", key: "human" });
    expect(human.extraFeats).toEqual(["skilled"]);
    expect(human.extraFeatChoices[0]?.proficiencyPicks).toHaveLength(3);
  });

  it("clears the extra origin feat when switching away from human", () => {
    const human = characterReducer(INITIAL_CHARACTER, { type: "SET_SPECIES", key: "human" });
    const elf = characterReducer(human, { type: "SET_SPECIES", key: "elf" });
    expect(elf.extraFeats).toEqual([]);
    expect(elf.extraFeatChoices).toEqual([]);
  });

  it("includes both background and versatile feats in derived stats", () => {
    const human = characterReducer(INITIAL_CHARACTER, { type: "SET_SPECIES", key: "human" });
    const withBackground = characterReducer(human, { type: "SET_BACKGROUND", key: "criminal" });
    const derived = computeDerivedStats(withBackground);
    expect(derived.feats.map((feat) => feat.key)).toEqual(["alert", "skilled"]);
  });

  it("applies versatile feat skill picks to skills", () => {
    const human = characterReducer(INITIAL_CHARACTER, { type: "SET_SPECIES", key: "human" });
    const picked = characterReducer(human, {
      type: "SET_EXTRA_FEAT_PROFICIENCY_PICK",
      featIndex: 0,
      pickIndex: 0,
      pick: { kind: "skill", id: "arcana" },
    });
    expect(picked.skills.arcana).toBe("proficient");
  });

  it("excludes versatile feat skills from class skill options", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_SPECIES", key: "human" });
    state = characterReducer(state, { type: "SET_CLASS", key: "paladin" });
    state = characterReducer(state, {
      type: "SET_EXTRA_FEAT_PROFICIENCY_PICK",
      featIndex: 0,
      pickIndex: 0,
      pick: { kind: "skill", id: "athletics" },
    });
    expect(
      characterReducer(state, { type: "SET_CLASS_SKILL_PICK", index: 0, skill: "athletics" }),
    ).toBe(state);
    expect(state.classSkillPicks).toEqual([null, null]);
  });

  it("stores background magic initiate cantrip and spell choices", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_BACKGROUND", key: "acolyte" });
    expect(state.featKey).toBe("magic-initiate-cleric");
    state = characterReducer(state, { type: "SET_FEAT_SPELLCASTING_ABILITY", ability: "wis" });
    state = characterReducer(state, { type: "SET_FEAT_CANTRIP_PICK", index: 0, spellKey: "light" });
    state = characterReducer(state, { type: "SET_FEAT_CANTRIP_PICK", index: 1, spellKey: "sacred-flame" });
    state = characterReducer(state, { type: "SET_FEAT_SPELL_PICK", index: 0, spellKey: "bless" });
    expect(state.featChoices.cantripPicks).toEqual(["light", "sacred-flame"]);
    expect(state.featChoices.spellPicks).toEqual(["bless"]);
  });

  it("stores magic initiate spell choices on the primary feat", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_FEAT", key: "magic-initiate-wizard" });
    expect(state.featChoices.cantripPicks).toHaveLength(2);
    expect(state.featChoices.spellPicks).toHaveLength(1);

    state = characterReducer(state, { type: "SET_FEAT_SPELLCASTING_ABILITY", ability: "int" });
    state = characterReducer(state, { type: "SET_FEAT_CANTRIP_PICK", index: 0, spellKey: "fire-bolt" });
    state = characterReducer(state, { type: "SET_FEAT_CANTRIP_PICK", index: 1, spellKey: "light" });
    state = characterReducer(state, { type: "SET_FEAT_SPELL_PICK", index: 0, spellKey: "burning-hands" });

    expect(state.featChoices.spellcastingAbility).toBe("int");
    expect(state.featChoices.cantripPicks).toEqual(["fire-bolt", "light"]);
    expect(state.featChoices.spellPicks).toEqual(["burning-hands"]);
  });

  it("accepts magic initiate cantrip picks when choice arrays start undersized", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "wizard" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "SET_CLASS_GRANTED_FEAT", level: 4, key: "magic-initiate-wizard" });
    state = {
      ...state,
      classGrantedFeatChoices: {
        ...state.classGrantedFeatChoices,
        4: {
          ...(state.classGrantedFeatChoices[4] ?? {
            proficiencyPicks: [],
            abilityIncreases: {},
            spellcastingAbility: null,
            cantripPicks: [],
            spellPicks: [],
            damageTypePick: null,
            weaponMasteryPick: null,
          }),
          cantripPicks: [],
          spellPicks: [],
        },
      },
    };
    state = characterReducer(state, {
      type: "SET_CLASS_GRANTED_FEAT_CANTRIP_PICK",
      level: 4,
      pickIndex: 0,
      spellKey: "fire-bolt",
    });
    expect(state.classGrantedFeatChoices[4]?.cantripPicks[0]).toBe("fire-bolt");
  });

  it("accepts feat spell picks when choice arrays start undersized", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "wizard" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "SET_CLASS_GRANTED_FEAT", level: 4, key: "magic-initiate-wizard" });
    state = {
      ...state,
      classGrantedFeatChoices: {
        ...state.classGrantedFeatChoices,
        4: {
          ...(state.classGrantedFeatChoices[4] ?? {
            proficiencyPicks: [],
            abilityIncreases: {},
            spellcastingAbility: null,
            cantripPicks: [],
            spellPicks: [],
            damageTypePick: null,
            weaponMasteryPick: null,
          }),
          cantripPicks: [],
          spellPicks: [],
        },
      },
    };
    state = characterReducer(state, {
      type: "SET_CLASS_GRANTED_FEAT_SPELL_PICK",
      level: 4,
      pickIndex: 0,
      spellKey: "burning-hands",
    });
    expect(state.classGrantedFeatChoices[4]?.spellPicks).toEqual(["burning-hands"]);
  });

  it("stores class-granted magic initiate and fey-touched spell picks", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "wizard" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "SET_CLASS_GRANTED_FEAT", level: 4, key: "magic-initiate-wizard" });
    state = characterReducer(state, {
      type: "SET_CLASS_GRANTED_FEAT_SPELLCASTING_ABILITY",
      level: 4,
      ability: "int",
    });
    state = characterReducer(state, {
      type: "SET_CLASS_GRANTED_FEAT_CANTRIP_PICK",
      level: 4,
      pickIndex: 0,
      spellKey: "fire-bolt",
    });
    state = characterReducer(state, {
      type: "SET_CLASS_GRANTED_FEAT_CANTRIP_PICK",
      level: 4,
      pickIndex: 1,
      spellKey: "light",
    });
    state = characterReducer(state, {
      type: "SET_CLASS_GRANTED_FEAT_SPELL_PICK",
      level: 4,
      pickIndex: 0,
      spellKey: "burning-hands",
    });
    expect(state.classGrantedFeatChoices[4]?.cantripPicks).toEqual(["fire-bolt", "light"]);
    expect(state.classGrantedFeatChoices[4]?.spellPicks).toEqual(["burning-hands"]);

    const activeFeatKeys = activeFeatKeysFromCharacter(state);
    const featChoicesFor = featChoicesResolverForCharacter(state);
    const granted = buildFeatGrantedSpells({ activeFeatKeys, featChoicesFor });
    expect(granted.map((entry) => entry.spellKey).sort()).toEqual(["burning-hands", "fire-bolt", "light"]);

    state = characterReducer(state, { type: "SET_CLASS_GRANTED_FEAT", level: 4, key: "fey-touched" });
    state = characterReducer(state, {
      type: "SET_CLASS_GRANTED_FEAT_ABILITY_INCREASES",
      level: 4,
      abilityIncreases: { cha: 1 },
    });
    state = characterReducer(state, {
      type: "SET_CLASS_GRANTED_FEAT_SPELL_PICK",
      level: 4,
      pickIndex: 0,
      spellKey: "sleep",
    });
    expect(state.classGrantedFeatChoices[4]?.spellPicks).toEqual(["sleep"]);
    const feyGranted = buildFeatGrantedSpells({
      activeFeatKeys: activeFeatKeysFromCharacter(state),
      featChoicesFor: featChoicesResolverForCharacter(state),
    });
    expect(feyGranted.map((entry) => entry.spellKey).sort()).toEqual(["misty-step", "sleep"]);
  });

  it("persists class-granted Magic Connoisseur L1 and L2 spell picks", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_FEAT", key: "magic-initiate-wizard" });
    state = characterReducer(state, { type: "SET_CLASS", key: "wizard" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "SET_CLASS_GRANTED_FEAT", level: 4, key: "magic-connoisseur" });
    expect(state.classGrantedFeatChoices[4]?.spellPicks).toHaveLength(2);

    state = characterReducer(state, {
      type: "SET_CLASS_GRANTED_FEAT_SPELL_PICK",
      level: 4,
      pickIndex: 0,
      spellKey: "burning-hands",
    });
    expect(state.classGrantedFeatChoices[4]?.spellPicks[0]).toBe("burning-hands");

    state = characterReducer(state, {
      type: "SET_CLASS_GRANTED_FEAT_SPELL_PICK",
      level: 4,
      pickIndex: 1,
      spellKey: "misty-step",
    });
    expect(state.classGrantedFeatChoices[4]?.spellPicks).toEqual(["burning-hands", "misty-step"]);

    const trackers = buildFeatSpellUseTrackers({
      activeFeatKeys: activeFeatKeysFromCharacter(state),
      featChoicesFor: featChoicesResolverForCharacter(state),
    });
    expect(trackers.map((tracker) => tracker.spellKey).sort()).toEqual(["burning-hands", "misty-step"]);
  });

  it("rejects duplicate spell picks across two magic initiate feats", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_SPECIES", key: "human" });
    state = characterReducer(state, { type: "SET_FEAT", key: "magic-initiate-wizard" });
    state = characterReducer(state, { type: "SET_EXTRA_FEAT", key: "magic-initiate-cleric" });
    state = characterReducer(state, { type: "SET_FEAT_CANTRIP_PICK", index: 0, spellKey: "fire-bolt" });
    const blocked = characterReducer(state, {
      type: "SET_EXTRA_FEAT_CANTRIP_PICK",
      featIndex: 0,
      pickIndex: 0,
      spellKey: "fire-bolt",
    });
    expect(blocked.extraFeatChoices[0]?.cantripPicks[0]).toBeNull();
  });
});

describe("characterReducer ability score method", () => {
  it("applies the class standard array when that method is selected", () => {
    const paladin = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "paladin" });
    const next = characterReducer(paladin, { type: "SET_ABILITY_SCORE_METHOD", method: "standardArray" });

    expect(next.abilityScoreMethod).toBe("standardArray");
    expect(next.abilityScores).toEqual({ str: 15, dex: 10, con: 13, int: 8, wis: 12, cha: 14 });
  });

  it("updates scores to the new class array while standard array stays selected", () => {
    const paladin = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "paladin" });
    const usingArray = characterReducer(paladin, { type: "SET_ABILITY_SCORE_METHOD", method: "standardArray" });
    const wizard = characterReducer(usingArray, { type: "SET_CLASS", key: "wizard" });

    expect(wizard.abilityScoreMethod).toBe("standardArray");
    expect(wizard.abilityScores).toEqual({ str: 8, dex: 12, con: 13, int: 15, wis: 14, cha: 10 });
  });

  it("leaves scores in place when switching from standard array to custom", () => {
    const paladin = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "paladin" });
    const usingArray = characterReducer(paladin, { type: "SET_ABILITY_SCORE_METHOD", method: "standardArray" });
    const next = characterReducer(usingArray, { type: "SET_ABILITY_SCORE_METHOD", method: "custom" });

    expect(next.abilityScoreMethod).toBe("custom");
    expect(next.abilityScores).toEqual(usingArray.abilityScores);
  });

  it("switches to custom when an ability score is typed while using the standard array", () => {
    const paladin = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "paladin" });
    const usingArray = characterReducer(paladin, { type: "SET_ABILITY_SCORE_METHOD", method: "standardArray" });
    const next = characterReducer(usingArray, { type: "SET_ABILITY_SCORE", ability: "str", value: 17 });

    expect(next.abilityScoreMethod).toBe("custom");
    expect(next.abilityScores.str).toBe(17);
    expect(next.abilityScores.dex).toBe(10);
  });

  it("leaves scores unchanged when the class is cleared while standard array is selected", () => {
    const paladin = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "paladin" });
    const usingArray = characterReducer(paladin, { type: "SET_ABILITY_SCORE_METHOD", method: "standardArray" });
    const cleared = characterReducer(usingArray, { type: "SET_CLASS", key: null });

    expect(cleared.abilityScoreMethod).toBe("standardArray");
    expect(cleared.abilityScores).toEqual(usingArray.abilityScores);
  });

  it("clamps scores into 8-15 when switching to point-buy", () => {
    const custom = characterReducer(INITIAL_CHARACTER, { type: "SET_ABILITY_SCORE", ability: "str", value: 18 });
    const over = characterReducer(custom, { type: "SET_ABILITY_SCORE", ability: "dex", value: 6 });
    const next = characterReducer(over, { type: "SET_ABILITY_SCORE_METHOD", method: "pointBuy" });

    expect(next.abilityScoreMethod).toBe("pointBuy");
    expect(next.abilityScores.str).toBe(15);
    expect(next.abilityScores.dex).toBe(8);
    expect(next.abilityScores.con).toBe(10);
  });

  it("stays on point-buy when an ability score is edited", () => {
    const pointBuy = characterReducer(INITIAL_CHARACTER, { type: "SET_ABILITY_SCORE_METHOD", method: "pointBuy" });
    const next = characterReducer(pointBuy, { type: "SET_ABILITY_SCORE", ability: "str", value: 14 });

    expect(next.abilityScoreMethod).toBe("pointBuy");
    expect(next.abilityScores.str).toBe(14);
    expect(next.abilityScores.dex).toBe(10);
  });
});

describe("characterReducer ability score increases", () => {
  function paladinWithStandardArray(): ReturnType<typeof characterReducer> {
    const paladin = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "paladin" });
    return characterReducer(paladin, { type: "SET_ABILITY_SCORE_METHOD", method: "standardArray" });
  }

  it("does not change method when extras are assigned on standard array", () => {
    const usingArray = paladinWithStandardArray();
    const next = characterReducer(usingArray, {
      type: "SET_ABILITY_SCORE_INCREASES",
      abilityScoreIncreases: { cha: 3 },
    });

    expect(next.abilityScoreMethod).toBe("standardArray");
    expect(next.abilityScores.cha).toBe(14);
    expect(next.abilityScoreIncreases.cha).toBe(3);
  });

  it("adds extras on top of generated scores in derived stats", () => {
    const usingArray = paladinWithStandardArray();
    const withExtras = characterReducer(usingArray, {
      type: "SET_ABILITY_SCORE_INCREASES",
      abilityScoreIncreases: { cha: 2, str: 1 },
    });
    const derived = computeDerivedStats(withExtras);

    expect(derived.abilityScores.cha).toBe(16);
    expect(derived.abilityModifiers.cha).toBe(3);
    expect(derived.abilityScores.str).toBe(16);
    expect(derived.abilityModifiers.str).toBe(3);
  });

  it("rejects increases over budget", () => {
    const usingArray = paladinWithStandardArray();
    const next = characterReducer(usingArray, {
      type: "SET_ABILITY_SCORE_INCREASES",
      abilityScoreIncreases: { cha: 2, str: 2 },
    });

    expect(next).toBe(usingArray);
  });

  it("keeps extras when class changes", () => {
    const usingArray = paladinWithStandardArray();
    const withExtras = characterReducer(usingArray, {
      type: "SET_ABILITY_SCORE_INCREASES",
      abilityScoreIncreases: { cha: 3 },
    });
    const wizard = characterReducer(withExtras, { type: "SET_CLASS", key: "wizard" });

    expect(wizard.abilityScoreIncreases.cha).toBe(3);
    expect(wizard.abilityScores.cha).toBe(10);
  });
});

describe("characterReducer hit points", () => {
  function paladin(): ReturnType<typeof characterReducer> {
    return characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "paladin" });
  }

  it("stores current HP below max and treats max as following the derived maximum", () => {
    const damaged = characterReducer(paladin(), { type: "SET_CURRENT_HIT_POINTS", value: 7 });
    expect(damaged.currentHitPoints).toBe(7);

    const healed = characterReducer(damaged, { type: "SET_CURRENT_HIT_POINTS", value: 10 });
    expect(healed.currentHitPoints).toBeNull();
  });

  it("clamps current HP down when Constitution lowers the maximum", () => {
    const hardy = characterReducer(paladin(), { type: "SET_ABILITY_SCORE", ability: "con", value: 16 });
    const damaged = characterReducer(hardy, { type: "SET_CURRENT_HIT_POINTS", value: 12 });
    expect(damaged.currentHitPoints).toBe(12);

    const lowered = characterReducer(damaged, { type: "SET_ABILITY_SCORE", ability: "con", value: 8 });
    expect(lowered.currentHitPoints).toBeNull();
  });

  it("keeps current HP when it is still below the new maximum", () => {
    const hardy = characterReducer(paladin(), { type: "SET_ABILITY_SCORE", ability: "con", value: 16 });
    const damaged = characterReducer(hardy, { type: "SET_CURRENT_HIT_POINTS", value: 5 });
    const lowered = characterReducer(damaged, { type: "SET_ABILITY_SCORE", ability: "con", value: 8 });
    expect(lowered.currentHitPoints).toBe(5);
  });

  it("ignores current HP changes before a class is selected", () => {
    const next = characterReducer(INITIAL_CHARACTER, { type: "SET_CURRENT_HIT_POINTS", value: 4 });
    expect(next).toBe(INITIAL_CHARACTER);
  });

  it("applies max HP bonus to current and effective max (Aid-style)", () => {
    const damaged = characterReducer(paladin(), { type: "SET_CURRENT_HIT_POINTS", value: 7 });
    const aided = characterReducer(damaged, { type: "APPLY_HIT_POINT_MAX_BONUS", amount: 5 });
    expect(aided.hitPointMaxBonus).toBe(5);
    expect(aided.currentHitPoints).toBe(12);
    expect(computeDerivedStats(aided).hitPoints).toBe(computeDerivedStats(damaged).hitPoints! + 5);
  });

  it("replaces max HP bonus and clears with clamp", () => {
    const damaged = characterReducer(paladin(), { type: "SET_CURRENT_HIT_POINTS", value: 7 });
    const aided = characterReducer(damaged, { type: "APPLY_HIT_POINT_MAX_BONUS", amount: 5 });
    const upcast = characterReducer(aided, { type: "APPLY_HIT_POINT_MAX_BONUS", amount: 10 });
    expect(upcast.hitPointMaxBonus).toBe(10);
    expect(upcast.currentHitPoints).toBe(17);

    const cleared = characterReducer(upcast, { type: "CLEAR_HIT_POINT_MAX_BONUS" });
    expect(cleared.hitPointMaxBonus).toBe(0);
    expect(cleared.currentHitPoints).toBe(7);
  });
});

describe("characterReducer death saving throws", () => {
  function paladin(): ReturnType<typeof characterReducer> {
    return characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "paladin" });
  }

  it("stores successes and failures independently, clamped to 0–3", () => {
    const withSuccesses = characterReducer(paladin(), {
      type: "SET_DEATH_SAVES",
      successes: 2,
    });
    expect(withSuccesses.deathSaveSuccesses).toBe(2);
    expect(withSuccesses.deathSaveFailures).toBe(0);

    const withBoth = characterReducer(withSuccesses, {
      type: "SET_DEATH_SAVES",
      failures: 1,
    });
    expect(withBoth.deathSaveSuccesses).toBe(2);
    expect(withBoth.deathSaveFailures).toBe(1);

    const clamped = characterReducer(withBoth, {
      type: "SET_DEATH_SAVES",
      successes: 5,
      failures: -2,
    });
    expect(clamped.deathSaveSuccesses).toBe(3);
    expect(clamped.deathSaveFailures).toBe(0);
  });

  it("clears both tracks when HP rises above 0", () => {
    const atZero = characterReducer(paladin(), { type: "SET_CURRENT_HIT_POINTS", value: 0 });
    const marked = characterReducer(atZero, {
      type: "SET_DEATH_SAVES",
      successes: 2,
      failures: 1,
    });

    const healed = characterReducer(marked, { type: "SET_CURRENT_HIT_POINTS", value: 5 });
    expect(healed.deathSaveSuccesses).toBe(0);
    expect(healed.deathSaveFailures).toBe(0);
  });

  it("preserves marks while HP stays at 0", () => {
    const atZero = characterReducer(paladin(), { type: "SET_CURRENT_HIT_POINTS", value: 0 });
    const marked = characterReducer(atZero, {
      type: "SET_DEATH_SAVES",
      successes: 1,
      failures: 2,
    });

    const stillZero = characterReducer(marked, { type: "SET_CURRENT_HIT_POINTS", value: 0 });
    expect(stillZero.deathSaveSuccesses).toBe(1);
    expect(stillZero.deathSaveFailures).toBe(2);
  });

  it("clears both tracks when reset explicitly", () => {
    const marked = characterReducer(paladin(), {
      type: "SET_DEATH_SAVES",
      successes: 3,
      failures: 2,
    });
    const reset = characterReducer(marked, {
      type: "SET_DEATH_SAVES",
      successes: 0,
      failures: 0,
    });
    expect(reset.deathSaveSuccesses).toBe(0);
    expect(reset.deathSaveFailures).toBe(0);
  });
});

describe("characterReducer heroic inspiration", () => {
  it("stores remaining uses clamped to 0–1", () => {
    const gained = characterReducer(INITIAL_CHARACTER, {
      type: "SET_HEROIC_INSPIRATION",
      value: 1,
    });
    expect(gained.heroicInspiration).toBe(1);

    const spent = characterReducer(gained, {
      type: "SET_HEROIC_INSPIRATION",
      value: 0,
    });
    expect(spent.heroicInspiration).toBe(0);

    const clamped = characterReducer(spent, {
      type: "SET_HEROIC_INSPIRATION",
      value: 5,
    });
    expect(clamped.heroicInspiration).toBe(1);
  });
});

describe("characterReducer hit dice", () => {
  function fighter(): ReturnType<typeof characterReducer> {
    return characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "fighter" });
  }

  it("stores remaining hit dice below max and treats max as following the derived maximum", () => {
    const spent = characterReducer(fighter(), { type: "SET_CURRENT_HIT_DICE", value: 0 });
    expect(spent.currentHitDice).toBe(0);

    const restored = characterReducer(spent, { type: "SET_CURRENT_HIT_DICE", value: 1 });
    expect(restored.currentHitDice).toBeNull();
  });

  it("ignores hit dice changes before a class is selected", () => {
    const next = characterReducer(INITIAL_CHARACTER, { type: "SET_CURRENT_HIT_DICE", value: 0 });
    expect(next).toBe(INITIAL_CHARACTER);
  });

  it("clamps hit dice to the valid range", () => {
    const spent = characterReducer(fighter(), { type: "SET_CURRENT_HIT_DICE", value: -1 });
    expect(spent.currentHitDice).toBe(0);

    const overMax = characterReducer(fighter(), { type: "SET_CURRENT_HIT_DICE", value: 5 });
    expect(overMax.currentHitDice).toBeNull();
  });
});

describe("characterReducer class feature uses", () => {
  function bard(): ReturnType<typeof characterReducer> {
    return characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "bard" });
  }

  it("stores remaining uses below max and treats max as the default", () => {
    const spent = characterReducer(bard(), { type: "SET_CLASS_FEATURE_USES", featureKey: "bardic-inspiration", value: 0 });
    expect(spent.classFeatureUses["bardic-inspiration"]).toBe(0);

    const restored = characterReducer(spent, { type: "SET_CLASS_FEATURE_USES", featureKey: "bardic-inspiration", value: 1 });
    expect(restored.classFeatureUses["bardic-inspiration"]).toBeUndefined();
  });

  it("clears uses when the class changes", () => {
    const spent = characterReducer(bard(), { type: "SET_CLASS_FEATURE_USES", featureKey: "bardic-inspiration", value: 0 });
    const fighter = characterReducer(spent, { type: "SET_CLASS", key: "fighter" });
    expect(fighter.classFeatureUses).toEqual({});
  });

  it("clamps bardic inspiration when Charisma drops", () => {
    const charismatic = characterReducer(bard(), { type: "SET_ABILITY_SCORE", ability: "cha", value: 16 });
    const spent = characterReducer(charismatic, {
      type: "SET_CLASS_FEATURE_USES",
      featureKey: "bardic-inspiration",
      value: 2,
    });
    expect(spent.classFeatureUses["bardic-inspiration"]).toBe(2);

    const weakened = characterReducer(spent, { type: "SET_ABILITY_SCORE", ability: "cha", value: 8 });
    expect(weakened.classFeatureUses["bardic-inspiration"]).toBeUndefined();
  });
});

describe("characterReducer currency and inventory", () => {
  it("sets a coin denomination to a non-negative integer", () => {
    const gold = characterReducer(INITIAL_CHARACTER, { type: "SET_CURRENCY", denomination: "gp", value: 15 });
    expect(gold.currency).toEqual({ pp: 0, gp: 15, ep: 0, sp: 0, cp: 0 });

    const clamped = characterReducer(gold, { type: "SET_CURRENCY", denomination: "sp", value: -3 });
    expect(clamped.currency.sp).toBe(0);
  });

  it("adds and removes miscellaneous inventory items", () => {
    const withLantern = characterReducer(INITIAL_CHARACTER, {
      type: "ADD_INVENTORY_ITEM",
      id: "lantern",
      name: "  Lantern  ",
      weightLb: 2,
      cost: { amount: 5, denomination: "sp" },
    });
    expect(withLantern.inventoryItems).toEqual([
      { id: "lantern", name: "Lantern", weightLb: 2, cost: { amount: 5, denomination: "sp" } },
    ]);

    const ignored = characterReducer(withLantern, {
      type: "ADD_INVENTORY_ITEM",
      id: "empty",
      name: "   ",
      weightLb: 1,
      cost: { amount: 1, denomination: "gp" },
    });
    expect(ignored).toBe(withLantern);

    const invalidWeight = characterReducer(withLantern, {
      type: "ADD_INVENTORY_ITEM",
      id: "bad",
      name: "Anvil",
      weightLb: -1,
      cost: { amount: 1, denomination: "gp" },
    });
    expect(invalidWeight).toBe(withLantern);

    const removed = characterReducer(withLantern, { type: "REMOVE_INVENTORY_ITEM", id: "lantern" });
    expect(removed.inventoryItems).toEqual([]);
  });

  it("adds and removes attuned magic items with a cap of three when carried in gear", () => {
    const notCarried = characterReducer(INITIAL_CHARACTER, {
      type: "ADD_ATTUNED_MAGIC_ITEM",
      itemKey: "cloak-of-protection",
    });
    expect(notCarried).toBe(INITIAL_CHARACTER);

    const withCloak = characterReducer(INITIAL_CHARACTER, { type: "ADD_ADVENTURING_GEAR", itemKey: "cloak-of-protection" });
    const first = characterReducer(withCloak, {
      type: "ADD_ATTUNED_MAGIC_ITEM",
      itemKey: "cloak-of-protection",
    });
    expect(first.attunedMagicItemKeys).toEqual(["cloak-of-protection"]);
    expect(first.adventuringGear).toEqual([{ key: "cloak-of-protection", quantity: 1 }]);

    const duplicate = characterReducer(first, { type: "ADD_ATTUNED_MAGIC_ITEM", itemKey: "cloak-of-protection" });
    expect(duplicate).toBe(first);

    const mundane = characterReducer(first, { type: "ADD_ATTUNED_MAGIC_ITEM", itemKey: "bag-of-holding" });
    expect(mundane).toBe(first);

    const withBracersGear = characterReducer(first, { type: "ADD_ADVENTURING_GEAR", itemKey: "bracers-of-archery" });
    const second = characterReducer(withBracersGear, { type: "ADD_ATTUNED_MAGIC_ITEM", itemKey: "bracers-of-archery" });
    const withGauntletsGear = characterReducer(second, { type: "ADD_ADVENTURING_GEAR", itemKey: "gauntlets-of-ogre-power" });
    const third = characterReducer(withGauntletsGear, {
      type: "ADD_ATTUNED_MAGIC_ITEM",
      itemKey: "gauntlets-of-ogre-power",
    });
    const withHeadbandGear = characterReducer(third, { type: "ADD_ADVENTURING_GEAR", itemKey: "headband-of-intellect" });
    const fourth = characterReducer(withHeadbandGear, {
      type: "ADD_ATTUNED_MAGIC_ITEM",
      itemKey: "headband-of-intellect",
    });
    expect(third.attunedMagicItemKeys).toHaveLength(3);
    expect(fourth.attunedMagicItemKeys).toHaveLength(3);
    expect(fourth.adventuringGear.some((entry) => entry.key === "headband-of-intellect")).toBe(true);

    const removed = characterReducer(third, { type: "REMOVE_ATTUNED_MAGIC_ITEM", itemKey: "bracers-of-archery" });
    expect(removed.attunedMagicItemKeys).toEqual(["cloak-of-protection", "gauntlets-of-ogre-power"]);
  });

  it("can carry more attunement items than attuned slots", () => {
    const keys = ["cloak-of-protection", "bracers-of-archery", "gauntlets-of-ogre-power", "headband-of-intellect"];
    let state = INITIAL_CHARACTER;
    for (const itemKey of keys) {
      state = characterReducer(state, { type: "ADD_ADVENTURING_GEAR", itemKey });
    }
    expect(state.adventuringGear).toHaveLength(4);
    state = characterReducer(state, { type: "ADD_ATTUNED_MAGIC_ITEM", itemKey: "cloak-of-protection" });
    state = characterReducer(state, { type: "ADD_ATTUNED_MAGIC_ITEM", itemKey: "bracers-of-archery" });
    state = characterReducer(state, { type: "ADD_ATTUNED_MAGIC_ITEM", itemKey: "gauntlets-of-ogre-power" });
    expect(state.attunedMagicItemKeys).toHaveLength(3);
    const blocked = characterReducer(state, { type: "ADD_ATTUNED_MAGIC_ITEM", itemKey: "headband-of-intellect" });
    expect(blocked).toBe(state);
    expect(blocked.adventuringGear.map((entry) => entry.key)).toEqual(keys);
  });

  it("clears attunement when carried gear is removed", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "ADD_ADVENTURING_GEAR", itemKey: "cloak-of-protection" });
    state = characterReducer(state, { type: "ADD_ATTUNED_MAGIC_ITEM", itemKey: "cloak-of-protection" });
    state = characterReducer(state, { type: "REMOVE_ADVENTURING_GEAR", itemKey: "cloak-of-protection" });
    expect(state.adventuringGear).toEqual([]);
    expect(state.attunedMagicItemKeys).toEqual([]);
  });

  it("adds and removes adventuring gear without a cap", () => {
    const withPack = characterReducer(INITIAL_CHARACTER, { type: "ADD_ADVENTURING_GEAR", itemKey: "backpack" });
    expect(withPack.adventuringGear).toEqual([{ key: "backpack", quantity: 1 }]);
    const withRope = characterReducer(withPack, { type: "ADD_ADVENTURING_GEAR", itemKey: "rope" });
    expect(withRope.adventuringGear).toEqual([{ key: "backpack", quantity: 1 }, { key: "rope", quantity: 1 }]);
    const duplicate = characterReducer(withRope, { type: "ADD_ADVENTURING_GEAR", itemKey: "backpack" });
    expect(duplicate).toBe(withRope);
    const moreRope = characterReducer(withRope, { type: "SET_ADVENTURING_GEAR_QUANTITY", itemKey: "rope", value: 3 });
    expect(moreRope.adventuringGear).toEqual([{ key: "backpack", quantity: 1 }, { key: "rope", quantity: 3 }]);
    const clearedRope = characterReducer(moreRope, { type: "SET_ADVENTURING_GEAR_QUANTITY", itemKey: "rope", value: 0 });
    expect(clearedRope.adventuringGear).toEqual([{ key: "backpack", quantity: 1 }]);
    const removed = characterReducer(withRope, { type: "REMOVE_ADVENTURING_GEAR", itemKey: "backpack" });
    expect(removed.adventuringGear).toEqual([{ key: "rope", quantity: 1 }]);

    const withBag = characterReducer(INITIAL_CHARACTER, { type: "ADD_ADVENTURING_GEAR", itemKey: "bag-of-holding" });
    expect(withBag.adventuringGear).toEqual([{ key: "bag-of-holding", quantity: 1 }]);
  });

  it("tracks remaining pack supplies and restocks when pack quantity increases", () => {
    const withPack = characterReducer(INITIAL_CHARACTER, { type: "ADD_ADVENTURING_GEAR", itemKey: "explorers-pack" });
    const spentOil = characterReducer(withPack, {
      type: "SET_PACK_CONTENT_REMAINING",
      packKey: "explorers-pack",
      itemKey: "oil",
      value: 0,
    });
    expect(spentOil.adventuringGear[0].packRemaining).toEqual({ oil: 0, rations: 10, torch: 10 });

    const doubled = characterReducer(spentOil, {
      type: "SET_ADVENTURING_GEAR_QUANTITY",
      itemKey: "explorers-pack",
      value: 2,
    });
    expect(doubled.adventuringGear[0]).toEqual({
      key: "explorers-pack",
      quantity: 2,
      packRemaining: { oil: 2, rations: 20, torch: 20 },
    });

    const ignored = characterReducer(withPack, {
      type: "SET_PACK_CONTENT_REMAINING",
      packKey: "explorers-pack",
      itemKey: "backpack",
      value: 0,
    });
    expect(ignored).toBe(withPack);
  });
});

describe("characterReducer ammunition and thrown quantity", () => {
  it("adds weapons with optional thrown quantity", () => {
    const withJavelins = characterReducer(INITIAL_CHARACTER, {
      type: "ADD_WEAPON",
      id: "j1",
      key: "javelin",
      quantity: 8,
    });
    expect(withJavelins.weapons).toEqual([{ id: "j1", key: "javelin", quantity: 8 }]);

    const withSword = characterReducer(withJavelins, {
      type: "ADD_WEAPON",
      id: "s1",
      key: "longsword",
    });
    expect(withSword.weapons[1]).toEqual({ id: "s1", key: "longsword", quantity: 1 });
  });

  it("stores optional variantKey on ADD_WEAPON and ADD_ARMOR without attuning", () => {
    const withWeapon = characterReducer(INITIAL_CHARACTER, {
      type: "ADD_WEAPON",
      id: "s1",
      key: "longsword",
      variantKey: "weapon-plus-1",
    });
    expect(withWeapon.weapons[0]).toEqual({
      id: "s1",
      key: "longsword",
      quantity: 1,
      variantKey: "weapon-plus-1",
    });
    expect(withWeapon.weapons[0].attuned).toBeUndefined();

    const withArmor = characterReducer(INITIAL_CHARACTER, {
      type: "ADD_ARMOR",
      id: "a1",
      key: "plate-armor",
      variantKey: "armor-plus-1",
    });
    expect(withArmor.armor[0].variantKey).toBe("armor-plus-1");
    expect(withArmor.armor[0].attuned).toBeUndefined();
  });

  it("updates thrown weapon quantity and clamps negatives to zero", () => {
    const withJavelins = characterReducer(INITIAL_CHARACTER, {
      type: "ADD_WEAPON",
      id: "j1",
      key: "javelin",
      quantity: 3,
    });
    const spent = characterReducer(withJavelins, { type: "SET_WEAPON_QUANTITY", id: "j1", value: 1 });
    expect(spent.weapons[0].quantity).toBe(1);

    const cleared = characterReducer(spent, { type: "SET_WEAPON_QUANTITY", id: "j1", value: -2 });
    expect(cleared.weapons[0].quantity).toBe(0);
  });

  it("adds ammunition packs and tracks remaining pieces", () => {
    const withArrows = characterReducer(INITIAL_CHARACTER, { type: "ADD_AMMUNITION_PACK", ammoType: "arrows" });
    expect(withArrows.ammunitionRemaining).toEqual({ arrows: 20 });

    const spent = characterReducer(withArrows, { type: "SET_AMMUNITION_REMAINING", ammoType: "arrows", value: 17 });
    expect(spent.ammunitionRemaining).toEqual({ arrows: 17 });

    const restocked = characterReducer(spent, { type: "ADD_AMMUNITION_PACK", ammoType: "arrows" });
    expect(restocked.ammunitionRemaining).toEqual({ arrows: 37 });
  });

  it("removes ammunition keys when remaining reaches zero", () => {
    const withBolts = characterReducer(INITIAL_CHARACTER, {
      type: "SET_AMMUNITION_REMAINING",
      ammoType: "bolts",
      value: 5,
    });
    const cleared = characterReducer(withBolts, { type: "SET_AMMUNITION_REMAINING", ammoType: "bolts", value: 0 });
    expect(cleared.ammunitionRemaining).toEqual({});
  });

  it("adds magic ammunition packs and tracks remaining pieces", () => {
    const withMagic = characterReducer(INITIAL_CHARACTER, {
      type: "ADD_MAGIC_AMMUNITION_PACK",
      id: "m1",
      ammoType: "arrows",
      variantKey: "ammunition-plus-1",
    });
    expect(withMagic.magicAmmunition).toEqual([
      { id: "m1", ammoType: "arrows", variantKey: "ammunition-plus-1", remaining: 20 },
    ]);

    const spent = characterReducer(withMagic, { type: "SET_MAGIC_AMMUNITION_REMAINING", id: "m1", value: 17 });
    expect(spent.magicAmmunition[0].remaining).toBe(17);

    const cleared = characterReducer(spent, { type: "SET_MAGIC_AMMUNITION_REMAINING", id: "m1", value: 0 });
    expect(cleared.magicAmmunition).toEqual([]);
  });

  it("removes magic ammunition stacks and clears preferred source", () => {
    const withMagic = characterReducer(INITIAL_CHARACTER, {
      type: "ADD_MAGIC_AMMUNITION_PACK",
      id: "m1",
      ammoType: "arrows",
      variantKey: "ammunition-plus-1",
    });
    const preferred = characterReducer(withMagic, {
      type: "SET_PREFERRED_AMMO_SOURCE",
      ammoType: "arrows",
      magicStackId: "m1",
    });
    expect(preferred.preferredAmmoSource).toEqual({ arrows: "m1" });

    const removed = characterReducer(preferred, { type: "REMOVE_MAGIC_AMMUNITION", id: "m1" });
    expect(removed.magicAmmunition).toEqual([]);
    expect(removed.preferredAmmoSource).toEqual({});
  });
});

describe("characterReducer Armory attunement", () => {
  function matchingRequiringWeapon(): { variantKey: string; weaponKey: string } | null {
    for (const variant of GENERIC_VARIANTS) {
      if (!variant.requiresAttunement) continue;
      const weapon = WEAPONS.find((item) => variantMatchesWeapon(variant, item));
      if (weapon) return { variantKey: variant.key, weaponKey: weapon.key };
    }
    return null;
  }

  function withCloaks(...keys: string[]) {
    return keys.reduce((state, itemKey) => {
      const withGear = characterReducer(state, { type: "ADD_ADVENTURING_GEAR", itemKey });
      return characterReducer(withGear, { type: "ADD_ATTUNED_MAGIC_ITEM", itemKey });
    }, INITIAL_CHARACTER);
  }

  it("shares the 3-slot cap with Cloak of Protection", () => {
    let state = withCloaks("cloak-of-protection", "bracers-of-archery");
    const catalogVariant = matchingRequiringWeapon();
    const variantKey = catalogVariant?.variantKey ?? "dazzling-weapon";
    const weaponKey = catalogVariant?.weaponKey ?? "longsword";
    state = characterReducer(state, {
      type: "ADD_WEAPON",
      id: "w1",
      key: weaponKey,
      variantKey,
    });
    if (!state.weapons[0]?.attuned) {
      state = characterReducer(state, { type: "SET_WEAPON_ATTUNED", id: "w1", attuned: true });
    }
    expect(state.weapons[0]?.attuned).toBe(true);
    expect(countAttunedSlots(state)).toBe(3);

    const blocked = characterReducer(state, {
      type: "ADD_ATTUNED_MAGIC_ITEM",
      itemKey: "gauntlets-of-ogre-power",
    });
    expect(blocked).toBe(state);
    expect(blocked.attunedMagicItemKeys).toEqual(["cloak-of-protection", "bracers-of-archery"]);
  });

  it("auto-attunes a requiring variant when a slot is free", () => {
    const catalogVariant = matchingRequiringWeapon();
    if (!catalogVariant) {
      const added = characterReducer(INITIAL_CHARACTER, {
        type: "ADD_WEAPON",
        id: "w1",
        key: "longsword",
        variantKey: "dazzling-weapon",
      });
      expect(added.weapons[0].attuned).toBeUndefined();
      const attuned = characterReducer(added, { type: "SET_WEAPON_ATTUNED", id: "w1", attuned: true });
      expect(attuned.weapons[0].attuned).toBe(true);
      expect(countAttunedSlots(attuned)).toBe(1);
      return;
    }

    const added = characterReducer(INITIAL_CHARACTER, {
      type: "ADD_WEAPON",
      id: "w1",
      key: catalogVariant.weaponKey,
      variantKey: catalogVariant.variantKey,
    });
    expect(added.weapons[0].attuned).toBe(true);
    expect(countAttunedSlots(added)).toBe(1);
  });

  it("adds a requiring variant unattuned when three slots are already used", () => {
    const full = withCloaks("cloak-of-protection", "bracers-of-archery", "gauntlets-of-ogre-power");
    expect(countAttunedSlots(full)).toBe(3);
    const catalogVariant = matchingRequiringWeapon();
    const variantKey = catalogVariant?.variantKey ?? "dazzling-weapon";
    const weaponKey = catalogVariant?.weaponKey ?? "longsword";
    const added = characterReducer(full, {
      type: "ADD_WEAPON",
      id: "w1",
      key: weaponKey,
      variantKey,
    });
    expect(added.weapons).toHaveLength(1);
    expect(added.weapons[0].attuned).toBeUndefined();
    const blockedToggle = characterReducer(added, { type: "SET_WEAPON_ATTUNED", id: "w1", attuned: true });
    expect(blockedToggle).toBe(added);

    const withArmor = characterReducer(full, {
      type: "ADD_ARMOR",
      id: "a1",
      key: "plate-armor",
      variantKey: "elven-chain",
    });
    const blockedArmor = characterReducer(withArmor, { type: "SET_ARMOR_ATTUNED", id: "a1", attuned: true });
    expect(blockedArmor.armor[0]?.attuned).toBeUndefined();
    expect(countAttunedSlots(blockedArmor)).toBe(3);
  });

  it("frees a slot when the attuned piece is removed", () => {
    let state = withCloaks("cloak-of-protection", "bracers-of-archery");
    const catalogVariant = matchingRequiringWeapon();
    const variantKey = catalogVariant?.variantKey ?? "dazzling-weapon";
    const weaponKey = catalogVariant?.weaponKey ?? "longsword";
    state = characterReducer(state, {
      type: "ADD_WEAPON",
      id: "w1",
      key: weaponKey,
      variantKey,
    });
    if (!state.weapons[0]?.attuned) {
      state = characterReducer(state, { type: "SET_WEAPON_ATTUNED", id: "w1", attuned: true });
    }
    expect(countAttunedSlots(state)).toBe(3);

    const removed = characterReducer(state, { type: "REMOVE_WEAPON", id: "w1" });
    expect(countAttunedSlots(removed)).toBe(2);
    const withGauntletsGear = characterReducer(removed, {
      type: "ADD_ADVENTURING_GEAR",
      itemKey: "gauntlets-of-ogre-power",
    });
    const withGauntlets = characterReducer(withGauntletsGear, {
      type: "ADD_ATTUNED_MAGIC_ITEM",
      itemKey: "gauntlets-of-ogre-power",
    });
    expect(withGauntlets.attunedMagicItemKeys).toEqual([
      "cloak-of-protection",
      "bracers-of-archery",
      "gauntlets-of-ogre-power",
    ]);
  });

  it("does not increment the attunement count for non-attune variants", () => {
    const plusWeapon = characterReducer(INITIAL_CHARACTER, {
      type: "ADD_WEAPON",
      id: "s1",
      key: "longsword",
      variantKey: "weapon-plus-1",
    });
    expect(plusWeapon.weapons[0].attuned).toBeUndefined();
    expect(countAttunedSlots(plusWeapon)).toBe(0);

    const plusArmor = characterReducer(INITIAL_CHARACTER, {
      type: "ADD_ARMOR",
      id: "a1",
      key: "plate-armor",
      variantKey: "armor-plus-1",
    });
    expect(plusArmor.armor[0].attuned).toBeUndefined();
    expect(countAttunedSlots(plusArmor)).toBe(0);

    const gleaming = findGenericVariant("armor-of-gleaming");
    if (gleaming && !gleaming.requiresAttunement) {
      const withGleaming = characterReducer(INITIAL_CHARACTER, {
        type: "ADD_ARMOR",
        id: "a2",
        key: "plate-armor",
        variantKey: "armor-of-gleaming",
      });
      expect(withGleaming.armor[0].attuned).toBeUndefined();
      expect(countAttunedSlots(withGleaming)).toBe(0);
    }
  });

  it.skipIf(!findGenericVariant("elven-chain"))(
    "rejects Elven Chain on a longsword when the matcher is available",
    () => {
      const elvenChain = findGenericVariant("elven-chain");
      const longsword = findByKey(WEAPONS, "longsword");
      expect(elvenChain).toBeTruthy();
      expect(longsword).toBeTruthy();
      expect(variantMatchesWeapon(elvenChain, longsword!)).toBe(false);
      const ignored = characterReducer(INITIAL_CHARACTER, {
        type: "ADD_WEAPON",
        id: "w1",
        key: "longsword",
        variantKey: "elven-chain",
      });
      expect(ignored).toBe(INITIAL_CHARACTER);
    },
  );
});

describe("characterReducer tool proficiencies", () => {
  it("suggests rogue thieves tools when class is set", () => {
    const rogue = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "rogue" });
    expect(rogue.classToolPicks).toEqual(["thieves-tools"]);
    expect(rogue.proficientTools).toEqual(["thieves-tools"]);
    expect(rogue.classToolsTouched).toBe(false);
  });

  it("suggests druid herbalism kit when class is set", () => {
    const druid = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "druid" });
    expect(druid.classToolPicks).toEqual(["herbalism-kit"]);
    expect(druid.proficientTools).toEqual(["herbalism-kit"]);
    expect(druid.classToolsTouched).toBe(false);
  });

  it("rejects bard class tool picks outside musical instruments", () => {
    const bard = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "bard" });
    const rejected = characterReducer(bard, {
      type: "SET_CLASS_TOOL_PICK",
      index: 0,
      tool: "disguise-kit",
    });
    expect(rejected.classToolPicks.every((pick) => pick === null)).toBe(true);
    const withPick = characterReducer(bard, {
      type: "SET_CLASS_TOOL_PICK",
      index: 0,
      tool: "musical-instrument-lute",
    });
    expect(withPick.proficientTools).toContain("musical-instrument-lute");
    expect(withPick.classToolsTouched).toBe(true);
  });

  it("resizes bard instrument picks when class changes", () => {
    const bard = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "bard" });
    expect(bard.classToolPicks).toHaveLength(3);
    expect(bard.classToolPicks.every((pick) => pick === null)).toBe(true);
  });

  it("suggests criminal thieves tools when background is set", () => {
    const criminal = characterReducer(INITIAL_CHARACTER, { type: "SET_BACKGROUND", key: "criminal" });
    expect(criminal.backgroundToolPicks).toEqual(["thieves-tools"]);
    expect(criminal.proficientTools).toEqual(["thieves-tools"]);
  });

  it("suggests soldier gaming set and restricts picks to gaming sets", () => {
    const soldier = characterReducer(INITIAL_CHARACTER, { type: "SET_BACKGROUND", key: "soldier" });
    expect(soldier.backgroundToolPicks).toHaveLength(1);
    expect(soldier.backgroundToolPicks[0]).not.toBeNull();
    const rejected = characterReducer(soldier, {
      type: "SET_BACKGROUND_TOOL_PICK",
      index: 0,
      tool: "disguise-kit",
    });
    expect(rejected.backgroundToolPicks).toEqual(soldier.backgroundToolPicks);
    const withPick = characterReducer(soldier, {
      type: "SET_BACKGROUND_TOOL_PICK",
      index: 0,
      tool: "gaming-set-playing-cards",
    });
    expect(withPick.proficientTools).toEqual(["gaming-set-playing-cards"]);
    expect(withPick.backgroundToolsTouched).toBe(true);
  });

  it("resets background tool picks when changing background", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_BACKGROUND", key: "criminal" });
    state = characterReducer(state, {
      type: "SET_BACKGROUND_TOOL_PICK",
      index: 0,
      tool: "disguise-kit",
    });
    state = characterReducer(state, { type: "SET_BACKGROUND", key: "acolyte" });
    expect(state.backgroundToolPicks).toEqual(["calligraphers-supplies"]);
    expect(state.backgroundToolsTouched).toBe(false);
  });

  it("deduplicates criminal rogue thieves tools in proficient list", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_BACKGROUND", key: "criminal" });
    state = characterReducer(state, { type: "SET_CLASS", key: "rogue" });
    expect(state.proficientTools).toEqual(["thieves-tools"]);
  });

  it("allows skilled feat to pick a tool instead of a skill", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_FEAT", key: "skilled" });
    state = characterReducer(state, {
      type: "SET_FEAT_PROFICIENCY_PICK",
      index: 0,
      pick: { kind: "tool", id: "disguise-kit" },
    });
    expect(state.proficientTools).toEqual(["disguise-kit"]);
    expect(state.skills.arcana).toBe("none");
  });

  it("reflects Skill Expert picks in the skills table", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_FEAT", key: "skill-expert" });
    state = characterReducer(state, {
      type: "SET_FEAT_PROFICIENCY_PICK",
      index: 0,
      pick: { kind: "skill", id: "arcana" },
    });
    expect(state.skills.arcana).toBe("proficient");
    state = characterReducer(state, {
      type: "SET_FEAT_PROFICIENCY_PICK",
      index: 1,
      pick: { kind: "skill", id: "arcana" },
    });
    expect(state.skills.arcana).toBe("expert");
  });

  it("reflects class-granted Skill Expert picks in the skills table", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "fighter" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "SET_CLASS_GRANTED_FEAT", level: 4, key: "skill-expert" });
    state = characterReducer(state, {
      type: "SET_CLASS_GRANTED_FEAT_PROFICIENCY_PICK",
      level: 4,
      pickIndex: 0,
      pick: { kind: "skill", id: "athletics" },
    });
    expect(state.skills.athletics).toBe("proficient");
    state = characterReducer(state, {
      type: "SET_CLASS_GRANTED_FEAT_PROFICIENCY_PICK",
      level: 4,
      pickIndex: 1,
      pick: { kind: "skill", id: "athletics" },
    });
    expect(state.skills.athletics).toBe("expert");
  });

  it("allows soldier background tool change away from the suggested gaming set", () => {
    const soldier = characterReducer(INITIAL_CHARACTER, { type: "SET_BACKGROUND", key: "soldier" });
    expect(soldier.backgroundToolPicks).toEqual(["gaming-set-dice"]);
    const withCards = characterReducer(soldier, {
      type: "SET_BACKGROUND_TOOL_PICK",
      index: 0,
      tool: "gaming-set-playing-cards",
    });
    expect(withCards.backgroundToolPicks).toEqual(["gaming-set-playing-cards"]);
    expect(withCards.backgroundToolsTouched).toBe(true);
  });

  it("allows musician feat instrument picks when the character already has bagpipes", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_BACKGROUND", key: "soldier" });
    state = { ...state, backgroundToolPicks: ["musical-instrument-bagpipes"] };
    state = characterReducer(state, { type: "SET_FEAT", key: "musician" });
    expect(state.featKey).toBe("musician");
    expect(state.backgroundToolPicks).toEqual(["musical-instrument-bagpipes"]);
    state = characterReducer(state, {
      type: "SET_FEAT_PROFICIENCY_PICK",
      index: 0,
      pick: { kind: "tool", id: "musical-instrument-lute" },
    });
    expect(state.featChoices.proficiencyPicks[0]).toEqual({ kind: "tool", id: "musical-instrument-lute" });
    state = characterReducer(state, {
      type: "SET_FEAT_PROFICIENCY_PICK",
      index: 0,
      pick: { kind: "tool", id: "musical-instrument-flute" },
    });
    expect(state.featChoices.proficiencyPicks[0]).toEqual({ kind: "tool", id: "musical-instrument-flute" });
    expect(state.proficientTools).toEqual([
      "musical-instrument-bagpipes",
      "musical-instrument-flute",
    ]);
  });

  it("allows musician feat to pick bagpipes when the character already has them", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_BACKGROUND", key: "soldier" });
    state = { ...state, backgroundToolPicks: ["musical-instrument-bagpipes"] };
    state = characterReducer(state, { type: "SET_FEAT", key: "musician" });
    state = characterReducer(state, {
      type: "SET_FEAT_PROFICIENCY_PICK",
      index: 0,
      pick: { kind: "tool", id: "musical-instrument-bagpipes" },
    });
    expect(state.featChoices.proficiencyPicks[0]).toEqual({ kind: "tool", id: "musical-instrument-bagpipes" });
    expect(state.proficientTools).toEqual(["musical-instrument-bagpipes"]);
  });

  it("rejects duplicate musician feat instrument picks across slots", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_FEAT", key: "musician" });
    state = characterReducer(state, {
      type: "SET_FEAT_PROFICIENCY_PICK",
      index: 0,
      pick: { kind: "tool", id: "musical-instrument-lute" },
    });
    const rejected = characterReducer(state, {
      type: "SET_FEAT_PROFICIENCY_PICK",
      index: 1,
      pick: { kind: "tool", id: "musical-instrument-lute" },
    });
    expect(rejected).toBe(state);
    expect(rejected.featChoices.proficiencyPicks[1]).toBeNull();
  });
});

describe("custom background", () => {
  it("grants no skills or feat until the player picks them", () => {
    const custom = characterReducer(INITIAL_CHARACTER, { type: "SET_BACKGROUND", key: CUSTOM_BACKGROUND_KEY });
    expect(custom.backgroundSkillPicks).toEqual([null, null]);
    expect(custom.backgroundToolPicks).toEqual([null]);
    expect(custom.featKey).toBeNull();
    expect(custom.skills.stealth).toBe("none");
    expect(custom.proficientTools).toEqual([]);
  });

  it("rejects custom background skills already granted by class picks", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "paladin" });
    state = characterReducer(state, { type: "SET_CLASS_SKILL_PICK", index: 0, skill: "athletics" });
    state = characterReducer(state, { type: "SET_BACKGROUND", key: CUSTOM_BACKGROUND_KEY });

    const rejected = characterReducer(state, { type: "SET_BACKGROUND_SKILL_PICK", index: 0, skill: "athletics" });
    expect(rejected).toBe(state);
    expect(rejected.classSkillPicks).toEqual(["athletics", null]);

    state = characterReducer(state, { type: "SET_BACKGROUND_SKILL_PICK", index: 0, skill: "persuasion" });
    state = characterReducer(state, { type: "SET_BACKGROUND_SKILL_PICK", index: 1, skill: "insight" });

    expect(state.skills.athletics).toBe("proficient");
    expect(state.skills.persuasion).toBe("proficient");
    expect(state.skills.insight).toBe("proficient");
    expect(state.classSkillPicks).toEqual(["athletics", null]);
  });

  it("applies a chosen background tool proficiency", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_BACKGROUND", key: CUSTOM_BACKGROUND_KEY });
    state = characterReducer(state, {
      type: "SET_BACKGROUND_TOOL_PICK",
      index: 0,
      tool: "thieves-tools",
    });
    expect(state.proficientTools).toEqual(["thieves-tools"]);
  });

  it("restores SRD background grants when switching away from custom", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_BACKGROUND", key: CUSTOM_BACKGROUND_KEY });
    state = characterReducer(state, { type: "SET_BACKGROUND_SKILL_PICK", index: 0, skill: "arcana" });
    state = characterReducer(state, { type: "SET_BACKGROUND_SKILL_PICK", index: 1, skill: "history" });
    state = characterReducer(state, { type: "SET_BACKGROUND", key: "sage" });

    expect(state.skills.arcana).toBe("proficient");
    expect(state.skills.history).toBe("proficient");
    expect(state.featKey).toBe("magic-initiate-wizard");
    expect(state.backgroundToolPicks).toEqual(["calligraphers-supplies"]);
  });

  it("stores a custom background name for display", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_BACKGROUND", key: CUSTOM_BACKGROUND_KEY });
    state = characterReducer(state, { type: "SET_CUSTOM_BACKGROUND_NAME", value: "Street Urchin" });
    const derived = computeDerivedStats(state);
    expect(derived.backgroundData?.name).toBe("Street Urchin");
  });
});

describe("characterReducer level up", () => {
  it("stores non-negative integer experience points", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_EXPERIENCE_POINTS", value: 20 });
    expect(state.experiencePoints).toBe(20);
    state = characterReducer(state, { type: "SET_EXPERIENCE_POINTS", value: -1 });
    expect(state.experiencePoints).toBe(20);
    state = characterReducer(state, { type: "SET_EXPERIENCE_POINTS", value: 1.5 });
    expect(state.experiencePoints).toBe(20);
  });

  it("keeps bard spell picks when leveling from 5 to 6", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "bard" });
    for (let step = 0; step < 4; step += 1) {
      state = characterReducer(state, { type: "LEVEL_UP" });
    }
    expect(state.level).toBe(5);
    const picks = [
      "dancing-lights",
      "mage-hand",
      "vicious-mockery",
      "cure-wounds",
      "detect-magic",
      "feather-fall",
      "healing-word",
      "sleep",
      "thunderwave",
    ];
    state = { ...state, cantripPicks: picks.slice(0, 3), spellPicks: picks.slice(3) };
    state = characterReducer(state, { type: "LEVEL_UP" });
    expect(state.level).toBe(6);
    expect(state.spellPicks).toEqual(picks.slice(3));
    expect(state.cantripPicks).toEqual(picks.slice(0, 3));
  });

  it("keeps spell picks across 5→6 level-up for every list mode", () => {
    const cases: {
      classKey: string;
      leveledSpell: string;
      cantrips: string[];
      spellbook?: boolean;
    }[] = [
      { classKey: "bard", leveledSpell: "cure-wounds", cantrips: ["vicious-mockery"] },
      { classKey: "cleric", leveledSpell: "cure-wounds", cantrips: ["guidance"] },
      { classKey: "druid", leveledSpell: "cure-wounds", cantrips: ["druidcraft"] },
      { classKey: "sorcerer", leveledSpell: "burning-hands", cantrips: ["fire-bolt"] },
      { classKey: "warlock", leveledSpell: "armor-of-agathys", cantrips: ["eldritch-blast"] },
      { classKey: "paladin", leveledSpell: "bless", cantrips: [] },
      { classKey: "wizard", leveledSpell: "burning-hands", cantrips: ["fire-bolt"], spellbook: true },
    ];

    for (const { classKey, leveledSpell, cantrips, spellbook } of cases) {
      for (const omitLevel6Slot of [false, true] as const) {
        const classData = findByKey(CLASSES, classKey)!;
        const savedLevel6SlotRow = classData.spellSlots?.byCharacterLevel[6];
        if (omitLevel6Slot && savedLevel6SlotRow !== undefined) {
          delete classData.spellSlots!.byCharacterLevel[6];
        }
        try {
          let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: classKey });
          while (state.level < 5) {
            state = characterReducer(state, { type: "LEVEL_UP" });
          }
          state = {
            ...state,
            cantripPicks: [...cantrips],
            spellPicks: [leveledSpell],
            ...(spellbook ? { spellbookPicks: [leveledSpell] } : {}),
          };
          state = characterReducer(state, { type: "LEVEL_UP" });
          expect(state.level).toBe(6);
          expect(state.cantripPicks).toEqual(cantrips);
          expect(state.spellPicks).toEqual([leveledSpell]);
          if (spellbook) {
            expect(state.spellbookPicks).toEqual([leveledSpell]);
          }
          if (spellbook) {
            expect(spellbookListKeys(classData, 6, null)).toContain(leveledSpell);
          } else {
            expect(preparedSpellPickOptions(classKey, 6)).toContain(leveledSpell);
          }
        } finally {
          if (omitLevel6Slot && savedLevel6SlotRow !== undefined) {
            classData.spellSlots!.byCharacterLevel[6] = savedLevel6SlotRow;
          }
        }
      }
    }
  });

  it("increments level through level 6 and caps there", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "fighter" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    expect(state.level).toBe(2);
    state = characterReducer(state, { type: "LEVEL_UP" });
    expect(state.level).toBe(3);
    state = characterReducer(state, { type: "LEVEL_UP" });
    expect(state.level).toBe(4);
    state = characterReducer(state, { type: "LEVEL_UP" });
    expect(state.level).toBe(5);
    state = characterReducer(state, { type: "LEVEL_UP" });
    expect(state.level).toBe(6);
    expect(characterReducer(state, { type: "LEVEL_UP" })).toBe(state);
  });

  it("stores a class-granted feat at level 4 and clears it when reverting below 4", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "wizard" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "SET_CLASS_GRANTED_FEAT", level: 4, key: "alert" });
    expect(state.classGrantedFeats[4]).toBe("alert");
    state = characterReducer(state, { type: "REVERT_LAST_LEVEL" });
    expect(state.level).toBe(3);
    expect(state.classGrantedFeats[4]).toBeUndefined();
    expect(state.classGrantedFeatChoices[4]).toBeUndefined();
  });

  it("reverts to level 1 and trims level-2 expertise picks", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "bard" });
    state = characterReducer(state, { type: "SET_CLASS_SKILL_PICK", index: 0, skill: "performance" });
    state = characterReducer(state, { type: "SET_CLASS_SKILL_PICK", index: 1, skill: "persuasion" });
    state = characterReducer(state, { type: "SET_CLASS_SKILL_PICK", index: 2, skill: "deception" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "SET_EXPERTISE_SKILL_PICK", index: 0, skill: "performance" });
    state = characterReducer(state, { type: "SET_EXPERTISE_SKILL_PICK", index: 1, skill: "persuasion" });
    state = characterReducer(state, { type: "REVERT_LAST_LEVEL" });
    expect(state.level).toBe(1);
    expect(state.expertiseSkillPicks).toEqual([]);
  });

  it("resets extra levels when the class changes", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "fighter" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "SET_CLASS", key: "wizard" });
    expect(state.level).toBe(1);
  });

  it("raises max HP when leveling up with current HP set", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "fighter" });
    state = characterReducer(state, { type: "SET_ABILITY_SCORE", ability: "con", value: 14 });
    const maxAt1 = computeDerivedStats(state).hitPoints!;
    state = characterReducer(state, { type: "SET_CURRENT_HIT_POINTS", value: maxAt1 - 2 });
    state = characterReducer(state, { type: "LEVEL_UP" });
    const maxAt2 = computeDerivedStats(state).hitPoints!;
    expect(state.currentHitPoints).toBe(maxAt2 - 2);
  });

  it("lets all SRD classes reach level 3", () => {
    for (const classKey of [
      "barbarian",
      "bard",
      "cleric",
      "druid",
      "fighter",
      "monk",
      "paladin",
      "ranger",
      "rogue",
      "sorcerer",
      "warlock",
      "wizard",
    ]) {
      let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: classKey });
      state = characterReducer(state, { type: "LEVEL_UP" });
      state = characterReducer(state, { type: "LEVEL_UP" });
      expect(state.level).toBe(3);
      expect(state.subclassKey).toBeNull();
    }
  });

  it("lets barbarian reach level 3 with berserker subclass and primal knowledge skill", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "barbarian" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    expect(state.level).toBe(3);
    expect(subclassesForClass("barbarian").map((entry) => entry.key)).toContain("path-of-the-berserker");
    expect(subclassesForClass("barbarian").length).toBeGreaterThanOrEqual(1);

    state = characterReducer(state, { type: "SET_SUBCLASS", key: "path-of-the-berserker" });
    expect(state.subclassKey).toBe("path-of-the-berserker");

    state = characterReducer(state, {
      type: "SET_CLASS_FEATURE_SKILL_PICK",
      featureKey: "primal-knowledge",
      index: 0,
      skill: "nature",
    });
    expect(state.skills.nature).toBe("proficient");

    const classData = findByKey(CLASSES, "barbarian")!;
    const trackers = buildClassFeatureUseTrackers(classData, 3, { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 });
    expect(trackers.find((tracker) => tracker.featureKey === "rage")?.maxUses).toBe(3);
  });

  it("stores Divine Order choice and adds a Thaumaturge cantrip slot", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "cleric" });
    expect(
      spellPickLimitsForClass(findByKey(CLASSES, "cleric"), { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }, 1)
        .cantripSlots,
    ).toBe(3);

    state = characterReducer(state, {
      type: "SET_CLASS_FEATURE_CHOICE",
      choiceKey: "divine-order",
      optionKey: "thaumaturge",
    });
    expect(state.classFeatureChoices).toEqual({ "divine-order": "thaumaturge" });
    expect(
      spellPickLimitsForClass(findByKey(CLASSES, "cleric"), { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }, 1, {
        "divine-order": "thaumaturge",
      }).cantripSlots,
    ).toBe(4);
    expect(computeDerivedStats(state).skillBonuses.arcana).toBe(0);
    expect(computeDerivedStats(state).skillBonuses.religion).toBe(0);

    state = characterReducer(state, {
      type: "SET_CLASS_FEATURE_CHOICE",
      choiceKey: "divine-order-skill",
      optionKey: "arcana",
    });
    expect(computeDerivedStats(state).skillBonuses.arcana).toBe(1);
    expect(computeDerivedStats(state).skillBonuses.religion).toBe(0);

    state = characterReducer(state, {
      type: "SET_CLASS_FEATURE_CHOICE",
      choiceKey: "divine-order",
      optionKey: "protector",
    });
    expect(
      spellPickLimitsForClass(findByKey(CLASSES, "cleric"), { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }, 1, {
        "divine-order": "protector",
      }).cantripSlots,
    ).toBe(3);
    expect(state.classFeatureChoices).toEqual({ "divine-order": "protector" });
    expect(computeDerivedStats(state).skillBonuses.arcana).toBe(0);
  });

  it("stores Primal Order choice and adds a Magician cantrip slot", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "druid" });
    expect(
      spellPickLimitsForClass(findByKey(CLASSES, "druid"), { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }, 1)
        .cantripSlots,
    ).toBe(2);

    state = characterReducer(state, {
      type: "SET_CLASS_FEATURE_CHOICE",
      choiceKey: "primal-order",
      optionKey: "magician",
    });
    expect(state.classFeatureChoices).toEqual({ "primal-order": "magician" });
    expect(
      spellPickLimitsForClass(findByKey(CLASSES, "druid"), { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }, 1, {
        "primal-order": "magician",
      }).cantripSlots,
    ).toBe(3);
    expect(computeDerivedStats(state).skillBonuses.nature).toBe(0);

    state = characterReducer(state, {
      type: "SET_CLASS_FEATURE_CHOICE",
      choiceKey: "primal-order-skill",
      optionKey: "nature",
    });
    expect(computeDerivedStats(state).skillBonuses.nature).toBe(1);

    state = characterReducer(state, {
      type: "SET_CLASS_FEATURE_CHOICE",
      choiceKey: "primal-order",
      optionKey: "warden",
    });
    expect(
      spellPickLimitsForClass(findByKey(CLASSES, "druid"), { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }, 1, {
        "primal-order": "warden",
      }).cantripSlots,
    ).toBe(2);
    expect(state.classFeatureChoices).toEqual({ "primal-order": "warden" });
    expect(computeDerivedStats(state).skillBonuses.nature).toBe(0);
  });

  it("adds Magician Wisdom bonus to proficient Nature (INT 13, WIS 18)", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "druid" });
    state = {
      ...state,
      abilityScores: { str: 8, dex: 14, con: 12, int: 13, wis: 18, cha: 10 },
    };
    state = characterReducer(state, { type: "SET_CLASS_SKILL_PICK", index: 0, skill: "nature" });
    state = characterReducer(state, {
      type: "SET_CLASS_FEATURE_CHOICE",
      choiceKey: "primal-order",
      optionKey: "magician",
    });
    state = characterReducer(state, {
      type: "SET_CLASS_FEATURE_CHOICE",
      choiceKey: "primal-order-skill",
      optionKey: "nature",
    });
    expect(computeDerivedStats(state).skillBonuses.nature).toBe(7);
  });

  it("reverts one level at a time and clears subclass state below level 3", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "paladin" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "SET_SUBCLASS", key: "oath-of-devotion" });
    state = characterReducer(state, { type: "SET_SUBCLASS_SKILL_PICK", index: 0, skill: "athletics" });
    state = characterReducer(state, { type: "REVERT_LAST_LEVEL" });
    expect(state.level).toBe(2);
    expect(state.subclassKey).toBeNull();
    expect(state.subclassSkillPicks).toEqual([]);
    state = characterReducer(state, { type: "REVERT_LAST_LEVEL" });
    expect(state.level).toBe(1);
  });
});

describe("characterReducer subclass choice", () => {
  it("does not auto-select a subclass at level 3", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "ranger" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    expect(subclassesForClass("ranger").length).toBeGreaterThanOrEqual(1);
    expect(state.subclassKey).toBeNull();
  });

  it("rejects subclass keys from another class", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "bard" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    expect(characterReducer(state, { type: "SET_SUBCLASS", key: "hunter" })).toBe(state);
  });

  it("grants lore skills and devotion oath spells after explicit picks", () => {
    let bard = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "bard" });
    bard = characterReducer(bard, { type: "LEVEL_UP" });
    bard = characterReducer(bard, { type: "LEVEL_UP" });
    bard = characterReducer(bard, { type: "SET_SUBCLASS", key: "college-of-lore" });
    bard = characterReducer(bard, { type: "SET_SUBCLASS_SKILL_PICK", index: 0, skill: "arcana" });
    bard = characterReducer(bard, { type: "SET_SUBCLASS_SKILL_PICK", index: 1, skill: "history" });
    bard = characterReducer(bard, { type: "SET_SUBCLASS_SKILL_PICK", index: 2, skill: "religion" });
    expect(bard.skills.arcana).toBe("proficient");
    expect(computeDerivedStats(bard).activeClassFeatures.some((feature) => feature.key === "cutting-words")).toBe(true);

    let paladin = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "paladin" });
    paladin = characterReducer(paladin, { type: "LEVEL_UP" });
    paladin = characterReducer(paladin, { type: "LEVEL_UP" });
    paladin = characterReducer(paladin, { type: "SET_SUBCLASS", key: "oath-of-devotion" });
    const granted = buildAllGrantedSpells({
      speciesCantrips: [],
      speciesPreparedSpells: [],
      classKey: paladin.classKey,
      subclassKey: paladin.subclassKey,
      level: paladin.level,
      activeFeatKeys: [],
      featChoicesFor: () => EMPTY_FEAT_CHOICES,
    });
    expect(granted.map((entry) => entry.spellKey)).toEqual([
      "protection-from-evil-and-good",
      "shield-of-faith",
      "divine-smite",
    ]);
    expect(preparedSpellPickOptions("paladin", 3, "oath-of-devotion")).not.toContain("shield-of-faith");
    expect(preparedSpellPickOptions("paladin", 3, "oath-of-devotion")).not.toContain("divine-smite");

    let ranger = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "ranger" });
    ranger = characterReducer(ranger, { type: "LEVEL_UP" });
    ranger = characterReducer(ranger, { type: "LEVEL_UP" });
    ranger = characterReducer(ranger, { type: "SET_SUBCLASS", key: "hunter" });
    ranger = characterReducer(ranger, {
      type: "SET_SUBCLASS_FEATURE_CHOICE",
      choiceKey: "hunters-prey",
      optionKey: "colossus-slayer",
    });
    expect(ranger.subclassFeatureChoices).toEqual({ "hunters-prey": "colossus-slayer" });
  });

  it("shows paladin channel divinity at level 3 before an oath is picked", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "paladin" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    const classData = findByKey(CLASSES, "paladin")!;
    const trackers = buildClassFeatureUseTrackers(classData, 3, { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 2 });
    expect(trackers.some((tracker) => tracker.featureKey === "channel-divinity")).toBe(true);
    expect(activeClassFeatures(classData, 3).some((feature) => feature.key === "channel-divinity")).toBe(true);
    expect(findSubclass("paladin", state.subclassKey)).toBeNull();
  });

  it("locks subclass after first pick", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "bard" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "SET_SUBCLASS", key: "college-of-lore" });
    state = characterReducer(state, { type: "SET_SUBCLASS_SKILL_PICK", index: 0, skill: "arcana" });

    const locked = state;
    state = characterReducer(state, { type: "SET_SUBCLASS", key: "college-of-valor" });
    expect(state).toBe(locked);
    expect(state.subclassKey).toBe("college-of-lore");
    expect(state.subclassSkillPicks).toEqual(["arcana", null, null]);

    state = characterReducer(state, { type: "SET_SUBCLASS", key: null });
    expect(state).toBe(locked);

    state = characterReducer(state, { type: "SET_SUBCLASS", key: "college-of-lore" });
    expect(state).toBe(locked);
    expect(state.subclassSkillPicks).toEqual(["arcana", null, null]);
  });

  it("stores hunter and land subclass feature choices", () => {
    let ranger = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "ranger" });
    ranger = characterReducer(ranger, { type: "LEVEL_UP" });
    ranger = characterReducer(ranger, { type: "LEVEL_UP" });
    ranger = characterReducer(ranger, { type: "SET_SUBCLASS", key: "hunter" });
    ranger = characterReducer(ranger, {
      type: "SET_SUBCLASS_FEATURE_CHOICE",
      choiceKey: "hunters-prey",
      optionKey: "colossus-slayer",
    });
    expect(ranger.subclassFeatureChoices).toEqual({ "hunters-prey": "colossus-slayer" });

    let druid = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "druid" });
    druid = characterReducer(druid, { type: "LEVEL_UP" });
    druid = characterReducer(druid, { type: "LEVEL_UP" });
    druid = characterReducer(druid, { type: "SET_SUBCLASS", key: "circle-of-the-land" });
    druid = characterReducer(druid, {
      type: "SET_SUBCLASS_FEATURE_CHOICE",
      choiceKey: "land-type",
      optionKey: "temperate",
    });
    expect(druid.subclassFeatureChoices).toEqual({ "land-type": "temperate" });
    expect(
      buildAllGrantedSpells({
        speciesCantrips: [],
        speciesPreparedSpells: [],
        classKey: druid.classKey,
        subclassKey: druid.subclassKey,
        subclassFeatureChoices: druid.subclassFeatureChoices,
        level: druid.level,
        activeFeatKeys: [],
        featChoicesFor: () => EMPTY_FEAT_CHOICES,
      }).some((entry) => entry.spellKey === "misty-step"),
    ).toBe(true);
  });

  it("excludes species and feat skills from lore subclass skill options", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_SPECIES", key: "human" });
    state = characterReducer(state, { type: "SET_CLASS", key: "bard" });
    state = characterReducer(state, {
      type: "SET_EXTRA_FEAT_PROFICIENCY_PICK",
      featIndex: 0,
      pickIndex: 0,
      pick: { kind: "skill", id: "persuasion" },
    });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "SET_SUBCLASS", key: "college-of-lore" });
    const rejected = characterReducer(state, {
      type: "SET_SUBCLASS_SKILL_PICK",
      index: 0,
      skill: "persuasion",
    });
    expect(rejected).toBe(state);
  });

  it("stores and applies paladin fighting style at level 2", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "paladin" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    expect(state.fightingStyleFeatKey).toBeNull();

    const rejected = characterReducer(state, { type: "SET_FIGHTING_STYLE_FEAT", key: "alert" });
    expect(rejected).toBe(state);

    state = characterReducer(state, { type: "SET_FIGHTING_STYLE_FEAT", key: "archery" });
    expect(state.fightingStyleFeatKey).toBe("archery");

    state = characterReducer(state, { type: "SET_FIGHTING_STYLE_FEAT", key: "defense" });
    expect(state.fightingStyleFeatKey).toBe("defense");

    state = characterReducer(state, {
      type: "ADD_ARMOR",
      id: "chain",
      key: "chain-mail",
    });
    const derived = computeDerivedStats(state);
    expect(derived.featContributions.acBonus).toBe(1);
    expect(derived.armorClass).toBe(17);
  });

  it("clears fighting style when reverting below the granted level", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "paladin" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "SET_FIGHTING_STYLE_FEAT", key: "defense" });
    state = characterReducer(state, { type: "REVERT_LAST_LEVEL" });
    expect(state.fightingStyleFeatKey).toBeNull();
  });

  it("keeps pact of the tome spell picks across level-ups", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "warlock" });
    const bookPicks = {
      cantrips: ["guidance", "mending", "message"],
      rituals: ["alarm", "detect-magic"],
    };
    state = {
      ...state,
      classFeatureOptionPicks: {
        "eldritch-invocations": ["pact-of-the-tome"],
      },
      classFeatureSpellPicks: {
        [PACT_OF_THE_TOME_SPELL_PICKS_KEY]: bookPicks,
      },
    };

    while (state.level < 5) {
      expect(state.classFeatureSpellPicks[PACT_OF_THE_TOME_SPELL_PICKS_KEY]).toEqual(bookPicks);
      expect(state.classFeatureOptionPicks["eldritch-invocations"]?.[0]).toBe("pact-of-the-tome");
      state = characterReducer(state, { type: "LEVEL_UP" });
    }
    expect(state.level).toBe(5);
    expect(state.classFeatureSpellPicks[PACT_OF_THE_TOME_SPELL_PICKS_KEY]).toEqual(bookPicks);
    expect(state.classFeatureOptionPicks["eldritch-invocations"]).toHaveLength(5);
    expect(state.classFeatureOptionPicks["eldritch-invocations"]?.[0]).toBe("pact-of-the-tome");
  });

  it("clears pact of the tome spell picks when swapping off the invocation", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "warlock" });
    state = {
      ...state,
      classFeatureOptionPicks: {
        "eldritch-invocations": ["pact-of-the-tome"],
      },
      classFeatureSpellPicks: {
        [PACT_OF_THE_TOME_SPELL_PICKS_KEY]: {
          cantrips: ["guidance", "mending", "message"],
          rituals: ["alarm", "detect-magic"],
        },
      },
    };

    state = characterReducer(state, {
      type: "SET_CLASS_FEATURE_OPTION_PICK",
      choiceKey: "eldritch-invocations",
      index: 0,
      optionKey: "eldritch-mind",
    });
    expect(state.classFeatureSpellPicks[PACT_OF_THE_TOME_SPELL_PICKS_KEY]).toBeUndefined();
  });

  it("keeps pact of the tome spell picks when reverting from level 2 to 1", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "warlock" });
    const bookPicks = {
      cantrips: ["guidance", "mending", "message"],
      rituals: ["alarm", "detect-magic"],
    };
    state = {
      ...state,
      classFeatureOptionPicks: {
        "eldritch-invocations": ["pact-of-the-tome"],
      },
      classFeatureSpellPicks: {
        [PACT_OF_THE_TOME_SPELL_PICKS_KEY]: bookPicks,
      },
    };
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "REVERT_LAST_LEVEL" });
    expect(state.level).toBe(1);
    expect(state.classFeatureSpellPicks[PACT_OF_THE_TOME_SPELL_PICKS_KEY]).toEqual(bookPicks);
    expect(state.classFeatureOptionPicks["eldritch-invocations"]).toEqual(["pact-of-the-tome"]);
  });

  it("stores invocation cantrip picks for Agonizing Blast", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "warlock" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = {
      ...state,
      cantripPicks: ["eldritch-blast"],
      classFeatureOptionPicks: {
        "eldritch-invocations": ["agonizing-blast", null, null],
      },
    };

    state = characterReducer(state, {
      type: "SET_CLASS_FEATURE_CHOICE",
      choiceKey: "agonizing-blast-0",
      optionKey: "eldritch-blast",
    });
    expect(state.classFeatureChoices).toEqual({ "agonizing-blast-0": "eldritch-blast" });

    state = characterReducer(state, {
      type: "SET_CLASS_FEATURE_OPTION_PICK",
      choiceKey: "eldritch-invocations",
      index: 0,
      optionKey: "repelling-blast",
    });
    expect(state.classFeatureChoices).toEqual({});
  });
});

describe("characterReducer multiclass spine", () => {
  function scores(overrides: Partial<Record<string, number>>) {
    return { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...overrides };
  }

  function withScores(state: ReturnType<typeof characterReducer>, overrides: Partial<Record<string, number>>) {
    let next = state;
    for (const [ability, value] of Object.entries(scores(overrides))) {
      next = characterReducer(next, { type: "SET_ABILITY_SCORE", ability: ability as "str", value });
    }
    return next;
  }

  it("SET_CLASS initializes levelPath to a single entry", () => {
    const state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "fighter" });
    expect(state.levelPath).toEqual(["fighter"]);
    expect(state.level).toBe(1);
    expect(state.classKey).toBe("fighter");
  });

  it("LEVEL_UP appends the primary class to levelPath", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "fighter" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    expect(state.levelPath).toEqual(["fighter", "fighter"]);
    expect(state.level).toBe(2);
  });

  it("LEVEL_UP appends the last class in levelPath when multiclassed", () => {
    let state = withScores(characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "wizard" }), {
      int: 14,
      dex: 13,
    });
    state = characterReducer(state, { type: "LEVEL_UP_CLASS", classKey: "fighter" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    expect(state.levelPath).toEqual(["wizard", "fighter", "fighter"]);
    expect(state.level).toBe(3);
  });

  it("CHANGE_LAST_LEVEL_CLASS updates the current level class when prerequisites pass", () => {
    let state = withScores(characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "rogue" }), {
      dex: 17,
      wis: 13,
    });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "CHANGE_LAST_LEVEL_CLASS", classKey: "ranger" });
    expect(state.levelPath).toEqual(["rogue", "ranger"]);
    expect(state.level).toBe(2);
  });

  it("CHANGE_LAST_LEVEL_CLASS rejects ability prerequisite failures", () => {
    let state = withScores(characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "rogue" }), {
      dex: 17,
      str: 10,
    });
    state = characterReducer(state, { type: "LEVEL_UP" });
    const before = state;
    state = characterReducer(state, { type: "CHANGE_LAST_LEVEL_CLASS", classKey: "barbarian" });
    expect(state).toBe(before);
    expect(state.levelPath).toEqual(["rogue", "rogue"]);
  });

  it("multiclassing into Ranger initializes per-class skill picks and applies them to skills", () => {
    let state = withScores(characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "rogue" }), {
      dex: 17,
      wis: 13,
    });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "CHANGE_LAST_LEVEL_CLASS", classKey: "ranger" });
    expect(state.classSkillPicksByClass.ranger).toEqual([null]);

    state = characterReducer(state, {
      type: "SET_CLASS_SKILL_PICK_BY_CLASS",
      classKey: "ranger",
      index: 0,
      skill: "survival",
    });
    expect(state.classSkillPicksByClass.ranger).toEqual(["survival"]);
    expect(state.skills.survival).toBe("proficient");
  });

  it("LEVEL_UP_CLASS adds a distinct class when prerequisites pass", () => {
    let state = withScores(characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "wizard" }), {
      int: 14,
      dex: 13,
      str: 10,
    });
    state = characterReducer(state, { type: "LEVEL_UP_CLASS", classKey: "fighter" });
    expect(state.levelPath).toEqual(["wizard", "fighter"]);
    expect(state.level).toBe(2);
    expect(state.classKey).toBe("wizard");
  });

  it("LEVEL_UP_CLASS rejects ability prerequisite failures", () => {
    let state = withScores(characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "barbarian" }), {
      str: 15,
      wis: 12,
    });
    const before = state;
    state = characterReducer(state, { type: "LEVEL_UP_CLASS", classKey: "druid" });
    expect(state).toBe(before);
  });

  it("LEVEL_UP_CLASS rejects at total level 6", () => {
    let state = withScores(characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "wizard" }), { int: 14 });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    state = characterReducer(state, { type: "LEVEL_UP" });
    expect(state.level).toBe(6);
    const before = state;
    state = characterReducer(state, { type: "LEVEL_UP_CLASS", classKey: "fighter" });
    expect(state).toBe(before);
  });

  it("REVERT_LAST_LEVEL pops the last levelPath entry", () => {
    let state = withScores(characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "wizard" }), {
      int: 14,
      dex: 13,
    });
    state = characterReducer(state, { type: "LEVEL_UP_CLASS", classKey: "fighter" });
    state = characterReducer(state, { type: "REVERT_LAST_LEVEL" });
    expect(state.levelPath).toEqual(["wizard"]);
    expect(state.level).toBe(1);
  });

  it("hydrates legacy single-class saves via sync on load", () => {
    const loaded = characterReducer(INITIAL_CHARACTER, {
      type: "LOAD_CHARACTER",
      character: {
        ...INITIAL_CHARACTER,
        classKey: "cleric",
        level: 3,
        levelPath: [],
      },
    });
    expect(loaded.levelPath).toEqual(["cleric", "cleric", "cleric"]);
    expect(loaded.level).toBe(3);
    expect(loaded.classKey).toBe("cleric");
  });
});

describe("level 5 mechanics", () => {
  function levelFighterTo(n: number) {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "fighter" });
    while (state.level < n) {
      state = characterReducer(state, { type: "LEVEL_UP" });
    }
    return state;
  }

  it("gives a level-5 fighter Extra Attack (2 attacks)", () => {
    const state = levelFighterTo(5);
    expect(computeDerivedStats(state).extraAttackCount).toBe(2);
  });

  it("keeps a level-5 rogue at one attack with 3d6 Sneak Attack", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "rogue" });
    while (state.level < 5) {
      state = characterReducer(state, { type: "LEVEL_UP" });
    }
    const derived = computeDerivedStats(state);
    expect(derived.extraAttackCount).toBe(0);
    expect(derived.classFeatureContributions.sneakAttackDice).toBe("3d6");
  });

  it("grants Thirsting Blade extra attack when that invocation is selected", () => {
    let state = characterReducer(INITIAL_CHARACTER, { type: "SET_CLASS", key: "warlock" });
    while (state.level < 5) {
      state = characterReducer(state, { type: "LEVEL_UP" });
    }
    state = {
      ...state,
      classFeatureOptionPicks: {
        "eldritch-invocations": ["thirsting-blade", null, null, null, null],
      },
    };
    expect(computeDerivedStats(state).extraAttackCount).toBe(2);
  });

  it("uses proficiency +3 on the derived sheet at character level 5", () => {
    const state = levelFighterTo(5);
    expect(computeDerivedStats(state).proficiencyBonus).toBe(3);
  });
});
