import type { AbilityId, ActionTiming } from "../data/types";
import type { CombatCard } from "./combatActions";
import { findSpellByKey, type CharacterSpellEntry } from "./spellSelection";
import { PROFICIENCY_BONUS } from "./proficiency";

const SAVE_ABILITY_PATTERN =
  /\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw/i;

const SPELL_ATTACK_PATTERN = /\b(?:ranged|melee) spell attack\b/i;

const SPELL_RANGE_FEET_PATTERN = /^(\d+)\s+feet$/i;

const SPELL_SNIPER_RANGE_BONUS_FEET = 60;

const SPELL_DAMAGE_PATTERN = /(\d+)d(\d+)\s+(\w+)\s+damage/i;

const SORCEROUS_BURST_DAMAGE_PATTERN = /(\d+)d(\d+)\s+damage\b/i;

const SORCEROUS_BURST_KEY = "sorcerous-burst";

const SAVE_ABILITY_MAP: Record<string, AbilityId> = {
  strength: "str",
  dexterity: "dex",
  constitution: "con",
  intelligence: "int",
  wisdom: "wis",
  charisma: "cha",
};

export function castingTimeToActionTiming(castingTime: string): ActionTiming | null {
  switch (castingTime) {
    case "action":
      return "action";
    case "bonus-action":
      return "bonus";
    case "reaction":
      return "reaction";
    default:
      return null;
  }
}

export function extractSpellSaveAbility(description: string): AbilityId | null {
  const match = SAVE_ABILITY_PATTERN.exec(description);
  if (!match) return null;
  return SAVE_ABILITY_MAP[match[1].toLowerCase()] ?? null;
}

export function spellRequiresAttackRoll(description: string): boolean {
  return SPELL_ATTACK_PATTERN.test(description);
}

/** Parses catalog range strings like "120 feet". Returns null for Self, Touch, and other special ranges. */
export function parseSpellRangeFeet(range: string): number | null {
  const match = SPELL_RANGE_FEET_PATTERN.exec(range.trim());
  if (!match) return null;
  return Number.parseInt(match[1], 10);
}

export function extendSpellRangeForSniper(range: string): string | null {
  const feet = parseSpellRangeFeet(range);
  if (feet == null || feet < 10) return null;
  return `${feet + SPELL_SNIPER_RANGE_BONUS_FEET} feet`;
}

export function resolveCombatSpellRange(
  range: string,
  description: string,
  hasSpellSniper: boolean,
): string {
  if (!hasSpellSniper || !spellRequiresAttackRoll(description)) return range;
  return extendSpellRangeForSniper(range) ?? range;
}

export function cantripDamageTier(characterLevel: number): number {
  if (characterLevel >= 17) return 4;
  if (characterLevel >= 11) return 3;
  if (characterLevel >= 5) return 2;
  return 1;
}

export interface SpellDamageDice {
  count: number;
  sides: number;
  damageType: string;
}

export function extractSpellDamageDice(description: string): SpellDamageDice | null {
  const match = SPELL_DAMAGE_PATTERN.exec(description);
  if (!match) return null;
  return {
    count: Number.parseInt(match[1], 10),
    sides: Number.parseInt(match[2], 10),
    damageType: match[3],
  };
}

export function formatSpellDamage(dice: SpellDamageDice): string {
  return `${dice.count}d${dice.sides} ${dice.damageType}`;
}

const ELDRITCH_BLAST_KEY = "eldritch-blast";

export function resolveCantripSpellDamage(
  spellKey: string,
  description: string,
  characterLevel: number,
): string | null {
  const tier = cantripDamageTier(characterLevel);
  if (spellKey === SORCEROUS_BURST_KEY) {
    const match = SORCEROUS_BURST_DAMAGE_PATTERN.exec(description);
    if (!match) return null;
    const sides = Number.parseInt(match[2], 10);
    return `*${tier}d${sides}`;
  }
  if (spellKey === ELDRITCH_BLAST_KEY) {
    const base = extractSpellDamageDice(description);
    if (!base) return null;
    const beamCount = characterLevel >= 17 ? 4 : characterLevel >= 11 ? 3 : characterLevel >= 5 ? 2 : 1;
    const formatted = formatSpellDamage(base);
    return beamCount > 1 ? `${formatted} × ${beamCount}` : formatted;
  }
  const base = extractSpellDamageDice(description);
  if (!base) return null;
  return formatSpellDamage({ ...base, count: base.count * tier });
}

/** Strip material descriptions for compact combat display (e.g. "V, S, M (sand)" → "V, S, M"). */
export function abbreviateSpellComponents(components: string): string {
  return components
    .split(", ")
    .map((segment) => {
      const trimmed = segment.trim();
      if (trimmed.startsWith("V")) return "V";
      if (trimmed.startsWith("S")) return "S";
      if (trimmed.startsWith("M")) return "M";
      return trimmed;
    })
    .join(", ");
}

