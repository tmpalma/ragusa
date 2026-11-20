import type { ClassSpellList } from "../../src/data/types.js";

/** Additive XPHB class-list keys not present on Open5e SRD-2024 tags (uses existing catalog keys). */
export const XPHB_CLASS_SPELL_LIST_ADDITIONS: Partial<Record<string, Partial<ClassSpellList>>> = {
  bard: {
    cantrips: ["blade-ward", "friends", "thunderclap"],
    level2: ["cloud-of-daggers", "crown-of-madness"],
  },
  cleric: {
    cantrips: ["toll-the-dead", "word-of-radiance"],
  },
  druid: {
    cantrips: ["thorn-whip", "thunderclap"],
    level2: ["beast-sense", "summon-beast"],
  },
  paladin: {
    level1: ["compelled-duel", "thunderous-smite", "wrathful-smite"],
  },
  ranger: {
    level1: ["hail-of-thorns"],
    level2: ["beast-sense", "cordon-of-arrows", "summon-beast"],
  },
  sorcerer: {
    cantrips: ["blade-ward", "friends", "mind-sliver", "thunderclap"],
    level1: ["witch-bolt"],
    level2: ["arcane-vigor", "cloud-of-daggers", "crown-of-madness"],
  },
  warlock: {
    cantrips: ["blade-ward", "friends", "mind-sliver", "thunderclap", "toll-the-dead"],
    level1: ["armor-of-agathys", "arms-of-hadar", "witch-bolt"],
    level2: ["cloud-of-daggers", "crown-of-madness"],
  },
  wizard: {
    cantrips: ["blade-ward", "friends", "mind-sliver", "thunderclap", "toll-the-dead"],
    level1: ["witch-bolt"],
    level2: ["arcane-vigor", "cloud-of-daggers", "crown-of-madness"],
  },
};
