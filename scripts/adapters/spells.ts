import type { ClassSpellList, SpellData } from "../../src/data/types.js";
import { fetchOpen5eAll, stripKeyPrefix } from "../lib/open5eClient.js";
import { ARTIFICER_SPELL_LIST } from "./artificerSpellList.js";
import { CANTRIP_DESC_OVERRIDES } from "./cantripDescOverrides.js";
import { SRD_XPHB } from "./catalogSource.js";
import { EXTRA_SPELLS } from "./extraSpells.js";
import { XPHB_CLASS_SPELL_LIST_ADDITIONS } from "./xphbClassSpellListAdditions.js";

interface RawSpellClass {
  key: string;
}

interface RawSpell {
  key: string;
  name: string;
  desc: string;
  level: number;
  school: { name: string };
  casting_time: string;
  range_text: string;
  duration: string;
  ritual: boolean;
  concentration?: boolean;
  requires_concentration?: boolean;
  verbal: boolean;
  somatic: boolean;
  material: boolean;
  material_specified: string | null;
  classes: RawSpellClass[];
}

function formatComponents(verbal: boolean, somatic: boolean, material: boolean, materialSpecified: string | null): string {
  const parts: string[] = [];
  if (verbal) parts.push("V");
  if (somatic) parts.push("S");
  if (material) {
    parts.push(materialSpecified ? `M (${materialSpecified})` : "M");
  }
  return parts.join(", ");
}

function classKeyFromOpen5e(classKey: string): string {
  return stripKeyPrefix(classKey);
}

export function transformSpell(raw: RawSpell): SpellData {
  return {
    key: stripKeyPrefix(raw.key),
    name: raw.name,
    level: raw.level,
    school: raw.school.name,
    castingTime: raw.casting_time,
    range: raw.range_text,
    duration: raw.duration,
    ritual: raw.ritual,
    concentration: raw.concentration === true || raw.requires_concentration === true,
    components: formatComponents(raw.verbal, raw.somatic, raw.material, raw.material_specified),
    desc: raw.desc,
    ...SRD_XPHB,
  };
}

export function buildClassSpellLists(rawSpells: RawSpell[]): Record<string, ClassSpellList> {
  const lists: Record<string, ClassSpellList> = {};

  for (const raw of rawSpells) {
    const spellKey = stripKeyPrefix(raw.key);
    for (const cls of raw.classes) {
      const classKey = classKeyFromOpen5e(cls.key);
      if (!lists[classKey]) {
        lists[classKey] = { cantrips: [], level1: [], level2: [], level3: [] };
      }
      if (raw.level === 0 && !lists[classKey].cantrips.includes(spellKey)) {
        lists[classKey].cantrips.push(spellKey);
      }
      if (raw.level === 1 && !lists[classKey].level1.includes(spellKey)) {
        lists[classKey].level1.push(spellKey);
      }
      if (raw.level === 2 && !lists[classKey].level2.includes(spellKey)) {
        lists[classKey].level2.push(spellKey);
      }
      if (raw.level === 3 && !lists[classKey].level3!.includes(spellKey)) {
        lists[classKey].level3!.push(spellKey);
      }
    }
  }

  for (const list of Object.values(lists)) {
    list.cantrips.sort((a, b) => a.localeCompare(b));
    list.level1.sort((a, b) => a.localeCompare(b));
    list.level2.sort((a, b) => a.localeCompare(b));
    list.level3?.sort((a, b) => a.localeCompare(b));
  }

  lists.artificer = {
    cantrips: [...ARTIFICER_SPELL_LIST.cantrips],
    level1: [...ARTIFICER_SPELL_LIST.level1],
    level2: [],
    level3: [],
  };

  return mergeClassSpellListAdditions(lists);
}

function mergeClassSpellListAdditions(
  lists: Record<string, ClassSpellList>,
): Record<string, ClassSpellList> {
  for (const [classKey, additions] of Object.entries(XPHB_CLASS_SPELL_LIST_ADDITIONS)) {
    if (!lists[classKey]) {
      lists[classKey] = { cantrips: [], level1: [], level2: [], level3: [] };
    }
    for (const bucket of ["cantrips", "level1", "level2", "level3"] as const) {
      const keys = additions[bucket];
      if (!keys) continue;
      for (const key of keys) {
        const bucketList = lists[classKey][bucket] ?? (lists[classKey][bucket] = []);
        if (!bucketList.includes(key)) {
          bucketList.push(key);
        }
      }
      lists[classKey][bucket].sort((a, b) => a.localeCompare(b));
    }
  }
  return lists;
}

