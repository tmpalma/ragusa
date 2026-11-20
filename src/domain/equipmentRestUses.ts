import { GENERIC_VARIANTS, MAGIC_ITEMS, findByKey } from "../data";

export type EquipmentRestRecovery = "long" | "short";

export interface EquipmentRestUsePool {
  maxUses: number;
  recovery: EquipmentRestRecovery;
  id: string;
  heading?: string;
}

const WORD_TO_NUM: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

function parseCountToken(token: string): number | null {
  const lower = token.toLowerCase();
  if (/^\d+$/.test(lower)) {
    const n = Number(lower);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return WORD_TO_NUM[lower] ?? null;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeApostrophe(text: string): string {
  return text.replace(/\u2019/g, "'");
}

/** Matches catalog “can't”, “can’t”, and “cannot” after apostrophe normalization. */
const CANT = String.raw`can(?:'|’|')t|cannot|can not`;

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function parseHeading(block: string): string | undefined {
  const match = block.match(/^\*\*([^*]+)\*\*\.?\s*/);
  if (!match) return undefined;
  return match[1].trim().replace(/\.$/, "");
}

function recoveryFromText(text: string): EquipmentRestRecovery | null {
  if (/finish a Short Rest/i.test(text)) return "short";
  if (/until the next dawn|daily at dawn|recharge daily at dawn|regains all/i.test(text)) return "long";
  if (/finish a Long Rest|finish a long rest/i.test(text)) return "long";
  return null;
}

function sentenceSkipped(sentence: string, blockText?: string): boolean {
  if (/\d+\s+days|seven days|next sunset|for 1 hour|10 minutes|cracks and becomes useless/i.test(sentence)) {
    return true;
  }
  if (
    /ceases to function until/i.test(sentence) &&
    blockText != null &&
    /\b(?:can be used|can do so|can create \w+|fuzzy objects)\s+(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+times\b/i.test(
      blockText,
    )
  ) {
    return true;
  }
  if (/\bthat spell\b|\bthat bead\b|\bthat effect\b|\bthat property\b|\bproduce that effect\b|\bcast that spell\b/i.test(sentence)) {
    return true;
  }
  if (/\bregains?\s+\d+d\d+/i.test(sentence) && !new RegExp(`${CANT}|ceases to function`, "i").test(sentence)) {
    return true;
  }
  return false;
}

function poolIdForSentence(sentence: string, heading: string | undefined, index: number): { id: string; heading?: string } {
  if (heading) {
    return { id: slugify(heading), heading };
  }
  const spellMatch = sentence.match(/\bcast (?:the spell )?([A-Z][A-Za-z' ]+)/);
  if (spellMatch) {
    const name = spellMatch[1].trim().replace(/\.$/, "");
    if (name.length > 2 && !/^this spell$/i.test(name)) {
      return { id: slugify(name), heading: name };
    }
  }
  return { id: index === 0 ? "default" : `use-${index + 1}` };
}

function maxUsesFromSentence(sentence: string, blockText: string): number | null {
  const fuzzy = sentence.match(/\bonce\s+(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+fuzzy objects have been pulled/i);
  if (fuzzy) return parseCountToken(fuzzy[1]);

  const timesUse = sentence.match(
    /\b(?:can be used|can do so|property can be used|can create \w+)\s+(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+times\b/i,
  );
  if (timesUse) {
    const count = parseCountToken(timesUse[1]);
    if (count != null && recoveryFromText(blockText)) return count;
  }

  const stew = sentence.match(/\bcan create stew\s+(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+times\b/i);
  if (stew) {
    const count = parseCountToken(stew[1]);
    if (count != null && recoveryFromText(blockText)) return count;
  }

  const hasRestLimit =
    new RegExp(`${CANT}(?: be used| use| cast| be invoked| heal| do so)?|ceases to function`, "i").test(
      sentence,
    );
  if (hasRestLimit) {
    const recovery = recoveryFromText(sentence);
    if (recovery) return 1;
  }

  return null;
}

/** Parses fixed rest-limited use pools from English catalog item descriptions. */
export function equipmentRestUsePools(desc: string): EquipmentRestUsePool[] {
  const normalized = normalizeApostrophe(desc);
  const blocks = normalized.split(/\n\n+/);
  const pools: EquipmentRestUsePool[] = [];
  const seenIds = new Set<string>();

  for (const block of blocks) {
    const heading = parseHeading(block);
    const blockText = block.replace(/^\*\*[^*]+\*\*\.?\s*/, "");
    const sentences = splitSentences(blockText);
    const blockRecovery = recoveryFromText(blockText);

    sentences.forEach((sentence, sentenceIndex) => {
      if (sentenceSkipped(sentence, blockText)) return;

      const windowText = [sentence, sentences[sentenceIndex + 1] ?? ""].join(" ");
      const maxUses = maxUsesFromSentence(sentence, `${blockText} ${windowText}`);
      if (maxUses == null) return;

      const recovery =
        recoveryFromText(sentence) ??
        recoveryFromText(windowText) ??
        (/\b(?:can be used|can do so|fuzzy objects)\b/i.test(sentence) ? blockRecovery : null);
      if (!recovery) return;

      const { id, heading: poolHeading } = poolIdForSentence(sentence, heading, pools.length);
      if (seenIds.has(id)) return;
      seenIds.add(id);

      pools.push({
        maxUses,
        recovery,
        id,
        heading: poolHeading ?? heading,
      });
    });
  }

  return pools;
}

export function equipmentRestUsePoolsForMagicItem(catalogKey: string): EquipmentRestUsePool[] {
  const item = findByKey(MAGIC_ITEMS, catalogKey);
  if (!item) return [];
  return equipmentRestUsePools(item.desc);
}

export function equipmentRestUsePoolsForVariant(variantKey: string): EquipmentRestUsePool[] {
  const variant = findByKey(GENERIC_VARIANTS, variantKey);
  if (!variant) return [];
  return equipmentRestUsePools(variant.desc);
}

export function gearRestUsesStorageKey(catalogKey: string, poolId: string): string {
  return poolId === "default" ? `gear:${catalogKey}` : `gear:${catalogKey}:${poolId}`;
}

export function armoryRestUsesStorageKey(instanceId: string, poolId: string): string {
  return poolId === "default" ? `armory:${instanceId}` : `armory:${instanceId}:${poolId}`;
}

export function currentEquipmentRestUses(
  remaining: Record<string, number>,
  storageKey: string,
  max: number,
): number {
  const stored = remaining[storageKey];
  if (stored == null) return max;
  return Math.min(max, Math.max(0, Math.round(stored)));
}

export function removeEquipmentRestUsesWithPrefix(
  remaining: Record<string, number>,
  prefix: string,
): Record<string, number> {
  let changed = false;
  const next: Record<string, number> = {};
  for (const [key, value] of Object.entries(remaining)) {
    if (key === prefix || key.startsWith(`${prefix}:`)) {
      changed = true;
      continue;
    }
    next[key] = value;
  }
  return changed ? next : remaining;
}

export function removeGearEquipmentRestUses(
  remaining: Record<string, number>,
  catalogKey: string,
): Record<string, number> {
  return removeEquipmentRestUsesWithPrefix(remaining, `gear:${catalogKey}`);
}

export function removeArmoryEquipmentRestUses(
  remaining: Record<string, number>,
  instanceId: string,
): Record<string, number> {
  return removeEquipmentRestUsesWithPrefix(remaining, `armory:${instanceId}`);
}

/** Recovery period for a stored key, derived from gear the character still carries or armory they own. */
export function recoveryForEquipmentRestStorageKey(
  character: {
    adventuringGear: readonly { key: string }[];
    weapons: readonly { id: string; variantKey?: string }[];
    armor: readonly { id: string; variantKey?: string }[];
  },
  storageKey: string,
): EquipmentRestRecovery | null {
  if (storageKey.startsWith("gear:")) {
    const rest = storageKey.slice("gear:".length);
    const colon = rest.indexOf(":");
    const catalogKey = colon >= 0 ? rest.slice(0, colon) : rest;
    const poolId = colon >= 0 ? rest.slice(colon + 1) : "default";
    if (!character.adventuringGear.some((entry) => entry.key === catalogKey)) return null;
    const pool = equipmentRestUsePoolsForMagicItem(catalogKey).find((entry) => entry.id === poolId);
    return pool?.recovery ?? null;
  }

  if (storageKey.startsWith("armory:")) {
    const rest = storageKey.slice("armory:".length);
    const colon = rest.indexOf(":");
    const instanceId = colon >= 0 ? rest.slice(0, colon) : rest;
    const poolId = colon >= 0 ? rest.slice(colon + 1) : "default";
    const piece =
      character.weapons.find((entry) => entry.id === instanceId) ??
      character.armor.find((entry) => entry.id === instanceId);
    if (!piece?.variantKey) return null;
    const pool = equipmentRestUsePoolsForVariant(piece.variantKey).find((entry) => entry.id === poolId);
    return pool?.recovery ?? null;
  }

  return null;
}

export function maxUsesForEquipmentRestStorageKey(
  character: {
    adventuringGear: readonly { key: string }[];
    weapons: readonly { id: string; variantKey?: string }[];
    armor: readonly { id: string; variantKey?: string }[];
  },
  storageKey: string,
): number | null {
  if (storageKey.startsWith("gear:")) {
    const rest = storageKey.slice("gear:".length);
    const colon = rest.indexOf(":");
    const catalogKey = colon >= 0 ? rest.slice(0, colon) : rest;
    const poolId = colon >= 0 ? rest.slice(colon + 1) : "default";
    const pool = equipmentRestUsePoolsForMagicItem(catalogKey).find((entry) => entry.id === poolId);
    return pool?.maxUses ?? null;
  }
  if (storageKey.startsWith("armory:")) {
    const rest = storageKey.slice("armory:".length);
    const colon = rest.indexOf(":");
    const instanceId = colon >= 0 ? rest.slice(0, colon) : rest;
    const poolId = colon >= 0 ? rest.slice(colon + 1) : "default";
    const piece =
      character.weapons.find((entry) => entry.id === instanceId) ??
      character.armor.find((entry) => entry.id === instanceId);
    if (!piece?.variantKey) return null;
    const pool = equipmentRestUsePoolsForVariant(piece.variantKey).find((entry) => entry.id === poolId);
    return pool?.maxUses ?? null;
  }
  return null;
}

export function restoreEquipmentRestUsesOnShortRest(
  character: {
    adventuringGear: readonly { key: string }[];
    weapons: readonly { id: string; variantKey?: string }[];
    armor: readonly { id: string; variantKey?: string }[];
    equipmentRestUsesRemaining: Record<string, number>;
  },
): Record<string, number> {
  const { equipmentRestUsesRemaining: uses } = character;
  if (Object.keys(uses).length === 0) return uses;

  let next = uses;
  let changed = false;
  for (const key of Object.keys(uses)) {
    const recovery = recoveryForEquipmentRestStorageKey(character, key);
    if (recovery !== "short") continue;
    if (!changed) {
      next = { ...uses };
      changed = true;
    }
    const { [key]: _removed, ...rest } = next;
    next = rest;
  }
  return changed ? next : uses;
}
