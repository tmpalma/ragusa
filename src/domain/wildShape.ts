import { BEASTS, findByKey } from "../data";
import type { AbilityId, BeastFormData, SkillId } from "../data/types";
import type { Character } from "../state/characterState";
import type { CombatCard } from "./combatActions";
import { formatModifier } from "./modifiers";
import { PROFICIENCY_BONUS } from "./proficiency";
import type { SavingThrowResult } from "./savingThrows";
import { savingThrowBonus } from "./savingThrows";
import { skillBonus } from "./skills";
import { SKILLS } from "../data/skills";
import { applyTemporaryHitPointsGrant } from "./temporaryHitPoints";

export const WILD_SHAPE_FEATURE_KEY = "wild-shape";
export const WILD_SHAPE_KNOWN_FORM_COUNT = 4;
export const MOON_DRUID_SUBCLASS_KEY = "circle-of-the-moon";

const L2_MAX_CR = new Set(["0", "1/8", "1/4"]);

export function parseChallengeRating(cr: string): number {
  if (cr.includes("/")) {
    const [numerator, denominator] = cr.split("/").map(Number);
    return numerator / denominator;
  }
  return Number(cr);
}

export function isMoonDruid(subclassKey: string | null | undefined): boolean {
  return subclassKey === MOON_DRUID_SUBCLASS_KEY;
}

export function wildShapeMaxCr(level: number, subclassKey?: string | null): number {
  if (isMoonDruid(subclassKey)) return Math.floor(level / 3);
  return 0.25;
}

function wildShapeCatalogBeast(beast: BeastFormData): boolean {
  return beast.wildShape !== false;
}

export function wildShapeEligibleBeasts(level: number, subclassKey?: string | null): BeastFormData[] {
  if (level < 2) return [];
  if (isMoonDruid(subclassKey)) {
    const maxCr = wildShapeMaxCr(level, subclassKey);
    return BEASTS.filter(
      (beast) => wildShapeCatalogBeast(beast) && parseChallengeRating(beast.cr) <= maxCr,
    );
  }
  return BEASTS.filter((beast) => wildShapeCatalogBeast(beast) && L2_MAX_CR.has(beast.cr));
}

export function wildShapeEffectiveAc(
  beast: BeastFormData,
  wisModifier: number,
  subclassKey?: string | null,
): number {
  if (!isMoonDruid(subclassKey)) return beast.ac;
  return Math.max(beast.ac, 13 + wisModifier);
}

export function isInWildShape(character: Character): boolean {
  return character.wildShapeActiveFormKey != null;
}

export function activeWildShapeForm(character: Character): BeastFormData | null {
  if (!character.wildShapeActiveFormKey) return null;
  return findByKey(BEASTS, character.wildShapeActiveFormKey);
}

export function initialWildShapeKnownForms(): string[] {
  return [];
}

export function overlayAbilityScores(
  baseScores: Record<AbilityId, number>,
  beast: BeastFormData,
): Record<AbilityId, number> {
  return {
    str: beast.abilities.str,
    dex: beast.abilities.dex,
    con: beast.abilities.con,
    int: baseScores.int,
    wis: baseScores.wis,
    cha: baseScores.cha,
  };
}

export function mergedSkillBonuses(
  characterSkills: Character["skills"],
  abilityModifiers: Record<AbilityId, number>,
  jackOfAllTrades: boolean,
  choiceBonuses: Partial<Record<SkillId, number>>,
  beast: BeastFormData | null,
  proficiencyBonus = PROFICIENCY_BONUS,
): Record<SkillId, number> {
  return Object.fromEntries(
    SKILLS.map((skill) => {
      const characterTotal =
        skillBonus(
          abilityModifiers[skill.ability],
          characterSkills[skill.id],
          jackOfAllTrades,
          proficiencyBonus,
        ) + (choiceBonuses[skill.id] ?? 0);
      const beastTotal = beast?.skills?.[skill.id];
      return [skill.id, beastTotal != null ? Math.max(characterTotal, beastTotal) : characterTotal];
    }),
  ) as Record<SkillId, number>;
}

