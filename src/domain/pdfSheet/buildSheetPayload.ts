import { ALIGNMENTS, ARMOR, CLASSES, findByKey, LANGUAGES, MAGIC_ITEMS, SPELLS, WEAPONS } from "../../data";
import { SKILLS } from "../../data/skills";
import { backgroundDisplayName } from "../background";
import { creatureSizeForCharacter } from "../carryingCapacity";
import type { DerivedStats } from "../deriveCharacter";
import { formatModifier } from "../modifiers";
import { lineageDisplayName } from "../speciesFeatures";
import { computeWeaponAttack, usesIntelligenceForMagicWeaponAttack } from "../weaponAttack";
import { classHasWeaponProficiency } from "../classFeatures/weaponMastery";
import { effectiveWeaponProficiencyGrants } from "../classFeatures/featureChoices";
import { resolveEquipmentPick } from "../equipmentPicks";
import type { Character } from "../../state/characterState";
import { allKnownLanguages, grantedLanguageKeys } from "../languageGrants";
import type { SheetPayload } from "./types";
import type { MarkdownTranslateFn } from "../markdown";
import { buildTrainingSummary, formatTrainingWeaponsLine } from "../training";
import { attunedDisplayItemName, listAttunedDisplayItems } from "../attunement";
import { effectiveLevelPath, formatClassLevelLine, resolvedClassLevels } from "../classLevels";
import { localizedVariantDisplayName, variantDisplayName } from "../genericVariantDisplay";
import type { EntityNameTranslate } from "../genericVariantDisplay";
import { findGenericVariant } from "../genericVariantMatcher";
import { bonusWeaponAmount, weaponInstanceGrantsProficiency } from "../genericVariantResolve";

const ABILITY_IDS = ["str", "dex", "con", "int", "wis", "cha"] as const;

/** EN sheet: paired columns share one AcroForm widget per row. */
const EN_HEADER_TWO_COL_PAD = 28;
const EN_HEADER_COL_SEP = "\u00A0";

function formatEnTwoColumnRow(left?: string, right?: string): string | null {
  const l = left?.trim() ?? "";
  const r = right?.trim() ?? "";
  if (!l && !r) return null;
  if (!r) return l;
  if (!l) return r;
  const gap = Math.max(1, EN_HEADER_TWO_COL_PAD - l.length);
  return `${l}${EN_HEADER_COL_SEP.repeat(gap)}${r}`;
}

type EntityNameFn = (catalog: string, key: string | null | undefined, fallback?: string) => string;

function splitAt(text: string, maxPrimary: number): [string, string] {
  const trimmed = text.trim();
  if (trimmed.length <= maxPrimary) return [trimmed, ""];
  const splitIndex = trimmed.lastIndexOf(" ", maxPrimary);
  if (splitIndex <= 0) return [trimmed.slice(0, maxPrimary), trimmed.slice(maxPrimary)];
  return [trimmed.slice(0, splitIndex), trimmed.slice(splitIndex + 1)];
}

function setText(payload: SheetPayload, slot: string, value: string | number | null | undefined) {
  if (value == null) return;
  const text = String(value).trim();
  if (!text) return;
  payload.text[slot] = text;
}

function setCheck(payload: SheetPayload, slot: string, checked: boolean) {
  if (checked) payload.checkboxes[slot] = true;
}

function formatSpeed(feet: number, t: MarkdownTranslateFn): string {
  return t("rules.speedFeet", { value: feet });
}

function catalogName(
  entityName: EntityNameFn,
  catalog: string,
  key: string,
  englishName: string,
): string {
  return entityName(catalog, key, englishName);
}

function catalogClassName(classKey: string, entityName: EntityNameFn): string {
  const classData = findByKey(CLASSES, classKey);
  return entityName("catalog.classes", classKey, classData?.name ?? classKey);
}

function classLine(
  character: Character,
  _derived: DerivedStats,
  entityName: EntityNameFn,
  t: MarkdownTranslateFn,
): string {
  const classLevels = resolvedClassLevels(effectiveLevelPath(character));
  if (classLevels.length === 0) return "";
  return formatClassLevelLine(
    classLevels,
    (classKey) => catalogClassName(classKey, entityName),
    (name, level) => t("sheet.classLevelSegment", { className: name, level }),
  );
}

