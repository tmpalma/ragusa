import type { AbilityId, ClassFeatureSpellPickSet, ItemCost, LanguageId, SkillId } from "../data/types";
import type { AmmoType } from "../data";
import type { ToolId } from "../data/toolStats";
import type { FeatChoices, FeatProficiencyPick } from "./featEffects";
import { EMPTY_ABILITY_SCORE_INCREASES } from "./abilityScoreIncreases";
import { EMPTY_FEAT_CHOICES } from "./featEffects";
import { mergeAttunedKeysIntoAdventuringGear, type AdventuringGearEntry } from "./adventuringGear";
import { syncCharacterLevelAliases } from "./classLevels";
import type { CompanionSummonPayment } from "./castSpell";
import type { SpiritType, TrackedCreatureInstance } from "./trackedCreatures";
import {
  INITIAL_CHARACTER,
  type AbilityScoreMethod,
  type Character,
  type CharacterArmor,
  type CharacterWeapon,
  type Currency,
  type InventoryItem,
  type MagicAmmunitionStack,
  type ProficiencyState,
  type SpeciesSizeChoice,
} from "../state/characterState";

export const CHARACTER_FILE_FORMAT = "dnd55e-chargen-character" as const;
export const CHARACTER_FILE_SCHEMA_VERSION = 1;

export type CharacterFileParseErrorCode =
  | "invalid_json"
  | "invalid_payload"
  | "unsupported_format"
  | "unsupported_schema_version";

export class CharacterFileParseError extends Error {
  readonly code: CharacterFileParseErrorCode;

  constructor(code: CharacterFileParseErrorCode, message: string) {
    super(message);
    this.name = "CharacterFileParseError";
    this.code = code;
  }
}

export interface CharacterFileEnvelope {
  format: typeof CHARACTER_FILE_FORMAT;
  schemaVersion: number;
  exportedAt: string;
  character: Character;
}

const ABILITY_IDS: AbilityId[] = ["str", "dex", "con", "int", "wis", "cha"];
const ABILITY_SCORE_METHODS: AbilityScoreMethod[] = ["custom", "standardArray", "pointBuy"];
const PROFICIENCY_STATES: ProficiencyState[] = ["none", "proficient", "expert"];
const SPECIES_SIZE_CHOICES: SpeciesSizeChoice[] = ["medium", "small"];
const CURRENCY_DENOMINATIONS = ["pp", "gp", "ep", "sp", "cp"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || isNumber(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function readString(value: unknown, fallback: string): string {
  return isString(value) ? value : fallback;
}

function readNullableString(value: unknown, fallback: string | null): string | null {
  return isNullableString(value) ? value : fallback;
}

function readNumber(value: unknown, fallback: number): number {
  return isNumber(value) ? value : fallback;
}

function readNullableNumber(value: unknown, fallback: number | null): number | null {
  return isNullableNumber(value) ? value : fallback;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return isBoolean(value) ? value : fallback;
}

function readStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  return value.filter((entry): entry is string => typeof entry === "string");
}

function readNullableStringArray(value: unknown, fallback: (string | null)[]): (string | null)[] {
  if (!Array.isArray(value)) return fallback;
  return value.map((entry) => (entry === null || typeof entry === "string" ? entry : null));
}

function readStringRecord(value: unknown, fallback: Record<string, string>): Record<string, string> {
  if (!isRecord(value)) return fallback;
  const next: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string") next[key] = entry;
  }
  return next;
}

function readBooleanRecord(value: unknown, fallback: Record<string, boolean>): Record<string, boolean> {
  if (!isRecord(value)) return fallback;
  const next: Record<string, boolean> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "boolean") next[key] = entry;
  }
  return next;
}

function readStringNumberRecord(value: unknown, fallback: Record<string, number>): Record<string, number> {
  if (!isRecord(value)) return fallback;
  const next: Record<string, number> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (isNumber(entry)) next[key] = entry;
  }
  return next;
}

function readNumberRecord(value: unknown, fallback: Record<number, number>): Record<number, number> {
  if (!isRecord(value)) return fallback;
  const next: Record<number, number> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "number" && Number.isFinite(entry)) next[Number(key)] = entry;
  }
  return next;
}

function readAbilityId(value: unknown, fallback: AbilityId | null): AbilityId | null {
  if (value === null) return null;
  return ABILITY_IDS.includes(value as AbilityId) ? (value as AbilityId) : fallback;
}

function readAbilityScoreMethod(value: unknown, fallback: AbilityScoreMethod): AbilityScoreMethod {
  return ABILITY_SCORE_METHODS.includes(value as AbilityScoreMethod)
    ? (value as AbilityScoreMethod)
    : fallback;
}

