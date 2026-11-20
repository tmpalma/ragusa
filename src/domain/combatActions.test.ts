import { describe, expect, it } from "vitest";
import { findByKey, SPECIES } from "../data";
import type { AbilityId, FeatData } from "../data/types";
import { buildSpeciesFeatureActionCards } from "./speciesFeatures/cards";
import { activeSpeciesFeatures, collectSpeciesFeatureContributions } from "./speciesFeatures/contributions";
import { buildCombatActions, classifyActionEconomy } from "./combatActions";

const MODIFIERS: Record<AbilityId, number> = { str: 2, dex: 2, con: 0, int: 0, wis: 0, cha: 0 };
const SIMPLE_WEAPON_PROFICIENCY = [{ kind: "simple" as const }];
const SIMPLE_AND_MARTIAL_WEAPON_PROFICIENCY = [{ kind: "simple" as const }, { kind: "martial" as const }];

function featStub(key: string, name: string): FeatData {
  return { key, name, category: "General", desc: "", srd: false, book: "XPHB" };
}

function ids(cards: { id: string }[]): string[] {
  return cards.map((card) => card.id);
}

describe("classifyActionEconomy", () => {
  it("classifies Bonus Action text before other action mentions", () => {
    expect(classifyActionEconomy("You can take the Dash action as a Bonus Action.")).toBe("bonus");
  });

  it("classifies reactions and Attack-action replacements", () => {
    expect(classifyActionEconomy("When a creature hits you, you can use your Reaction to add +1 to AC.")).toBe(
      "reaction",
    );
    expect(
      classifyActionEconomy("When you take the Attack action on your turn, you can replace one of your attacks."),
    ).toBe("action");
  });

  it("returns null when there is no action-economy language", () => {
    expect(classifyActionEconomy("You have Darkvision with a range of 60 feet.")).toBeNull();
  });
});

