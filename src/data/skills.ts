import type { AbilityId, SkillId } from "./types";

export interface SkillDefinition {
  id: SkillId;
  name: string;
  ability: AbilityId;
}

export const SKILLS: SkillDefinition[] = [
  { id: "acrobatics", name: "Acrobatics", ability: "dex" },
  { id: "animalHandling", name: "Animal Handling", ability: "wis" },
  { id: "arcana", name: "Arcana", ability: "int" },
  { id: "athletics", name: "Athletics", ability: "str" },
  { id: "deception", name: "Deception", ability: "cha" },
  { id: "history", name: "History", ability: "int" },
  { id: "insight", name: "Insight", ability: "wis" },
  { id: "intimidation", name: "Intimidation", ability: "cha" },
  { id: "investigation", name: "Investigation", ability: "int" },
  { id: "medicine", name: "Medicine", ability: "wis" },
  { id: "nature", name: "Nature", ability: "int" },
  { id: "perception", name: "Perception", ability: "wis" },
  { id: "performance", name: "Performance", ability: "cha" },
  { id: "persuasion", name: "Persuasion", ability: "cha" },
  { id: "religion", name: "Religion", ability: "int" },
  { id: "sleightOfHand", name: "Sleight of Hand", ability: "dex" },
  { id: "stealth", name: "Stealth", ability: "dex" },
  { id: "survival", name: "Survival", ability: "wis" },
];

export const ABILITIES: { id: AbilityId; name: string }[] = [
  { id: "str", name: "STR" },
  { id: "dex", name: "DEX" },
  { id: "con", name: "CON" },
  { id: "int", name: "INT" },
  { id: "wis", name: "WIS" },
  { id: "cha", name: "CHA" },
];
