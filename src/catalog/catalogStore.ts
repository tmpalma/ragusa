import type {
  AdventuringGearData,
  AlignmentData,
  ArmorData,
  BackgroundData,
  BeastFormData,
  BookData,
  ClassData,
  ClassSpellList,
  ConditionData,
  DeityData,
  FeatData,
  GenericVariantData,
  LanguageData,
  MagicItemData,
  SpeciesData,
  SpellData,
  SubclassData,
  WeaponData,
} from "../data/types";

export const CLASSES: ClassData[] = [];
export const SUBCLASSES: SubclassData[] = [];
export const CLASS_SPELL_LISTS: Record<string, ClassSpellList> = {};
export const SPELLS: SpellData[] = [];
export const SPECIES: SpeciesData[] = [];
export const BACKGROUNDS: BackgroundData[] = [];
export const DEITIES: DeityData[] = [];
export const BEASTS: BeastFormData[] = [];
export const CONDITIONS: ConditionData[] = [];
export const BOOKS: BookData[] = [];
export const FEATS: FeatData[] = [];
export const WEAPONS: WeaponData[] = [];
export const ARMOR: ArmorData[] = [];
export const ALIGNMENTS: AlignmentData[] = [];
export const LANGUAGES: LanguageData[] = [];
export const MAGIC_ITEMS: MagicItemData[] = [];
export const GENERIC_VARIANTS: GenericVariantData[] = [];
export const ADVENTURING_GEAR: AdventuringGearData[] = [];

export function replaceArray<T>(target: T[], next: T[]): void {
  target.length = 0;
  target.push(...next);
}

export function replaceRecord<T extends Record<string, unknown>>(target: T, next: T): void {
  for (const key of Object.keys(target)) delete target[key];
  Object.assign(target, next);
}

export function findByKey<T extends { key: string }>(list: T[], key: string | null | undefined): T | null {
  if (!key) return null;
  return list.find((item) => item.key === key) ?? null;
}