function readAbilityScores(value: unknown, fallback: Record<AbilityId, number>): Record<AbilityId, number> {
  if (!isRecord(value)) return fallback;
  const next = { ...fallback };
  for (const id of ABILITY_IDS) {
    const entry = value[id];
    if (isNumber(entry)) next[id] = entry;
  }
  return next;
}

function readAbilityScoreIncreases(
  value: unknown,
  fallback: Record<AbilityId, number>,
): Record<AbilityId, number> {
  if (!isRecord(value)) return fallback;
  const next = { ...fallback };
  for (const id of ABILITY_IDS) {
    const entry = value[id];
    if (isNumber(entry)) next[id] = entry;
  }
  return next;
}

/** Feat choice increases use `{}` when unset; omit all-zero records after hydration. */
function compactFeatAbilityIncreases(
  increases: Record<AbilityId, number>,
): Partial<Record<AbilityId, number>> {
  if (ABILITY_IDS.every((id) => (increases[id] ?? 0) === 0)) return {};
  return increases;
}

function readSkills(value: unknown, fallback: Record<SkillId, ProficiencyState>): Record<SkillId, ProficiencyState> {
  if (!isRecord(value)) return fallback;
  const next = { ...fallback };
  for (const [key, entry] of Object.entries(value)) {
    if (PROFICIENCY_STATES.includes(entry as ProficiencyState)) {
      next[key as SkillId] = entry as ProficiencyState;
    }
  }
  return next;
}

function readSpeciesSize(value: unknown, fallback: SpeciesSizeChoice | null): SpeciesSizeChoice | null {
  if (value === null) return null;
  return SPECIES_SIZE_CHOICES.includes(value as SpeciesSizeChoice) ? (value as SpeciesSizeChoice) : fallback;
}

function readCurrency(value: unknown, fallback: Currency): Currency {
  if (!isRecord(value)) return fallback;
  const next = { ...fallback };
  for (const denomination of CURRENCY_DENOMINATIONS) {
    const entry = value[denomination];
    if (isNumber(entry)) next[denomination] = entry;
  }
  return next;
}

function readItemCost(value: unknown): ItemCost | null {
  if (!isRecord(value)) return null;
  const amount = value.amount;
  const denomination = value.denomination;
  if (!isNumber(amount) || !CURRENCY_DENOMINATIONS.includes(denomination as (typeof CURRENCY_DENOMINATIONS)[number])) {
    return null;
  }
  return { amount, denomination: denomination as ItemCost["denomination"] };
}

function readSpiritType(value: unknown): SpiritType | undefined {
  if (value === "celestial" || value === "fey" || value === "fiend") return value;
  return undefined;
}

function readSummonPayment(value: unknown): CompanionSummonPayment | undefined {
  if (!isRecord(value)) return undefined;
  const spellKey = value.spellKey;
  const slotLevel = value.slotLevel;
  if (!isString(spellKey) || !isNumber(slotLevel)) return undefined;
  const freeCastSourceId = value.freeCastSourceId === null || isString(value.freeCastSourceId)
    ? (value.freeCastSourceId as string | null)
    : null;
  const slotPool = value.slotPool === "pact" ? "pact" : "spell";
  const castAsRitual = value.castAsRitual === true ? true : undefined;
  return {
    spellKey,
    slotLevel: Math.floor(slotLevel),
    freeCastSourceId,
    slotPool,
    ...(castAsRitual ? { castAsRitual: true } : {}),
  };
}

function readTrackedCreatures(value: unknown, fallback: TrackedCreatureInstance[]): TrackedCreatureInstance[] {
  if (!Array.isArray(value)) return fallback;
  const rows: TrackedCreatureInstance[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const id = entry.id;
    const sourceKey = entry.sourceKey;
    const category = entry.category;
    if (!isString(id) || !isString(sourceKey)) continue;
    if (category !== "companion" && category !== "summon") continue;
    rows.push({
      id,
      sourceKey,
      category,
      formKey: readNullableString(entry.formKey, null),
      spiritType: readSpiritType(entry.spiritType),
      castSlotLevel: isNumber(entry.castSlotLevel) ? Math.floor(entry.castSlotLevel) : undefined,
      currentHitPoints: readNullableNumber(entry.currentHitPoints, null),
      temporaryHitPointsMax: readNullableNumber(entry.temporaryHitPointsMax, null),
      temporaryHitPointsRemaining: readNullableNumber(entry.temporaryHitPointsRemaining, null),
      featureUses: readStringNumberRecord(entry.featureUses, {}),
      dismissed: entry.dismissed === true ? true : undefined,
      summoned: entry.summoned === true ? true : undefined,
      summonPayment: readSummonPayment(entry.summonPayment),
    });
  }
  return rows;
}

