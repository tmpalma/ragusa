import type { FeatureOptionData } from "../../src/data/types.js";

/** 2024 SRD Metamagic options for Sorcerer level 2+. */
export const METAMAGIC_OPTIONS: FeatureOptionData[] = [
  {
    key: "careful-spell",
    name: "Careful Spell",
    desc: "Cost: 1 Sorcery Point\n\nWhen you cast a spell that forces other creatures to make a saving throw, you can protect some of those creatures from the spell's full force. To do so, spend 1 Sorcery Point and choose a number of those creatures up to your Charisma modifier (minimum of one creature). A chosen creature automatically succeeds on its saving throw against the spell, and it takes no damage if it would normally take half damage on a successful save.",
  },
  {
    key: "distant-spell",
    name: "Distant Spell",
    desc: "Cost: 1 Sorcery Point\n\nWhen you cast a spell that has a range of at least 5 feet, you can spend 1 Sorcery Point to double the spell's range. Or when you cast a spell that has a range of Touch, you can spend 1 Sorcery Point to make the spell's range 30 feet.",
  },
  {
    key: "empowered-spell",
    name: "Empowered Spell",
    desc: "Cost: 1 Sorcery Point\n\nWhen you roll damage for a spell, you can spend 1 Sorcery Point to reroll a number of the damage dice up to your Charisma modifier (minimum of one), and you must use the new rolls.\n\nYou can use Empowered Spell even if you've already used a different Metamagic option during the casting of the spell.",
  },
  {
    key: "extended-spell",
    name: "Extended Spell",
    desc: "Cost: 1 Sorcery Point\n\nWhen you cast a spell that has a duration of 1 minute or longer, you can spend 1 Sorcery Point to double its duration to a maximum duration of 24 hours.\n\nIf the affected spell requires Concentration, you have Advantage on any saving throw you make to maintain that Concentration.",
  },
  {
    key: "heightened-spell",
    name: "Heightened Spell",
    desc: "Cost: 2 Sorcery Points\n\nWhen you cast a spell that forces a creature to make a saving throw, you can spend 2 Sorcery Points to give one target of the spell Disadvantage on saves against the spell.",
  },
  {
    key: "quickened-spell",
    name: "Quickened Spell",
    desc: "Cost: 2 Sorcery Points\n\nWhen you cast a spell that has a casting time of an action, you can spend 2 Sorcery Points to change the casting time to a Bonus Action for this casting. You can't modify a spell in this way if you've already cast a level 1+ spell on the current turn, nor can you cast a level 1+ spell on this turn after modifying a spell in this way.",
  },
  {
    key: "seeking-spell",
    name: "Seeking Spell",
    desc: "Cost: 1 Sorcery Point\n\nIf you make an attack roll for a spell and miss, you can spend 1 Sorcery Point to reroll the d20, and you must use the new roll.\n\nYou can use Seeking Spell even if you've already used a different Metamagic option during the casting of the spell.",
  },
  {
    key: "subtle-spell",
    name: "Subtle Spell",
    desc: "Cost: 1 Sorcery Point\n\nWhen you cast a spell, you can spend 1 Sorcery Point to cast it without any Verbal, Somatic, or Material components, except Material components that are consumed by the spell or that have a cost specified in the spell.",
  },
  {
    key: "transmuted-spell",
    name: "Transmuted Spell",
    desc: "Cost: 1 Sorcery Point\n\nWhen you cast a spell that deals a type of damage from the following list, you can spend 1 Sorcery Point to change that damage type to one of the other listed types: Acid, Cold, Fire, Lightning, Poison, Thunder.",
  },
  {
    key: "twinned-spell",
    name: "Twinned Spell",
    desc: "Cost: 1 Sorcery Point\n\nWhen you cast a spell, such as Charm Person, that can be cast with a higher-level spell slot to target an additional creature, you can spend 1 Sorcery Point to increase the spell's effective level by 1.",
  },
];
