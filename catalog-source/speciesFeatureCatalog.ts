import type { SpeciesChoice, SpeciesFeatureData, SpeciesLineageOption } from "../src/data/types.js";

const KEEN_SENSES_OPTIONS = ["insight", "perception", "survival"] as const;

function lineageSpell(key: string, name: string, spellName: string, level: number): SpeciesFeatureData {
  return {
    key,
    name,
    desc: `You always have ${spellName} prepared. You can cast it once without a spell slot, and you regain the ability to cast it in that way when you finish a Long Rest. You can also cast the spell using any spell slots you have of the appropriate level.`,
    grantedAtLevel: level,
    combatSurface: true,
    effects: [{ type: "always_prepared_spell", spellName, minLevel: level }],
  };
}

function dragonAncestry(key: string, name: string, damageType: string): SpeciesFeatureData {
  return {
    key: `draconic-ancestry-${key}`,
    name: `${name} Ancestry`,
    desc: `Your draconic ancestry is ${name}. You have Resistance to ${damageType} damage.`,
    grantedAtLevel: 1,
    combatSurface: true,
    effects: [{ type: "damage_resistance", damageType }],
  };
}

const DRAGON_ANCESTRY_OPTIONS = [
  { key: "black", name: "Black", damageType: "Acid" },
  { key: "blue", name: "Blue", damageType: "Lightning" },
  { key: "brass", name: "Brass", damageType: "Fire" },
  { key: "bronze", name: "Bronze", damageType: "Lightning" },
  { key: "copper", name: "Copper", damageType: "Acid" },
  { key: "gold", name: "Gold", damageType: "Fire" },
  { key: "green", name: "Green", damageType: "Poison" },
  { key: "red", name: "Red", damageType: "Fire" },
  { key: "silver", name: "Silver", damageType: "Cold" },
  { key: "white", name: "White", damageType: "Cold" },
].map(({ key, name, damageType }) => ({
  key,
  name,
  features: [dragonAncestry(key, name, damageType)],
})) satisfies SpeciesLineageOption[];

const ELF_LINEAGE_OPTIONS = [
  {
    key: "drow",
    name: "Drow",
    features: [
      {
        key: "drow-darkvision",
        name: "Superior Darkvision",
        desc: "The range of your Darkvision increases to 120 feet.",
        grantedAtLevel: 1,
        combatSurface: true,
        effects: [{ type: "darkvision", feet: 120 }],
      },
      {
        key: "drow-cantrip",
        name: "Dancing Lights",
        desc: "You know the Dancing Lights cantrip.",
        grantedAtLevel: 1,
        combatSurface: true,
        effects: [{ type: "grant_cantrip", spellName: "Dancing Lights" }],
      },
      lineageSpell("drow-spell-3", "Faerie Fire", "Faerie Fire", 3),
      lineageSpell("drow-spell-5", "Darkness", "Darkness", 5),
    ],
  },
  {
    key: "high-elf",
    name: "High Elf",
    features: [
      {
        key: "high-elf-cantrip",
        name: "Prestidigitation",
        desc: "You know the Prestidigitation cantrip. Whenever you finish a Long Rest, you can replace that cantrip with a different cantrip from the Wizard spell list.",
        grantedAtLevel: 1,
        combatSurface: true,
        effects: [
          {
            type: "choose_cantrip",
            choiceKey: "high-elf-cantrip",
            defaultSpellKey: "prestidigitation",
            listClassKey: "wizard",
          },
        ],
      },
      lineageSpell("high-elf-spell-3", "Detect Magic", "Detect Magic", 3),
      lineageSpell("high-elf-spell-5", "Misty Step", "Misty Step", 5),
    ],
  },
  {
    key: "wood-elf",
    name: "Wood Elf",
    features: [
      {
        key: "wood-elf-speed",
        name: "Fleet of Foot",
        desc: "Your Speed increases to 35 feet.",
        grantedAtLevel: 1,
        combatSurface: false,
        effects: [{ type: "walk_speed_set", feet: 35 }],
      },
      {
        key: "wood-elf-cantrip",
        name: "Druidcraft",
        desc: "You know the Druidcraft cantrip.",
        grantedAtLevel: 1,
        combatSurface: true,
        effects: [{ type: "grant_cantrip", spellName: "Druidcraft" }],
      },
      lineageSpell("wood-elf-spell-3", "Longstrider", "Longstrider", 3),
      lineageSpell("wood-elf-spell-5", "Pass without Trace", "Pass without Trace", 5),
    ],
  },
] satisfies SpeciesLineageOption[];