function readInventoryItems(value: unknown, fallback: InventoryItem[]): InventoryItem[] {
  if (!Array.isArray(value)) return fallback;
  const items: InventoryItem[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const id = entry.id;
    const name = entry.name;
    const weightLb = entry.weightLb;
    const cost = readItemCost(entry.cost);
    if (!isString(id) || !isString(name) || !isNumber(weightLb) || !cost) continue;
    items.push({ id, name, weightLb, cost });
  }
  return items;
}

function readOptionalVariantKey(value: unknown): string | undefined {
  return isString(value) && value.length > 0 ? value : undefined;
}

function readOptionalAttuned(value: unknown): boolean | undefined {
  return value === true ? true : undefined;
}

function readCharacterWeapon(value: unknown): CharacterWeapon | null {
  if (!isRecord(value)) return null;
  const id = value.id;
  const key = value.key;
  if (!isString(id) || !isString(key)) return null;
  const quantity = value.quantity;
  const weapon: CharacterWeapon = { id, key };
  if (isNumber(quantity)) weapon.quantity = quantity;
  const variantKey = readOptionalVariantKey(value.variantKey);
  if (variantKey) weapon.variantKey = variantKey;
  const attuned = readOptionalAttuned(value.attuned);
  if (attuned) weapon.attuned = true;
  return weapon;
}

function readCharacterWeapons(value: unknown, fallback: CharacterWeapon[]): CharacterWeapon[] {
  if (!Array.isArray(value)) return fallback;
  return value.map(readCharacterWeapon).filter((entry): entry is CharacterWeapon => entry !== null);
}

function readCharacterArmor(value: unknown): CharacterArmor | null {
  if (!isRecord(value)) return null;
  const id = value.id;
  const key = value.key;
  const worn = value.worn;
  if (!isString(id) || !isString(key) || !isBoolean(worn)) return null;
  const armor: CharacterArmor = { id, key, worn };
  const variantKey = readOptionalVariantKey(value.variantKey);
  if (variantKey) armor.variantKey = variantKey;
  const attuned = readOptionalAttuned(value.attuned);
  if (attuned) armor.attuned = true;
  return armor;
}

function readCharacterArmors(value: unknown, fallback: CharacterArmor[]): CharacterArmor[] {
  if (!Array.isArray(value)) return fallback;
  return value.map(readCharacterArmor).filter((entry): entry is CharacterArmor => entry !== null);
}

function readFeatProficiencyPick(value: unknown): FeatProficiencyPick | null {
  if (!isRecord(value)) return null;
  const kind = value.kind;
  const id = value.id;
  if (!isString(kind) || !isString(id)) return null;
  if (kind === "skill") return { kind: "skill", id: id as SkillId };
  if (kind === "tool") return { kind: "tool", id: id as ToolId };
  return null;
}

function readFeatChoices(value: unknown, fallback: FeatChoices): FeatChoices {
  if (!isRecord(value)) return fallback;
  const proficiencyPicks = Array.isArray(value.proficiencyPicks)
    ? value.proficiencyPicks.map((entry) => {
        if (entry === null) return null;
        return readFeatProficiencyPick(entry);
      })
    : fallback.proficiencyPicks;
  return {
    proficiencyPicks,
    abilityIncreases: compactFeatAbilityIncreases(
      readAbilityScoreIncreases(value.abilityIncreases, {
        ...EMPTY_ABILITY_SCORE_INCREASES,
        ...fallback.abilityIncreases,
      }),
    ),
    spellcastingAbility: readAbilityId(value.spellcastingAbility, fallback.spellcastingAbility),
    cantripPicks: readNullableStringArray(value.cantripPicks, fallback.cantripPicks),
    spellPicks: readNullableStringArray(value.spellPicks, fallback.spellPicks),
    damageTypePick: readNullableString(value.damageTypePick, fallback.damageTypePick),
    weaponMasteryPick: readNullableString(value.weaponMasteryPick, fallback.weaponMasteryPick),
  };
}

function readFeatChoicesArray(value: unknown, fallback: FeatChoices[]): FeatChoices[] {
  if (!Array.isArray(value)) return fallback;
  return value.map((entry) => readFeatChoices(entry, { ...EMPTY_FEAT_CHOICES }));
}

function readClassGrantedFeats(value: unknown, fallback: Record<number, string>): Record<number, string> {
  if (!isRecord(value)) return fallback;
  const next: Record<number, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string") next[Number(key)] = entry;
  }
  return next;
}