describe("buildCombatActions", () => {
  it("includes standard 2024 actions, Unarmed Strike, and Opportunity Attack", () => {
    const lists = buildCombatActions({
      speciesKey: null,
      weapons: [],
      abilityModifiers: MODIFIERS,
      feats: [],
    });

    expect(ids(lists.actions)).toEqual([
      "unarmed-strike",
      "dash",
      "disengage",
      "dodge",
      "help",
      "hide",
      "influence",
      "magic",
      "ready",
      "search",
      "study",
      "utilize",
    ]);
    expect(ids(lists.reactions)).toContain("opportunity-attack");
    expect(ids(lists.bonusActions)).not.toContain("light-extra-attack");
  });

  it("orders owned weapons before Unarmed Strike and other actions", () => {
    const lists = buildCombatActions({
      speciesKey: null,
      weapons: [{ id: "w1", key: "dagger" }],
      abilityModifiers: MODIFIERS,
      feats: [],
    });

    expect(ids(lists.actions).slice(0, 3)).toEqual(["weapon-w1", "unarmed-strike", "dash"]);
    expect(ids(lists.actions)).not.toContain("attack");
  });

  it("adds a weapon Attack card and a Light bonus action when a Light weapon is owned", () => {
    const lists = buildCombatActions({
      speciesKey: null,
      weapons: [{ id: "w1", key: "dagger" }],
      abilityModifiers: MODIFIERS,
      feats: [],
      weaponProficiencyGrants: SIMPLE_WEAPON_PROFICIENCY,
    });

    const dagger = lists.actions.find((card) => card.id === "weapon-w1");
    expect(dagger?.entityKey).toBe("dagger");
    expect(dagger?.attackMeta).toEqual({
      bonus: "+4",
      damage: "1d4+2 Piercing",
      ability: "str",
      offHandDamage: "1d4 Piercing",
    });
    expect(ids(lists.bonusActions)).toContain("light-extra-attack");
  });

  it("omits off-hand damage on Light weapons with Two-Weapon Fighting", () => {
    const lists = buildCombatActions({
      speciesKey: null,
      weapons: [{ id: "w1", key: "dagger" }],
      abilityModifiers: MODIFIERS,
      feats: [],
      lightExtraAttackAddsAbilityMod: true,
      weaponProficiencyGrants: SIMPLE_WEAPON_PROFICIENCY,
    });

    const dagger = lists.actions.find((card) => card.id === "weapon-w1");
    expect(dagger?.attackMeta).toEqual({
      bonus: "+4",
      damage: "1d4+2 Piercing",
      ability: "str",
    });
    const lightExtra = lists.bonusActions.find((card) => card.id === "light-extra-attack");
    expect(lightExtra?.messageKey).toBe("combat.lightExtraAttackWithAbilityMod");
  });

  it("does not add the Light bonus action for a non-Light weapon", () => {
    const lists = buildCombatActions({
      speciesKey: null,
      weapons: [{ id: "w1", key: "battleaxe" }],
      abilityModifiers: MODIFIERS,
      feats: [],
    });

    expect(ids(lists.actions)).toContain("weapon-w1");
    expect(ids(lists.bonusActions)).not.toContain("light-extra-attack");
    const battleaxe = lists.actions.find((card) => card.id === "weapon-w1");
    expect(battleaxe?.attackMeta?.offHandDamage).toBeUndefined();
  });

  it("places species feature actions and feat cards into the matching action-economy column", () => {
    const dwarf = findByKey(SPECIES, "dwarf");
    const dragonborn = findByKey(SPECIES, "dragonborn");
    expect(dwarf && dragonborn).toBeTruthy();

    const dwarfActions = buildSpeciesFeatureActionCards({
      speciesData: dwarf,
      lineageKey: null,
      level: 1,
      contributions: collectSpeciesFeatureContributions(dwarf, null, 1),
      spellcastingAbility: null,
      formatMeta: (_key, params) => String(params?.type ?? ""),
    });
    const dragonbornActions = buildSpeciesFeatureActionCards({
      speciesData: dragonborn,
      lineageKey: "red",
      level: 1,
      contributions: collectSpeciesFeatureContributions(dragonborn, "red", 1),
      spellcastingAbility: null,
      formatMeta: () => "",
    });

    const lists = buildCombatActions({
      speciesKey: "dragonborn",
      weapons: [],
      abilityModifiers: MODIFIERS,
      feats: [
        {
          key: "shadow-touched-fake",
          name: "Test Feat",
          category: "Origin",
          desc: "You can become Invisible as a Bonus Action.",
          srd: false,
          book: "XPHB",
        } satisfies FeatData,
      ],
      speciesFeatureActions: {
        action: [...dwarfActions.action, ...dragonbornActions.action],
        bonus: [...dwarfActions.bonus, ...dragonbornActions.bonus],
        reaction: [...dwarfActions.reaction, ...dragonbornActions.reaction],
      },
    });

    expect(ids(lists.bonusActions)).toEqual(
      expect.arrayContaining(["species-feature-dwarf-stonecunning", "feat-shadow-touched-fake"]),
    );
    expect(ids(lists.actions)).toContain("species-feature-dragonborn-breath-weapon");
    expect(ids(lists.bonusActions)).not.toContain("species-feature-goliath-giant-ancestry");
  });

  it("adds Archery bonus only to ranged weapon attack cards", () => {
    const lists = buildCombatActions({
      speciesKey: null,
      weapons: [
        { id: "bow", key: "longbow" },
        { id: "dagger", key: "dagger" },
      ],
      abilityModifiers: MODIFIERS,
      feats: [],
      rangedAttackBonus: 2,
      weaponProficiencyGrants: SIMPLE_AND_MARTIAL_WEAPON_PROFICIENCY,
    });

    expect(lists.actions.find((card) => card.id === "weapon-bow")?.attackMeta?.bonus).toBe("+6");
    expect(lists.actions.find((card) => card.id === "weapon-bow")?.attackMeta?.ability).toBe("dex");
    expect(lists.actions.find((card) => card.id === "weapon-dagger")?.attackMeta?.bonus).toBe("+4");
    expect(lists.actions.find((card) => card.id === "weapon-dagger")?.attackMeta?.ability).toBe("str");
  });

  it("labels Strength on melee weapons that lack Finesse", () => {
    const modifiers: Record<AbilityId, number> = { str: 1, dex: 3, con: 0, int: 0, wis: 0, cha: 0 };
    const lists = buildCombatActions({
      speciesKey: null,
      weapons: [
        { id: "axe", key: "handaxe" },
        { id: "bow", key: "longbow" },
      ],
      abilityModifiers: modifiers,
      feats: [],
      weaponProficiencyGrants: SIMPLE_AND_MARTIAL_WEAPON_PROFICIENCY,
    });

    expect(lists.actions.find((card) => card.id === "weapon-axe")?.attackMeta).toEqual({
      bonus: "+3",
      damage: "1d6+1 Slashing",
      ability: "str",
      offHandDamage: "1d6 Slashing",
    });
    expect(lists.actions.find((card) => card.id === "weapon-bow")?.attackMeta?.ability).toBe("dex");
    expect(lists.actions.find((card) => card.id === "unarmed-strike")?.attackMeta?.ability).toBe("str");
  });

  it("omits proficiency for martial weapons when grants exclude martial", () => {
    const lists = buildCombatActions({
      speciesKey: null,
      weapons: [{ id: "axe", key: "battleaxe" }],
      abilityModifiers: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
      feats: [],
      weaponProficiencyGrants: SIMPLE_WEAPON_PROFICIENCY,
    });
    expect(lists.actions.find((card) => card.id === "weapon-axe")?.attackMeta?.bonus).toBe("0");
  });

  it("adds proficiency for martial weapons when Protector grants martial", () => {
    const lists = buildCombatActions({
      speciesKey: null,
      weapons: [{ id: "axe", key: "battleaxe" }],
      abilityModifiers: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
      feats: [],
      weaponProficiencyGrants: SIMPLE_AND_MARTIAL_WEAPON_PROFICIENCY,
    });
    expect(lists.actions.find((card) => card.id === "weapon-axe")?.attackMeta?.bonus).toBe("+2");
  });

  it("emits Polearm Master action cards from combat reference options", () => {
    const polearmMaster = featStub("polearm-master", "Polearm Master");
    expect(polearmMaster).toBeTruthy();
    const lists = buildCombatActions({
      speciesKey: null,
      weapons: [],
      abilityModifiers: MODIFIERS,
      feats: [polearmMaster!],
    });

    expect(lists.bonusActions.map((card) => card.id)).toContain("feat-polearm-master-pole-strike");
    expect(lists.reactions.map((card) => card.id)).toContain("feat-polearm-master-reactive-strike");
    expect(lists.bonusActions.find((card) => card.id === "feat-polearm-master-pole-strike")?.name).toBe(
      "Pole Strike",
    );
    expect(lists.reactions.find((card) => card.id === "feat-polearm-master-reactive-strike")?.name).toBe(
      "Reactive Strike",
    );
  });

  it("combines Sentinel reaction options on one card", () => {
    const sentinel = featStub("sentinel", "Sentinel");
    expect(sentinel).toBeTruthy();
    const lists = buildCombatActions({
      speciesKey: null,
      weapons: [],
      abilityModifiers: MODIFIERS,
      feats: [sentinel!],
    });
    expect(lists.reactions.filter((card) => card.entityKey === "sentinel")).toHaveLength(1);
    const card = lists.reactions.find((card) => card.id === "feat-sentinel-reaction");
    expect(card?.referenceOptions?.map((option) => option.key)).toEqual(["guardian", "halt"]);
  });

  it("uses Intelligence for Battle Smith magic weapon attacks", () => {
    const battleSmithMods = { str: 0, dex: 2, con: 0, int: 4, wis: 0, cha: 0 };
    const lists = buildCombatActions({
      speciesKey: null,
      weapons: [{ id: "w1", key: "heavy-crossbow", variantKey: "weapon-plus-1", attuned: true }],
      abilityModifiers: battleSmithMods,
      feats: [],
      weaponProficiencyGrants: SIMPLE_AND_MARTIAL_WEAPON_PROFICIENCY,
      battleSmithMagicWeaponAttacks: true,
    });
    const card = lists.actions.find((entry) => entry.id === "weapon-w1");
    expect(card?.attackMeta?.ability).toBe("int");
    expect(card?.attackMeta?.bonus).toBe("+7");
    expect(card?.attackMeta?.damage).toBe("1d10+5 Piercing");
  });
});