const GNOME_LINEAGE_OPTIONS = [
  {
    key: "forest",
    name: "Forest Gnome",
    features: [
      {
        key: "forest-gnome-cantrip",
        name: "Minor Illusion",
        desc: "You know the Minor Illusion cantrip.",
        grantedAtLevel: 1,
        combatSurface: true,
        effects: [{ type: "grant_cantrip", spellName: "Minor Illusion" }],
      },
      {
        key: "forest-gnome-speak-with-animals",
        name: "Speak with Animals",
        desc: "You always have the Speak with Animals spell prepared. You can cast it without a spell slot a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest. You can also use any spell slots you have to cast the spell.",
        grantedAtLevel: 1,
        combatSurface: true,
        limitedUses: { kind: "proficiencyBonus" },
        effects: [{ type: "always_prepared_spell", spellName: "Speak with Animals" }],
      },
    ],
  },
  {
    key: "rock",
    name: "Rock Gnome",
    features: [
      {
        key: "rock-gnome-cantrips",
        name: "Artificer's Cantrips",
        desc: "You know the Mending and Prestidigitation cantrips. In addition, you can spend 10 minutes casting Prestidigitation to create a Tiny clockwork device (AC 5, 1 HP). You can have three such devices in existence at a time.",
        grantedAtLevel: 1,
        combatSurface: true,
        effects: [
          { type: "grant_cantrip", spellName: "Mending" },
          { type: "grant_cantrip", spellName: "Prestidigitation" },
        ],
      },
    ],
  },
] satisfies SpeciesLineageOption[];

const GOLIATH_ANCESTRY_OPTIONS = [
  {
    key: "cloud",
    name: "Cloud's Jaunt (Cloud Giant)",
    features: [
      {
        key: "clouds-jaunt",
        name: "Cloud's Jaunt",
        desc: "As a Bonus Action, you magically teleport up to 30 feet to an unoccupied space you can see.",
        grantedAtLevel: 1,
        combatSurface: true,
        actionTiming: "bonus" as const,
        limitedUses: { kind: "proficiencyBonus" },
        effects: [{ type: "narrative" }],
      },
    ],
  },
  {
    key: "fire",
    name: "Fire's Burn (Fire Giant)",
    features: [
      {
        key: "fires-burn",
        name: "Fire's Burn",
        desc: "When you hit a target with an attack roll and deal damage to it, you can also deal 1d10 Fire damage to that target.",
        grantedAtLevel: 1,
        combatSurface: true,
        limitedUses: { kind: "proficiencyBonus" },
        effects: [{ type: "narrative" }],
      },
    ],
  },
  {
    key: "frost",
    name: "Frost's Chill (Frost Giant)",
    features: [
      {
        key: "frosts-chill",
        name: "Frost's Chill",
        desc: "When you hit a target with an attack roll and deal damage to it, you can also deal 1d6 Cold damage to that target and reduce its Speed by 10 feet until the start of your next turn.",
        grantedAtLevel: 1,
        combatSurface: true,
        limitedUses: { kind: "proficiencyBonus" },
        effects: [{ type: "narrative" }],
      },
    ],
  },
  {
    key: "hill",
    name: "Hill's Tumble (Hill Giant)",
    features: [
      {
        key: "hills-tumble",
        name: "Hill's Tumble",
        desc: "When you hit a Large or smaller creature with an attack roll and deal damage to it, you can give that target the Prone condition.",
        grantedAtLevel: 1,
        combatSurface: true,
        limitedUses: { kind: "proficiencyBonus" },
        effects: [{ type: "narrative" }],
      },
    ],
  },
  {
    key: "stone",
    name: "Stone's Endurance (Stone Giant)",
    features: [
      {
        key: "stones-endurance",
        name: "Stone's Endurance",
        desc: "When you take damage, you can take a Reaction to roll 1d12. Add your Constitution modifier to the number rolled and reduce the damage by that total.",
        grantedAtLevel: 1,
        combatSurface: true,
        actionTiming: "reaction" as const,
        limitedUses: { kind: "proficiencyBonus" },
        effects: [{ type: "narrative" }],
      },
    ],
  },
  {
    key: "storm",
    name: "Storm's Thunder (Storm Giant)",
    features: [
      {
        key: "storms-thunder",
        name: "Storm's Thunder",
        desc: "When you take damage from a creature within 60 feet of you, you can take a Reaction to deal 1d8 Thunder damage to that creature.",
        grantedAtLevel: 1,
        combatSurface: true,
        actionTiming: "reaction" as const,
        limitedUses: { kind: "proficiencyBonus" },
        effects: [{ type: "narrative" }],
      },
    ],
  },
] satisfies SpeciesLineageOption[];