export async function loadSpells(): Promise<{ spells: SpellData[]; classSpellLists: Record<string, ClassSpellList> }> {
  const raw = await fetchOpen5eAll<RawSpell>("spells", "document__key__in=srd-2024");
  const open5eKeys = new Set(raw.map((entry) => stripKeyPrefix(entry.key)));
  const extraSpells = EXTRA_SPELLS.filter((spell) => !open5eKeys.has(spell.key));
  const spells = [...raw.map(transformSpell), ...extraSpells]
    .map(enrichSpell)
    .sort((a, b) => a.name.localeCompare(b.name));
  const classSpellLists = buildClassSpellLists(raw);
  return { spells, classSpellLists };
}

const PRESTIDIGITATION_EFFECT_OPTIONS = [
  {
    key: "sensory-effect",
    name: "Sensory Effect",
    desc:
      "You create an instantaneous, harmless sensory effect, such as a shower of sparks, a puff of wind, faint musical notes, or an odd odor.",
  },
  {
    key: "fire-play",
    name: "Fire Play",
    desc: "You instantaneously light or snuff out a candle, a torch, or a small campfire.",
  },
  {
    key: "clean-or-soil",
    name: "Clean or Soil",
    desc: "You instantaneously clean or soil an object no larger than 1 cubic foot.",
  },
  {
    key: "minor-sensation",
    name: "Minor Sensation",
    desc: "You chill, warm, or flavor up to 1 cubic foot of nonliving material for 1 hour.",
  },
  {
    key: "magic-mark",
    name: "Magic Mark",
    desc: "You make a color, a small mark, or a symbol appear on an object or a surface for 1 hour.",
  },
  {
    key: "minor-creation",
    name: "Minor Creation",
    desc:
      "You create a nonmagical trinket or an illusory image that can fit in your hand. It lasts until the end of your next turn. A trinket can deal no damage and has no monetary worth.",
  },
] as const;

const THAUMATURGY_EFFECT_OPTIONS = [
  {
    key: "altered-eyes",
    name: "Altered Eyes",
    desc: "You alter the appearance of your eyes for 1 minute.",
  },
  {
    key: "booming-voice",
    name: "Booming Voice",
    desc:
      "Your voice booms up to three times as loud as normal for 1 minute. For the duration, you have Advantage on Charisma (Intimidation) checks.",
  },
  {
    key: "fire-play",
    name: "Fire Play",
    desc: "You cause flames to flicker, brighten, dim, or change color for 1 minute.",
  },
  {
    key: "invisible-hand",
    name: "Invisible Hand",
    desc: "You instantaneously cause an unlocked door or window to fly open or slam shut.",
  },
  {
    key: "phantom-sound",
    name: "Phantom Sound",
    desc:
      "You create an instantaneous sound that originates from a point of your choice within range, such as a rumble of thunder, the cry of a raven, or ominous whispers.",
  },
  {
    key: "tremors",
    name: "Tremors",
    desc: "You cause harmless tremors in the ground for 1 minute.",
  },
] as const;

const MINOR_ILLUSION_EFFECT_OPTIONS = [
  {
    key: "sound",
    name: "Sound",
    desc:
      "If you create a sound, its volume can range from a whisper to a scream. It can be your voice, someone else's voice, a lion's roar, a beating of drums, or any other sound you choose. The sound continues unabated throughout the duration, or you can make discrete sounds at different times before the spell ends.",
  },
  {
    key: "image",
    name: "Image",
    desc:
      "If you create an image of an object—such as a chair, muddy footprints, or a small chest—it must be no larger than a 5-foot Cube. The image can't create sound, light, smell, or any other sensory effect. Physical interaction with the image reveals it to be an illusion, since things can pass through it.",
  },
] as const;

const ALARM_EFFECT_OPTIONS = [
  {
    key: "audible-alarm",
    name: "Audible Alarm",
    desc: "The alarm produces the sound of a handbell for 10 seconds within 60 feet of the warded area.",
  },
  {
    key: "mental-alarm",
    name: "Mental Alarm",
    desc:
      "You are alerted by a mental ping if you are within 1 mile of the warded area. This ping awakens you if you're asleep.",
  },
] as const;