function readClassGrantedFeatChoices(
  value: unknown,
  fallback: Record<number, FeatChoices>,
): Record<number, FeatChoices> {
  if (!isRecord(value)) return fallback;
  const next: Record<number, FeatChoices> = {};
  for (const [key, entry] of Object.entries(value)) {
    next[Number(key)] = readFeatChoices(entry, { ...EMPTY_FEAT_CHOICES });
  }
  return next;
}

function readNullableStringRecordArray(
  value: unknown,
  fallback: Record<string, (string | null)[]>,
): Record<string, (string | null)[]> {
  if (!isRecord(value)) return fallback;
  const next: Record<string, (string | null)[]> = {};
  for (const [key, entry] of Object.entries(value)) {
    next[key] = readNullableStringArray(entry, []);
  }
  return next;
}

function readToolPickRecordArray(
  value: unknown,
  fallback: Record<string, (ToolId | null)[]>,
): Record<string, (ToolId | null)[]> {
  if (!isRecord(value)) return fallback;
  const next: Record<string, (ToolId | null)[]> = {};
  for (const [key, entry] of Object.entries(value)) {
    next[key] = readNullableStringArray(entry, []) as (ToolId | null)[];
  }
  return next;
}

function readClassFeatureSpellPickSet(value: unknown): ClassFeatureSpellPickSet | null {
  if (!isRecord(value)) return null;
  return {
    cantrips: readNullableStringArray(value.cantrips, []),
    rituals: readNullableStringArray(value.rituals, []),
  };
}

function readClassFeatureSpellPicks(
  value: unknown,
  fallback: Record<string, ClassFeatureSpellPickSet>,
): Record<string, ClassFeatureSpellPickSet> {
  if (!isRecord(value)) return fallback;
  const next: Record<string, ClassFeatureSpellPickSet> = {};
  for (const [key, entry] of Object.entries(value)) {
    const pickSet = readClassFeatureSpellPickSet(entry);
    if (pickSet) next[key] = pickSet;
  }
  return next;
}

function readPackRemaining(value: unknown): Record<string, number> | undefined {
  if (!isRecord(value)) return undefined;
  const remaining: Record<string, number> = {};
  for (const [itemKey, count] of Object.entries(value)) {
    if (!isString(itemKey) || !isNumber(count) || count < 0) continue;
    remaining[itemKey] = Math.floor(count);
  }
  return Object.keys(remaining).length > 0 ? remaining : undefined;
}

function readAdventuringGear(value: unknown, fallback: AdventuringGearEntry[]): AdventuringGearEntry[] {
  if (!Array.isArray(value)) return fallback;
  const entries: AdventuringGearEntry[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const key = entry.key;
    const quantity = entry.quantity;
    if (!isString(key) || !isNumber(quantity)) continue;
    const packRemaining = readPackRemaining(entry.packRemaining);
    entries.push(packRemaining ? { key, quantity, packRemaining } : { key, quantity });
  }
  return entries;
}

function readClassLevels(
  value: unknown,
  fallback: { classKey: string; level: number }[] | undefined,
): { classKey: string; level: number }[] | undefined {
  if (value === undefined) return fallback;
  if (!Array.isArray(value)) return fallback;
  const levels = value
    .map((entry) => {
      if (!isRecord(entry)) return null;
      const classKey = entry.classKey;
      const level = entry.level;
      if (!isString(classKey) || !isNumber(level)) return null;
      return { classKey, level };
    })
    .filter((entry): entry is { classKey: string; level: number } => entry !== null);
  return levels.length > 0 ? levels : undefined;
}

function readNullableStringRecord(
  value: unknown,
  fallback: Record<string, string | null>,
): Record<string, string | null> {
  if (!isRecord(value)) return fallback;
  const next: Record<string, string | null> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry === null || typeof entry === "string") next[key] = entry;
  }
  return next;
}

function readPactSlotRemaining(
  value: unknown,
  fallback: { count: number; slotLevel: number } | null,
): { count: number; slotLevel: number } | null {
  if (value === null) return null;
  if (!isRecord(value)) return fallback;
  const count = value.count;
  const slotLevel = value.slotLevel;
  if (!isNumber(count) || !isNumber(slotLevel)) return fallback;
  return { count, slotLevel };
}

function readHitDiceRemaining(
  value: unknown,
  fallback: Partial<Record<number, number | null>>,
): Partial<Record<number, number | null>> {
  if (!isRecord(value)) return fallback;
  const next: Partial<Record<number, number | null>> = {};
  for (const [key, entry] of Object.entries(value)) {
    const die = Number(key);
    if (!Number.isFinite(die)) continue;
    if (entry === null || isNumber(entry)) next[die] = entry;
  }
  return next;
}

