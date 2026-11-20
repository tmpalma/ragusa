import type { FeatDefinition } from "./featEffects.js";

/** Definitions for XPHB feats beyond the original SRD Open5e set. */
export const EXTRA_FEAT_DEFINITIONS: FeatDefinition[] = [
  {
    featKey: "crafter",
    prerequisites: [],
    effects: [{ type: "grant_skill_proficiencies", count: 3, allowSkills: false, toolIds: [
      "carpenters-tools",
      "leatherworkers-tools",
      "masons-tools",
      "potters-tools",
      "smiths-tools",
      "tinkers-tools",
      "weavers-tools",
      "woodcarvers-tools",
    ] }, { type: "narrative" }],
  },
  { featKey: "healer", prerequisites: [], effects: [{ type: "narrative" }], combatSurface: true, actionTiming: "action" },
  { featKey: "lucky", prerequisites: [], effects: [{ type: "limited_uses", formula: "proficiency_bonus", restRecovery: "long" }, { type: "narrative" }], combatSurface: true },
  {
    featKey: "musician",
    prerequisites: [],
    effects: [{ type: "grant_skill_proficiencies", count: 3, allowSkills: false, toolCategories: ["musicalInstrument"] }, { type: "narrative" }],
    combatSurface: true,
  },
  { featKey: "tavern-brawler", prerequisites: [], effects: [{ type: "unarmed_damage_die", die: "1d4" }, { type: "narrative" }], combatSurface: true },
  { featKey: "tough", prerequisites: [], effects: [{ type: "hp_per_level", amount: 2 }] },
  {
    featKey: "blessed-warrior",
    prerequisites: [{ type: "fighting_style_feature" }],
    effects: [{ type: "grant_spells", spellList: "cleric", cantripCount: 2, spellLevel: 0, fixedSpellcastingAbility: "cha" }],
  },
  {
    featKey: "druidic-warrior",
    prerequisites: [{ type: "fighting_style_feature" }],
    effects: [{ type: "grant_spells", spellList: "druid", cantripCount: 2, spellLevel: 0, fixedSpellcastingAbility: "wis" }],
  },
  {
    featKey: "blind-fighting",
    prerequisites: [{ type: "fighting_style_feature" }],
    effects: [{ type: "narrative" }],
  },
  {
    featKey: "dueling",
    prerequisites: [{ type: "fighting_style_feature" }],
    effects: [{ type: "weapon_damage_bonus", amount: 2, filter: "oneHandedMelee" }, { type: "narrative" }],
    combatSurface: true,
  },
  {
    featKey: "interception",
    prerequisites: [{ type: "fighting_style_feature" }],
    effects: [{ type: "narrative" }],
    combatSurface: true,
    actionTiming: "reaction",
  },
  {
    featKey: "protection",
    prerequisites: [{ type: "fighting_style_feature" }],
    effects: [{ type: "narrative" }],
    combatSurface: true,
    actionTiming: "reaction",
  },
  {
    featKey: "thrown-weapon-fighting",
    prerequisites: [{ type: "fighting_style_feature" }],
    effects: [{ type: "weapon_damage_bonus", amount: 2, filter: "thrown" }, { type: "narrative" }],
    combatSurface: true,
  },
  {
    featKey: "unarmed-fighting",
    prerequisites: [{ type: "fighting_style_feature" }],
    effects: [{ type: "unarmed_damage_die", die: "1d6" }, { type: "narrative" }],
    combatSurface: true,
  },
  {
    featKey: "boon-of-energy-resistance",
    prerequisites: [{ type: "level", min: 19 }],
    effects: [{ type: "ability_score_increase", points: 1, maxScore: 30 }, { type: "narrative" }],
  },
  {
    featKey: "boon-of-fortitude",
    prerequisites: [{ type: "level", min: 19 }],
    effects: [{ type: "ability_score_increase", points: 1, maxScore: 30 }, { type: "narrative" }],
  },
  {
    featKey: "boon-of-recovery",
    prerequisites: [{ type: "level", min: 19 }],
    effects: [{ type: "ability_score_increase", points: 1, maxScore: 30 }, { type: "narrative" }],
  },
  {
    featKey: "boon-of-skill",
    prerequisites: [{ type: "level", min: 19 }],
    effects: [{ type: "ability_score_increase", points: 1, maxScore: 30 }, { type: "narrative" }],
  },
  {
    featKey: "boon-of-speed",
    prerequisites: [{ type: "level", min: 19 }],
    effects: [{ type: "ability_score_increase", points: 1, maxScore: 30 }, { type: "narrative" }],
  },
  {
    featKey: "actor",
    prerequisites: [{ type: "level", min: 4 }, { type: "ability", abilities: ["cha"], min: 13 }],
    effects: [{ type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["cha"] }, { type: "narrative" }],
    combatSurface: true,
  },
  {
    featKey: "athlete",
    prerequisites: [{ type: "level", min: 4 }, { type: "ability", abilities: ["str", "dex"], min: 13 }],
    effects: [{ type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["str", "dex"] }, { type: "narrative" }],
  },
  {
    featKey: "charger",
    prerequisites: [{ type: "level", min: 4 }, { type: "ability", abilities: ["str", "dex"], min: 13 }],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["str", "dex"] },
      {
        type: "combat_reference_options",
        options: [
          {
            key: "improved-dash",
            name: "Improved Dash",
            desc: "When you take the Dash action, your Speed increases by 10 feet for that action.",
          },
          {
            key: "charge-attack",
            name: "Charge Attack",
            desc:
              "If you move at least 10 feet in a straight line toward a target immediately before hitting it with a melee attack roll as part of the Attack action, choose one of the following effects: gain a 1d8 bonus to the attack's damage roll, or push the target up to 10 feet away if it is no more than one size larger than you. You can use this benefit only once on each of your turns.",
          },
        ],
      },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "chef",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["con"] },
      { type: "grant_skill_proficiencies", count: 0, fixedToolIds: ["cooks-utensils"] },
      {
        type: "limited_uses",
        formula: "proficiency_bonus",
        restRecovery: "short",
        trackerLabelKey: "combat.featChefBolsteringTreats",
      },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "crossbow-expert",
    prerequisites: [{ type: "level", min: 4 }, { type: "ability", abilities: ["dex"], min: 13 }],
    effects: [{ type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["dex"] }, { type: "narrative" }],
    combatSurface: true,
  },
  {
    featKey: "crusher",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["str", "con"] },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "defensive-duelist",
    prerequisites: [{ type: "level", min: 4 }, { type: "ability", abilities: ["dex"], min: 13 }],
    effects: [{ type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["dex"] }, { type: "narrative" }],
    combatSurface: true,
    actionTiming: "reaction",
  },
  {
    featKey: "dual-wielder",
    prerequisites: [{ type: "level", min: 4 }, { type: "ability", abilities: ["str", "dex"], min: 13 }],
    effects: [{ type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["str", "dex"] }, { type: "narrative" }],
    combatSurface: true,
  },
  {
    featKey: "durable",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["con"] },
      {
        type: "combat_reference_options",
        options: [
          {
            key: "speedy-recovery",
            name: "Speedy Recovery",
            desc: "As a Bonus Action, you can expend one of your Hit Point Dice, roll the die, and regain a number of Hit Points equal to the roll.",
            actionTiming: "bonus",
          },
          {
            key: "defy-death",
            name: "Defy Death",
            desc: "You have Advantage on Death Saving Throw.",
          },
        ],
      },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "elemental-adept",
    repeatable: true,
    prerequisites: [{ type: "level", min: 4 }, { type: "spellcasting_feature" }],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["int", "wis", "cha"] },
      { type: "resistance", damageTypes: ["acid", "cold", "fire", "lightning", "thunder"], chooseDamageType: true },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "fey-touched",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["int", "wis", "cha"] },
      {
        type: "grant_spells",
        fixedSpellKeys: ["misty-step"],
        schools: ["divination", "enchantment"],
        spellLevel: 1,
        spellPickCount: 1,
        cantripCount: 0,
        freeCast: "eachGranted",
        inheritAbilityFromAsi: true,
      },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "great-weapon-master",
    prerequisites: [{ type: "level", min: 4 }, { type: "ability", abilities: ["str"], min: 13 }],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["str"] },
      { type: "weapon_damage_bonus", amountFormula: "proficiency_bonus", filter: "heavyAttack" },
      {
        type: "combat_reference_options",
        options: [
          {
            key: "heavy-weapon-mastery",
            name: "Heavy Weapon Mastery",
            desc:
              "When you hit a creature with a weapon that has the H property as part of the Attack action on your turn, you can cause the weapon to deal extra damage to the target. The extra damage equals your Proficiency.",
          },
          {
            key: "hew",
            name: "Hew",
            desc:
              "Immediately after you score a Critical Hit with a Melee weapon or reduce a creature to 0 Hit Points with one, you can make one attack with the same weapon as a Bonus Action.",
          },
        ],
      },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "heavily-armored",
    prerequisites: [
      { type: "level", min: 4 },
      { type: "armor_category_training", category: "medium" },
    ],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["str", "con"] },
      { type: "grant_armor_categories", categories: ["heavy"] },
      { type: "narrative" },
    ],
  },
  {
    featKey: "heavy-armor-master",
    prerequisites: [
      { type: "level", min: 4 },
      { type: "armor_category_training", category: "heavy" },
    ],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["str", "con"] },
      { type: "damage_reduction_while_wearing", amountFormula: "proficiency_bonus", armorCategory: "heavy", damageTypes: ["bludgeoning", "piercing", "slashing"] },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "inspiring-leader",
    prerequisites: [{ type: "level", min: 4 }, { type: "ability", abilities: ["wis", "cha"], min: 13 }],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["int", "wis", "cha"] },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "keen-mind",
    prerequisites: [{ type: "level", min: 4 }, { type: "ability", abilities: ["int"], min: 13 }],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["int"] },
      {
        type: "grant_expertise",
        count: 1,
        skillIds: ["history", "investigation", "arcana", "nature", "religion"],
        proficiencyOrExpertise: true,
      },
      {
        type: "combat_reference_options",
        options: [
          {
            key: "quick-study",
            name: "Quick Study",
            desc: "You can take the Study action as a Bonus Action.",
            actionTiming: "bonus",
          },
        ],
      },
      { type: "narrative" },
    ],
  },
  {
    featKey: "lightly-armored",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["str", "dex"] },
      { type: "grant_armor_categories", categories: ["light"], shieldProficiency: true },
      { type: "narrative" },
    ],
  },
  {
    featKey: "mage-slayer",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["str", "dex"] },
      { type: "limited_uses", formula: "proficiency_bonus", restRecovery: "short" },
      {
        type: "combat_reference_options",
        options: [
          {
            key: "concentration-breaker",
            name: "Concentration Breaker",
            desc: "When you damage a creature that is Concentration, it has Disadvantage on the saving throw it makes to maintain Concentration.",
          },
          {
            key: "guarded-mind",
            name: "Guarded Mind",
            desc:
              "If you fail an Intelligence, a Wisdom, or a Charisma saving throw, you can cause yourself to succeed instead. Once you use this benefit, you can't use it again until you finish a Short Rest or Long Rest.",
          },
        ],
      },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "martial-weapon-training",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["str", "dex"] },
      { type: "grant_weapon_proficiency", proficiency: "martial" },
      { type: "narrative" },
    ],
  },
  {
    featKey: "medium-armor-master",
    prerequisites: [
      { type: "level", min: 4 },
      { type: "armor_category_training", category: "medium" },
    ],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["str", "dex"] },
      { type: "medium_armor_dex_cap", cap: 3 },
      { type: "narrative" },
    ],
  },
  {
    featKey: "moderately-armored",
    prerequisites: [
      { type: "level", min: 4 },
      { type: "armor_category_training", category: "light" },
    ],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["str", "dex"] },
      { type: "grant_armor_categories", categories: ["medium"] },
      { type: "narrative" },
    ],
  },
  {
    featKey: "mounted-combatant",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["str", "dex", "wis"] },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "observant",
    prerequisites: [{ type: "level", min: 4 }, { type: "ability", abilities: ["int", "wis"], min: 13 }],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["int", "wis"] },
      { type: "grant_skill_proficiencies", count: 1, allowSkills: true, skillIds: ["insight", "investigation", "perception"] },
      {
        type: "combat_reference_options",
        options: [
          {
            key: "quick-search",
            name: "Quick Search",
            desc: "You can take the Search action as a Bonus Action.",
            actionTiming: "bonus",
          },
        ],
      },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "piercer",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["str", "dex"] },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "poisoner",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["int", "dex"] },
      { type: "grant_skill_proficiencies", count: 1, allowSkills: false, toolIds: ["poisoners-kit"] },
      { type: "limited_uses", formula: "proficiency_bonus", restRecovery: "long" },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "polearm-master",
    prerequisites: [{ type: "level", min: 4 }, { type: "ability", abilities: ["str", "dex"], min: 13 }],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["str", "dex"] },
      {
        type: "combat_reference_options",
        options: [
          {
            key: "pole-strike",
            name: "Pole Strike",
            desc:
              "Immediately after you take the Attack action and attack with a Quarterstaff, a Spear, or a weapon that has the Heavy and Reach properties, you can use a Bonus Action to make a melee attack with the opposite end of the weapon. The weapon deals Bludgeoning damage, and the weapon's damage die for this attack is a d4.",
            actionTiming: "bonus",
          },
          {
            key: "reactive-strike",
            name: "Reactive Strike",
            desc:
              "While you're holding a Quarterstaff, a Spear, or a weapon that has the Heavy and Reach properties, you can take a Reaction to make one melee attack against a creature that enters the reach you have with that weapon.",
            actionTiming: "reaction",
          },
        ],
      },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "resilient",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, grantSaveProficiency: true },
      { type: "narrative" },
    ],
  },
  {
    featKey: "ritual-caster",
    prerequisites: [{ type: "level", min: 4 }, { type: "ability", abilities: ["int", "wis", "cha"], min: 13 }],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["int", "wis", "cha"] },
      {
        type: "grant_spells",
        ritualOnly: true,
        spellLevel: 1,
        spellPickCountFromProficiency: true,
        cantripCount: 0,
        inheritAbilityFromAsi: true,
        freeCast: "none",
      },
      { type: "limited_uses", formula: { kind: "fixed", uses: 1 }, restRecovery: "long" },
      {
        type: "combat_reference_options",
        options: [
          {
            key: "quick-ritual",
            name: "Quick Ritual",
            desc:
              "You can cast a Ritual spell that you have prepared using its regular casting time rather than the extended time for a Ritual. Doing so doesn't require a spell slot. Once you cast the spell in this way, you can't use this benefit again until you finish a Long Rest.",
          },
        ],
      },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "sentinel",
    prerequisites: [{ type: "level", min: 4 }, { type: "ability", abilities: ["str", "dex"], min: 13 }],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["str", "dex"] },
      {
        type: "combat_reference_options",
        options: [
          {
            key: "guardian",
            name: "Guardian",
            desc:
              "Immediately after a creature within 5 feet of you takes the Disengage action or hits a target other than you with an attack, you can make an Opportunity Attack against that creature.",
            actionTiming: "reaction",
          },
          {
            key: "halt",
            name: "Halt",
            desc: "When you hit a creature with an Opportunity Attack, the creature's Speed becomes 0 for the rest of the current turn.",
            actionTiming: "reaction",
          },
        ],
      },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "shadow-touched",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["int", "wis", "cha"] },
      {
        type: "grant_spells",
        fixedSpellKeys: ["invisibility"],
        schools: ["illusion", "necromancy"],
        spellLevel: 1,
        spellPickCount: 1,
        cantripCount: 0,
        freeCast: "eachGranted",
        inheritAbilityFromAsi: true,
      },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "sharpshooter",
    prerequisites: [{ type: "level", min: 4 }, { type: "ability", abilities: ["dex"], min: 13 }],
    effects: [{ type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["dex"] }, { type: "narrative" }],
    combatSurface: true,
  },
  {
    featKey: "shield-master",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["str"] },
      {
        type: "combat_reference_options",
        options: [
          {
            key: "shield-bash",
            name: "Shield Bash",
            desc:
              "If you attack a creature within 5 feet of you as part of the Attack action and hit with a Melee weapon, you can immediately bash the target with your Shield if it's equipped, forcing the target to make a Strength saving throw (8 plus your Strength modifier and Proficiency). On a failed save, you either push the target 5 feet from you or cause it to have the Prone condition (your choice). You can use this benefit only once on each of your turns.",
          },
          {
            key: "interpose-shield",
            name: "Interpose Shield",
            desc:
              "If you're subjected to an effect that allows you to make a Dexterity saving throw to take only half damage, you can take a Reaction to take no damage if you succeed on the saving throw and are holding a Shield.",
            actionTiming: "reaction",
          },
        ],
      },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "skill-expert",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20 },
      { type: "grant_skill_proficiencies", count: 1, allowSkills: true },
      { type: "grant_expertise", count: 1 },
      { type: "narrative" },
    ],
  },
  {
    featKey: "skulker",
    prerequisites: [{ type: "level", min: 4 }, { type: "ability", abilities: ["dex"], min: 13 }],
    effects: [{ type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["dex"] }, { type: "narrative" }],
    combatSurface: true,
  },
  {
    featKey: "slasher",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["str", "dex"] },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "speedy",
    prerequisites: [{ type: "level", min: 4 }, { type: "ability", abilities: ["dex", "con"], min: 13 }],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["dex", "con"] },
      { type: "walk_speed_bonus", feet: 10 },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "spell-sniper",
    prerequisites: [{ type: "level", min: 4 }, { type: "spellcasting_feature" }],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["int", "wis", "cha"] },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "telekinetic",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["int", "wis", "cha"] },
      {
        type: "grant_spells",
        fixedSpellKeys: ["mage-hand"],
        cantripCount: 0,
        inheritAbilityFromAsi: true,
        freeCast: "none",
      },
      {
        type: "combat_reference_options",
        intro: "",
        options: [
          {
            key: "telekinetic-shove",
            name: "Telekinetic Shove",
            desc: "As a Bonus Action, you can telekinetically shove one creature you can see within 30 feet of yourself. The target must succeed on a Strength saving throw (DC 8 plus the modifier of the ability increased by this feat and your Proficiency Bonus) or be moved 5 feet toward or away from you.",
            actionTiming: "bonus",
          },
        ],
      },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "telepathic",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["int", "wis", "cha"] },
      {
        type: "grant_spells",
        fixedSpellKeys: ["detect-thoughts"],
        cantripCount: 0,
        inheritAbilityFromAsi: true,
        freeCast: "eachGranted",
      },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "war-caster",
    prerequisites: [{ type: "level", min: 4 }, { type: "spellcasting_feature" }],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["int", "wis", "cha"] },
      {
        type: "combat_reference_options",
        options: [
          {
            key: "reactive-spell",
            name: "Reactive Spell",
            desc:
              "When a creature provokes an Opportunity Attack from you by leaving your reach, you can take a Reaction to cast a spell at the creature rather than making an Opportunity Attack. The spell must have a casting time of one action and must target only that creature.",
            actionTiming: "reaction",
          },
          {
            key: "concentration",
            name: "Concentration",
            desc: "You have Advantage on Constitution saving throws that you make to maintain Concentration.",
          },
          {
            key: "somatic-components",
            name: "Somatic Components",
            desc: "You can perform the Somatic components of spells even when you have weapons or a Shield in one or both hands.",
          },
        ],
      },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
  {
    featKey: "weapon-master",
    prerequisites: [{ type: "level", min: 4 }],
    effects: [
      { type: "ability_score_increase", points: 1, maxScore: 20, allowedAbilities: ["str", "dex"] },
      { type: "narrative" },
    ],
    combatSurface: true,
  },
];
