import type { FeatDefinition, FeatCombatReferenceOption } from "./featEffects.js";
import { SKILLS } from "../data/skills.js";
import type { AbilityId, ActionTiming } from "../data/types";

const ASI_INT_WIS_CHA = {
  type: "ability_score_increase" as const,
  points: 1,
  maxScore: 20,
  allowedAbilities: ["int", "wis", "cha"] as AbilityId[],
};

const GREATER_MARK_PREREQS: Record<string, string> = {
  "greater-aberrant-mark": "aberrant-dragonmark",
  "greater-mark-of-detection": "mark-of-detection",
  "greater-mark-of-finding": "mark-of-finding",
  "greater-mark-of-handling": "mark-of-handling",
  "greater-mark-of-healing": "mark-of-healing",
  "greater-mark-of-hospitality": "mark-of-hospitality",
  "greater-mark-of-making": "mark-of-making",
  "greater-mark-of-passage": "mark-of-passage",
  "greater-mark-of-scribing": "mark-of-scribing",
  "greater-mark-of-sentinel": "mark-of-sentinel",
  "greater-mark-of-shadow": "mark-of-shadow",
  "greater-mark-of-storm": "mark-of-storm",
  "greater-mark-of-warding": "mark-of-warding",
};

function adeptFixedGrants(spells: { spellKey: string; minSlotLevel: number }[]) {
  return {
    type: "grant_spells" as const,
    fixedSpellGrants: spells,
    cantripCount: 0,
    inheritAbilityFromAsi: true,
    freeCast: "none" as const,
  };
}

function adeptExtraAbility(
  key: string,
  name: string,
  desc: string,
  actionTiming?: ActionTiming,
): { type: "combat_reference_options"; intro: string; options: FeatCombatReferenceOption[] } {
  return {
    type: "combat_reference_options",
    intro: "",
    options: [{ key, name, desc, ...(actionTiming ? { actionTiming } : {}) }],
  };
}

const ALL_SKILL_IDS = SKILLS.map((skill) => skill.id);