function readNullableStringArrayRecord(
  value: unknown,
  fallback: Record<string, (string | null)[]>,
): Record<string, (string | null)[]> {
  if (!isRecord(value)) return fallback;
  const next: Record<string, (string | null)[]> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (Array.isArray(entry)) {
      next[key] = entry.map((item) => (item === null || typeof item === "string" ? item : null));
    }
  }
  return next;
}

function readStringArrayRecord(
  value: unknown,
  fallback: Record<string, string[]>,
): Record<string, string[]> {
  if (!isRecord(value)) return fallback;
  const next: Record<string, string[]> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (Array.isArray(entry)) {
      next[key] = entry.filter((item): item is string => typeof item === "string");
    }
  }
  return next;
}

function readStringRecordRecord(
  value: unknown,
  fallback: Record<string, Record<string, string>>,
): Record<string, Record<string, string>> {
  if (!isRecord(value)) return fallback;
  const next: Record<string, Record<string, string>> = {};
  for (const [classKey, choices] of Object.entries(value)) {
    if (!isRecord(choices)) continue;
    next[classKey] = readStringRecord(choices, {});
  }
  return next;
}

function readClassGrantedFeatsByClass(
  value: unknown,
  fallback: Record<string, Record<number, string>>,
): Record<string, Record<number, string>> {
  if (!isRecord(value)) return fallback;
  const next: Record<string, Record<number, string>> = {};
  for (const [classKey, levels] of Object.entries(value)) {
    if (!isRecord(levels)) continue;
    const grantLevels: Record<number, string> = {};
    for (const [levelKey, featKey] of Object.entries(levels)) {
      const level = Number(levelKey);
      if (Number.isFinite(level) && typeof featKey === "string") grantLevels[level] = featKey;
    }
    if (Object.keys(grantLevels).length > 0) next[classKey] = grantLevels;
  }
  return next;
}

function readAmmunitionRemaining(
  value: unknown,
  fallback: Partial<Record<AmmoType, number>>,
): Partial<Record<AmmoType, number>> {
  if (!isRecord(value)) return fallback;
  const next: Partial<Record<AmmoType, number>> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (isNumber(entry)) next[key as AmmoType] = entry;
  }
  return next;
}

function readMagicAmmunition(value: unknown, fallback: MagicAmmunitionStack[]): MagicAmmunitionStack[] {
  if (!Array.isArray(value)) return fallback;
  const stacks: MagicAmmunitionStack[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const id = entry.id;
    const ammoType = entry.ammoType;
    const variantKey = entry.variantKey;
    const remaining = entry.remaining;
    if (!isString(id) || !isString(ammoType) || !isString(variantKey) || !isNumber(remaining)) continue;
    stacks.push({
      id,
      ammoType: ammoType as AmmoType,
      variantKey,
      remaining: Math.max(0, Math.floor(remaining)),
    });
  }
  return stacks;
}

function readPreferredAmmoSource(
  value: unknown,
  fallback: Partial<Record<AmmoType, string | null>>,
): Partial<Record<AmmoType, string | null>> {
  if (!isRecord(value)) return fallback;
  const next: Partial<Record<AmmoType, string | null>> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry === null) next[key as AmmoType] = null;
    else if (isString(entry)) next[key as AmmoType] = entry;
  }
  return next;
}

export function characterForSave(character: Character): Character {
  return {
    ...character,
    skillConflictNotice: null,
  };
}

export function serializeCharacterFile(character: Character, exportedAt = new Date()): string {
  const envelope: CharacterFileEnvelope = {
    format: CHARACTER_FILE_FORMAT,
    schemaVersion: CHARACTER_FILE_SCHEMA_VERSION,
    exportedAt: exportedAt.toISOString(),
    character: characterForSave(character),
  };
  return JSON.stringify(envelope, null, 2);
}