function spellSaveDcLine(
  derived: DerivedStats,
  entityName: EntityNameFn,
): string | null {
  const casters = derived.perClassSpellcasting.filter((entry) => entry.summary);
  if (casters.length === 0) return null;
  if (casters.length === 1) return String(casters[0].summary!.saveDc);
  return casters
    .map(
      ({ classKey, summary }) =>
        `${catalogClassName(classKey, entityName)} ${summary!.saveDc}`,
    )
    .join(" / ");
}

function speciesLine(
  character: Character,
  derived: DerivedStats,
  entityName: EntityNameFn,
): string {
  if (!derived.speciesData) return "";
  const speciesName = entityName("catalog.species", derived.speciesData.key, derived.speciesData.name);
  const lineage = lineageDisplayName(derived.speciesData, character.speciesLineageKey);
  return lineage ? `${speciesName} (${lineage})` : speciesName;
}

function backgroundLine(
  character: Character,
  derived: DerivedStats,
  t: MarkdownTranslateFn,
  entityName: EntityNameFn,
): string {
  if (!derived.backgroundData) return "";
  return backgroundDisplayName(
    character,
    derived.backgroundData,
    t("character.customBackground"),
    entityName("catalog.backgrounds", derived.backgroundData.key, derived.backgroundData.name),
  );
}

function composeVariantGearName(
  baseName: string,
  variantKey: string | undefined,
  tEntity?: EntityNameTranslate,
): string {
  const variant = findGenericVariant(variantKey);
  if (tEntity) return localizedVariantDisplayName(baseName, variant, tEntity);
  return variantDisplayName(baseName, variant);
}

function weaponAttacks(
  character: Character,
  derived: DerivedStats,
  entityName: EntityNameFn,
  tEntity?: EntityNameTranslate,
): { name: string; bonus: string; damage: string }[] {
  const martialArtsDie = derived.classFeatureContributions.martialArtsDie ?? null;
  const weaponGrants = effectiveWeaponProficiencyGrants(
    derived.classData,
    character.level,
    character.classFeatureChoices,
    character.subclassKey,
  );
  return character.weapons
    .map((entry) => {
      const weapon = findByKey(WEAPONS, entry.key);
      if (!weapon) return null;
      const proficient =
        classHasWeaponProficiency(derived.classData, weapon, weaponGrants) ||
        weaponInstanceGrantsProficiency(entry);
      const variantBonus = bonusWeaponAmount(entry);
      const useIntelligence =
        usesIntelligenceForMagicWeaponAttack(character.classKey, character.subclassKey, character.level) &&
        Boolean(entry.variantKey);
      const attack = computeWeaponAttack(
        weapon,
        derived.abilityModifiers,
        derived.proficiencyBonus,
        variantBonus,
        proficient,
        martialArtsDie,
        variantBonus,
        useIntelligence ? "int" : undefined,
      );
      const name = composeVariantGearName(
        catalogName(entityName, "catalog.weapons", weapon.key, weapon.name),
        entry.variantKey,
        tEntity,
      );
      const qty = entry.quantity && entry.quantity > 1 ? ` (×${entry.quantity})` : "";
      return {
        name: `${name}${qty}`,
        bonus: formatModifier(attack.attackBonus),
        damage: attack.damage,
      };
    })
    .filter((row): row is { name: string; bonus: string; damage: string } => row !== null);
}