export function mergedSavingThrows(
  abilityModifiers: Record<AbilityId, number>,
  classProficiencies: AbilityId[],
  beast: BeastFormData | null,
  proficiencyBonus = PROFICIENCY_BONUS,
): Record<AbilityId, SavingThrowResult> {
  const abilities: AbilityId[] = ["str", "dex", "con", "int", "wis", "cha"];
  return Object.fromEntries(
    abilities.map((ability) => {
      const character = savingThrowBonus(
        abilityModifiers[ability],
        classProficiencies.includes(ability),
        proficiencyBonus,
      );
      const beastMod = beast?.saves?.[ability];
      if (beastMod != null && beastMod > character.modifier) {
        return [ability, { proficient: character.proficient, modifier: beastMod }];
      }
      return [ability, character];
    }),
  ) as Record<AbilityId, SavingThrowResult>;
}

export function buildBeastAttackCards(beast: BeastFormData): CombatCard[] {
  return beast.attacks.map((attack, index) => ({
    id: `beast-attack-${beast.key}-${index}`,
    kind: "beast-attack" as const,
    entityKey: beast.key,
    traitSlug: slugify(attack.name),
    name: attack.name,
    description: attack.rider ?? "",
    attackMeta: {
      bonus: formatModifier(attack.toHit),
      damage: `${attack.damage} ${attack.damageType}`,
    },
  }));
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function canEnterWildShape(
  character: Character,
  formKey: string,
  maxUses: number,
): boolean {
  if (character.classKey !== "druid" || character.level < 2) return false;
  if (!character.wildShapeKnownForms.includes(formKey)) return false;
  if (!wildShapeEligibleBeasts(character.level, character.subclassKey).some((beast) => beast.key === formKey)) {
    return false;
  }
  const remaining = character.classFeatureUses[WILD_SHAPE_FEATURE_KEY] ?? maxUses;
  return remaining > 0;
}

export function spendWildShapeUse(
  classFeatureUses: Record<string, number>,
  maxUses: number,
): Record<string, number> {
  const remaining = classFeatureUses[WILD_SHAPE_FEATURE_KEY] ?? maxUses;
  const nextRemaining = remaining - 1;
  if (nextRemaining <= 0) {
    return { ...classFeatureUses, [WILD_SHAPE_FEATURE_KEY]: 0 };
  }
  return { ...classFeatureUses, [WILD_SHAPE_FEATURE_KEY]: nextRemaining };
}

export function enterWildShapeState(
  character: Character,
  formKey: string,
  maxUses: number,
): Pick<Character, "wildShapeActiveFormKey" | "classFeatureUses" | "temporaryHitPointsMax" | "temporaryHitPointsRemaining"> {
  const tempHpAmount = isMoonDruid(character.subclassKey) ? character.level * 3 : character.level;
  const tempHp = applyTemporaryHitPointsGrant(
    {
      temporaryHitPointsMax: character.temporaryHitPointsMax,
      temporaryHitPointsRemaining: character.temporaryHitPointsRemaining,
    },
    tempHpAmount,
  );
  return {
    wildShapeActiveFormKey: formKey,
    classFeatureUses: spendWildShapeUse(character.classFeatureUses, maxUses),
    temporaryHitPointsMax: tempHp.temporaryHitPointsMax,
    temporaryHitPointsRemaining: tempHp.temporaryHitPointsRemaining,
  };
}

export function clearWildShapeState(): Pick<Character, "wildShapeActiveFormKey" | "wildShapeKnownForms"> {
  return {
    wildShapeActiveFormKey: null,
    wildShapeKnownForms: initialWildShapeKnownForms(),
  };
}

export function exitWildShapeIfUnconscious(character: Character, newHp: number | null, maxHp: number): Character {
  if (character.wildShapeActiveFormKey == null) return character;
  const hp = newHp ?? maxHp;
  if (hp > 0) return character;
  return { ...character, wildShapeActiveFormKey: null };
}
