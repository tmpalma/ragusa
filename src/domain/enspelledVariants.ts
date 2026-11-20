import { SPELLS } from "../data";
import type { CharacterArmor, CharacterWeapon } from "../state/characterState";

const ENSPELLED_VARIANT_KEY = /^enspelled-(armor|weapon)-(cantrip|level-\d+)$/;

const ENSPELLED_ARMOR_SCHOOLS = ["Abjuration", "Illusion"];
const ENSPELLED_WEAPON_SCHOOLS = ["Conjuration", "Divination", "Evocation", "Necromancy", "Transmutation"];

export function isEnspelledVariantKey(variantKey: string | null | undefined): boolean {
  return variantKey != null && ENSPELLED_VARIANT_KEY.test(variantKey);
}

export function enspelledSpellLevel(variantKey: string): number {
  if (variantKey.endsWith("-cantrip")) return 0;
  const match = variantKey.match(/-level-(\d+)$/);
  return match ? Number(match[1]) : 0;
}

export function enspelledAllowedSchools(variantKey: string): string[] {
  return variantKey.includes("-armor-") ? ENSPELLED_ARMOR_SCHOOLS : ENSPELLED_WEAPON_SCHOOLS;
}

export function enspelledSpellOptions(variantKey: string): string[] {
  if (!isEnspelledVariantKey(variantKey)) return [];
  const level = enspelledSpellLevel(variantKey);
  const schools = new Set(enspelledAllowedSchools(variantKey).map((school) => school.toLowerCase()));
  return SPELLS.filter(
    (spell) => spell.level === level && schools.has(spell.school.trim().toLowerCase()),
  )
    .map((spell) => spell.key)
    .sort((left, right) => left.localeCompare(right));
}

export function isValidEnspelledSpellPick(variantKey: string, spellKey: string): boolean {
  return enspelledSpellOptions(variantKey).includes(spellKey);
}

export function pruneEnspelledSpellPicks(
  picks: Record<string, string>,
  weapons: readonly CharacterWeapon[],
  armor: readonly CharacterArmor[],
): Record<string, string> {
  const next: Record<string, string> = {};
  for (const weapon of weapons) {
    if (!weapon.variantKey || !isEnspelledVariantKey(weapon.variantKey)) continue;
    const spellKey = picks[weapon.id];
    if (spellKey && isValidEnspelledSpellPick(weapon.variantKey, spellKey)) {
      next[weapon.id] = spellKey;
    }
  }
  for (const piece of armor) {
    if (!piece.variantKey || !isEnspelledVariantKey(piece.variantKey)) continue;
    const spellKey = picks[piece.id];
    if (spellKey && isValidEnspelledSpellPick(piece.variantKey, spellKey)) {
      next[piece.id] = spellKey;
    }
  }
  return next;
}