function equipmentLines(
  character: Character,
  derived: DerivedStats,
  t: MarkdownTranslateFn,
  entityName: EntityNameFn,
  tEntity?: EntityNameTranslate,
): string[] {
  const lines: string[] = [];

  for (const armorEntry of character.armor) {
    const armor = findByKey(ARMOR, armorEntry.key);
    if (!armor) continue;
    const name = composeVariantGearName(
      catalogName(entityName, "catalog.armor", armor.key, armor.name),
      armorEntry.variantKey,
      tEntity,
    );
    lines.push(armorEntry.worn ? `${name} (${t("equipment.worn")})` : name);
  }

  const carriedGearKeys = new Set<string>();
  for (const entry of character.adventuringGear) {
    carriedGearKeys.add(entry.key);
    const resolved = resolveEquipmentPick(entry.key);
    const fallbackName = resolved?.item.name ?? entry.key;
    const label =
      resolved?.kind === "homebrew"
        ? fallbackName
        : catalogName(
            entityName,
            resolved?.kind === "magic" ? "catalog.magicItems" : "catalog.adventuringGear",
            entry.key,
            fallbackName,
          );
    lines.push(entry.quantity > 1 ? `${label} ×${entry.quantity}` : label);
  }

  for (const item of character.inventoryItems) {
    const weight =
      item.weightLb > 0 ? ` (${item.weightLb} ${t("equipment.poundsAbbr")})` : "";
    lines.push(`${item.name}${weight}`);
  }

  for (const key of character.attunedMagicItemKeys) {
    if (carriedGearKeys.has(key)) continue;
    const item = findByKey(MAGIC_ITEMS, key);
    if (item) {
      lines.push(catalogName(entityName, "catalog.magicItems", item.key, item.name));
    }
  }

  if (lines.length === 0 && derived.carrying.currentLb > 0) {
    lines.push(
      t("equipment.carried") +
        `: ${derived.carrying.currentLb} ${t("equipment.poundsAbbr")}`,
    );
  }

  return lines;
}

function speciesTraitLines(derived: DerivedStats, entityName: EntityNameFn): string[] {
  const lines: string[] = [];
  for (const feature of derived.activeSpeciesFeatures) {
    if (!derived.speciesData) continue;
    lines.push(
      catalogName(
        entityName,
        "catalog.species",
        `${derived.speciesData.key}.feature.${feature.key}`,
        feature.name,
      ),
    );
  }
  return lines;
}

function classFeatureLines(derived: DerivedStats, entityName: EntityNameFn): string[] {
  const lines: string[] = [];
  for (const feature of derived.activeClassFeatures) {
    if (!derived.classData) continue;
    lines.push(
      catalogName(
        entityName,
        "catalog.classes",
        `${derived.classData.key}.feature.${feature.key}`,
        feature.name,
      ),
    );
  }
  return lines;
}

function featLines(derived: DerivedStats, entityName: EntityNameFn): string[] {
  return derived.feats.map((feat) => catalogName(entityName, "catalog.feats", feat.key, feat.name));
}

function toolProficiencyLines(character: Character, t: MarkdownTranslateFn): string[] {
  return character.proficientTools.map((toolId) => t(`rules.tool.${toolId}`)).filter(Boolean);
}

function weaponProficiencyLines(
  character: Character,
  derived: DerivedStats,
  t: MarkdownTranslateFn,
): string[] {
  const summary = buildTrainingSummary({
    classData: derived.classData,
    level: character.level,
    classFeatureChoices: character.classFeatureChoices,
    subclassKey: character.subclassKey,
    featContributions: derived.featContributions,
  });
  const line = formatTrainingWeaponsLine(summary, t);
  return line === t("rules.emDash") ? [] : [line];
}

interface SpellRow {
  level: number;
  name: string;
}

function collectSpellRows(character: Character, entityName: EntityNameFn): SpellRow[] {
  const rows: SpellRow[] = [];
  const seen = new Set<string>();

  for (const key of [
    ...character.cantripPicks,
    ...character.spellPicks,
    ...character.spellbookPicks,
    ...character.spellbookExtraPicks,
    ...character.subclassSpellbookPicks,
    ...character.alwaysPreparedSpellPicks,
  ]) {
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const spell = findByKey(SPELLS, key);
    if (!spell) continue;
    rows.push({
      level: spell.level,
      name: catalogName(entityName, "catalog.spells", spell.key, spell.name),
    });
  }

  rows.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  return rows;
}

