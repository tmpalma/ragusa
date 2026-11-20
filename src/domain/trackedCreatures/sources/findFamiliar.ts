import { BEASTS, findByKey } from "../../../data";
import type { BeastFormData } from "../../../data/types";
import { parseChallengeRating } from "../../wildShape";
import { registerCreatureSource } from "../registry";
import type { CreatureSourceContext, CreatureSourceRegistry, ResolvedCreatureStatBlock, SpiritType, TrackedCreatureInstance } from "../types";
import {
  characterHasFeat,
  characterHasOwnedSpell,
  druidHasWildCompanion,
  FIND_FAMILIAR_SOURCE_KEY,
  warlockHasPactOfTheChain,
} from "../shared";

const CHAIN_FORM_KEYS = [
  "imp",
  "pseudodragon",
  "quasit",
  "skeleton",
  "slaad-tadpole",
  "sphinx-of-wonder",
  "sprite",
  "venomous-snake",
] as const;

const BATTLE_FAMILIAR_FORM_KEYS = [
  "battle-familiar-brute",
  "battle-familiar-flyer",
  "battle-familiar-stalker",
] as const;

const SPIRIT_TYPES: SpiritType[] = ["celestial", "fey", "fiend"];

function usesBattleFamiliar(ctx: CreatureSourceContext): boolean {
  return characterHasFeat(ctx, "warlike-familiar") && characterHasOwnedSpell(ctx, "battle-familiar");
}

function familiarFormOptions(ctx: CreatureSourceContext): { key: string }[] {
  if (usesBattleFamiliar(ctx)) {
    return BATTLE_FAMILIAR_FORM_KEYS.map((key) => ({ key }));
  }
  const chain = warlockHasPactOfTheChain(ctx.character);
  const crZero = BEASTS.filter(
    (beast) => beast.cr === "0" && parseChallengeRating(beast.cr) === 0 && beast.wildShape !== false,
  ).map((beast) => ({ key: beast.key }));
  if (!chain) return crZero;
  const chainOnly = CHAIN_FORM_KEYS.filter((key) => findByKey(BEASTS, key)).map((key) => ({ key }));
  const seen = new Set<string>();
  return [...crZero, ...chainOnly].filter((entry) => {
    if (seen.has(entry.key)) return false;
    seen.add(entry.key);
    return true;
  });
}

function familiarMaxHp(ctx: CreatureSourceContext, baseMax: number): number {
  if (!characterHasFeat(ctx, "familiar-friend")) return baseMax;
  return baseMax + 2 * ctx.character.level;
}

function resolveBeastForm(formKey: string | null): BeastFormData | null {
  if (!formKey) return null;
  return findByKey(BEASTS, formKey);
}

function buildFamiliarStatBlock(
  ctx: CreatureSourceContext,
  instance: TrackedCreatureInstance,
): ResolvedCreatureStatBlock | null {
  const beast = resolveBeastForm(instance.formKey);
  if (!beast) return null;

  const notes: string[] = ["companions.cannotAttack"];
  if (warlockHasPactOfTheChain(ctx.character)) notes.push("companions.chainAttack");

  const templateHp = beast.hitPoints ?? Math.max(1, beast.abilities.con);
  return {
    displayName: beast.name,
    ac: beast.ac,
    maxHitPoints: familiarMaxHp(ctx, templateHp),
    abilities: beast.abilities,
    speeds: beast.speeds,
    attacks: beast.attacks,
    traits: (beast.traits ?? []).map((trait) => ({ name: trait.name, desc: trait.desc })),
    notes,
    useTrackers: [],
  };
}

export function registerFindFamiliarSource(registry: CreatureSourceRegistry): void {
  registerCreatureSource(registry, {
    sourceKey: FIND_FAMILIAR_SOURCE_KEY,
    category: "companion",
    titleEntityType: "spells",
    titleEntityKey: "find-familiar",
    isAvailable: (ctx) =>
      characterHasOwnedSpell(ctx, "find-familiar") || druidHasWildCompanion(ctx),
    defaultInstanceFields: () => ({
      formKey: null,
      featureUses: {},
      summoned: false,
    }),
    formOptions: familiarFormOptions,
    spiritTypeOptions: () => SPIRIT_TYPES,
    castSlotLevelRange: () => null,
    resolveStatBlock: buildFamiliarStatBlock,
    initialFeatureUses: () => ({}),
    restPolicy: { shortRest: "none", longRest: "restoreHpAndUses" },
    supportsDismiss: true,
    summonSpellKey: "find-familiar",
  });
}