/** Patches applied over extract stubs for imported-book mechanics. */
export const POST2024_FEAT_MECHANICS: Partial<FeatDefinition>[] = [
  {
    featKey: "arcane-warrior",
    prerequisites: [{ type: "fighting_style_feature" }],
    effects: [
      {
        type: "grant_spells",
        spellList: "wizard",
        cantripCount: 2,
        spellLevel: 0,
        inheritAbilityFromAsi: true,
        freeCast: "none",
      },
      { type: "narrative" },
    ],
  },
  {
    featKey: "vampire-touched",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      ASI_INT_WIS_CHA,
      {
        type: "grant_spells",
        fixedSpellKeys: ["spider-climb"],
        schools: ["enchantment", "illusion"],
        spellLevel: 1,
        spellPickCount: 1,
        cantripCount: 0,
        freeCast: "eachGranted",
        inheritAbilityFromAsi: true,
      },
      { type: "narrative" },
    ],
  },
  {
    featKey: "potent-dragonmark",
    prerequisites: [{ type: "level", min: 4 }, { type: "feat_category", category: "Dragonmark" }],
    effects: [ASI_INT_WIS_CHA, { type: "narrative" }],
  },
  {
    featKey: "dragonscarred",
    prerequisites: [{ type: "level", min: 4 }, { type: "feat", featKeys: ["cult-of-the-dragon-initiate"] }],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["con", "cha"] },
      { type: "resistance", damageTypes: ["acid", "cold", "fire", "lightning", "poison"], chooseDamageType: true },
      { type: "narrative" },
    ],
    combatSurface: true,
    actionTiming: "bonus",
  },
  {
    featKey: "purple-dragon-commandant",
    prerequisites: [{ type: "level", min: 4 }, { type: "feat", featKeys: ["purple-dragon-rook"] }, { type: "martial_weapon_proficiency" }],
    effects: [{ type: "narrative" }],
    combatSurface: true,
    actionTiming: "bonus",
  },
  {
    featKey: "spellfire-adept",
    prerequisites: [{ type: "level", min: 4 }, { type: "feat", featKeys: ["spellfire-spark"] }],
    effects: [{ type: "narrative" }],
  },
  {
    featKey: "harper-teamwork",
    prerequisites: [{ type: "level", min: 4 }, { type: "feat", featKeys: ["harper-agent"] }],
    effects: [{ type: "narrative" }],
  },
  {
    featKey: "genie-magic",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      ASI_INT_WIS_CHA,
      {
        type: "limited_uses",
        formula: { kind: "fixed", uses: 1 },
        restRecovery: "long",
        uiSurface: "combat",
      },
      {
        type: "combat_reference_options",
        intro: "",
        options: [
          {
            key: "wish-magic",
            name: "Wish Magic",
            desc: "As a Magic action, you can cast a level 1 spell that has a casting time of an action. Once you use this benefit, you can't do so again until you finish a Long Rest. The spell's spellcasting ability is the ability increased by this feat. When you reach level 11, the spell you cast with this feat is cast as though using a level 2 spell slot. When you reach level 17, the spell is cast as though using a level 3 spell slot.",
          },
        ],
      },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "fairy-trickster",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["dex", "cha"] },
      { type: "limited_uses", formula: "proficiency_bonus", restRecovery: "long" },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "abjuration-adept",
    effects: [
      ASI_INT_WIS_CHA,
      adeptFixedGrants([
        { spellKey: "shield", minSlotLevel: 1 },
        { spellKey: "lesser-restoration", minSlotLevel: 2 },
        { spellKey: "protection-from-energy", minSlotLevel: 3 },
        { spellKey: "banishment", minSlotLevel: 4 },
        { spellKey: "mass-cure-wounds", minSlotLevel: 5 },
      ]),
      adeptExtraAbility(
        "protective-ward",
        "Protective Ward",
        "When you cast an Abjuration spell using a spell slot, you can choose a creature within 30 feet of yourself. That creature gains Temporary Hit Points equal to twice your Proficiency Bonus.",
      ),
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "conjuration-adept",
    effects: [
      ASI_INT_WIS_CHA,
      adeptFixedGrants([
        { spellKey: "entangle", minSlotLevel: 1 },
        { spellKey: "misty-step", minSlotLevel: 2 },
        { spellKey: "conjure-animals", minSlotLevel: 3 },
        { spellKey: "dimension-door", minSlotLevel: 4 },
        { spellKey: "conjure-elemental", minSlotLevel: 5 },
      ]),
      adeptExtraAbility(
        "persistent-conjuration",
        "Persistent Conjuration",
        "While maintaining Concentration on a spell from the Conjuration school, you gain a bonus to Constitution saving throws to maintain this Concentration equal to the ability modifier of the score increased by this feat.",
      ),
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "divination-adept",
    effects: [
      ASI_INT_WIS_CHA,
      adeptFixedGrants([
        { spellKey: "detect-evil-and-good", minSlotLevel: 1 },
        { spellKey: "mind-spike", minSlotLevel: 2 },
        { spellKey: "clairvoyance", minSlotLevel: 3 },
        { spellKey: "divination", minSlotLevel: 4 },
        { spellKey: "scrying", minSlotLevel: 5 },
      ]),
      { type: "limited_uses", formula: { kind: "fixed", uses: 1 }, restRecovery: "long" },
      adeptExtraAbility(
        "prescient-intervention",
        "Prescient Intervention",
        "When a creature you can see within 60 feet of yourself makes a D20 Test, you can take a Reaction to give that creature Advantage or Disadvantage (your choice) on that roll. Once you use this benefit, you can't use it again until you finish a Long Rest. You can also regain use of this feature when you cast a spell from the Divination school using a spell slot.",
        "reaction",
      ),
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "enchantment-adept",
    effects: [
      ASI_INT_WIS_CHA,
      adeptFixedGrants([
        { spellKey: "dissonant-whispers", minSlotLevel: 1 },
        { spellKey: "enthrall", minSlotLevel: 2 },
        { spellKey: "hold-person", minSlotLevel: 3 },
        { spellKey: "dominate-beast", minSlotLevel: 4 },
        { spellKey: "modify-memory", minSlotLevel: 5 },
      ]),
      adeptExtraAbility(
        "subtle-enchantments",
        "Subtle Enchantments",
        "When you cast an Enchantment spell using a spell slot, you can cast it without Somatic or Verbal components.",
      ),
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "evocation-adept",
    effects: [
      ASI_INT_WIS_CHA,
      adeptFixedGrants([
        { spellKey: "chromatic-orb", minSlotLevel: 1 },
        { spellKey: "shatter", minSlotLevel: 2 },
        { spellKey: "fireball", minSlotLevel: 3 },
        { spellKey: "vitriolic-sphere", minSlotLevel: 4 },
        { spellKey: "wall-of-force", minSlotLevel: 5 },
      ]),
      adeptExtraAbility(
        "fueled-evocation",
        "Fueled Evocation",
        "When you cast an Evocation spell using a spell slot, you can add your spellcasting ability modifier to one damage roll of that spell.",
      ),
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "illusion-adept",
    effects: [
      ASI_INT_WIS_CHA,
      adeptFixedGrants([
        { spellKey: "silent-image", minSlotLevel: 1 },
        { spellKey: "phantasmal-force", minSlotLevel: 2 },
        { spellKey: "major-image", minSlotLevel: 3 },
        { spellKey: "hallucinatory-terrain", minSlotLevel: 4 },
        { spellKey: "seeming", minSlotLevel: 5 },
      ]),
      adeptExtraAbility(
        "masterful-illusions",
        "Masterful Illusions",
        "When you cast an Illusion spell using a spell slot, you can choose one creature that failed the saving throw against the spell. The creature has the Charmed condition for 1 minute or until you or your allies damage it.",
      ),
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "necromancy-adept",
    effects: [
      ASI_INT_WIS_CHA,
      adeptFixedGrants([
        { spellKey: "inflict-wounds", minSlotLevel: 1 },
        { spellKey: "ray-of-enfeeblement", minSlotLevel: 2 },
        { spellKey: "vampiric-touch", minSlotLevel: 3 },
        { spellKey: "blight", minSlotLevel: 4 },
        { spellKey: "raise-dead", minSlotLevel: 5 },
      ]),
      adeptExtraAbility(
        "life-manipulation",
        "Life Manipulation",
        "When you cast a Necromancy spell using a spell slot, you can have the spell deal maximum damage instead of rolling.",
      ),
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "transmutation-adept",
    effects: [
      ASI_INT_WIS_CHA,
      adeptFixedGrants([
        { spellKey: "jump", minSlotLevel: 1 },
        { spellKey: "spider-climb", minSlotLevel: 2 },
        { spellKey: "slow", minSlotLevel: 3 },
        { spellKey: "polymorph", minSlotLevel: 4 },
        { spellKey: "animate-objects", minSlotLevel: 5 },
      ]),
      adeptExtraAbility(
        "magical-augmentation",
        "Magical Augmentation",
        "When you cast a Transmutation spell using a spell slot, you can target an additional creature within range.",
      ),
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "cloying-mists",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      ASI_INT_WIS_CHA,
      {
        type: "grant_spells",
        fixedSpellKeys: ["fog-cloud"],
        cantripCount: 0,
        inheritAbilityFromAsi: true,
        freeCast: "eachGranted",
      },
      adeptExtraAbility(
        "grasping-mist",
        "Grasping Mist",
        "Whenever you cast Fog Cloud, nonmagical flames in the spell's Sphere are extinguished, and creatures other than you and your allies have their Speed reduced by 5 feet while in the spell's Sphere.",
      ),
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "cold-caster",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      ASI_INT_WIS_CHA,
      {
        type: "grant_spells",
        fixedSpellKeys: ["ray-of-frost"],
        cantripCount: 0,
        inheritAbilityFromAsi: true,
        freeCast: "none",
      },
      adeptExtraAbility(
        "frostbite",
        "Frostbite",
        "Once per turn when you hit a creature with an attack roll and deal Cold damage, you can temporarily negate the creature's defenses. The creature subtracts 1d4 from the next saving throw it makes before the end of your next turn.",
      ),
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "enclave-magic",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      ASI_INT_WIS_CHA,
      {
        type: "grant_spells",
        fixedSpellKeys: ["beast-sense"],
        cantripCount: 0,
        inheritAbilityFromAsi: true,
        freeCast: "eachGranted",
      },
      adeptExtraAbility(
        "friend-to-animals",
        "Friend to Animals",
        "You have Advantage on Charisma checks to influence Beasts, and Beasts have Disadvantage on attack rolls against you unless you have attacked them within the past 10 minutes.",
      ),
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "light-bringer",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      ASI_INT_WIS_CHA,
      {
        type: "grant_spells",
        fixedSpellKeys: ["light"],
        cantripCount: 0,
        inheritAbilityFromAsi: true,
        freeCast: "none",
      },
      {
        type: "combat_reference_options",
        options: [
          {
            key: "suns-healing",
            name: "Sun's Healing",
            desc: "As a Bonus Action while within sunlight, you can expend one of your Hit Point Dice, roll the die, and regain a number of Hit Points equal to the roll. Once you use this benefit, you can't use it again until you finish a Short or Long Rest.",
            actionTiming: "bonus",
          },
          {
            key: "solar-luminance",
            name: "Solar Luminance",
            desc: "When you cast Light, you can have the light from the spell be sunlight. Once you use this benefit, you can't use it again until you finish a Long Rest.",
          },
        ],
      },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "treacherous-allure",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      ASI_INT_WIS_CHA,
      {
        type: "grant_spells",
        fixedSpellKeys: ["charm-person"],
        cantripCount: 0,
        inheritAbilityFromAsi: true,
        freeCast: "eachGranted",
      },
      adeptExtraAbility(
        "inevitable-betrayal",
        "Inevitable Betrayal",
        "When a creature you Charmed makes an attack roll, it has Advantage on the roll if the target isn't you. When the Charmed condition ends on the creature, it knows you Charmed it.",
      ),
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "warlike-familiar",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      ASI_INT_WIS_CHA,
      {
        type: "grant_spells",
        fixedSpellKeys: ["battle-familiar"],
        cantripCount: 0,
        inheritAbilityFromAsi: true,
        freeCast: "none",
      },
      adeptExtraAbility(
        "intercept-attack",
        "Intercept Attack",
        "When a creature you can see hits your familiar with an attack roll, you can take a Reaction to have the attack hit you instead.",
        "reaction",
      ),
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "magic-connoisseur",
    prerequisites: [
      { type: "level", min: 4 },
      { type: "feat", featKeys: ["magic-initiate-wizard", "magic-initiate-cleric", "magic-initiate-druid"] },
    ],
    effects: [
      ASI_INT_WIS_CHA,
      {
        type: "grant_spells",
        inheritSpellListFromMagicInitiate: true,
        inheritAbilityFromMagicInitiate: true,
        spellLevel: 1,
        spellPickCount: 1,
        cantripCount: 0,
        freeCast: "eachGranted",
      },
      {
        type: "grant_spells",
        inheritSpellListFromMagicInitiate: true,
        inheritAbilityFromMagicInitiate: true,
        spellLevel: 2,
        spellPickCount: 1,
        cantripCount: 0,
        freeCast: "eachGranted",
      },
      { type: "narrative" },
    ],
  },
  {
    featKey: "spell-resistant",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      ASI_INT_WIS_CHA,
      {
        type: "resistance",
        damageTypes: ["necrotic", "psychic", "radiant", "thunder"],
        chooseDamageType: true,
      },
      { type: "limited_uses", formula: "proficiency_bonus", restRecovery: "long" },
      {
        type: "combat_reference_options",
        intro: "",
        options: [
          {
            key: "magical-resilience",
            name: "Magical Resilience",
            desc:
              "You have Resistance to one of the following damage types (choose when you gain this feat): Necrotic, Psychic, Radiant, or Thunder.",
          },
          {
            key: "magic-resistant",
            name: "Magic Resistant",
            desc:
              "When you would fail a saving throw against a spell or magical effect, you can roll 1d6 and add the number rolled to the save's total, potentially turning the failure into a success. You can use this benefit a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.",
          },
        ],
      },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "spell-subterfuge",
    prerequisites: [{ type: "level", min: 4 }, { type: "spellcasting_feature" }],
    effects: [
      ASI_INT_WIS_CHA,
      {
        type: "limited_uses",
        formula: { kind: "abilityMod", ability: "int" },
        restRecovery: "long",
      },
      {
        type: "combat_reference_options",
        options: [
          {
            key: "shrouding-spells",
            name: "Shrouding Spells",
            desc: "When you cast a spell, you can take a Bonus Action to become Invisible until the end of your next turn or until you make an attack roll, deal damage, or cast a spell.",
            actionTiming: "bonus",
          },
        ],
      },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "zhentarim-tactics",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      ASI_INT_WIS_CHA,
      { type: "grant_expertise", count: 1, skillIds: ALL_SKILL_IDS },
      {
        type: "combat_reference_options",
        options: [
          {
            key: "retaliate",
            name: "Retaliate",
            desc: "When a creature within 5 feet of you hits you with an attack roll, you can take a Reaction to make one melee attack against that creature.",
            actionTiming: "reaction",
          },
          {
            key: "versatile-merc",
            name: "Versatile Merc",
            desc: "When you finish a Long Rest, you can replace the skill in which you have Expertise from this feat with another skill in which you have proficiency.",
          },
        ],
      },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "delicious-pain",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      ASI_INT_WIS_CHA,
      { type: "limited_uses", formula: { kind: "fixed", uses: 1 }, restRecovery: "short" },
      adeptExtraAbility(
        "toughened-flesh",
        "Toughened Flesh",
        "When you take damage, you can take a Reaction to gain Resistance to that damage type until the start of your next turn.",
        "reaction",
      ),
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "lordly-resolve",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      ASI_INT_WIS_CHA,
      { type: "limited_uses", formula: { kind: "fixed", uses: 1 }, restRecovery: "long" },
      adeptExtraAbility(
        "standard-bearer",
        "Standard Bearer",
        "As a Bonus Action, choose up to three creatures within 60 feet of yourself that can see you. Each target can immediately take a Reaction to end the Prone condition. While bolstered for 1 minute, targets can't be possessed or gain the Charmed or Frightened condition.",
        "bonus",
      ),
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "love-bites",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      ASI_INT_WIS_CHA,
      { type: "limited_uses", formula: { kind: "fixed", uses: 1 }, restRecovery: "short" },
      adeptExtraAbility(
        "endearing-pain",
        "Endearing Pain",
        "When you take damage from a creature within 30 feet of you, you can take a Bonus Action to force that creature to make a Wisdom saving throw. On a failed save, the creature has the Charmed condition until the end of your next turn.",
        "bonus",
      ),
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "elemental-familiar",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      ASI_INT_WIS_CHA,
      adeptExtraAbility(
        "energy-pulse",
        "Energy Pulse",
        "As a Bonus Action, you can command your familiar to release a pulse of elemental energy in a 10-foot Emanation originating from it. Each creature in the area makes a Dexterity saving throw, taking 2d6 damage of a type you choose on a failed save.",
        "bonus",
      ),
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "putrefy",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      ASI_INT_WIS_CHA,
      { type: "limited_uses", formula: { kind: "fixed", uses: 1 }, restRecovery: "short" },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "rebuke",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      ASI_INT_WIS_CHA,
      { type: "limited_uses", formula: { kind: "fixed", uses: 1 }, restRecovery: "short" },
      {
        type: "combat_reference_options",
        intro: "",
        options: [
          {
            key: "radiant-strike",
            name: "Radiant Strike",
            desc: "When you make a damage roll that deals Radiant damage, you can cause one Huge or smaller creature taking the damage to have the Prone condition. Once you use this benefit, you can't use it again until you finish a Short or Long Rest.",
          },
        ],
      },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "otherworldly-familiar",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      ASI_INT_WIS_CHA,
      {
        type: "resistance",
        damageTypes: ["necrotic", "poison", "psychic", "radiant", "thunder"],
        chooseDamageType: true,
      },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "soothing-familiar",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [ASI_INT_WIS_CHA, { type: "narrative" }],
    combatSurface: true,
  },
  {
    featKey: "mythal-touched",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      ASI_INT_WIS_CHA,
      { type: "limited_uses", formula: "proficiency_bonus", restRecovery: "long" },
      adeptExtraAbility(
        "mythal-ward",
        "Mythal Ward",
        "When you take damage, you can take a Reaction to roll 1d20. On a 10 or higher, you take no damage; otherwise, you take half damage. Once you use this benefit, you can't use it again until you finish a Long Rest.",
        "reaction",
      ),
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  ...Object.entries(GREATER_MARK_PREREQS).map(([featKey, requiredFeat]) => ({
    featKey,
    prerequisites: [{ type: "level" as const, min: 4 }, { type: "feat" as const, featKeys: [requiredFeat] }],
    effects: [
      { type: "ability_score_increase" as const, points: 1, maxScore: 20 },
      { type: "narrative" as const },
    ],
  })),
];

export function applyPost2024FeatMechanics(stubs: FeatDefinition[]): FeatDefinition[] {
  const patchByKey = new Map(POST2024_FEAT_MECHANICS.map((patch) => [patch.featKey!, patch]));
  return stubs.map((stub) => {
    const patch = patchByKey.get(stub.featKey);
    if (!patch) return stub;
    return { ...stub, ...patch, effects: patch.effects ?? stub.effects, prerequisites: patch.prerequisites ?? stub.prerequisites };
  });
}