function fillSpellSlotUsed(
  payload: SheetPayload,
  level: number,
  usedCount: number,
  maxSlots: number,
) {
  const capped = Math.min(usedCount, maxSlots);
  for (let i = 0; i < capped; i++) {
    setCheck(payload, `spellUsedL${level}_${i}`, true);
  }
}

function sizeLabel(character: Character, derived: DerivedStats, t: MarkdownTranslateFn): string {
  const size = creatureSizeForCharacter(derived.speciesData, character.speciesSize);
  return t(`character.speciesSize.${size}`);
}

export function buildSheetPayload(
  character: Character,
  derived: DerivedStats,
  t: MarkdownTranslateFn,
  entityName: EntityNameFn,
  tEntity?: EntityNameTranslate,
): SheetPayload {
  const payload: SheetPayload = { text: {}, checkboxes: {} };

  setText(payload, "characterName", character.name);
  setText(payload, "experiencePoints", character.experiencePoints || null);
  setText(payload, "level", character.level);

  setText(payload, "background", backgroundLine(character, derived, t, entityName));
  setText(payload, "species", speciesLine(character, derived, entityName));
  setText(payload, "class", classLine(character, derived, entityName, t));
  if (character.subclassKey && derived.classData) {
    setText(
      payload,
      "subclass",
      entityName(
        "catalog.classes",
        `${character.classKey}.subclass.${character.subclassKey}`,
        character.subclassKey,
      ),
    );
  }

  setText(
    payload,
    "enBackgroundClassRow",
    formatEnTwoColumnRow(payload.text.background, payload.text.class),
  );
  setText(
    payload,
    "enSpeciesSubclassRow",
    formatEnTwoColumnRow(payload.text.species, payload.text.subclass),
  );

  const initiative = formatModifier(derived.initiative);
  const walkSpeed = derived.speeds.find((s) => s.type === "walk") ?? derived.speeds[0];
  const speedText = walkSpeed ? formatSpeed(walkSpeed.feet, t) : null;
  const passivePerception = 10 + derived.skillBonuses.perception;
  const sizeText = sizeLabel(character, derived, t);

  setText(payload, "armorClass", derived.armorClass);
  setText(payload, "proficiencyBonus", formatModifier(derived.proficiencyBonus));
  setText(payload, "initiative", initiative);
  setText(payload, "speed", speedText);
  setText(payload, "size", sizeText);
  setText(payload, "passivePerception", passivePerception);

  const maxHp = derived.hitPoints;
  const currentHp = character.currentHitPoints ?? maxHp;
  setText(payload, "hpMax", maxHp);
  setText(payload, "hpCurrent", currentHp);
  setText(payload, "hpTemp", character.temporaryHitPointsRemaining || null);

  const maxHitDice = derived.classData ? character.level : null;
  const remainingHitDice = character.currentHitDice ?? maxHitDice;
  if (maxHitDice != null && remainingHitDice != null) {
    setText(payload, "hitDiceMax", maxHitDice);
    setText(payload, "hitDiceSpent", maxHitDice - remainingHitDice);
  }

  for (const id of ABILITY_IDS) {
    setText(payload, `${id}Score`, derived.abilityScores[id]);
    setText(payload, `${id}Mod`, formatModifier(derived.abilityModifiers[id]));
    setText(payload, `saveBonus_${id}`, formatModifier(derived.savingThrows[id].modifier));
    setCheck(payload, `saveProf_${id}`, derived.savingThrows[id].proficient);
  }

  for (const skill of SKILLS) {
    setText(payload, `skillBonus_${skill.id}`, formatModifier(derived.skillBonuses[skill.id]));
    const prof = character.skills[skill.id];
    setCheck(payload, `skillProf_${skill.id}`, prof === "proficient" || prof === "expert");
  }

  setCheck(payload, "inspiration", character.heroicInspiration >= 1);

  setCheck(payload, "deathSaveSuccess1", character.deathSaveSuccesses >= 1);
  setCheck(payload, "deathSaveSuccess2", character.deathSaveSuccesses >= 2);
  setCheck(payload, "deathSaveSuccess3", character.deathSaveSuccesses >= 3);
  setCheck(payload, "deathSaveFailure1", character.deathSaveFailures >= 1);
  setCheck(payload, "deathSaveFailure2", character.deathSaveFailures >= 2);
  setCheck(payload, "deathSaveFailure3", character.deathSaveFailures >= 3);

  const attacks = weaponAttacks(character, derived, entityName, tEntity);
  attacks.slice(0, 6).forEach((attack, index) => {
    const n = index + 1;
    setText(payload, `attack${n}Name`, attack.name);
    setText(payload, `attack${n}Bonus`, attack.bonus);
    setText(payload, `attack${n}Damage`, attack.damage);
  });

  const overflowAttacks = attacks.slice(6);
  const equipmentLinesList = equipmentLines(character, derived, t, entityName, tEntity);
  if (overflowAttacks.length > 0) {
    equipmentLinesList.push(
      ...overflowAttacks.map((a) => `${a.name}: ${a.bonus}, ${a.damage}`),
    );
  }
  setText(payload, "equipment", equipmentLinesList.join("\n"));

  const classFeatures = classFeatureLines(derived, entityName);
  const [classLeft, classRight] = splitAt(classFeatures.join("\n"), 900);
  setText(payload, "classFeaturesLeft", classLeft);
  setText(payload, "classFeaturesRight", classRight);

  setText(payload, "speciesTraits", speciesTraitLines(derived, entityName).join("\n"));
  setText(payload, "feats", featLines(derived, entityName).join("\n"));
  setText(payload, "weaponProficiencies", weaponProficiencyLines(character, derived, t).join("\n"));
  setText(payload, "toolProficiencies", toolProficiencyLines(character, t).join("\n"));

  if (character.backstory.trim()) {
    setText(payload, "backstory", character.backstory.trim());
  }

  if (character.alignmentKey) {
    const alignment = findByKey(ALIGNMENTS, character.alignmentKey);
    setText(
      payload,
      "alignment",
      entityName(
        "catalog.alignments",
        character.alignmentKey,
        alignment?.name ?? character.alignmentKey,
      ),
    );
  }

  if (character.languagePicks.length > 0 || grantedLanguageKeys(character).length > 0) {
    const languageLine = allKnownLanguages(character)
      .map((key) => {
        const language = findByKey(LANGUAGES, key);
        return catalogName(entityName, "catalog.languages", key, language?.name ?? key);
      })
      .join(", ");
    setText(payload, "languages", languageLine);
  }

  setText(payload, "currencyPp", character.currency.pp || null);
  setText(payload, "currencyGp", character.currency.gp || null);
  setText(payload, "currencyEp", character.currency.ep || null);
  setText(payload, "currencySp", character.currency.sp || null);
  setText(payload, "currencyCp", character.currency.cp || null);

  const attunedItems = listAttunedDisplayItems(character).map((item) =>
    attunedDisplayItemName(item, entityName, tEntity),
  );
  attunedItems.slice(0, 3).forEach((name, index) => {
    setText(payload, `attunement${index + 1}`, name);
  });

  const spellcasting = derived.spellcasting;
  if (spellcasting) {
    setText(payload, "spellAbilityMod", formatModifier(spellcasting.abilityModifier));
    setText(payload, "spellAttackBonus", formatModifier(spellcasting.attackBonus));
    setText(payload, "spellSaveDc", spellSaveDcLine(derived, entityName) ?? spellcasting.saveDc);

    for (const [levelKey, maxSlotsRaw] of Object.entries(spellcasting.slotsByLevel)) {
      const level = Number(levelKey);
      const maxSlots = Number(maxSlotsRaw);
      const remaining = character.spellSlotRemaining[level] ?? maxSlots;
      const used = Math.max(0, maxSlots - remaining);
      fillSpellSlotUsed(payload, level, used, maxSlots);
    }
  }

  const spellRows = collectSpellRows(character, entityName);
  spellRows.slice(0, 30).forEach((row, index) => {
    setText(payload, `spellRow${index}`, row.name);
  });

  return payload;
}