export function hydrateCharacter(raw: unknown): Character {
  if (!isRecord(raw)) return { ...INITIAL_CHARACTER };

  const base = INITIAL_CHARACTER;
  const classLevels = readClassLevels(raw.classLevels, base.classLevels);
  const levelPath = readStringArray(raw.levelPath, base.levelPath);
  const hydrated: Character = {
    name: readString(raw.name, base.name),
    speciesKey: readNullableString(raw.speciesKey, base.speciesKey),
    speciesLineageKey: readNullableString(raw.speciesLineageKey, base.speciesLineageKey),
    speciesSpellcastingAbility: readAbilityId(raw.speciesSpellcastingAbility, base.speciesSpellcastingAbility),
    speciesSkillPicks: readNullableStringArray(raw.speciesSkillPicks, base.speciesSkillPicks) as (SkillId | null)[],
    speciesToolPicks: readNullableStringArray(raw.speciesToolPicks, base.speciesToolPicks) as (ToolId | null)[],
    speciesSize: readSpeciesSize(raw.speciesSize, base.speciesSize),
    speciesFeatureChoices: readStringRecord(raw.speciesFeatureChoices, base.speciesFeatureChoices),
    speciesCantripSwapAvailable: readBooleanRecord(
      raw.speciesCantripSwapAvailable,
      base.speciesCantripSwapAvailable,
    ),
    backgroundKey: readNullableString(raw.backgroundKey, base.backgroundKey),
    customBackgroundName: readString(raw.customBackgroundName, base.customBackgroundName),
    backgroundSkillPicks: readNullableStringArray(raw.backgroundSkillPicks, base.backgroundSkillPicks) as (
      | SkillId
      | null
    )[],
    classKey: readNullableString(raw.classKey, base.classKey),
    alignmentKey: readNullableString(raw.alignmentKey, base.alignmentKey),
    deityKey: readNullableString(raw.deityKey, base.deityKey),
    alignmentDescription: readString(raw.alignmentDescription, base.alignmentDescription),
    alignmentDescriptionTouched: readBoolean(raw.alignmentDescriptionTouched, base.alignmentDescriptionTouched),
    backstory: readString(raw.backstory, base.backstory),
    languagePicks: readStringArray(raw.languagePicks, base.languagePicks) as LanguageId[],
    abilityScores: readAbilityScores(raw.abilityScores, base.abilityScores),
    abilityScoreIncreases: readAbilityScoreIncreases(
      raw.abilityScoreIncreases,
      base.abilityScoreIncreases ?? { ...EMPTY_ABILITY_SCORE_INCREASES },
    ),
    abilityScoreMethod: readAbilityScoreMethod(raw.abilityScoreMethod, base.abilityScoreMethod),
    classSkillPicks: readNullableStringArray(raw.classSkillPicks, base.classSkillPicks) as (SkillId | null)[],
    backgroundToolPicks: readNullableStringArray(raw.backgroundToolPicks, base.backgroundToolPicks) as (
      | ToolId
      | null
    )[],
    backgroundToolsTouched: readBoolean(raw.backgroundToolsTouched, base.backgroundToolsTouched),
    classToolPicks: readNullableStringArray(raw.classToolPicks, base.classToolPicks) as (ToolId | null)[],
    classToolsTouched: readBoolean(raw.classToolsTouched, base.classToolsTouched),
    proficientTools: readStringArray(raw.proficientTools, base.proficientTools) as ToolId[],
    skillConflictNotice: null,
    skills: readSkills(raw.skills, base.skills),
    weapons: readCharacterWeapons(raw.weapons, base.weapons),
    armor: readCharacterArmors(raw.armor, base.armor),
    featKey: readNullableString(raw.featKey, base.featKey),
    featTouched: readBoolean(raw.featTouched, base.featTouched),
    extraFeats: readStringArray(raw.extraFeats, base.extraFeats),
    extraFeatChoices: readFeatChoicesArray(raw.extraFeatChoices, base.extraFeatChoices),
    fightingStyleFeatKey: readNullableString(raw.fightingStyleFeatKey, base.fightingStyleFeatKey),
    fightingStyleFeatChoices: readFeatChoices(raw.fightingStyleFeatChoices, base.fightingStyleFeatChoices),
    classGrantedFeats: readClassGrantedFeats(raw.classGrantedFeats, base.classGrantedFeats),
    classGrantedFeatChoices: readClassGrantedFeatChoices(raw.classGrantedFeatChoices, base.classGrantedFeatChoices),
    featChoices: readFeatChoices(raw.featChoices, base.featChoices),
    weaponMasteryPicks: readStringArray(raw.weaponMasteryPicks, base.weaponMasteryPicks),
    weaponMasteryPicksByClass: readStringArrayRecord(
      raw.weaponMasteryPicksByClass,
      base.weaponMasteryPicksByClass,
    ),
    expertiseSkillPicks: readNullableStringArray(raw.expertiseSkillPicks, base.expertiseSkillPicks) as (
      | SkillId
      | null
    )[],
    currentHitPoints: readNullableNumber(raw.currentHitPoints, base.currentHitPoints),
    hitPointMaxBonus: Math.max(0, readNumber(raw.hitPointMaxBonus, base.hitPointMaxBonus)),
    currentHitDice: readNullableNumber(raw.currentHitDice, base.currentHitDice),
    classFeatureUses: readStringNumberRecord(raw.classFeatureUses, base.classFeatureUses),
    classFeaturePoolRemaining: readStringNumberRecord(raw.classFeaturePoolRemaining, base.classFeaturePoolRemaining),
    speciesFeatureUses: readStringNumberRecord(raw.speciesFeatureUses, base.speciesFeatureUses),
    currency: readCurrency(raw.currency, base.currency),
    ammunitionRemaining: readAmmunitionRemaining(raw.ammunitionRemaining, base.ammunitionRemaining),
    magicAmmunition: readMagicAmmunition(raw.magicAmmunition, base.magicAmmunition),
    preferredAmmoSource: readPreferredAmmoSource(raw.preferredAmmoSource, base.preferredAmmoSource),
    inventoryItems: readInventoryItems(raw.inventoryItems, base.inventoryItems),
    level: readNumber(raw.level, base.level),
    experiencePoints: readNumber(raw.experiencePoints, base.experiencePoints),
    cantripPicks: readStringArray(raw.cantripPicks, base.cantripPicks),
    spellPicks: readStringArray(raw.spellPicks, base.spellPicks),
    spellbookPicks: readStringArray(raw.spellbookPicks, base.spellbookPicks),
    spellbookExtraPicks: readStringArray(raw.spellbookExtraPicks, base.spellbookExtraPicks),
    subclassSpellbookPicks: readStringArray(raw.subclassSpellbookPicks, base.subclassSpellbookPicks),
    alwaysPreparedSpellPicks: readStringArray(
      raw.alwaysPreparedSpellPicks,
      base.alwaysPreparedSpellPicks,
    ),
    spellSlotRemaining: readNumberRecord(raw.spellSlotRemaining, base.spellSlotRemaining),
    concentrationSpellKey: readNullableString(raw.concentrationSpellKey, base.concentrationSpellKey),
    concentrationRoundsRemaining: readNullableNumber(
      raw.concentrationRoundsRemaining,
      base.concentrationRoundsRemaining,
    ),
    createdSpellSlots: readNumberRecord(raw.createdSpellSlots, base.createdSpellSlots),
    featSpellUses: readStringNumberRecord(raw.featSpellUses, base.featSpellUses),
    magicItemChargeRemaining: readStringNumberRecord(
      raw.magicItemChargeRemaining,
      base.magicItemChargeRemaining,
    ),
    equipmentRestUsesRemaining: readStringNumberRecord(
      raw.equipmentRestUsesRemaining,
      base.equipmentRestUsesRemaining,
    ),
    enspelledSpellPicks: readStringRecord(raw.enspelledSpellPicks, base.enspelledSpellPicks),
    subclassKey: readNullableString(raw.subclassKey, base.subclassKey),
    subclassSkillPicks: readNullableStringArray(raw.subclassSkillPicks, base.subclassSkillPicks) as (SkillId | null)[],
    subclassFeatureChoices: readStringRecord(raw.subclassFeatureChoices, base.subclassFeatureChoices),
    subclassFeatureOptionPicks: readNullableStringRecordArray(
      raw.subclassFeatureOptionPicks,
      base.subclassFeatureOptionPicks,
    ),
    subclassToolPicks: readToolPickRecordArray(raw.subclassToolPicks, base.subclassToolPicks),
    classFeatureSkillPicks: readNullableStringRecordArray(
      raw.classFeatureSkillPicks,
      base.classFeatureSkillPicks,
    ) as Record<string, (SkillId | null)[]>,
    classFeatureChoices: readStringRecord(raw.classFeatureChoices, base.classFeatureChoices),
    classFeatureOptionPicks: readNullableStringRecordArray(
      raw.classFeatureOptionPicks,
      base.classFeatureOptionPicks,
    ),
    classFeatureSpellPicks: readClassFeatureSpellPicks(raw.classFeatureSpellPicks, base.classFeatureSpellPicks),
    temporaryHitPointsMax: readNullableNumber(raw.temporaryHitPointsMax, base.temporaryHitPointsMax),
    temporaryHitPointsRemaining: readNullableNumber(
      raw.temporaryHitPointsRemaining,
      base.temporaryHitPointsRemaining,
    ),
    deathSaveSuccesses: readNumber(raw.deathSaveSuccesses, base.deathSaveSuccesses),
    deathSaveFailures: readNumber(raw.deathSaveFailures, base.deathSaveFailures),
    conditionKeys: readStringArray(raw.conditionKeys, base.conditionKeys),
    conditionRoundsRemaining: readStringNumberRecord(
      raw.conditionRoundsRemaining,
      base.conditionRoundsRemaining,
    ),
    exhaustionLevel: readNumber(raw.exhaustionLevel, base.exhaustionLevel),
    heroicInspiration: readNumber(raw.heroicInspiration, base.heroicInspiration),
    wildShapeKnownForms: readStringArray(raw.wildShapeKnownForms, base.wildShapeKnownForms),
    wildShapeActiveFormKey: readNullableString(raw.wildShapeActiveFormKey, base.wildShapeActiveFormKey),
    trackedCreatures: readTrackedCreatures(raw.trackedCreatures, base.trackedCreatures),
    artificerPlanKeys: readStringArray(raw.artificerPlanKeys, base.artificerPlanKeys),
    artificerCreatedItemKeys: readStringArray(raw.artificerCreatedItemKeys, base.artificerCreatedItemKeys),
    attunedMagicItemKeys: readStringArray(raw.attunedMagicItemKeys, base.attunedMagicItemKeys),
    equipmentActionKeys: readStringArray(raw.equipmentActionKeys, base.equipmentActionKeys),
    adventuringGear: readAdventuringGear(raw.adventuringGear, base.adventuringGear),
    levelPath,
    subclassByClass: readNullableStringRecord(raw.subclassByClass, base.subclassByClass),
    pactSlotRemaining: readPactSlotRemaining(raw.pactSlotRemaining, base.pactSlotRemaining),
    hitDiceRemaining: readHitDiceRemaining(raw.hitDiceRemaining, base.hitDiceRemaining),
    armorClassFormulaKey: readNullableString(raw.armorClassFormulaKey, base.armorClassFormulaKey),
    classSkillPicksByClass: readNullableStringArrayRecord(
      raw.classSkillPicksByClass,
      base.classSkillPicksByClass,
    ) as Record<string, (SkillId | null)[]>,
    classToolPicksByClass: readNullableStringArrayRecord(
      raw.classToolPicksByClass,
      base.classToolPicksByClass,
    ) as Record<string, (ToolId | null)[]>,
    cantripPicksByClass: readStringArrayRecord(raw.cantripPicksByClass, base.cantripPicksByClass),
    spellPicksByClass: readStringArrayRecord(raw.spellPicksByClass, base.spellPicksByClass),
    spellbookPicksByClass: readStringArrayRecord(raw.spellbookPicksByClass, base.spellbookPicksByClass),
    fightingStyleFeatKeyByClass: readNullableStringRecord(
      raw.fightingStyleFeatKeyByClass,
      base.fightingStyleFeatKeyByClass,
    ),
    classFeatureChoicesByClass: readStringRecordRecord(
      raw.classFeatureChoicesByClass,
      base.classFeatureChoicesByClass,
    ),
    classGrantedFeatsByClass: readClassGrantedFeatsByClass(
      raw.classGrantedFeatsByClass,
      base.classGrantedFeatsByClass,
    ),
    ...(classLevels !== undefined ? { classLevels } : {}),
  };

  const synced = syncCharacterLevelAliases(hydrated);
  const withCarriedAttuned: Character = {
    ...synced,
    adventuringGear: mergeAttunedKeysIntoAdventuringGear(synced.adventuringGear, synced.attunedMagicItemKeys),
  };
  const legacyPicks = readStringArray(raw.weaponMasteryPicks, base.weaponMasteryPicks);
  const hasPerClassPicks = isRecord(raw.weaponMasteryPicksByClass) && Object.keys(raw.weaponMasteryPicksByClass).length > 0;
  if (!hasPerClassPicks && legacyPicks.length > 0 && withCarriedAttuned.classKey) {
    return {
      ...withCarriedAttuned,
      weaponMasteryPicksByClass: { [withCarriedAttuned.classKey]: legacyPicks },
    };
  }
  return withCarriedAttuned;
}

