import type { CatalogSource, SubclassData } from "../../src/data/types.js";
import { EXTRA_SUBCLASSES } from "./extraSubclasses.js";
import { NON_SRD_EFA, SRD_XPHB, nonSrd } from "./catalogSource.js";

type SubclassDraft = Omit<SubclassData, keyof CatalogSource>;

/** Non-SRD extra subclasses keyed by subclass key (5etools 2024 sources). */
const EXTRA_SUBCLASS_SOURCES: Record<string, CatalogSource> = {
  "college-of-dance": nonSrd("XPHB"),
  "college-of-glamour": nonSrd("XPHB"),
  "college-of-valor": nonSrd("XPHB"),
  "college-of-the-moon": nonSrd("FRHoF"),
  "college-of-spirits": nonSrd("RHW"),
  "oath-of-glory": nonSrd("XPHB"),
  "oath-of-the-ancients": nonSrd("XPHB"),
  "oath-of-vengeance": nonSrd("XPHB"),
  "oath-of-the-noble-genies": nonSrd("FRHoF"),
  "beast-master": nonSrd("XPHB"),
  "fey-wanderer": nonSrd("XPHB"),
  "gloom-stalker": nonSrd("XPHB"),
  "winter-walker": nonSrd("FRHoF"),
  "hollow-warden": nonSrd("RHW"),
  alchemist: NON_SRD_EFA,
  armorer: NON_SRD_EFA,
  artillerist: NON_SRD_EFA,
  "battle-smith": NON_SRD_EFA,
  cartographer: NON_SRD_EFA,
  reanimator: nonSrd("RHW"),
  "path-of-the-wild-heart": nonSrd("XPHB"),
  "path-of-the-world-tree": nonSrd("XPHB"),
  "path-of-the-zealot": nonSrd("XPHB"),
  "light-domain": nonSrd("XPHB"),
  "war-domain": nonSrd("XPHB"),
  "trickery-domain": nonSrd("XPHB"),
  "circle-of-the-moon": nonSrd("XPHB"),
  "circle-of-the-sea": nonSrd("XPHB"),
  "circle-of-stars": nonSrd("XPHB"),
  "battle-master": nonSrd("XPHB"),
  "eldritch-knight": nonSrd("XPHB"),
  "psi-warrior": nonSrd("XPHB"),
  "warrior-of-mercy": nonSrd("XPHB"),
  "warrior-of-shadow": nonSrd("XPHB"),
  "warrior-of-the-elements": nonSrd("XPHB"),
  assassin: nonSrd("XPHB"),
  "arcane-trickster": nonSrd("XPHB"),
  soulknife: nonSrd("XPHB"),
  "aberrant-sorcery": nonSrd("XPHB"),
  "clockwork-sorcery": nonSrd("XPHB"),
  "wild-magic-sorcery": nonSrd("XPHB"),
  "archfey-patron": nonSrd("XPHB"),
  "great-old-one-patron": nonSrd("XPHB"),
  "celestial-patron": nonSrd("XPHB"),
  abjurer: nonSrd("XPHB"),
  diviner: nonSrd("XPHB"),
  illusionist: nonSrd("XPHB"),
};

function withSubclassSource(subclass: SubclassDraft): SubclassData {
  return { ...subclass, ...(EXTRA_SUBCLASS_SOURCES[subclass.key] ?? SRD_XPHB) };
}