const TIEFLING_LEGACY_OPTIONS = [
  {
    key: "abyssal",
    name: "Abyssal",
    features: [
      {
        key: "abyssal-resistance",
        name: "Poison Resistance",
        desc: "You have Resistance to Poison damage.",
        grantedAtLevel: 1,
        combatSurface: true,
        effects: [{ type: "damage_resistance", damageType: "Poison" }],
      },
      {
        key: "abyssal-cantrip",
        name: "Poison Spray",
        desc: "You know the Poison Spray cantrip.",
        grantedAtLevel: 1,
        combatSurface: true,
        effects: [{ type: "grant_cantrip", spellName: "Poison Spray" }],
      },
      lineageSpell("abyssal-spell-3", "Ray of Sickness", "Ray of Sickness", 3),
      lineageSpell("abyssal-spell-5", "Hold Person", "Hold Person", 5),
    ],
  },
  {
    key: "chthonic",
    name: "Chthonic",
    features: [
      {
        key: "chthonic-resistance",
        name: "Necrotic Resistance",
        desc: "You have Resistance to Necrotic damage.",
        grantedAtLevel: 1,
        combatSurface: true,
        effects: [{ type: "damage_resistance", damageType: "Necrotic" }],
      },
      {
        key: "chthonic-cantrip",
        name: "Chill Touch",
        desc: "You know the Chill Touch cantrip.",
        grantedAtLevel: 1,
        combatSurface: true,
        effects: [{ type: "grant_cantrip", spellName: "Chill Touch" }],
      },
      lineageSpell("chthonic-spell-3", "False Life", "False Life", 3),
      lineageSpell("chthonic-spell-5", "Ray of Enfeeblement", "Ray of Enfeeblement", 5),
    ],
  },
  {
    key: "infernal",
    name: "Infernal",
    features: [
      {
        key: "infernal-resistance",
        name: "Fire Resistance",
        desc: "You have Resistance to Fire damage.",
        grantedAtLevel: 1,
        combatSurface: true,
        effects: [{ type: "damage_resistance", damageType: "Fire" }],
      },
      {
        key: "infernal-cantrip",
        name: "Fire Bolt",
        desc: "You know the Fire Bolt cantrip.",
        grantedAtLevel: 1,
        combatSurface: true,
        effects: [{ type: "grant_cantrip", spellName: "Fire Bolt" }],
      },
      lineageSpell("infernal-spell-3", "Hellish Rebuke", "Hellish Rebuke", 3),
      lineageSpell("infernal-spell-5", "Darkness", "Darkness", 5),
    ],
  },
] satisfies SpeciesLineageOption[];