export function parseCharacterFile(source: string): Character {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new CharacterFileParseError("invalid_json", "Invalid JSON");
  }

  if (!isRecord(parsed)) {
    throw new CharacterFileParseError("invalid_payload", "Invalid character file payload");
  }

  const format = parsed.format;
  if (format !== CHARACTER_FILE_FORMAT) {
    throw new CharacterFileParseError("unsupported_format", "Unsupported character file format");
  }

  const schemaVersion = parsed.schemaVersion;
  if (!isNumber(schemaVersion)) {
    throw new CharacterFileParseError("invalid_payload", "Invalid character file schema version");
  }
  if (schemaVersion > CHARACTER_FILE_SCHEMA_VERSION) {
    throw new CharacterFileParseError(
      "unsupported_schema_version",
      "Character file requires a newer version of this app",
    );
  }

  const characterRaw = parsed.character;
  if (!isRecord(characterRaw)) {
    throw new CharacterFileParseError("invalid_payload", "Invalid character data");
  }

  return hydrateCharacter(characterRaw);
}

export function characterFileName(character: Character): string {
  return `${character.name.trim() || "character"}.json`;
}

export function isInitialCharacter(character: Character): boolean {
  return JSON.stringify(characterForSave(character)) === JSON.stringify(characterForSave(INITIAL_CHARACTER));
}
