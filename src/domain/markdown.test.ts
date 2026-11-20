import { describe, expect, it } from "vitest";
import { INITIAL_CHARACTER, type Character } from "../state/characterState";
import { englishEntityName, englishT } from "../i18n/testHelpers";
import { computeDerivedStats } from "./deriveCharacter";
import { generateCharacterMarkdown } from "./markdown";

describe("generateCharacterMarkdown", () => {
  it("matches the specified format for a Human Fighter with the Soldier background", () => {
    const character: Character = {
      ...INITIAL_CHARACTER,
      name: "Rath",
      speciesKey: "human",
      backgroundKey: "soldier",
      featKey: "savage-attacker",
      classKey: "fighter",
      abilityScores: { str: 17, dex: 12, con: 15, int: 10, wis: 10, cha: 8 },
      skills: {
        ...INITIAL_CHARACTER.skills,
        athletics: "proficient",
        intimidation: "proficient",
        perception: "proficient",
      },
    };

    const derived = computeDerivedStats(character);
    const markdown = generateCharacterMarkdown(character, derived, englishT, englishEntityName);

    expect(markdown).toBe(
      [
        "Name: Rath",
        "Class: Fighter",
        "Background: Soldier",
        "Species: Human",
        "    | Attribute | Score | Modifier |",
        "    | STR | 17 | +3 |",
        "    | DEX | 12 | +1 |",
        "    | CON | 15 | +2 |",
        "    | INT | 10 | 0 |",
        "    | WIS | 10 | 0 |",
        "    | CHA | 8 | -1 |",
        "Proficiency Bonus: +2",
        "Feats:",
        "    Savage Attacker",
        "Armor Class: 11",
        "Hit Points: 12",
        "Armor Training: Light · Medium · Heavy · Shields",
        "Weapon Proficiencies: Simple · Martial",
        "Saving Throws",
        "    | Attribute | Proficient | Modifier |",
        "    | STR | X | +5 |",
        "    | DEX |  | +1 |",
        "    | CON | X | +4 |",
        "    | INT |  | 0 |",
        "    | WIS |  | 0 |",
        "    | CHA |  | -1 |",
        "Skills:",
        "    | Skill | Ability | Modifier | Bonus |",
        "    | Acrobatics | DEX | +1 | +1 |",
        "    | Animal Handling | WIS | 0 | 0 |",
        "    | Arcana | INT | 0 | 0 |",
        "    | Athletics* | STR | +3 | +5 |",
        "    | Deception | CHA | -1 | -1 |",
        "    | History | INT | 0 | 0 |",
        "    | Insight | WIS | 0 | 0 |",
        "    | Intimidation* | CHA | -1 | +1 |",
        "    | Investigation | INT | 0 | 0 |",
        "    | Medicine | WIS | 0 | 0 |",
        "    | Nature | INT | 0 | 0 |",
        "    | Perception* | WIS | 0 | +2 |",
        "    | Performance | CHA | -1 | -1 |",
        "    | Persuasion | CHA | -1 | -1 |",
        "    | Religion | INT | 0 | 0 |",
        "    | Sleight of Hand | DEX | +1 | +1 |",
        "    | Stealth | DEX | +1 | +1 |",
        "    | Survival | WIS | 0 | 0 |",
      ].join("\n"),
    );
  });

  it("omits the spellcasting-only fields and shows no feats for a caster with no background chosen", () => {
    const character: Character = { ...INITIAL_CHARACTER, classKey: "wizard" };
    const derived = computeDerivedStats(character);
    const markdown = generateCharacterMarkdown(character, derived, englishT, englishEntityName);

    expect(markdown).toContain("Feats:\nArmor Class: 10\nHit Points: 6");
  });

  it("includes a tools table when the character has tool proficiencies", () => {
    const character: Character = {
      ...INITIAL_CHARACTER,
      classKey: "rogue",
      proficientTools: ["thieves-tools"],
    };
    const derived = computeDerivedStats(character);
    const markdown = generateCharacterMarkdown(character, derived, englishT, englishEntityName);

    expect(markdown).toContain("Tools:");
    expect(markdown).toContain("| Thieves' Tools | DEX | +2 |");
  });

  it("exports a custom background name", () => {
    const character = {
      ...INITIAL_CHARACTER,
      name: "Lyra",
      backgroundKey: "custom",
      customBackgroundName: "Street Urchin",
      classKey: "rogue",
    };
    const derived = computeDerivedStats(character);
    const markdown = generateCharacterMarkdown(character, derived, englishT, englishEntityName);

    expect(markdown).toContain("Background: Street Urchin");
  });
});