export interface SpeciesFeatureCatalogEntry {
  features: SpeciesFeatureData[];
  choice?: SpeciesChoice;
  hasSizeChoice?: boolean;
  size?: "small" | "medium";
}

export const SPECIES_FEATURE_CATALOG: Record<string, SpeciesFeatureCatalogEntry> = {
  dragonborn: {
    size: "medium",
    features: [
      {
        key: "draconic-ancestry",
        name: "Draconic Ancestry",
        desc: "Your lineage stems from a dragon progenitor. Choose the kind of dragon from the Draconic Ancestors table. Your choice affects your Breath Weapon and Damage Resistance traits as well as your appearance.",
        grantedAtLevel: 1,
        combatSurface: false,
        effects: [{ type: "narrative" }],
      },
      {
        key: "breath-weapon",
        name: "Breath Weapon",
        desc: "When you take the Attack action on your turn, you can replace one of your attacks with an exhalation of magical energy in either a 15-foot Cone or a 30-foot Line that is 5 feet wide (choose the shape each time). Each creature in that area must make a Dexterity saving throw (DC 8 plus your Constitution modifier and Proficiency Bonus). On a failed save, a creature takes 1d10 damage of the type determined by your Draconic Ancestry trait. On a successful save, a creature takes half as much damage. This damage increases by 1d10 when you reach character levels 5 (2d10), 11 (3d10), and 17 (4d10).\n\nYou can use this Breath Weapon a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.",
        grantedAtLevel: 1,
        combatSurface: true,
        actionTiming: "action",
        limitedUses: { kind: "proficiencyBonus" },
        effects: [{ type: "narrative" }],
      },
      {
        key: "darkvision",
        name: "Darkvision",
        desc: "You have Darkvision with a range of 60 feet.",
        grantedAtLevel: 1,
        combatSurface: true,
        effects: [{ type: "darkvision", feet: 60 }],
      },
      {
        key: "draconic-flight",
        name: "Draconic Flight",
        desc: "When you reach character level 5, you can channel draconic magic to give yourself temporary flight. As a Bonus Action, you sprout spectral wings on your back that last for 10 minutes or until you end them (no action required) or have the Incapacitated condition. During that time, you have a Fly Speed equal to your Speed. Once you use this trait, you can't use it again until you finish a Long Rest.",
        grantedAtLevel: 5,
        combatSurface: true,
        actionTiming: "bonus",
        limitedUses: { kind: "fixed", uses: 1 },
        effects: [{ type: "narrative" }],
      },
    ],
    choice: {
      key: "draconic-ancestry",
      options: DRAGON_ANCESTRY_OPTIONS,
    },
  },
  dwarf: {
    size: "medium",
    features: [
      {
        key: "darkvision",
        name: "Darkvision",
        desc: "You have Darkvision with a range of 120 feet.",
        grantedAtLevel: 1,
        combatSurface: true,
        effects: [{ type: "darkvision", feet: 120 }],
      },
      {
        key: "dwarven-resilience",
        name: "Dwarven Resilience",
        desc: "You have Resistance to Poison damage. You also have Advantage on saving throws you make to avoid or end the Poisoned condition.",
        grantedAtLevel: 1,
        combatSurface: true,
        effects: [{ type: "damage_resistance", damageType: "Poison" }],
      },
      {
        key: "dwarven-toughness",
        name: "Dwarven Toughness",
        desc: "Your Hit Point maximum increases by 1, and it increases by 1 again whenever you gain a level.",
        grantedAtLevel: 1,
        combatSurface: false,
        effects: [{ type: "hp_per_level", amount: 1 }],
      },
      {
        key: "stonecunning",
        name: "Stonecunning",
        desc: "As a Bonus Action, you gain Tremorsense with a range of 60 feet for 10 minutes. You must be on a stone surface or touching a stone surface to use this Tremorsense.\n\nYou can use this Bonus Action a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.",
        grantedAtLevel: 1,
        combatSurface: true,
        actionTiming: "bonus",
        limitedUses: { kind: "proficiencyBonus" },
        effects: [{ type: "narrative" }],
      },
    ],
  },
  elf: {
    size: "medium",
    features: [
      {
        key: "darkvision",
        name: "Darkvision",
        desc: "You have Darkvision with a range of 60 feet.",
        grantedAtLevel: 1,
        combatSurface: true,
        effects: [{ type: "darkvision", feet: 60 }],
      },
      {
        key: "elven-lineage",
        name: "Elven Lineage",
        desc: "You are part of a lineage that grants you supernatural abilities. Choose a lineage from the Elven Lineages table.",
        grantedAtLevel: 1,
        combatSurface: false,
        effects: [{ type: "narrative" }],
      },
      {
        key: "fey-ancestry",
        name: "Fey Ancestry",
        desc: "You have Advantage on saving throws you make to avoid or end the Charmed condition.",
        grantedAtLevel: 1,
        combatSurface: true,
        effects: [{ type: "narrative" }],
      },
      {
        key: "keen-senses",
        name: "Keen Senses",
        desc: "You have proficiency in the Insight, Perception, or Survival skill.",
        grantedAtLevel: 1,
        combatSurface: false,
        effects: [{ type: "grant_skill_proficiency", count: 1, options: [...KEEN_SENSES_OPTIONS] }],
      },
      {
        key: "trance",
        name: "Trance",
        desc: "You don't need to sleep, and magic can't put you to sleep. You can finish a Long Rest in 4 hours if you spend those hours in a trancelike meditation, during which you retain consciousness.",
        grantedAtLevel: 1,
        combatSurface: false,
        effects: [{ type: "narrative" }],
      },
    ],
    choice: {
      key: "elven-lineage",
      requiresSpellcastingAbility: true,
      options: ELF_LINEAGE_OPTIONS,
    },
  },
  gnome: {
    size: "small",
    features: [
      {
        key: "darkvision",
        name: "Darkvision",
        desc: "You have Darkvision with a range of 60 feet.",
        grantedAtLevel: 1,
        combatSurface: true,
        effects: [{ type: "darkvision", feet: 60 }],
      },
      {
        key: "gnomish-cunning",
        name: "Gnomish Cunning",
        desc: "You have Advantage on Intelligence, Wisdom, and Charisma saving throws.",
        grantedAtLevel: 1,
        combatSurface: true,
        effects: [{ type: "narrative" }],
      },
      {
        key: "gnomish-lineage",
        name: "Gnomish Lineage",
        desc: "You are part of a lineage that grants you supernatural abilities. Choose Forest Gnome or Rock Gnome.",
        grantedAtLevel: 1,
        combatSurface: false,
        effects: [{ type: "narrative" }],
      },
    ],
    choice: {
      key: "gnomish-lineage",
      requiresSpellcastingAbility: true,
      options: GNOME_LINEAGE_OPTIONS,
    },
  },
  goliath: {
    size: "medium",
    features: [
      {
        key: "giant-ancestry",
        name: "Giant Ancestry",
        desc: "You are descended from Giants. Choose one supernatural boon from your ancestry.",
        grantedAtLevel: 1,
        combatSurface: false,
        effects: [{ type: "narrative" }],
      },
      {
        key: "large-form",
        name: "Large Form",
        desc: "Starting at character level 5, you can change your size to Large as a Bonus Action if you're in a big enough space. This transformation lasts for 10 minutes or until you end it (no action required). For that duration, you have Advantage on Strength checks, and your Speed increases by 10 feet. Once you use this trait, you can't use it again until you finish a Long Rest.",
        grantedAtLevel: 5,
        combatSurface: true,
        actionTiming: "bonus",
        limitedUses: { kind: "fixed", uses: 1 },
        effects: [{ type: "narrative" }],
      },
      {
        key: "powerful-build",
        name: "Powerful Build",
        desc: "You have Advantage on any ability check you make to end the Grappled condition. You also count as one size larger when determining your carrying capacity.",
        grantedAtLevel: 1,
        combatSurface: true,
        effects: [{ type: "carrying_size_increase", steps: 1 }],
      },
    ],
    choice: {
      key: "giant-ancestry",
      options: GOLIATH_ANCESTRY_OPTIONS,
    },
  },
  halfling: {
    size: "small",
    features: [
      {
        key: "brave",
        name: "Brave",
        desc: "You have Advantage on saving throws you make to avoid or end the Frightened condition.",
        grantedAtLevel: 1,
        combatSurface: true,
        effects: [{ type: "narrative" }],
      },
      {
        key: "halfling-nimbleness",
        name: "Halfling Nimbleness",
        desc: "You can move through the space of any creature that is a size larger than you, but you can't stop in the same space.",
        grantedAtLevel: 1,
        combatSurface: true,
        effects: [{ type: "narrative" }],
      },
      {
        key: "luck",
        name: "Luck",
        desc: "When you roll a 1 on the d20 of a D20 Test, you can reroll the die, and you must use the new roll.",
        grantedAtLevel: 1,
        combatSurface: true,
        effects: [{ type: "narrative" }],
      },
      {
        key: "naturally-stealthy",
        name: "Naturally Stealthy",
        desc: "You can take the Hide action even when you are obscured only by a creature that is at least one size larger than you.",
        grantedAtLevel: 1,
        combatSurface: true,
        effects: [{ type: "narrative" }],
      },
    ],
  },
  human: {
    hasSizeChoice: true,
    features: [
      {
        key: "resourceful",
        name: "Resourceful",
        desc: "You gain Heroic Inspiration whenever you finish a Long Rest.",
        grantedAtLevel: 1,
        combatSurface: false,
        effects: [{ type: "narrative" }],
      },
      {
        key: "skillful",
        name: "Skillful",
        desc: "You gain proficiency in one skill of your choice.",
        grantedAtLevel: 1,
        combatSurface: false,
        effects: [{ type: "grant_skill_proficiency", count: 1 }],
      },
      {
        key: "versatile",
        name: "Versatile",
        desc: "You gain an Origin feat of your choice (see Feats). Skilled is recommended.",
        grantedAtLevel: 1,
        combatSurface: false,
        effects: [{ type: "narrative" }],
      },
    ],
  },
  orc: {
    size: "medium",
    features: [
      {
        key: "adrenaline-rush",
        name: "Adrenaline Rush",
        desc: "You can take the Dash action as a Bonus Action. When you do so, you gain a number of Temporary Hit Points equal to your Proficiency Bonus.\n\nYou can use this trait a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Short or Long Rest.",
        grantedAtLevel: 1,
        combatSurface: true,
        actionTiming: "bonus",
        limitedUses: { kind: "proficiencyBonus" },
        restRecovery: "short",
        effects: [{ type: "narrative" }],
      },
      {
        key: "darkvision",
        name: "Darkvision",
        desc: "You have Darkvision with a range of 120 feet.",
        grantedAtLevel: 1,
        combatSurface: true,
        effects: [{ type: "darkvision", feet: 120 }],
      },
      {
        key: "relentless-endurance",
        name: "Relentless Endurance",
        desc: "When you are reduced to 0 Hit Points but not killed outright, you can drop to 1 Hit Point instead. Once you use this trait, you can't do so again until you finish a Long Rest.",
        grantedAtLevel: 1,
        combatSurface: true,
        limitedUses: { kind: "fixed", uses: 1 },
        effects: [{ type: "narrative" }],
      },
    ],
  },
  tiefling: {
    hasSizeChoice: true,
    features: [
      {
        key: "darkvision",
        name: "Darkvision",
        desc: "You have Darkvision with a range of 60 feet.",
        grantedAtLevel: 1,
        combatSurface: true,
        effects: [{ type: "darkvision", feet: 60 }],
      },
      {
        key: "fiendish-legacy",
        name: "Fiendish Legacy",
        desc: "You are the recipient of a legacy that grants you supernatural abilities. Choose a legacy from the Fiendish Legacies table.",
        grantedAtLevel: 1,
        combatSurface: false,
        effects: [{ type: "narrative" }],
      },
      {
        key: "otherworldly-presence",
        name: "Otherworldly Presence",
        desc: "You know the Thaumaturgy cantrip. When you cast it with this trait, the spell uses the same spellcasting ability you use for your Fiendish Legacy trait.",
        grantedAtLevel: 1,
        combatSurface: true,
        effects: [{ type: "grant_cantrip", spellName: "Thaumaturgy" }],
      },
    ],
    choice: {
      key: "fiendish-legacy",
      requiresSpellcastingAbility: true,
      options: TIEFLING_LEGACY_OPTIONS,
    },
  },
  changeling: {
    hasSizeChoice: true,
    features: [
      {
        key: "changeling-instincts",
        name: "Changeling Instincts",
        desc: "Thanks to your connection to the fey realm, you gain proficiency in two of the following skills of your choice: Deception, Insight, Intimidation, Performance, or Persuasion.",
        grantedAtLevel: 1,
        combatSurface: false,
        effects: [
          {
            type: "grant_skill_proficiency",
            count: 2,
            options: ["deception", "insight", "intimidation", "performance", "persuasion"],
          },
        ],
      },
      {
        key: "shape-shifter",
        name: "Shape-Shifter",
        desc: "As an action, you can shape-shift to change your appearance and your voice. You determine the specifics of the changes, including your coloration, hair length, and sex. You can also adjust your height and weight and can change your size between Medium and Small. You can make yourself appear as a member of another playable species, though none of your game statistics change. You can't duplicate the appearance of an individual you've never seen, and you must adopt a form that has the same basic arrangement of limbs that you have. This trait doesn't change your clothing and equipment.\n\nWhile shape-shifted with this trait, you have Advantage on Charisma checks.\n\nYou stay in the new form until you take an action to revert to your true form.",
        grantedAtLevel: 1,
        combatSurface: true,
        actionTiming: "action",
        effects: [{ type: "narrative" }],
      },
    ],
  },
  warforged: {
    hasSizeChoice: true,
    features: [
      {
        key: "construct-resilience",
        name: "Construct Resilience",
        desc: "You have Resistance to Poison damage. You also have Advantage on saving throws to avoid or end the Poisoned condition.",
        grantedAtLevel: 1,
        combatSurface: true,
        effects: [{ type: "damage_resistance", damageType: "Poison" }],
      },
      {
        key: "integrated-protection",
        name: "Integrated Protection",
        desc: "You gain a +1 bonus to your Armor Class. In addition, armor you have donned can't be removed against your will while you're alive.",
        grantedAtLevel: 1,
        combatSurface: true,
        effects: [{ type: "ac_bonus", amount: 1 }],
      },
      {
        key: "sentrys-rest",
        name: "Sentry's Rest",
        desc: "You don't need to sleep, and magic can't put you to sleep. You can finish a Long Rest in 6 hours if you spend those hours in an inactive, motionless state. During this time, you appear inert but remain conscious.",
        grantedAtLevel: 1,
        combatSurface: true,
        effects: [{ type: "narrative" }],
      },
      {
        key: "specialized-design",
        name: "Specialized Design",
        desc: "You gain one skill proficiency and one tool proficiency of your choice.",
        grantedAtLevel: 1,
        combatSurface: false,
        effects: [
          { type: "grant_skill_proficiency", count: 1 },
          { type: "grant_tool_proficiency", count: 1 },
        ],
      },
      {
        key: "tireless",
        name: "Tireless",
        desc: "You don't gain Exhaustion levels from dehydration, malnutrition, or suffocation.",
        grantedAtLevel: 1,
        combatSurface: true,
        effects: [{ type: "narrative" }],
      },
    ],
  },
};