describe("activeSpeciesFeatures", () => {
  it("includes lineage features only when lineage is chosen", () => {
    const elf = findByKey(SPECIES, "elf");
    expect(elf).toBeTruthy();
    const withoutLineage = activeSpeciesFeatures(elf, null, 1);
    const withWoodElf = activeSpeciesFeatures(elf, "wood-elf", 1);

    expect(withoutLineage.some((feature) => feature.key === "wood-elf-speed")).toBe(false);
    expect(withWoodElf.some((feature) => feature.key === "wood-elf-speed")).toBe(true);
  });

  it("gates lineage spells by character level", () => {
    const elf = findByKey(SPECIES, "elf");
    expect(elf).toBeTruthy();
    const level1 = activeSpeciesFeatures(elf, "high-elf", 1);
    const level3 = activeSpeciesFeatures(elf, "high-elf", 3);

    expect(level1.some((feature) => feature.key === "high-elf-spell-3")).toBe(false);
    expect(level3.some((feature) => feature.key === "high-elf-spell-3")).toBe(true);
  });
});

describe("collectSpeciesFeatureContributions", () => {
  it("applies Wood Elf speed and Drow darkvision", () => {
    const elf = findByKey(SPECIES, "elf");
    expect(elf).toBeTruthy();

    const woodElf = collectSpeciesFeatureContributions(elf, "wood-elf", 1);
    expect(woodElf.walkSpeedFeet).toBe(35);

    const drow = collectSpeciesFeatureContributions(elf, "drow", 1);
    expect(drow.darkvisionFeet).toBe(120);
  });

  it("adds Dwarf HP per level", () => {
    const dwarf = findByKey(SPECIES, "dwarf");
    expect(dwarf).toBeTruthy();
    expect(collectSpeciesFeatureContributions(dwarf, null, 1).hpPerLevel).toBe(1);
  });

  it("adds Dragonborn damage resistance from ancestry", () => {
    const dragonborn = findByKey(SPECIES, "dragonborn");
    expect(dragonborn).toBeTruthy();
    const contributions = collectSpeciesFeatureContributions(dragonborn, "red", 1);
    expect(contributions.damageResistances).toContain("Fire");
  });
});