const DRUIDCRAFT_EFFECT_OPTIONS = [
  {
    key: "weather-sensor",
    name: "Weather Sensor",
    desc:
      "You create a Tiny, harmless sensory effect that predicts what the weather will be at your location for the next 24 hours. The effect might manifest as a golden orb for clear skies, a cloud for rain, falling snowflakes for snow, and so on. This effect persists for 1 round.",
  },
  {
    key: "bloom",
    name: "Bloom",
    desc: "You instantly make a flower blossom, a seed pod open, or a leaf bud bloom.",
  },
  {
    key: "sensory-effect",
    name: "Sensory Effect",
    desc:
      "You create a harmless sensory effect, such as falling leaves, spectral dancing fairies, a gentle breeze, the sound of an animal, or the faint odor of skunk. The effect must fit in a 5-foot Cube.",
  },
  {
    key: "fire-play",
    name: "Fire Play",
    desc: "You light or snuff out a candle, a torch, or a campfire.",
  },
] as const;

const COMMAND_EFFECT_OPTIONS = [
  {
    key: "approach",
    name: "Approach",
    desc:
      "The target moves toward you by the shortest and most direct route, ending its turn if it moves within 5 feet of you.",
  },
  {
    key: "drop",
    name: "Drop",
    desc: "The target drops whatever it is holding and then ends its turn.",
  },
  {
    key: "flee",
    name: "Flee",
    desc: "The target spends its turn moving away from you by the fastest available means.",
  },
  {
    key: "grovel",
    name: "Grovel",
    desc: "The target has the Prone condition and then ends its turn.",
  },
  {
    key: "halt",
    name: "Halt",
    desc: "On its turn, the target doesn't move and takes no action or Bonus Action.",
  },
] as const;

function enrichSpell(spell: SpellData): SpellData {
  if (spell.key === "druidcraft") {
    return {
      ...spell,
      desc: "Whispering to the spirits of nature, you create one of the following effects within range.",
      effectOptions: [...DRUIDCRAFT_EFFECT_OPTIONS],
    };
  }
  if (spell.key === "prestidigitation") {
    return {
      ...spell,
      desc:
        "You create a magical effect within range. Choose the effect from the options below. If you cast this spell multiple times, you can have up to three of its non-instantaneous effects active at a time.",
      effectOptions: [...PRESTIDIGITATION_EFFECT_OPTIONS],
    };
  }
  if (spell.key === "thaumaturgy") {
    return {
      ...spell,
      desc:
        "You manifest a minor wonder within range. You create one of the effects below within range. If you cast this spell multiple times, you can have up to three of its 1-minute effects active at a time.",
      effectOptions: [...THAUMATURGY_EFFECT_OPTIONS],
    };
  }
  if (spell.key === "minor-illusion") {
    return {
      ...spell,
      desc:
        "You create a sound or an image of an object within range that lasts for the duration. See the descriptions below for the effects of each. The illusion ends if you cast this spell again. If a creature takes a Study action to examine the sound or image, the creature can determine that it is an illusion with a successful Intelligence (Investigation) check against your spell save DC. If a creature discerns the illusion for what it is, the illusion becomes faint to the creature.",
      effectOptions: [...MINOR_ILLUSION_EFFECT_OPTIONS],
    };
  }
  if (spell.key === "command") {
    return {
      ...spell,
      desc:
        "You speak a one-word command to a creature you can see within range. The target must succeed on a Wisdom saving throw or follow the command on its next turn. Choose the command from these options:",
      effectOptions: [...COMMAND_EFFECT_OPTIONS],
    };
  }
  if (spell.key === "alarm") {
    return {
      ...spell,
      desc:
        "You set an alarm against intrusion. Choose a door, a window, or an area within range that is no larger than a 20-foot Cube. Until the spell ends, an alarm alerts you whenever a creature touches or enters the warded area. When you cast the spell, you can designate creatures that won't set off the alarm. You also choose whether the alarm is audible or mental:",
      effectOptions: [...ALARM_EFFECT_OPTIONS],
    };
  }
  const cantripDescOverride = CANTRIP_DESC_OVERRIDES[spell.key];
  if (cantripDescOverride) {
    return { ...spell, desc: cantripDescOverride };
  }
  return spell;
}