export interface CombatSpellSortOptions {
  locale?: string;
  spellName?: (spellKey: string, fallback: string) => string;
}

function compareSpellCards(
  a: CombatCard,
  b: CombatCard,
  sortOptions?: CombatSpellSortOptions,
): number {
  const locale = sortOptions?.locale ?? "en";
  const spellName = sortOptions?.spellName ?? ((_key, fallback) => fallback);
  const levelDiff = (a.spellMeta?.level ?? 0) - (b.spellMeta?.level ?? 0);
  if (levelDiff !== 0) return levelDiff;
  const nameA = a.entityKey ? spellName(a.entityKey, a.name) : a.name;
  const nameB = b.entityKey ? spellName(b.entityKey, b.name) : b.name;
  return nameA.localeCompare(nameB, locale);
}

export interface SpellCastContext {
  classAttackBonus?: number;
  classSaveDc?: number;
  abilityModifiers: Record<AbilityId, number>;
  proficiencyBonus?: number;
  speciesSpellcastingAbility?: AbilityId | null;
  characterLevel?: number;
  hasSpellSniper?: boolean;
}

/** @deprecated Use SpellCastContext */
export type SpellSaveDcContext = SpellCastContext;

function resolveSpellCastStat(
  entry: CharacterSpellEntry,
  context: SpellCastContext | undefined,
  kind: "attack" | "saveDc",
): number | undefined {
  if (!context) return undefined;

  const proficiencyBonus = context.proficiencyBonus ?? PROFICIENCY_BONUS;
  const baseFromAbility = (ability: AbilityId) =>
    kind === "attack"
      ? context.abilityModifiers[ability] + proficiencyBonus
      : 8 + context.abilityModifiers[ability] + proficiencyBonus;

  if (entry.spellcastingAbility) {
    return baseFromAbility(entry.spellcastingAbility);
  }

  if (entry.source === "pick" || entry.source === "classFeature") {
    return kind === "attack" ? context.classAttackBonus : context.classSaveDc;
  }

  if (entry.source === "species" && context.speciesSpellcastingAbility) {
    return baseFromAbility(context.speciesSpellcastingAbility);
  }

  return kind === "attack" ? context.classAttackBonus : context.classSaveDc;
}

export function resolveSpellSaveDc(
  entry: CharacterSpellEntry,
  context?: SpellCastContext,
): number | undefined {
  return resolveSpellCastStat(entry, context, "saveDc");
}

export function resolveSpellAttackBonus(
  entry: CharacterSpellEntry,
  context?: SpellCastContext,
): number | undefined {
  return resolveSpellCastStat(entry, context, "attack");
}

export function buildCombatSpellCards(
  entries: CharacterSpellEntry[],
  castContext?: SpellCastContext,
  sortOptions?: CombatSpellSortOptions,
): Record<ActionTiming, CombatCard[]> {
  const cards: Record<ActionTiming, CombatCard[]> = { action: [], bonus: [], reaction: [] };

  for (const entry of entries) {
    const spell = findSpellByKey(entry.spellKey);
    if (!spell) continue;

    const timing = entry.combatActionTiming ?? castingTimeToActionTiming(spell.castingTime);
    if (!timing) continue;

    const saveAbility = extractSpellSaveAbility(spell.desc);
    const requiresSpellAttack = spellRequiresAttackRoll(spell.desc);
    const saveDc = saveAbility ? resolveSpellSaveDc(entry, castContext) : undefined;
    const spellAttackBonus = requiresSpellAttack
      ? resolveSpellAttackBonus(entry, castContext)
      : undefined;
    const spellDamage =
      spell.level === 0 && castContext?.characterLevel != null
        ? resolveCantripSpellDamage(spell.key, spell.desc, castContext.characterLevel)
        : undefined;
    cards[timing].push({
      id: `spell-${entry.spellKey}`,
      kind: "spell",
      entityKey: entry.spellKey,
      name: spell.name,
      description: "",
      spellMeta: {
        level: spell.level,
        school: spell.school,
        range: resolveCombatSpellRange(
          spell.range,
          spell.desc,
          castContext?.hasSpellSniper ?? false,
        ),
        duration: spell.duration,
        components: abbreviateSpellComponents(spell.components),
        concentration: spell.concentration,
        ...(saveAbility ? { saveAbility, ...(saveDc != null ? { saveDc } : {}) } : {}),
        ...(spellAttackBonus != null ? { spellAttackBonus } : {}),
        ...(spellDamage ? { spellDamage } : {}),
      },
    });
  }

  const compare = (left: CombatCard, right: CombatCard) => compareSpellCards(left, right, sortOptions);
  cards.action.sort(compare);
  cards.bonus.sort(compare);
  cards.reaction.sort(compare);

  return cards;
}