/** SRD 2024 subclasses for all twelve classes (levels 1–3 features only in this slice). */
const CORE_SUBCLASSES: SubclassDraft[] = [
  {
    key: "path-of-the-berserker",
    classKey: "barbarian",
    name: "Path of the Berserker",
    desc: "Barbarians who walk the Path of the Berserker direct their Rage primarily toward violence. These Barbarians are often found among Orcs and other creatures that have a strong demon taint in their blood.",
    features: [
      {
        key: "frenzy",
        name: "Frenzy",
        desc: "If you use Reckless Attack while your Rage is active, you deal extra damage to the first target you hit on your turn with a Strength-based attack. To determine the extra damage, roll a number of d6s equal to your Rage Damage bonus, and add them together. The damage has the same type as the weapon or Unarmed Strike used for the attack.",
        grantedAtLevel: 3,
        combatSurface: true,
        effects: [{ type: "narrative" }],
      },
    ],
  },
  {
    key: "college-of-lore",
    classKey: "bard",
    name: "College of Lore",
    desc: "Bards of the College of Lore collect spells and secrets from diverse sources. They gather in libraries and universities to share their lore, and meet at festivals or affairs of state to expose corruption and unravel lies.",
    features: [
      {
        key: "bonus-proficiencies",
        name: "Bonus Proficiencies",
        desc: "You gain proficiency with three skills of your choice.",
        grantedAtLevel: 3,
        combatSurface: false,
        effects: [{ type: "grant_skill_proficiencies", count: 3 }],
      },
      {
        key: "cutting-words",
        name: "Cutting Words",
        desc: "When a creature that you can see within 60 feet of yourself makes a damage roll or succeeds on an ability check or attack roll, you can take a Reaction to expend one use of your Bardic Inspiration; roll your Bardic Inspiration die, and subtract the number rolled from the creature's roll.",
        grantedAtLevel: 3,
        combatSurface: true,
        actionTiming: "reaction",
        effects: [{ type: "narrative" }],
      },
    ],
  },
  {
    key: "oath-of-devotion",
    classKey: "paladin",
    name: "Oath of Devotion",
    desc: "The Oath of Devotion binds Paladins to the ideals of justice and order. These Paladins meet the archetype of the knight in shining armor, holding themselves to the highest standards of conduct.",
    features: [
      {
        key: "oath-of-devotion-spells",
        name: "Oath of Devotion Spells",
        desc: "The magic of your oath ensures you always have Protection from Evil and Good and Shield of Faith prepared.",
        grantedAtLevel: 3,
        combatSurface: false,
        effects: [
          {
            type: "always_prepared_spells",
            spellNames: ["Protection from Evil and Good", "Shield of Faith"],
          },
        ],
      },
      {
        key: "sacred-weapon",
        name: "Sacred Weapon",
        desc: "When you take the Attack action, you can expend one use of your Channel Divinity to imbue one Melee weapon that you are holding with positive energy. For 10 minutes or until you use this feature again, you add your Charisma modifier to attack rolls with that weapon (minimum +1), and each time you hit with it, you cause it to deal its normal damage type or Radiant damage.\n\nThe weapon also emits Bright Light in a 20-foot radius and Dim Light 20 feet beyond that.",
        grantedAtLevel: 3,
        combatSurface: true,
        actionTiming: "action",
        effects: [{ type: "narrative" }],
      },
    ],
  },
  {
    key: "hunter",
    classKey: "ranger",
    name: "Hunter",
    desc: "You stalk prey in the wilds and elsewhere, using your abilities as a Hunter to protect nature and people everywhere from forces that would destroy them.",
    features: [
      {
        key: "hunters-lore",
        name: "Hunter's Lore",
        desc: "While a creature is marked by your Hunter's Mark, you know whether that creature has any Immunities, Resistances, or Vulnerabilities, and if the creature has any, you know what they are.",
        grantedAtLevel: 3,
        combatSurface: false,
        effects: [{ type: "narrative" }],
      },
      {
        key: "hunters-prey",
        name: "Hunter's Prey",
        desc: "You gain one of the following feature options of your choice. Whenever you finish a Short or Long Rest, you can replace the chosen option with the other one.",
        grantedAtLevel: 3,
        combatSurface: true,
        limitedUses: { kind: "fixed", uses: 1 },
        restRecovery: "short",
        effects: [
          {
            type: "choose_feature_option",
            choiceKey: "hunters-prey",
            options: [
              {
                key: "colossus-slayer",
                name: "Colossus Slayer",
                desc: "When you hit a creature with a weapon, the weapon deals an extra 1d8 damage to the target if it's missing any of its Hit Points. You can deal this extra damage only once per turn.",
              },
              {
                key: "horde-breaker",
                name: "Horde Breaker",
                desc: "Once on each of your turns when you make an attack with a weapon, you can make another attack with the same weapon against a different creature that is within 5 feet of the original target, that is within the weapon's range, and that you haven't attacked this turn.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    key: "life-domain",
    classKey: "cleric",
    name: "Life Domain",
    desc: "The Life Domain focuses on the vibrant positive energy that sustains all life. Clerics of this Domain are masters of healing, using life-giving magic to keep their allies alive.",
    features: [
      {
        key: "life-domain-spells",
        name: "Life Domain Spells",
        desc: "The magic of your domain ensures you always have Aid, Bless, Cure Wounds, and Lesser Restoration prepared.",
        grantedAtLevel: 3,
        combatSurface: false,
        effects: [
          {
            type: "always_prepared_spells",
            spellNames: ["Aid", "Bless", "Cure Wounds", "Lesser Restoration"],
          },
        ],
      },
      {
        key: "disciple-of-life",
        name: "Disciple of Life",
        desc: "When a spell you cast restores Hit Points to a creature, that creature regains additional Hit Points on the turn you cast the spell. The extra Hit Points equal 2 plus the spell's level.",
        grantedAtLevel: 3,
        combatSurface: true,
        effects: [{ type: "narrative" }],
      },
      {
        key: "preserve-life",
        name: "Preserve Life",
        desc: "As a Magic action, you expend a use of your Channel Divinity and present your Holy Symbol to evoke healing energy that can restore a number of Hit Points equal to five times your Cleric level. Choose Bloodied creatures within 30 feet of yourself (which can include you), and divide those Hit Points among them. This feature can restore a creature to no more than half its Hit Point maximum.",
        grantedAtLevel: 3,
        combatSurface: true,
        actionTiming: "action",
        effects: [{ type: "narrative" }],
      },
    ],
  },
  {
    key: "circle-of-the-land",
    classKey: "druid",
    name: "Circle of the Land",
    desc: "The Circle of the Land is made up of mystics and sages who safeguard ancient knowledge and rites through a vast oral tradition. These Druids meet within sacred circles of trees or standing stones to share their secret lore.",
    features: [
      {
        key: "circle-of-the-land-spells",
        name: "Circle of the Land Spells",
        desc: "Your mystical connection to the land infuses you with the ability to cast certain spells. Each time you finish a Long Rest, you regain the ability to cast one spell from the following list that you don't have prepared, based on your land type.",
        grantedAtLevel: 3,
        combatSurface: false,
        effects: [
          {
            type: "choose_feature_option",
            choiceKey: "land-type",
            options: [
              {
                key: "arid",
                name: "Arid Land",
                desc: "Burning Hands, Blur, and Fire Bolt are always prepared.",
                spellNames: ["Burning Hands", "Blur", "Fire Bolt"],
              },
              {
                key: "polar",
                name: "Polar Land",
                desc: "Fog Cloud, Hold Person, and Ray of Frost are always prepared.",
                spellNames: ["Fog Cloud", "Hold Person", "Ray of Frost"],
              },
              {
                key: "temperate",
                name: "Temperate Land",
                desc: "Sleep, Misty Step, and Shocking Grasp are always prepared.",
                spellNames: ["Sleep", "Misty Step", "Shocking Grasp"],
              },
              {
                key: "tropical",
                name: "Tropical Land",
                desc: "Ray of Sickness, Web, and Acid Splash are always prepared.",
                spellNames: ["Ray of Sickness", "Web", "Acid Splash"],
              },
            ],
          },
        ],
      },
      {
        key: "lands-aid",
        name: "Land's Aid",
        desc: "As a Magic action, you expend a use of your Wild Shape and choose one creature you can see within 60 feet of yourself. Roll a number of d6s equal to your Druid level. The target takes Necrotic damage equal to the total, and you or another creature within 60 feet of yourself regains Hit Points equal to the total.",
        grantedAtLevel: 3,
        combatSurface: true,
        actionTiming: "action",
        effects: [{ type: "narrative" }],
      },
    ],
  },
  {
    key: "champion",
    classKey: "fighter",
    name: "Champion",
    desc: "A Champion focuses on the development of martial prowess in a relentless pursuit of victory. Champions combine rigorous training with physical excellence to deal devastating blows.",
    features: [
      {
        key: "improved-critical",
        name: "Improved Critical",
        desc: "Your attack rolls with weapons and Unarmed Strikes can score a Critical Hit on a roll of 19 or 20 on the d20.",
        grantedAtLevel: 3,
        combatSurface: true,
        effects: [{ type: "narrative" }],
      },
      {
        key: "remarkable-athlete",
        name: "Remarkable Athlete",
        desc: "You have Advantage on Initiative rolls and Strength (Athletics) checks.",
        grantedAtLevel: 3,
        combatSurface: true,
        effects: [{ type: "narrative" }],
      },
    ],
  },
  {
    key: "warrior-of-the-open-hand",
    classKey: "monk",
    name: "Warrior of the Open Hand",
    desc: "Warriors of the Open Hand are masters of martial arts combat. They learn techniques to push and trip their opponents and manipulate their own energy to protect themselves from harm.",
    features: [
      {
        key: "open-hand-technique",
        name: "Open Hand Technique",
        desc: "When you hit a creature with an Unarmed Strike, you can use one of the following effects:\n\nAdd Damage. The target takes extra Bludgeoning damage equal to your Martial Arts die.\n\nPush. The target must succeed on a Strength saving throw or be pushed up to 15 feet away from you.\n\nTopple. The target must succeed on a Dexterity saving throw or have the Prone condition.",
        grantedAtLevel: 3,
        combatSurface: true,
        effects: [{ type: "narrative" }],
      },
    ],
  },
  {
    key: "thief",
    classKey: "rogue",
    name: "Thief",
    desc: "A mix of burglar, treasure hunter, and explorer, you are the epitome of an adventurer. In addition to improving your agility and stealth, you gain abilities useful for delving into ruins and getting maximum benefit from the magic items you find.",
    features: [
      {
        key: "fast-hands",
        name: "Fast Hands",
        desc: "As a Bonus Action, you can do one of the following:\n\nSleight of Hand. Make a Dexterity (Sleight of Hand) check.\n\nUse an Object. Take the Utilize action, or take the Magic action to use a magic item that requires that action.",
        grantedAtLevel: 3,
        combatSurface: true,
        actionTiming: "bonus",
        effects: [{ type: "narrative" }],
      },
      {
        key: "second-story-work",
        name: "Second-Story Work",
        desc: "You've trained to get into especially hard-to-reach places, granting you these benefits.\n\nClimber. You gain a Climb Speed equal to your Speed.\n\nJumper. You can determine your jump distance using your Dexterity rather than your Strength.",
        grantedAtLevel: 3,
        combatSurface: true,
        effects: [{ type: "narrative" }],
      },
    ],
  },
  {
    key: "draconic-sorcery",
    classKey: "sorcerer",
    name: "Draconic Sorcery",
    desc: "Your innate magic comes from the gift of a dragon. Perhaps an ancestor made a bargain with a dragon, or a draconic sorcerer might have a dragon parent.",
    features: [
      {
        key: "draconic-resilience",
        name: "Draconic Resilience",
        desc: "Your hit point maximum increases by 1 for each Sorcerer level you have. In addition, while you aren't wearing armor, your base Armor Class equals 10 plus your Dexterity and Charisma modifiers. You can use a Shield and still gain this benefit.",
        grantedAtLevel: 3,
        combatSurface: true,
        effects: [
          { type: "unarmored_defense", abilities: ["cha"] },
          { type: "hit_points_per_class_level", amount: 1 },
        ],
      },
      {
        key: "draconic-spells",
        name: "Draconic Spells",
        desc: "When you reach Sorcerer levels specified in the Draconic Spells table, you always have the listed spells prepared.",
        grantedAtLevel: 3,
        combatSurface: false,
        effects: [
          {
            type: "always_prepared_spells",
            spellNames: ["Alter Self", "Chromatic Orb", "Command", "Dragon's Breath"],
          },
        ],
      },
    ],
  },
  {
    key: "fiend-patron",
    classKey: "warlock",
    name: "Fiend Patron",
    desc: "Your pact draws on the Lower Planes, the realms of perdition. You might forge a bargain with a demon lord, an archdevil, or another fiend.",
    features: [
      {
        key: "dark-ones-blessing",
        name: "Dark One's Blessing",
        desc: "When you reduce an enemy to 0 Hit Points, you gain Temporary Hit Points equal to your Charisma modifier plus your Warlock level (minimum of 1).",
        grantedAtLevel: 3,
        combatSurface: true,
        effects: [{ type: "narrative" }],
      },
      {
        key: "fiend-spells",
        name: "Fiend Spells",
        desc: "The magic of your patron ensures you always have Burning Hands, Command, Scorching Ray, and Suggestion prepared.",
        grantedAtLevel: 3,
        combatSurface: false,
        effects: [
          {
            type: "always_prepared_spells",
            spellNames: ["Burning Hands", "Command", "Scorching Ray", "Suggestion"],
          },
        ],
      },
    ],
  },
  {
    key: "evoker",
    classKey: "wizard",
    name: "Evoker",
    desc: "Your studies focus on magic that creates powerful elemental effects such as bitter cold, searing flame, rolling thunder, crackling lightning, and burning acid.",
    features: [
      {
        key: "potent-cantrip",
        name: "Potent Cantrip",
        desc: "When you cast a cantrip at a creature and you miss with the attack roll or the target succeeds on a saving throw, the target takes half the cantrip's damage (if any) but suffers no additional effect from the spell.",
        grantedAtLevel: 3,
        combatSurface: true,
        effects: [{ type: "narrative" }],
      },
      {
        key: "evocation-savant",
        name: "Evocation Savant",
        desc: "Choose two Wizard spells from the Evocation school, each of which must be no higher than level 2, and add them to your spellbook for free. In addition, whenever you gain access to a new level of spell slots, you can add one Wizard spell from the Evocation school to your spellbook for free.",
        grantedAtLevel: 3,
        combatSurface: false,
        effects: [{ type: "grant_spellbook_picks", count: 2, school: "Evocation", maxSpellLevel: 2 }],
      },
    ],
  },
];

export const SUBCLASSES: SubclassData[] = [...CORE_SUBCLASSES, ...EXTRA_SUBCLASSES].map(withSubclassSource);
