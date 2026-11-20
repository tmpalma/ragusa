import type { FeatData } from "../../src/data/types.js";
import { nonSrd } from "./catalogSource.js";

/** Post-2024 book feats transcribed from 5etools (developer extract). */
export const POST2024_FEATS: FeatData[] = [
  {
    key: "aberrant-anatomy",
    name: "Aberrant Anatomy",
    category: "Dark Gift",
    desc: `Exposure to alien horrors like those of the Far Realm has warped your physical form in supernatural ways. You gain the following features.

**Breathless.** You can hold your breath for 1 hour.

**Extrasensory Perception.** You have proficiency in the Perception skill, if you lack it. You also gain Expertise in that skill.

In addition, you have Blindsight with a range of 15 feet.

**Warping Flesh.** Immediately after you make a D20 Test and roll a 1 on the d20, the aberrant influence infecting your form flares, wrenching control of your flesh. Make a Constitution saving throw (DC 13 plus your Proficiency Bonus). On a failed save, you have the Stunned condition until the end of your next turn.`,
    ...nonSrd("RHW"),
  },
  {
    key: "abjuration-adept",
    name: "Abjuration Adept",
    category: "General",
    desc: `You gain the following benefits.

**Additional Spells.** Your prowess allows you to always have certain spells at the ready. When you have spell slots of a level specified in the Abjuration Adept Spells table, you thereafter always have the spells listed for that level and lower prepared.

**Protective Ward.** When you cast a spell from the Abjuration school using a spell slot, you or one creature you can see within 30 feet of yourself gains Temporary Hit Points equal to twice the level of spell slot expended.

Abjuration Adept Spells
Spell Slot Level | Spell
1 | Shield
2 | Lesser Restoration
3 | Protection from Energy
4 | Banishment
5 | Mass Cure Wounds`,
    ...nonSrd("AU"),
  },
  {
    key: "arcane-artist",
    name: "Arcane Artist",
    category: "Origin",
    desc: `You gain the following benefits.

**Cantrip.** You learn the Minor Illusion cantrip. Intelligence, Wisdom, or Charisma is your spellcasting ability for this spell (choose when you select this feat).

**Inspiring Magic.** When you cast a spell from the Illusion school, you can choose one ally within 30 feet of yourself who can see you. That ally gains Heroic Inspiration. Once you use this benefit, you can't use it again until you finish a Long Rest.`,
    ...nonSrd("AU"),
  },
  {
    key: "arcane-eloquence",
    name: "Arcane Eloquence",
    category: "Origin",
    desc: `You gain the following benefits.

**Cantrip.** You learn the Vicious Mockery cantrip. Intelligence, Wisdom, or Charisma is your spellcasting ability for this spell (choose when you select this feat).

**Smooth Talker.** When you make a Charisma (Deception, Intimidation, or Persuasion) check, you can roll 1d4 and add the number rolled to the ability check.`,
    ...nonSrd("AU"),
  },
  {
    key: "arcane-infiltrator",
    name: "Arcane Infiltrator",
    category: "Origin",
    desc: `You gain the following benefits.

**Cantrip.** You learn the Friends cantrip. Intelligence, Wisdom, or Charisma is your spellcasting ability for this spell (choose when you select this feat).

**Cunning Diversion.** You can take the Dodge action as a Bonus Action. You can use this benefit a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.`,
    ...nonSrd("AU"),
  },
  {
    key: "arcane-omens",
    name: "Arcane Omens",
    category: "Origin",
    desc: `You gain the following benefits.

**Cantrip.** You learn the Guidance cantrip. Intelligence, Wisdom, or Charisma is your spellcasting ability for this spell (choose when you select this feat).

**Helpful Premonition.** When you or a creature you can see within 30 feet of yourself fails a saving throw, you can take a Reaction to roll 1d4 and add the number rolled to the save's total, potentially turning the failure into a success. You can use this benefit a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.`,
    ...nonSrd("AU"),
  },
  {
    key: "arcane-overload",
    name: "Arcane Overload",
    category: "Origin",
    desc: `You gain the following benefits.

**Cantrip.** You learn the Fire Bolt cantrip. Intelligence, Wisdom, or Charisma is your spellcasting ability for this spell (choose when you select this feat).

**Power Surge.** When you cast an Evocation spell and deal damage with it, you can add your Proficiency Bonus to one damage roll of that spell. Once you use this benefit, you can't do so again until you finish a Long Rest.`,
    ...nonSrd("AU"),
  },
  {
    key: "arcane-safeguard",
    name: "Arcane Safeguard",
    category: "Origin",
    desc: `You gain the following benefits.

**Cantrip.** You learn the Resistance cantrip. Intelligence, Wisdom, or Charisma is your spellcasting ability for this spell (choose when you select this feat). You can cast the Resistance cantrip as a Bonus Action. You can do so a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.

**Sheltering Aid.** When you take the Help action to assist with an ally's ability check, that ally gains a number of Temporary Hit Points equal to your Proficiency Bonus.`,
    ...nonSrd("AU"),
  },
  {
    key: "arcane-undertaker",
    name: "Arcane Undertaker",
    category: "Origin",
    desc: `You gain the following benefits.

**Cantrip.** You learn one Cleric or Wizard cantrip of your choice. The cantrip must be from the Necromancy school. Intelligence, Wisdom, or Charisma is your spellcasting ability for this spell (choose when you select this feat).

**Knowledge from the Dead.** When you make an Intelligence (History) or Wisdom (Medicine) check, you can roll 1d4 and add the number rolled to the ability check.

**Understanding of Death.** When you take the Help action to stabilize a creature with 0 Hit Points, you gain Heroic Inspiration. Once you use this benefit, you can't use it again until you finish a Long Rest.`,
    ...nonSrd("AU"),
  },
  {
    key: "arcane-warrior",
    name: "Arcane Warrior",
    category: "Fighting Style",
    desc: `You learn two Wizard cantrips of your choice. Mage Hand and Ray of Frost are recommended. Intelligence, Wisdom, or Charisma is your spellcasting ability for these spells (choose when you select this feat).

Whenever you gain a level, you can replace one of these cantrips with another Wizard cantrip.`,
    ...nonSrd("AU"),
  },
  {
    key: "bloodlust",
    name: "Bloodlust",
    category: "General",
    desc: `You gain the following benefits.

**Powerful Recovery.** When you roll a Hit Point Die to regain Hit Points, you can treat any roll of 1 or 2 as a 3.

**Sanguine Feast.** Once per turn when you hit a Bloodied creature that isn't a Construct or Undead with an attack roll, you can expend a Hit Point Die, roll it, and regain a number of Hit Points equal to the number rolled plus your Constitution modifier.

You can use this feature a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.`,
    ...nonSrd("ABH"),
  },
  {
    key: "bomber",
    name: "Bomber",
    category: "General",
    desc: `You gain the following benefits.

**Far Lobber.** When you use the Attack action to throw a vial or flask, you can target an object or creature you can see within 40 feet of yourself.

**Long Shots.** Attacking at long range doesn't impose Disadvantage on your attack rolls with Thrown weapons.`,
    ...nonSrd("ABH"),
  },
  {
    key: "cloying-mists",
    name: "Cloying Mists",
    category: "General",
    desc: `You gain the following benefits.

**Arise, Fog.** You always have the Fog Cloud spell prepared. You can cast it without a spell slot, and you must finish a Long Rest before you can cast it in this way again. You can also cast it using spell slots you have of the appropriate level. Your spellcasting ability for the spell is the ability increased by this feat.

**Grasping Mist.** Whenever you cast Fog Cloud, nonmagical flames in the spell's Sphere are extinguished, and creatures other than you and your allies have their Speed reduced by 5 feet while in the spell's Sphere.`,
    ...nonSrd("ABH"),
  },
  {
    key: "cold-caster",
    name: "Cold Caster",
    category: "General",
    desc: `You gain the following benefits.

**Cantrip.** You learn the Ray of Frost cantrip. If you already know it, you learn a different Wizard cantrip of your choice. The spell's spellcasting ability is the ability increased by this feat.

**Frostbite.** Once per turn when you hit a creature with an attack roll and deal Cold damage, you can temporarily negate the creature's defenses. The creature subtracts 1d4 from the next saving throw it makes before the end of your next turn.`,
    ...nonSrd("FRHoF"),
  },
  {
    key: "conjuration-adept",
    name: "Conjuration Adept",
    category: "General",
    desc: `You gain the following benefits.

**Additional Spells.** Your prowess allows you to always have certain spells at the ready. When you have spell slots of a level specified in the Conjuration Adept Spells table, you thereafter always have the spells listed for that level and lower prepared.

**Persistent Conjuration.** While maintaining Concentration on a spell from the Conjuration school, you gain a bonus to Constitution saving throws to maintain this Concentration. This bonus is equal to the ability modifier of the score increased by this feat.

Conjuration Adept Spells
Spell Slot Level | Spell
1 | Entangle
2 | Misty Step
3 | Conjure Animals
4 | Dimension Door
5 | Conjure Elemental`,
    ...nonSrd("AU"),
  },
  {
    key: "delicious-pain",
    name: "Delicious Pain",
    category: "General",
    desc: `You gain the following benefits.

**Toughened Flesh.** Immediately after you take Bludgeoning, Piercing, or Slashing damage, you can take a Reaction to gain Resistance to Bludgeoning, Piercing, and Slashing damage until the start of your next turn. Once you use this benefit, you can't use it again until you finish a Short or Long Rest.`,
    ...nonSrd("ABH"),
  },
  {
    key: "divination-adept",
    name: "Divination Adept",
    category: "General",
    desc: `You gain the following benefits.

**Additional Spells.** Your prowess allows you to always have certain spells at the ready. When you have spell slots of a level specified in the Divination Adept Spells table, you thereafter always have the spells listed for that level and lower prepared.

**Prescient Intervention.** When a creature you can see within 60 feet of yourself makes a D20 Test, you can take a Reaction to give that creature Advantage or Disadvantage (your choice) on that roll.

Once you use this benefit, you can't do so again until you finish a Long Rest. You can also regain use of this feature when you cast a spell from the Divination school using a spell slot.

Divination Adept Spells
Spell Slot Level | Spell
1 | Detect Evil and Good
2 | Mind Spike
3 | Clairvoyance
4 | Divination
5 | Scrying`,
    ...nonSrd("AU"),
  },
  {
    key: "dragonscarred",
    name: "Dragonscarred",
    category: "General",
    desc: `You gain the following benefits.

**Damage Resistance.** When you gain this feat, choose Acid, Cold, Fire, Lightning, or Poison. You have Resistance to the chosen damage type.

**Fearsome Power.** When you deal damage to a creature as part of the Attack or Magic action on your turn, you can use the Dragon's Terror benefit of the Cult of the Dragon Initiate feat as a Bonus Action this turn.`,
    ...nonSrd("FRHoF"),
  },
  {
    key: "echoing-soul",
    name: "Echoing Soul",
    category: "Dark Gift",
    desc: `You experience echoes from a past or alternate life. You gain the following features.

**Channeled Prowess.** You have proficiency in two skills of your choice.

In addition, choose one skill you have proficiency in. You gain Expertise in that skill. Whenever you finish a Long Rest, you can change your choice for this benefit.

**Inherent Tongues.** You know one additional language of your choice, which you choose from the language tables in the Player's Handbook.

**Intrusive Echoes.** Immediately after you make a D20 Test and roll a 1 on the d20, memories and sensations from your soul's other life threaten to overtake you. Make a Constitution saving throw (DC 13 plus your Proficiency Bonus). On a failed save, you have the Incapacitated condition until the end of your next turn. While you are Incapacitated in this way, your Speed is halved.`,
    ...nonSrd("RHW"),
  },
  {
    key: "elemental-familiar",
    name: "Elemental Familiar",
    category: "General",
    desc: `You gain the following benefits.

**Elemental Energy.** You learn how to imbue your familiar with elemental power. When you cast the Find Familiar spell, choose Acid, Cold, Fire, Lightning, or Thunder damage. Your familiar is imbued with this energy until you cast Find Familiar again, granting it the following benefits:

**Elemental Resistance.** Your familiar has Resistance to the chosen damage type.

**Energy Pulse.** As a Bonus Action, you command your familiar to unleash a burst of elemental energy. Your familiar must be within 120 feet of you and take a Reaction to unleash this burst. Each creature in a 5-foot Emanation originating from your familiar makes a Dexterity saving throw (DC 8 plus your spellcasting ability modifier for the Find Familiar spell and your Proficiency Bonus). On a failed save, a creature takes 2d4 damage of the chosen type, and if the creature is Medium or smaller, it has the Prone condition.`,
    ...nonSrd("AU"),
  },
  {
    key: "enchantment-adept",
    name: "Enchantment Adept",
    category: "General",
    desc: `You gain the following benefits.

**Additional Spells.** Your prowess allows you to always have certain spells at the ready. When you have spell slots of a level specified in the Enchantment Adept Spells table, you thereafter always have the spells listed for that level and lower prepared.

**Subtle Enchantments.** When you cast a spell from the Enchantment school using a spell slot, you can cast it without any Verbal, Somatic, or Material components, except Material components that are consumed by the spell or that have a cost specified in the spell.

Enchantment Adept Spells
Spell Slot Level | Spell
1 | Dissonant Whispers
2 | Enthrall
3 | Hold Person
4 | Dominate Beast
5 | Modify Memory`,
    ...nonSrd("AU"),
  },
  {
    key: "enclave-magic",
    name: "Enclave Magic",
    category: "General",
    desc: `You gain the following benefits.

**Friend to Animals.** You have Advantage on ability checks when taking the Influence action with Beasts.

**Two Hearts, One Mind.** You always have the Beast Sense spell prepared. You can cast it once without a spell slot, and you regain the ability to cast it in that way when you finish a Long Rest. When you cast it without a spell slot using this feature, it doesn't require Concentration. You can also cast the spell using any spell slots you have of the appropriate level. The spell's spellcasting ability is the ability increased by this feat.`,
    ...nonSrd("FRHoF"),
  },
  {
    key: "evocation-adept",
    name: "Evocation Adept",
    category: "General",
    desc: `You gain the following benefits.

**Additional Spells.** Your prowess allows you to always have certain spells at the ready. When you have spell slots of a level specified in the Evocation Adept Spells table, you thereafter always have the spells listed for that level and lower prepared.

**Fueled Evocation.** Once per turn when you cast an Evocation spell and deal damage, you can roll up to two of your unexpended Hit Point Dice and add the total rolled to one of the spell's damage rolls. Those Hit Point Dice are then expended.

Evocation Adept Spells
Spell Slot Level | Spell
1 | Chromatic Orb
2 | Shatter
3 | Fireball
4 | Vitriolic Sphere
5 | Wall of Force`,
    ...nonSrd("AU"),
  },
  {
    key: "fairy-trickster",
    name: "Fairy Trickster",
    category: "General",
    desc: `You gain the following benefits.

**Faerie Trod Trotter.** When you take the Disengage action on your turn, Difficult Terrain doesn't cost you extra movement for the rest of that turn.

**Flustering Strike.** When you hit a creature with an attack roll, you can attempt to fluster the target. The target must succeed on a Wisdom saving throw (DC 8 plus the ability modifier of the score increased by this feat and your Proficiency Bonus) or have Disadvantage on saving throws until the end of your next turn.

You can use this benefit a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.`,
    ...nonSrd("FRHoF"),
  },
  {
    key: "familiar-friend",
    name: "Familiar Friend",
    category: "Origin",
    desc: `You gain the following benefits.

**Faithful Companion.** You always have the Find Familiar spell prepared. Intelligence, Wisdom, or Charisma is your spellcasting ability for this spell (choose when you select this feat). You can cast it once without a spell slot or Material components, and you regain the ability to cast it in this way when you finish a Long Rest. You can also cast the spell using any spell slots you have.

**Fortified Familiar.** When you cast the Find Familiar spell, your familiar's Hit Point maximum and current Hit Points are increased by an amount equal to twice your character level.

**Helpful Friend.** When you make an ability check using a skill in which you have proficiency while your familiar is within 5 feet of you, you gain Advantage on the check. You can use this benefit a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.`,
    ...nonSrd("AU"),
  },
  {
    key: "gathered-whispers",
    name: "Gathered Whispers",
    category: "Dark Gift",
    desc: `You are haunted by a cacophony of whispering spirits only you can hear. You gain the following features.

**Spirit Whispers.** You learn the Message spell and can cast it without Material components. Additionally, you always have the Augury spell prepared. You can cast it without a spell slot or spell components, and you must finish a Long Rest before you can cast it in this way again. You can also cast the spell using any spell slots you have.

Intelligence, Wisdom, or Charisma is your spellcasting ability for this benefit (choose when you select this feat).

**Unearthly Scream.** When you are hit by an attack roll, you can take a Reaction to channel your haunting spirits into a protective, otherworldly scream. You can add your Proficiency Bonus to your AC against that attack, potentially causing it to miss. You can use this benefit a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.

**Voices from Beyond.** Immediately after you make a D20 Test and roll a 1 on the d20, the haunting voices rise to a ghastly volume. Make a Wisdom saving throw (DC 13 plus your Proficiency Bonus). On a failed save, you have the Deafened condition until the end of your next turn. While Deafened, you have Disadvantage on ability checks and attack rolls.`,
    ...nonSrd("RHW"),
  },
  {
    key: "genie-magic",
    name: "Genie Magic",
    category: "General",
    desc: `You gain the following benefits.

**Wish Magic.** As a Magic action, you can cast a level=1 that has a casting time of an action. Once you use this benefit, you can't do so again until you finish a Long Rest. The spell's spellcasting ability is the ability increased by this feat.

When you reach level 11, the spell you cast with this feat is cast as though using a level 2 spell slot.

When you reach level 17, the spell is cast as though using a level 3 spell slot.`,
    ...nonSrd("FRHoF"),
  },
  {
    key: "greater-aberrant-mark",
    name: "Greater Aberrant Mark",
    category: "General",
    desc: `You gain the following benefits.

**Improved Fortitude.** When you use the Aberrant Fortitude benefit of your Aberrant Dragonmark feat, you can roll 1d6 instead of 1d4. You also now regain your use of Aberrant Fortitude whenever you finish a Short or Long Rest.

**Mark of Inspiration.** When you cast a cantrip, you can roll one or two of your unexpended Hit Point Dice. You gain a number of Temporary Hit Points equal to the number rolled plus your Constitution modifier, and one creature of your choice within 30 feet of you (not including you) takes Force damage equal to the number rolled. Those dice are then expended.

You can use this benefit a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.`,
    ...nonSrd("EFA"),
  },
  {
    key: "greater-mark-of-detection",
    name: "Greater Mark of Detection",
    category: "General",
    desc: `You gain the following benefits.

**Improved Intuition.** When you use the Deductive Intuition benefit of your Mark of Detection feat, you can roll 1d6 instead of 1d4.

**Shared Detection.** When you use the Magical Detection benefit of your Mark of Detection feat to cast See Invisibility without a spell slot, you can choose one creature you can see within 30 feet of yourself. That creature also gains the benefits of the spell for its duration.`,
    ...nonSrd("EFA"),
  },
  {
    key: "greater-mark-of-finding",
    name: "Greater Mark of Finding",
    category: "General",
    desc: `You gain the following benefits.

**Improved Intuition.** When you use the Hunter's Intuition benefit of your Mark of Finding feat, you can roll 1d6 instead of 1d4.

**Improved Finding.** When you use the Finder's Magic benefit of your Mark of Finding to cast Hunter's Mark without a spell slot, the range of the spell is doubled, and you can modify the spell so that the target can't benefit from the Invisible condition for the duration.`,
    ...nonSrd("EFA"),
  },
  {
    key: "greater-mark-of-handling",
    name: "Greater Mark of Handling",
    category: "General",
    desc: `You gain the following benefits.

**Improved Intuition.** When you use the Wild Intuition benefit of your Mark of Handling feat, you can roll 1d6 instead of 1d4.

**Improved Handling.** While you are mounted, immediately after you hit a target within 5 feet of your mount with a melee attack roll, your mount can take a Reaction to move up to its Speed or take the Attack action to make one attack only (your choice).

**Subdue Animal.** As a Magic action, you exert command over one Beast or Monstrosity you can see within 30 feet of yourself. The target must succeed on a Wisdom saving throw (DC 8 plus your Wisdom modifier and Proficiency Bonus) or have the Frightened condition until the start of your next turn. You can use this benefit a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.`,
    ...nonSrd("EFA"),
  },
  {
    key: "greater-mark-of-healing",
    name: "Greater Mark of Healing",
    category: "General",
    desc: `You gain the following benefits.

**Improved Intuition.** When you use the Medical Intuition benefit of your Mark of Healing feat, you can roll 1d6 instead of 1d4.

**Improved Healing.** You can now use the Healing Touch benefit of your Mark of Healing feat to cast Cure Wounds without using a spell slot a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest. Additionally, when you cast Cure Wounds and roll dice to determine the number of Hit Points restored, you can treat any 1 or 2 on a roll as a 3.`,
    ...nonSrd("EFA"),
  },
  {
    key: "greater-mark-of-hospitality",
    name: "Greater Mark of Hospitality",
    category: "General",
    desc: `You gain the following benefits.

**Improved Intuition.** When you use the Ever Hospitable benefit of your Mark of Hospitality feat, you can roll 1d6 instead of 1d4.

**Improved Hospitality.** When you cast Purify Food and Drink, you can modify the spell so that instead of its normal effect, each creature of your choice within 30 feet of you is refreshed. Each affected creature's Exhaustion level is reduced by 1, and the creature gains Temporary Hit Points equal to your Proficiency Bonus plus your Intelligence, Wisdom, or Charisma modifier (choose when you select this feat). Once you modify the spell with this benefit, you can't do so again until you finish a Long Rest.`,
    ...nonSrd("EFA"),
  },
  {
    key: "greater-mark-of-making",
    name: "Greater Mark of Making",
    category: "General",
    desc: `You gain the following benefits.

**Improved Intuition.** When you use the Artisan's Intuition benefit of your Mark of Making feat, you can roll 1d6 instead of 1d4.

**Improved Making.** When you use the Spellsmith benefit of your Mark of Making feat to cast Magic Weapon without a spell slot, you cast the spell as its level 3 version.`,
    ...nonSrd("EFA"),
  },
  {
    key: "greater-mark-of-passage",
    name: "Greater Mark of Passage",
    category: "General",
    desc: `You gain the following benefits.

**Improved Intuition.** When you use the Intuitive Motion benefit of your Mark of Passage feat, you can roll 1d6 instead of 1d4.

**Improved Passage.** When you use the Magical Passage benefit of your Mark of Passage feat to cast Misty Step without a spell slot, you can also choose up to two willing creatures you can see within 30 feet of yourself before you teleport. Each target can then take a Reaction to also teleport up to 30 feet to an unoccupied space it can see.`,
    ...nonSrd("EFA"),
  },
  {
    key: "greater-mark-of-scribing",
    name: "Greater Mark of Scribing",
    category: "General",
    desc: `You gain the following benefits.

**Improved Intuition.** When you use the Gifted Scribe benefit of your Mark of Scribing feat, you can roll 1d6 instead of 1d4.

**Inspired Scribing.** When you cast Comprehend Languages, you can modify the spell to encompass up to three willing creatures you can see within 30 feet of yourself. Each chosen creature also gains the benefits of the spell for the duration. In addition, for the duration of the spell, you and the chosen creatures can communicate telepathically with each other while within 1 mile of each other. Once you modify the spell with this benefit, you can't do so again until you finish a Long Rest.`,
    ...nonSrd("EFA"),
  },
  {
    key: "greater-mark-of-sentinel",
    name: "Greater Mark of Sentinel",
    category: "General",
    desc: `You gain the following benefits.

**Improved Intuition.** When you use the Sentinel's Intuition benefit of your Mark of Sentinel feat, you can roll 1d6 instead of 1d4.

**Improved Sentinel.** When you use the Vigilant Guardian benefit of your Mark of Sentinel feat, you can also make one attack with a weapon or an Unarmed Strike as part of that same Reaction.`,
    ...nonSrd("EFA"),
  },
  {
    key: "greater-mark-of-shadow",
    name: "Greater Mark of Shadow",
    category: "General",
    desc: `You gain the following benefits.

**Improved Intuition.** When you use the Cunning Intuition benefit of your Mark of Shadow feat, you can roll 1d6 instead of 1d4.

**Improved Shadow.** When you use the Shape Shadows benefit of your Mark of Shadow feat to cast Invisibility without a spell slot, you cast the spell as its level 3 version.`,
    ...nonSrd("EFA"),
  },
  {
    key: "greater-mark-of-storm",
    name: "Greater Mark of Storm",
    category: "General",
    desc: `You gain the following benefits.

**Improved Intuition.** When you use the Windwright's Intuition benefit of your Mark of Storm feat, you can roll 1d6 instead of 1d4.

**Improved Storm.** When you use the Storm Magic benefit of your Mark of Storm feat to cast Gust of Wind without a spell slot, you also gain a Fly Speed of 60 feet for the duration of the spell.`,
    ...nonSrd("EFA"),
  },
  {
    key: "greater-mark-of-warding",
    name: "Greater Mark of Warding",
    category: "General",
    desc: `You gain the following benefits.

**Improved Intuition.** When you use the Warder's Intuition benefit of your Mark of Warding feat, you can roll 1d6 instead of 1d4.

**Improved Warding.** When a creature makes an attack roll against you or a creature you can see within 30 feet of yourself, you can take a Reaction to impose Disadvantage on that roll. You can use this benefit a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.`,
    ...nonSrd("EFA"),
  },
  {
    key: "harper-teamwork",
    name: "Harper Teamwork",
    category: "General",
    desc: `You gain the following benefits.

**Withering Wordplay.** When you take the Help action to assist an ally's attack roll against an enemy, that enemy also has Disadvantage on the first saving throw it makes before the start of your next turn.

**Inspiring Willpower.** If you succeed on a saving throw to end the Frightened or Paralyzed condition on yourself, you can choose one ally you can see within 30 feet of yourself that has the same condition. That condition immediately ends for that ally.`,
    ...nonSrd("FRHoF"),
  },
  {
    key: "illusion-adept",
    name: "Illusion Adept",
    category: "General",
    desc: `You gain the following benefits.

**Additional Spells.** Your prowess allows you to always have certain spells at the ready. When you have spell slots of a level specified in the Illusion Adept Spells table, you thereafter always have the spells listed for that level and lower prepared.

**Masterful Illusions.** When you cast a spell from the Illusion school using a spell slot, you can cast it without any Verbal, Somatic, or Material components, except Material components that are consumed by the spell or that have a cost specified in the spell. Additionally, creatures have Disadvantage on Intelligence (Investigation) checks made to discern the true nature of illusions created by your spells.

Illusion Adept Spells
Spell Slot Level | Spell
1 | Silent Image
2 | Phantasmal Force
3 | Major Image
4 | Hallucinatory Terrain
5 | Seeming`,
    ...nonSrd("AU"),
  },
  {
    key: "light-bringer",
    name: "Light Bringer",
    category: "General",
    desc: `You gain the following benefits.

**Sacred Magic.** You learn the Light spell and can cast it without Material components. If you already know that cantrip, you learn a different Cleric cantrip of your choice. The spell's spellcasting ability is the ability increased by this feat.

**Solar Luminance.** When you cast Light, you can have the light from the spell be sunlight. Once you use this benefit, you can't use it again until you finish a Long Rest.

**Sun's Healing.** As a Bonus Action while within sunlight, you can expend one of your Hit Point Dice, roll the die, and regain a number of Hit Points equal to the roll. Once you use this benefit, you can't use it again until you finish a Short or Long Rest.`,
    ...nonSrd("ABH"),
  },
  {
    key: "living-shadow",
    name: "Living Shadow",
    category: "Dark Gift",
    desc: `The shadow you cast is animate and ever-present—sometimes it even acts according to its own will. You gain the following features.

**Grasping Shadow.** You learn the Mage Hand spell and can cast it without spell components. Intelligence, Wisdom, or Charisma is your spellcasting ability for this spell (choose when you select this feat).

**Lengthened Strike.** When you make a melee attack roll as part of the Attack or Magic action on your turn, you can increase your reach for that attack by 10 feet, as your shadow stretches to aid you. You can use this feature a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.

**Ominous Will.** Immediately after you make a D20 Test and roll a 1 on the d20, your shadow attempts to exert its will. Make a Wisdom saving throw (DC 13 plus your Proficiency Bonus). On a failed save, you have the Incapacitated condition until the start of your next turn, at which point you must roll on the Shadow's Will table to determine what you do during that turn.

Shadow's Will
1d8 | Behavior
1 | You don't take an action or a Bonus Action, and you use all your movement to move. Roll 1d4 for the direction: 1, north; 2, east; 3, south; or 4, west.
2-6 | You don't move or take a Bonus Action, and you take the Attack action to make one melee attack against a random creature within reach. If none are within reach, you take no action.
7-8 | You have the Prone condition, and your turn ends.`,
    ...nonSrd("RHW"),
  },
  {
    key: "lordly-resolve",
    name: "Lordly Resolve",
    category: "General",
    desc: `You gain the following benefits.

**Standard Bearer.** As a Bonus Action, choose up to three creatures within 60 feet of yourself that can see you. Each target can immediately take a Reaction to right itself and end the Prone condition, provided its Speed isn't 0. Additionally, you bolster the targets' resolve, which lasts for 1 minute or until you have the Incapacitated condition. While bolstered, a target can't be possessed or gain the Charmed or Frightened condition; if a target is already possessed, Charmed, or Frightened, the target has Advantage on any new saving throw against the relevant effect.

Once you use this benefit, you can't do so again until you finish a Long Rest.`,
    ...nonSrd("FRHoF"),
  },
  {
    key: "love-bites",
    name: "Love Bites",
    category: "General",
    desc: `You gain the following benefits.

**Endearing Pain.** Immediately after you damage a creature with a Melee weapon or an Unarmed Strike, you can take a Bonus Action to give the target the Charmed condition until the start of your next turn or until you or your allies damage it. Once you use this benefit, you can't use it again until you finish a Short or Long Rest.`,
    ...nonSrd("ABH"),
  },
  {
    key: "magic-connoisseur",
    name: "Magic Connoisseur",
    category: "General",
    desc: `You gain the following benefits.

**Additional Spells.** Choose a level 1 and a level 2 spell from the same list you selected for the Magic Initiate feat's cantrips. You always have those spells prepared. You can cast each spell once without a spell slot, and you regain the ability to cast it in this way when you finish a Long Rest. You can also cast those spells using any spell slots you have of the appropriate level. The spellcasting ability for these spells is the same as the spellcasting ability chosen for your Magic Initiate feat's spells.

**Spell Change.** Whenever you gain a new level, you can replace one of the spells you chose for this feat with a different spell of the same level from the chosen spell list.`,
    ...nonSrd("AU"),
  },
  {
    key: "mist-walker",
    name: "Mist Walker",
    category: "Dark Gift",
    desc: `You know how to slip through the Mists' grasp, but this freedom comes at a price: If you remain in one area for too long, the Mists find you and drain your life force. You gain the following features.

**Domain Traveler.** When you enter the Mists intent on reaching a specific domain, you are treated as if you possess a Mist talisman keyed to that domain. To use this feature, you must know the name of the domain you have chosen as your destination, but you don't need to have previously visited that land. This trait doesn't allow you to bypass domain borders closed by a Darklord's will.

**Mist Walk.** When you take damage or fail a saving throw to avoid or end the Grappled or Restrained condition, you can take a Reaction and teleport up to 15 feet to an unoccupied space you can see. You can use this feature a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.

**Poisoned Roots.** When you finish a Long Rest, the world around you in a 10-mile radius becomes a siphon that leeches away at your vitality. Whenever you finish a Short Rest in that area, make a Constitution saving throw (DC 13 plus your Proficiency Bonus). On a failed save, you get no benefits from finishing that rest.`,
    ...nonSrd("RHW"),
  },
  {
    key: "mythal-touched",
    name: "Mythal Touched",
    category: "General",
    desc: `You gain the following benefits.

**Mythal Ward.** If a spell attack hits you or you fail a saving throw against a spell, you can take a Reaction to roll on the Mythal-Touched Magic table to create a magical effect. If an effect requires a saving throw, the DC equals 8 plus the modifier of the ability increased by this feat and your Proficiency Bonus.

You can use this benefit a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.

Mythal-Touched Magic
1d20 | Effect
1-2 | You and each creature within 15 feet of you make a Dexterity saving throw, taking Force damage equal to 1d8 times the level of the triggering spell on a failed save or half as much damage on a successful one.
3-7 | You and the triggering spell's caster form a telepathic link for 1 hour.
8-10 | Gravity is reversed in a 15-foot-radius, 60-foot-tall Cylinder centered on you for 1 minute, per the Reverse Gravity spell.
11-13 | You and the triggering spell's caster each make a Constitution saving throw. On a failed save, the creature has the Stunned condition until the end of its next turn.
14-17 | You gain a +2 bonus to AC for 1 minute, potentially turning the triggering spell into a miss if it was a spell attack.
18-19 | Any flammable, nonmagical object within 10 feet of the triggering spell's caster that isn't being worn or carried by another creature bursts into flame, takes 1d4 Fire damage, and is burning.
20 | The triggering spell dissipates with no effect, and the action, Bonus Action, or Reaction used to cast it is wasted. If that spell was cast with a spell slot, the slot isn't expended.`,
    ...nonSrd("FRHoF"),
  },
  {
    key: "necromancy-adept",
    name: "Necromancy Adept",
    category: "General",
    desc: `You gain the following benefits.

**Additional Spells.** Your prowess allows you to always have certain spells at the ready. When you have spell slots of a level specified in the Necromancy Adept Spells table, you thereafter always have the spells listed for that level and lower prepared.

**Life Manipulation.** When you cast a spell from the Necromancy school using a spell slot, you can immediately roll up to two of your unexpended Hit Point Dice. You regain Hit Points equal to the total rolled plus the level of spell slot expended. Those Hit Point Dice are then expended.

Necromancy Adept Spells
Spell Slot Level | Spell
1 | Inflict Wounds
2 | Ray of Enfeeblement
3 | Vampiric Touch
4 | Blight
5 | Raise Dead`,
    ...nonSrd("AU"),
  },
  {
    key: "orders-resilience",
    name: "Order's Resilience",
    category: "General",
    desc: `You gain the following benefits.

**Resurge.** When you have the Prone condition, you can right yourself with only 5 feet of movement.

**Stronger Together.** If you are within 5 feet of an ally that doesn't have the Incapacitated condition, you and that ally have Advantage on Strength saving throws. You can't use this benefit while you have the Incapacitated condition.`,
    ...nonSrd("FRHoF"),
  },
  {
    key: "otherworldly-familiar",
    name: "Otherworldly Familiar",
    category: "General",
    desc: `You gain the following benefits.

**Otherworldly Power.** When you cast the Find Familiar spell, you can imbue your familiar with otherworldly might, which lasts until you cast Find Familiar again. While imbued, your familiar gains the following benefits:

**Energy Resistance.** Choose Necrotic, Poison, Psychic, Radiant, or Thunder damage. Your familiar has Resistance to the chosen damage type.

**Phase Walk.** Your familiar can move through other creatures and objects as if they were Difficult Terrain. If your familiar ends its turn inside an object, it is shunted to the last unoccupied space it was in.`,
    ...nonSrd("AU"),
  },
  {
    key: "portal-jumper",
    name: "Portal Jumper",
    category: "Origin",
    desc: `You gain the following benefits.

**Otherworldly Resilience.** You have Resistance to one of the following damage types: Necrotic, Psychic, or Radiant (choose when you select this feat).

**Portal Step.** You can spend 15 feet of movement to teleport to an unoccupied space you can see within 15 feet of yourself. You can use this benefit a number of times equal to your Proficiency Bonus but only once per turn, and you regain all expended uses when you finish a Long Rest.`,
    ...nonSrd("AU"),
  },
  {
    key: "potent-dragonmark",
    name: "Potent Dragonmark",
    category: "General",
    desc: `You gain the following benefits.

**Dragonmark Preparation.** You always have the spells on your Spells of the Mark list (if any) prepared.

**Dragonmark Spellcasting.** You have one extra spell slot to cast the spells granted by your Dragonmark feat. The spell slot's level is half your level (round up), to a maximum of level 5. You regain the expended slot when you finish a Short or Long Rest. You can use this spell slot to cast only a spell you have prepared because of your Dragonmark feat or the Dragonmark Preparation benefit of this feat.`,
    ...nonSrd("EFA"),
  },
  {
    key: "purple-dragon-commandant",
    name: "Purple Dragon Commandant",
    category: "General",
    desc: `You gain the following benefits.

**Encourage Ally.** As a Bonus Action, you bolster one ally you can see within 30 feet. The ally gains Temporary Hit Points equal to 2d6 plus the modifier of the ability score increased by this feat. You can take this Bonus Action a number of times equal to your Proficiency Bonus, and you regain all uses when you finish a Long Rest.

**Last Stand.** You have Advantage on attack rolls while Bloodied.`,
    ...nonSrd("FRHoF"),
  },
  {
    key: "putrefy",
    name: "Putrefy",
    category: "General",
    desc: `You gain the following benefits.

**Necrosis.** When you make a damage roll that deals Necrotic damage, you can cause one creature taking that damage to have the Poisoned condition until the start of your next turn. Once you use this benefit, you can't use it again until you finish a Short or Long Rest.`,
    ...nonSrd("ABH"),
  },
  {
    key: "rebuke",
    name: "Rebuke",
    category: "General",
    desc: `You gain the following benefits.

**Radiant Strike.** When you make a damage roll that deals Radiant damage, you can cause one Huge or smaller creature taking the damage to have the Prone condition. Once you use this benefit, you can't use it again until you finish a Short or Long Rest.`,
    ...nonSrd("ABH"),
  },
  {
    key: "second-skin",
    name: "Second Skin",
    category: "Dark Gift",
    desc: `There is another side of you that most people never see: a beast, a terrifying avenger, or a walking nightmare. You gain the following features.

**Alternate Form.** You always have the Alter Self spell prepared. You can cast it without a spell slot or spell components, and you must finish a Long Rest before you can cast it in this way again. You can also cast it using spell slots you have of the appropriate level. Intelligence, Wisdom, or Charisma is your spellcasting ability for this spell (choose when you select this feat).

When you cast Alter Self without a spell slot using this feature, it doesn't require Concentration.

**Involuntary Change.** Certain circumstances can involuntarily trigger your transformation. When you select this feat, roll on the Change Catalyst table to determine what triggers your change.

After you experience the catalyst, at the start of your next turn, make a Charisma saving throw (DC 13 plus your Proficiency Bonus). On a failed save, you immediately use Alternate Form to cast Alter Self without a spell slot. If you've already expended the use of that feature, you instead have the Stunned condition until the start of your next turn.

Change Catalyst
1d6 | Catalyst
1 | Seeing a particular phase of the moon
2 | Smelling the scent of a certain type of flower
3 | Hearing temple bells ringing
4 | Hearing a particular melody
5 | Touching pure silver with your bare skin
6 | Seeing someone who resembles a specific individual`,
    ...nonSrd("RHW"),
  },
  {
    key: "sharp-eye",
    name: "Sharp Eye",
    category: "Origin",
    desc: `When you take the Search or Study action, you can give yourself Advantage on any ability check made as part of that action. You can use this feature a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest. If the check fails, the use of this feature isn't expended.`,
    ...nonSrd("RHW"),
  },
  {
    key: "soothing-familiar",
    name: "Soothing Familiar",
    category: "General",
    desc: `You gain the following benefits.

**Healing Beacon.** Positive energy fills a 5-foot Emanation originating from your familiar as long as it is within 120 feet of you. Whenever an ally in that Emanation rolls a die to determine the number of Hit Points restored to a creature, that ally can treat a roll of 1 or 2 on the die as a 3.`,
    ...nonSrd("AU"),
  },
  {
    key: "spell-resistant",
    name: "Spell Resistant",
    category: "General",
    desc: `You gain the following benefits.

**Magical Resilience.** You have Resistance to one of the following damage types (choose when you gain this feat): Necrotic, Psychic, Radiant, or Thunder.

**Magic Resistant.** When you would fail a saving throw against a spell or magical effect, you can roll 1d6 and add the number rolled to the save's total, potentially turning the failure into a success. You can use this benefit a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.`,
    ...nonSrd("AU"),
  },
  {
    key: "spell-subterfuge",
    name: "Spell Subterfuge",
    category: "General",
    desc: `You gain the following benefits.

**Shrouding Spells.** After you cast a spell that has a casting time of an action using a spell slot, you can take both the Dash and Hide actions as a Bonus Action. You can use this benefit a number of times equal to the ability modifier of the score increased by this feat, and you regain all expended uses when you finish a Long Rest.

**Sneaky Casting.** If you have the Hide action's Invisible condition, casting a spell with a Verbal component or making a spell attack doesn't end that condition on you if you end the turn behind Three-Quarters Cover or Total Cover.`,
    ...nonSrd("AU"),
  },
  {
    key: "spellfire-adept",
    name: "Spellfire Adept",
    category: "General",
    desc: `You gain the following benefits.

**Fueled Spellfire.** Once per turn, when a spell you cast deals Radiant damage, you can expend up to two Hit Point Dice, roll them, and add the total rolled to one damage roll of the spell.

**Searing Spellfire.** When you make a damage roll that deals Radiant damage, it ignores Resistance to Radiant damage.`,
    ...nonSrd("FRHoF"),
  },
  {
    key: "street-justice",
    name: "Street Justice",
    category: "General",
    desc: `You gain the following benefits.

**Headlock.** Your allies have Advantage on attack rolls against a creature Grappled by you.

**Sturdy Knot.** When you use Chain, Manacles, or Rope to bind a creature, add your Proficiency Bonus to the DC to escape or burst the Chain, Manacles, or Rope.

**Tough Talk.** A creature's Hostile attitude doesn't impose Disadvantage on your Charisma (Intimidation) checks to influence that creature.`,
    ...nonSrd("FRHoF"),
  },
  {
    key: "survivor",
    name: "Survivor",
    category: "Origin",
    desc: `You gain the following benefits.

**Hypervigilance.** Whenever you roll Initiative, you can reroll the d20 if the number rolled is 9 or lower. You must use the new roll.

**Steel Yourself.** When you fail a saving throw to avoid or end the Charmed or Frightened condition, you can take a Reaction to add a bonus to the roll, potentially causing it to succeed. The bonus is equal to your Proficiency Bonus.

Once you take this Reaction, you can't do so again until you finish a Long Rest.`,
    ...nonSrd("RHW"),
  },
  {
    key: "symbiotic-being",
    name: "Symbiotic Being",
    category: "Dark Gift",
    desc: `A second being resides within your body, offering knowledge and assistance while furthering its own agenda. You gain the following features.

**Entwined Existence.** The symbiote can't be targeted. If you die, so does your symbiote. If you are returned to life, your symbiote also revives.

**Second Mind.** You gain proficiency in one of the following skills: Arcana, Deception, History, Intimidation, Insight, Investigation, Nature, Religion, Perception, or Persuasion. You also know one additional language of your choice, chosen from the language tables in the Player's Handbook.

**Sustained Symbiosis.** When you fail a saving throw, you can take a Reaction and expend one of your Hit Dice. Roll the die and add the number rolled to the saving throw, potentially turning the failure into a success.

You can use this feature a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.

**Symbiotic Agenda.** Immediately after you make a D20 Test and roll a 1 on the d20, your symbiote attempts to assert control. Make a Charisma saving throw (DC 13 plus your Proficiency Bonus). On a failed save, you have the Charmed condition for 1d12 hours. While Charmed, you must try to follow the symbiote's commands and further its goals, as determined by the DM. Whenever you take damage, you can repeat this save, ending the effect on a success.

At the DM's discretion, you might make this saving throw whenever you act contrary to the symbiote's agenda.`,
    ...nonSrd("RHW"),
  },
  {
    key: "touch-of-death",
    name: "Touch of Death",
    category: "Dark Gift",
    desc: `Deathly power resides within you, bursting out at the slightest provocation. You gain the following features.

**Death Touch.** You learn the Chill Touch spell and can cast it without spell components. Necrotic damage you deal with this spell ignores Resistance. Intelligence, Wisdom, or Charisma is your spellcasting ability for this spell (choose when you select this feat).

**Pull of the Grave.** You have Disadvantage on Death Saving Throws.`,
    ...nonSrd("RHW"),
  },
  {
    key: "transmutation-adept",
    name: "Transmutation Adept",
    category: "General",
    desc: `You gain the following benefits.

**Additional Spells.** Your prowess allows you to always have certain spells at the ready. When you have spell slots of a level specified in the Transmutation Adept Spells table, you thereafter always have the spells listed for that level and lower prepared.

**Magical Augmentation.** On your turn when you cast a spell from the Transmutation school using a spell slot, your Speed increases by a number of feet equal to five times the level of spell slot expended. This increase lasts until the end of the turn.

Transmutation Adept Spells
Spell Slot Level | Spell
1 | Jump
2 | Spider Climb
3 | Slow
4 | Polymorph
5 | Animate Objects`,
    ...nonSrd("AU"),
  },
  {
    key: "transmuted-anatomy",
    name: "Transmuted Anatomy",
    category: "Origin",
    desc: `You gain the following benefits.

**Lengthened Stride.** Your Speed increases by 5 feet.

**Resilient Anatomy.** You have Advantage on saving throws against effects that would compel you to shape-shift against your will. Additionally, when you fail a Constitution saving throw, you can take a Reaction to roll 1d4 and add the number rolled to the save, potentially turning the failure into a success. You can use this benefit a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.`,
    ...nonSrd("AU"),
  },
  {
    key: "treacherous-allure",
    name: "Treacherous Allure",
    category: "General",
    desc: `You gain the following benefits.

**Enchanting Presence.** You always have the Charm Person spell prepared. You can cast it without a spell slot, and you must finish a Long Rest before you can cast it in this way again. You can also cast it using spell slots you have of the appropriate level. Your spellcasting ability for the spell is the ability increased by this feat.

**Inevitable Betrayal.** You have Advantage on attack rolls against creatures with the Charmed condition.`,
    ...nonSrd("ABH"),
  },
  {
    key: "vampire-touched",
    name: "Vampire Touched",
    category: "General",
    desc: `You gain the following benefits.

**Vampire Magic.** Choose one level 1 spell from the Enchantment or Illusion school of magic. You always have that spell and the Spider Climb spell prepared. You can cast each of these spells without expending a spell slot, but when you cast Spider Climb this way, you must target yourself, and you must finish a Long Rest before you can cast each spell in this way again. You can also cast either spell using spell slots you have of the appropriate level. Your spellcasting ability for the spells is the ability increased by this feat.`,
    ...nonSrd("ABH"),
  },
  {
    key: "warlike-familiar",
    name: "Warlike Familiar",
    category: "General",
    desc: `You gain the following benefits.

**Battle Familiar.** You always have the Battle Familiar spell (see chapter 2) prepared. You can cast it once without a spell slot, and you regain the ability to cast it in this way when you finish a Long Rest. You can also cast the spell using any spell slots you have of the appropriate level. Your spellcasting ability for this spell is the one chosen for the Faithful Companion benefit of your Familiar Friend feat.

**Intercept Attack.** When a creature within 5 feet of your familiar is hit by an attack roll, your familiar can take a Reaction to add a bonus to the creature's Armor Class against that attack, potentially causing the attack to miss. The bonus is equal to your Proficiency Bonus.`,
    ...nonSrd("AU"),
  },
  {
    key: "watchers",
    name: "Watchers",
    category: "Dark Gift",
    desc: `Something unnatural is always watching you, taking the form of scurrying vermin and other eerie creatures. You gain the following features.

**Borrowed Eyes.** You always have the Beast Sense and Speak with Animals spells prepared. You can cast each spell without a spell slot, and you must finish a Long Rest before you can cast it in this way again. You can also cast these spells using spell slots you have of the appropriate level.

**Heightened Suspicion.** Whenever you take the Search action, you can roll 1d4 and add the number rolled to any ability check made as part of that action.

**Incessant Watchers.** You have Disadvantage on saving throws made against the Scrying spell.

In addition, immediately after you make a D20 Test and roll a 1 on the d20, paranoia threatens to overwhelm you. Make a Wisdom saving throw (DC 13 plus your Proficiency Bonus). On a failed save, you have Disadvantage on D20 Tests for 1 minute. You can repeat the save at the end of each of your turns, ending the effect early on a success.`,
    ...nonSrd("RHW"),
  },
  {
    key: "zhentarim-tactics",
    name: "Zhentarim Tactics",
    category: "General",
    desc: `You gain the following benefits.

**Retaliate.** Immediately after a creature within 5 feet of you hits you with a melee attack, you can make an Opportunity Attack against that creature.

**Versatile Merc.** When you finish a Long Rest, choose a skill in which you have proficiency. You have Expertise in that skill until you finish your next Long Rest.`,
    ...nonSrd("FRHoF"),
  },
];
