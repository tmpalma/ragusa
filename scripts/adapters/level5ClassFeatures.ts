import type { ClassFeatureData } from "../../src/data/types.js";

/** Level-5 class features ported from dnd55-data seed 030. */
export const LEVEL_5_CLASS_FEATURES: Record<string, ClassFeatureData[]> = {
  "barbarian": [
    {
      "key": "extra-attack",
      "name": "Extra Attack",
      "desc": "You can attack twice instead of once whenever you take the Attack action on your turn.",
      "effects": [
        {
          "type": "narrative"
        }
      ],
      "combatSurface": true,
      "grantedAtLevel": 5
    },
    {
      "key": "fast-movement",
      "name": "Fast Movement",
      "desc": "Your speed increases by 10 feet while you aren't wearing Heavy armor.",
      "effects": [
        {
          "type": "narrative"
        }
      ],
      "combatSurface": false,
      "grantedAtLevel": 5
    }
  ],
  "bard": [
    {
      "key": "font-of-inspiration",
      "name": "Font of Inspiration",
      "desc": "You now regain all your expended uses of Bardic Inspiration when you finish a Short Rest or Long Rest.\n\nIn addition, you can expend a spell slot (no action required) to regain one expended use of Bardic Inspiration.",
      "effects": [
        {
          "type": "narrative"
        }
      ],
      "combatSurface": false,
      "grantedAtLevel": 5,
      "restRecovery": "short"
    }
  ],
  "cleric": [
    {
      "key": "sear-undead",
      "name": "Sear Undead",
      "desc": "Whenever you use Turn Undead, you can roll a number of d8s equal to your Wisdom modifier (minimum of 1d8) and add the rolls together. Each Undead that fails its saving throw against that use of Turn Undead takes Radiant damage equal to the roll's total. This damage doesn't end the turn effect.",
      "effects": [
        {
          "type": "narrative"
        }
      ],
      "combatSurface": true,
      "grantedAtLevel": 5
    }
  ],
  "druid": [
    {
      "key": "wild-resurgence",
      "name": "Wild Resurgence",
      "desc": "Once on each of your turns, if you have no uses of Wild Shape left, you can give yourself one use by expending a spell slot (no action required).\n\nIn addition, you can expend one use of Wild Shape (no action required) to give yourself a level 1 spell slot, but you can't do so again until you finish a Long Rest.",
      "effects": [
        {
          "type": "narrative"
        }
      ],
      "combatSurface": true,
      "grantedAtLevel": 5
    }
  ],
  "fighter": [
    {
      "key": "extra-attack",
      "name": "Extra Attack",
      "desc": "You can attack twice instead of once whenever you take the Attack action on your turn.",
      "effects": [
        {
          "type": "narrative"
        }
      ],
      "combatSurface": true,
      "grantedAtLevel": 5
    },
    {
      "key": "tactical-shift",
      "name": "Tactical Shift",
      "desc": "Whenever you activate your Second Wind with a Bonus Action, you can move up to half your Speed without provoking Opportunity Attack.",
      "effects": [
        {
          "type": "narrative"
        }
      ],
      "combatSurface": true,
      "grantedAtLevel": 5
    }
  ],
  "monk": [
    {
      "key": "extra-attack",
      "name": "Extra Attack",
      "desc": "You can attack twice instead of once whenever you take the Attack action on your turn.",
      "effects": [
        {
          "type": "narrative"
        }
      ],
      "combatSurface": true,
      "grantedAtLevel": 5
    },
    {
      "key": "stunning-strike",
      "name": "Stunning Strike",
      "desc": "Once per turn when you hit a creature with a Monk weapon or an Unarmed Strike, you can expend 1 Focus Point to attempt a stunning strike. The target must make a Constitution saving throw. On a failed save, the target has the Stunned condition until the start of your next turn. On a successful save, the target's Speed is halved until the start of your next turn, and the next attack roll made against the target before then has Advantage.",
      "effects": [
        {
          "type": "narrative"
        }
      ],
      "combatSurface": true,
      "grantedAtLevel": 5
    }
  ],
  "paladin": [
    {
      "key": "extra-attack",
      "name": "Extra Attack",
      "desc": "You can attack twice instead of once whenever you take the Attack action on your turn.",
      "effects": [
        {
          "type": "narrative"
        }
      ],
      "combatSurface": true,
      "grantedAtLevel": 5
    },
    {
      "key": "faithful-steed",
      "name": "Faithful Steed",
      "desc": "You can call on the aid of an otherworldly steed. You always have the Find Steed spell prepared.\n\nYou can also cast the spell once without expending a spell slot, and you regain the ability to do so when you finish a Long Rest.",
      "effects": [
        {
          "type": "always_prepared_spells",
          "spellNames": [
            "Find Steed"
          ]
        }
      ],
      "combatSurface": true,
      "grantedAtLevel": 5,
      "limitedUses": {
        "kind": "fixed",
        "uses": 1
      },
      "restRecovery": "long"
    }
  ],
  "ranger": [
    {
      "key": "extra-attack",
      "name": "Extra Attack",
      "desc": "You can attack twice instead of once whenever you take the Attack action on your turn.",
      "effects": [
        {
          "type": "narrative"
        }
      ],
      "combatSurface": true,
      "grantedAtLevel": 5
    }
  ],
  "rogue": [
    {
      "key": "cunning-strike",
      "name": "Cunning Strike",
      "desc": "You've developed cunning ways to use your Sneak Attack. When you deal Sneak Attack damage, you can add one of the following Cunning Strike effects. Each effect has a die cost, which is the number of Sneak Attack damage dice you must forgo to add the effect. You remove the die before rolling, and the effect occurs immediately after the attack's damage is dealt. For example, if you add the Poison effect, remove 1d6 from the Sneak Attack's damage before rolling.\n\nIf a Cunning Strike effect requires a saving throw, the DC equals 8 plus your Dexterity modifier and Proficiency Bonus.",
      "effects": [
        {
          "type": "choose_feature_option",
          "options": [
            {
              "key": "poison",
              "name": "Poison",
              "desc": "Cost: 1d6. You add a toxin to your strike, forcing the target to make a Constitution saving throw. On a failed save, the target has the Poisoned condition for 1 minute. At the end of each of its turns, the Poisoned target repeats the save, ending the effect on itself on a success.\n\nTo use this effect, you must have a Poisoner's Kit on your person."
            },
            {
              "key": "trip",
              "name": "Trip",
              "desc": "Cost: 1d6. If the target is Large or smaller, it must succeed on a Dexterity saving throw or have the Prone condition."
            },
            {
              "key": "withdraw",
              "name": "Withdraw",
              "desc": "Cost: 1d6. Immediately after the attack, you move up to half your Speed without provoking Opportunity Attack."
            }
          ],
          "choiceKey": "cunning-strike",
          "uiSurface": "reference"
        }
      ],
      "combatSurface": true,
      "grantedAtLevel": 5
    },
    {
      "key": "uncanny-dodge",
      "name": "Uncanny Dodge",
      "desc": "When an attacker that you can see hits you with an attack roll, you can take a Reaction to halve the attack's damage against you (round down).",
      "effects": [
        {
          "type": "narrative"
        }
      ],
      "combatSurface": true,
      "grantedAtLevel": 5,
      "actionTiming": "reaction"
    }
  ],
  "sorcerer": [
    {
      "key": "sorcerous-restoration",
      "name": "Sorcerous Restoration",
      "desc": "When you finish a Short Rest, you can regain expended Sorcery Points, but no more than a number equal to half your Sorcerer level (round down). Once you use this feature, you can't do so again until you finish a Long Rest.",
      "effects": [
        {
          "type": "narrative"
        }
      ],
      "combatSurface": false,
      "grantedAtLevel": 5,
      "limitedUses": {
        "kind": "fixed",
        "uses": 1
      },
      "restRecovery": "long"
    }
  ],
  "wizard": [
    {
      "key": "memorize-spell",
      "name": "Memorize Spell",
      "desc": "Whenever you finish a Short Rest, you can study your spellbook and replace one of the level 1+ Wizard spells you have prepared for your Spellcasting feature with another level 1+ spell from the book.",
      "effects": [
        {
          "type": "narrative"
        }
      ],
      "combatSurface": true,
      "grantedAtLevel": 5
    }
  ]
} as Record<string, ClassFeatureData[]>;
