/**
 * Developer-only: read the local 5etools dump and write committed adapters.
 * Do not call from fetch:data, the app, or CI.
 *
 *   npx tsx scripts/extract-srd-items.ts
 */
import { readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { GenericVariantData, GenericVariantEffect, GenericVariantExclude, GenericVariantRequire } from "../src/data/types.js";
import {
  copperToItemCost,
  flattenFiveToolsEntries,
  parseBonusAmount,
  slugifyItemName,
  typeAbbreviation,
} from "./lib/fiveToolsText.js";

const DUMP = path.join(os.homedir(), "Downloads", "5etools-v2.35.0", "data");
const ADAPTERS = path.join(import.meta.dirname, "adapters");

const MAGIC_RARITIES = new Set(["common", "uncommon"]);
const GEAR_TYPES = new Set(["G", "AT", "INS", "T", "GS", "FD", "SCF", "TAH"]);
const BRACERS_ARCHERY_WEAPONS = ["longbow", "shortbow"];

interface RawItem {
  name: string;
  source?: string;
  srd52?: boolean;
  rarity?: string;
  type?: string;
  wondrous?: boolean;
  staff?: boolean;
  reqAttune?: boolean | string;
  weight?: number;
  value?: number;
  entries?: unknown;
  additionalEntries?: unknown;
  bonusAc?: unknown;
  bonusSavingThrow?: unknown;
  bonusSpellAttack?: unknown;
  bonusSpellSaveDc?: unknown;
  bonusAbilityCheck?: unknown;
  bonusWeaponDamage?: unknown;
  ability?: { static?: Record<string, number> };
  modifySpeed?: { static?: { walk?: number } };
}

type MagicItemEffect =
  | { type: "ac_bonus"; amount: number }
  | { type: "save_bonus"; amount: number }
  | { type: "spell_attack_bonus"; amount: number }
  | { type: "spell_save_dc_bonus"; amount: number }
  | { type: "ability_check_bonus"; amount: number }
  | { type: "set_ability_score"; ability: string; score: number }
  | { type: "walk_speed_floor"; feet: number }
  | { type: "weapon_damage_bonus"; amount: number; weaponKeys: string[] };

function magicCategory(item: RawItem): string {
  const abbr = typeAbbreviation(item.type);
  if (item.staff || abbr === "M" || abbr === "R") return "weapon";
  if (abbr === "S" || abbr === "LA" || abbr === "MA" || abbr === "HA") return "armor";
  if (abbr === "WD") return "wand";
  if (abbr === "RG") return "ring";
  if (abbr === "RD") return "rod";
  if (abbr === "P") return "potion";
  if (abbr === "SC") return "scroll";
  if (item.wondrous) return "wondrous";
  return "other";
}

function gearCategory(abbr: string): string {
  switch (abbr) {
    case "G":
      return "adventuring-gear";
    case "AT":
      return "artisans-tools";
    case "INS":
      return "instrument";
    case "T":
      return "tool";
    case "GS":
      return "gaming-set";
    case "FD":
      return "food-and-drink";
    case "SCF":
      return "spellcasting-focus";
    case "TAH":
      return "tack-and-harness";
    default:
      return "other";
  }
}

function effectsFor(item: RawItem): MagicItemEffect[] {
  const effects: MagicItemEffect[] = [];
  const ac = parseBonusAmount(item.bonusAc);
  if (ac != null) effects.push({ type: "ac_bonus", amount: ac });
  const save = parseBonusAmount(item.bonusSavingThrow);
  if (save != null) effects.push({ type: "save_bonus", amount: save });
  const spellAtk = parseBonusAmount(item.bonusSpellAttack);
  if (spellAtk != null) effects.push({ type: "spell_attack_bonus", amount: spellAtk });
  const spellDc = parseBonusAmount(item.bonusSpellSaveDc);
  if (spellDc != null) effects.push({ type: "spell_save_dc_bonus", amount: spellDc });
  const check = parseBonusAmount(item.bonusAbilityCheck);
  if (check != null) effects.push({ type: "ability_check_bonus", amount: check });
  const staticAbility = item.ability?.static;
  if (staticAbility) {
    for (const [ability, score] of Object.entries(staticAbility)) {
      if (typeof score === "number") effects.push({ type: "set_ability_score", ability, score });
    }
  }
  const walk = item.modifySpeed?.static?.walk;
  if (typeof walk === "number") effects.push({ type: "walk_speed_floor", feet: walk });
  const weaponDamage = parseBonusAmount(item.bonusWeaponDamage);
  if (weaponDamage != null && item.name === "Bracers of Archery") {
    effects.push({ type: "weapon_damage_bonus", amount: weaponDamage, weaponKeys: BRACERS_ARCHERY_WEAPONS });
  }
  return effects;
}

async function writeJson(filename: string, data: unknown) {
  const target = path.join(ADAPTERS, filename);
  await writeFile(target, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`[write] scripts/adapters/${filename} (${Array.isArray(data) ? data.length : "?"} entries)`);
}

async function main() {
  const itemsJson = JSON.parse(await readFile(path.join(DUMP, "items.json"), "utf8")) as { item: RawItem[] };
  const baseJson = JSON.parse(await readFile(path.join(DUMP, "items-base.json"), "utf8")) as { baseitem: RawItem[] };

  const magicItems = itemsJson.item
    .filter(
      (item) =>
        item.source === "XDMG" &&
        MAGIC_RARITIES.has(String(item.rarity ?? "").toLowerCase()),
    )
    .map((item) => {
      const req = item.reqAttune;
      const requiresAttunement = Boolean(req);
      return {
        key: slugifyItemName(item.name),
        name: item.name,
        rarity: String(item.rarity).toLowerCase(),
        category: magicCategory(item),
        requiresAttunement,
        attuneNote: typeof req === "string" ? req : undefined,
        weightLb: typeof item.weight === "number" ? item.weight : 0,
        desc: flattenFiveToolsEntries(item.entries),
        effects: effectsFor(item),
        srd: Boolean(item.srd52),
        book: "XDMG",
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const gearByKey = new Map<string, Record<string, unknown>>();

  function addGear(item: RawItem, book: string) {
    const abbr = typeAbbreviation(item.type);
    if (!GEAR_TYPES.has(abbr)) return;
    if (item.source !== "XPHB" || !item.srd52) return;
    const key = slugifyItemName(item.name);
    if (gearByKey.has(key)) return;
    const desc = flattenFiveToolsEntries(item.entries ?? item.additionalEntries);
    gearByKey.set(key, {
      key,
      name: item.name,
      category: gearCategory(abbr),
      weightLb: typeof item.weight === "number" ? item.weight : 0,
      cost: copperToItemCost(item.value),
      desc,
      srd: true,
      book,
    });
  }

  for (const item of itemsJson.item) addGear(item, "XPHB");
  for (const item of baseJson.baseitem) addGear(item, "XPHB");

  const adventuringGear = [...gearByKey.values()].sort((a, b) =>
    String(a.name).localeCompare(String(b.name)),
  );

  await writeJson("magicItems.json", magicItems);
  await writeJson("adventuringGear.json", adventuringGear);
  await writeJson("genericVariants.json", await extractGenericVariants());
}

const AMMO_ONLY_TYPES = new Set(["A", "AF"]);
const ARMOR_REQUIRE_TYPES = new Set(["LA", "MA", "HA", "S"]);
const WEAPON_REQUIRE_TYPES = new Set(["M", "R", "A", "AF"]);
const VARIANT_SOURCES = new Set(["XDMG", "EFA"]);

const HAND_MAPPED_VARIANT_EFFECTS: Record<string, GenericVariantEffect[]> = {
  "repeating-shot": [{ type: "ignoreLoading" }, { type: "ignoreAmmoConsumption" }],
  "returning-weapon": [{ type: "returningThrown" }],
  "mithral-armor": [{ type: "ignoreStrengthRequirement" }, { type: "ignoreStealthDisadvantage" }],
  "elven-chain": [{ type: "grantsProficiency" }],
};

interface RawMagicVariant {
  name: string;
  type?: string;
  requires?: Record<string, unknown>[];
  excludes?: Record<string, unknown>;
  inherits?: Record<string, unknown> & {
    source?: string;
    srd52?: boolean;
    rarity?: string;
    entries?: unknown;
    namePrefix?: string;
    nameSuffix?: string;
    reqAttune?: boolean | string;
    bonusWeapon?: unknown;
    bonusAc?: unknown;
    grantsProficiency?: unknown;
    charges?: unknown;
    recharge?: unknown;
  };
}

function cleanVariantName(name: string): string {
  return name.replace(/\s*\(\*\)\s*$/, "").trim();
}

function asStringList(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === "string");
  return [];
}

function mapRequireTypes(value: unknown): string | string[] | undefined {
  const mapped = asStringList(value).map((entry) => typeAbbreviation(entry)).filter(Boolean);
  if (mapped.length === 0) return undefined;
  return mapped.length === 1 ? mapped[0] : mapped;
}

function mapRequireProperties(value: unknown): string | string[] | undefined {
  const mapped = asStringList(value).map((entry) => typeAbbreviation(entry)).filter(Boolean);
  if (mapped.length === 0) return undefined;
  return mapped.length === 1 ? mapped[0] : mapped;
}

function isAmmunitionOnlyRequires(requires: Record<string, unknown>[] | undefined): boolean {
  if (!requires?.length) return false;
  return requires.every((clause) => {
    const keys = Object.keys(clause);
    if (keys.length !== 1 || keys[0] !== "type") return false;
    return AMMO_ONLY_TYPES.has(typeAbbreviation(clause.type));
  });
}

function resolveInheritPlaceholders(entries: unknown, inherits: Record<string, unknown>): unknown {
  if (typeof entries === "string") {
    return entries.replace(/\{=([a-zA-Z0-9]+)\}/g, (_full, key: string) => {
      const value = inherits[key];
      return value == null ? "" : String(value);
    });
  }
  if (Array.isArray(entries)) return entries.map((entry) => resolveInheritPlaceholders(entry, inherits));
  if (entries && typeof entries === "object") {
    const node = entries as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
      next[key] = resolveInheritPlaceholders(value, inherits);
    }
    return next;
  }
  return entries;
}

function mapRequireClause(raw: Record<string, unknown>): GenericVariantRequire {
  const clause: GenericVariantRequire = {};
  if (raw.weapon === true) clause.weapon = true;
  if (typeof raw.weaponCategory === "string") clause.weaponCategory = raw.weaponCategory;
  const type = mapRequireTypes(raw.type);
  if (type) clause.type = type;
  const property = mapRequireProperties(raw.property);
  if (property) clause.property = property;
  if (typeof raw.name === "string") clause.name = raw.name;
  if (typeof raw.source === "string") clause.source = raw.source;
  if (raw.sword === true) clause.sword = true;
  return clause;
}

function mapExcludes(raw: Record<string, unknown> | undefined): GenericVariantExclude | undefined {
  if (!raw) return undefined;
  const names = asStringList(raw.name);
  if (names.length === 0) return undefined;
  return { name: names.length === 1 ? names[0] : names };
}

function inferAppliesTo(
  rawRequires: Record<string, unknown>[] | undefined,
  requires: GenericVariantRequire[],
  weaponKeys: Set<string>,
  armorKeys: Set<string>,
): "weapon" | "armor" | "ammunition" {
  if (isAmmunitionOnlyRequires(rawRequires)) return "ammunition";
  let weaponScore = 0;
  let armorScore = 0;
  for (const clause of requires) {
    if (clause.weapon || clause.weaponCategory || clause.sword) weaponScore += 1;
    for (const type of asStringList(clause.type)) {
      if (WEAPON_REQUIRE_TYPES.has(type)) weaponScore += 1;
      if (ARMOR_REQUIRE_TYPES.has(type)) armorScore += 1;
    }
    if (clause.name) {
      const key = slugifyItemName(clause.name);
      if (weaponKeys.has(key)) weaponScore += 1;
      if (armorKeys.has(key)) armorScore += 1;
    }
  }
  return armorScore > weaponScore ? "armor" : "weapon";
}

function effectsForVariant(key: string, inherits: NonNullable<RawMagicVariant["inherits"]>): GenericVariantEffect[] {
  const effects: GenericVariantEffect[] = [];
  const seen = new Set<string>();
  const push = (effect: GenericVariantEffect) => {
    const id = JSON.stringify(effect);
    if (seen.has(id)) return;
    seen.add(id);
    effects.push(effect);
  };

  const bonusWeapon = parseBonusAmount(inherits.bonusWeapon);
  if (bonusWeapon != null) push({ type: "bonusWeapon", amount: bonusWeapon });
  const bonusAc = parseBonusAmount(inherits.bonusAc);
  if (bonusAc != null) push({ type: "bonusAc", amount: bonusAc });
  if (inherits.grantsProficiency === true) push({ type: "grantsProficiency" });
  if (typeof inherits.charges === "number" && Number.isFinite(inherits.charges) && inherits.recharge === "dawn") {
    push({ type: "charges", amount: inherits.charges, recharge: "dawn" });
  }
  for (const extra of HAND_MAPPED_VARIANT_EFFECTS[key] ?? []) push(extra);
  return effects;
}

async function extractGenericVariants(): Promise<GenericVariantData[]> {
  const variantsJson = JSON.parse(await readFile(path.join(DUMP, "magicvariants.json"), "utf8")) as {
    magicvariant: RawMagicVariant[];
  };
  const weaponsJson = JSON.parse(
    await readFile(path.join(import.meta.dirname, "..", "catalog-source", "generated", "weapons.json"), "utf8"),
  ) as { key: string }[];
  const armorJson = JSON.parse(
    await readFile(path.join(import.meta.dirname, "..", "catalog-source", "generated", "armor.json"), "utf8"),
  ) as { key: string }[];
  const weaponKeys = new Set(weaponsJson.map((row) => row.key));
  const armorKeys = new Set(armorJson.map((row) => row.key));

  const variants: GenericVariantData[] = [];
  for (const raw of variantsJson.magicvariant) {
    if (raw.type !== "GV|XDMG") continue;
    const inherits = raw.inherits ?? {};
    const book = inherits.source;
    if (!book || !VARIANT_SOURCES.has(book)) continue;

    const name = cleanVariantName(raw.name);
    const key = slugifyItemName(name);
    const requires = (raw.requires ?? []).map(mapRequireClause);
    const rarity = String(inherits.rarity ?? "").toLowerCase();
    const req = inherits.reqAttune;
    const row: GenericVariantData = {
      key,
      name,
      rarity: rarity as GenericVariantData["rarity"],
      requiresAttunement: Boolean(req),
      appliesTo: inferAppliesTo(raw.requires, requires, weaponKeys, armorKeys),
      requires,
      desc: flattenFiveToolsEntries(resolveInheritPlaceholders(inherits.entries, inherits)),
      effects: effectsForVariant(key, inherits),
      srd: Boolean(inherits.srd52),
      book,
    };
    if (typeof req === "string") row.attuneNote = req;
    if (inherits.namePrefix) row.namePrefix = inherits.namePrefix;
    if (inherits.nameSuffix) row.nameSuffix = inherits.nameSuffix;
    const excludes = mapExcludes(raw.excludes);
    if (excludes) row.excludes = excludes;
    variants.push(row);
  }

  return variants.sort((a, b) => a.name.localeCompare(b.name));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
