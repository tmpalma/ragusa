import { BEASTS, findByKey } from "../../../data";
import { classSpellAttackBonus } from "../context";
import { registerCreatureSource } from "../registry";
import type { CreatureSourceContext, CreatureSourceRegistry, ResolvedCreatureStatBlock, SpiritType, TrackedCreatureInstance } from "../types";
import {
  characterHasOwnedSpell,
  FIND_STEED_SOURCE_KEY,
  highestSpellSlotLevel,
  paladinHasFaithfulSteed,
} from "../shared";

const STEED_TEMPLATE_KEY = "otherworldly-steed";
const SPIRIT_TYPES: SpiritType[] = ["celestial", "fey", "fiend"];

const SLAM_DAMAGE_BY_SPIRIT: Record<SpiritType, string> = {
  celestial: "radiant",
  fey: "psychic",
  fiend: "necrotic",
};

function steedSlotLevel(instance: TrackedCreatureInstance): number {
  return Math.max(2, instance.castSlotLevel ?? 2);
}

function steedStatBlock(ctx: CreatureSourceContext, instance: TrackedCreatureInstance): ResolvedCreatureStatBlock | null {
  const template = findByKey(BEASTS, STEED_TEMPLATE_KEY);
  const slot = steedSlotLevel(instance);
  const spirit = instance.spiritType ?? "celestial";
  const speeds = [...(template?.speeds ?? [{ type: "walk", feet: 60 }])];
  if (slot >= 4 && !speeds.some((entry) => entry.type === "fly")) {
    speeds.push({ type: "fly", feet: 60 });
  }

  const paladinAttack = classSpellAttackBonus(ctx, "paladin") || ctx.proficiencyBonus + ctx.abilityModifiers.cha;

  const steedAbilityBySpirit: Record<SpiritType, { useKey: string; labelKey: string }> = {
    celestial: { useKey: "healing-touch", labelKey: "companions.uses.healingTouch" },
    fey: { useKey: "fey-step", labelKey: "companions.uses.feyStep" },
    fiend: { useKey: "fell-glare", labelKey: "companions.uses.fellGlare" },
  };
  const ability = steedAbilityBySpirit[spirit];
  const useTrackers = slot >= 2 ? [{ ...ability, maxUses: 1 }] : [];

  const traits = (template?.traits ?? []).map((trait) => ({
    key: trait.key,
    name: trait.name,
    desc: trait.desc,
  }));

  return {
    displayName: template?.name,
    ac: 10 + slot,
    maxHitPoints: 5 + 10 * slot,
    abilities: template?.abilities ?? {
      str: 18,
      dex: 12,
      con: 14,
      int: 6,
      wis: 12,
      cha: 8,
    },
    speeds,
    attacks: [
      {
        name: "Otherworldly Slam",
        toHit: paladinAttack,
        damage: `1d8+${slot}`,
        damageType: SLAM_DAMAGE_BY_SPIRIT[spirit],
      },
    ],
    traits,
    notes: [],
    useTrackers,
  };
}

export function registerFindSteedSource(registry: CreatureSourceRegistry): void {
  registerCreatureSource(registry, {
    sourceKey: FIND_STEED_SOURCE_KEY,
    category: "companion",
    titleEntityType: "spells",
    titleEntityKey: "find-steed",
    isAvailable: (ctx) => paladinHasFaithfulSteed(ctx) || characterHasOwnedSpell(ctx, "find-steed"),
    defaultInstanceFields: (ctx) => {
      const range = { min: 2, max: Math.max(2, highestSpellSlotLevel(ctx.slotsByLevel)) };
      return {
        spiritType: undefined,
        castSlotLevel: range.min,
        featureUses: {},
        summoned: false,
      };
    },
    formOptions: () => [{ key: STEED_TEMPLATE_KEY }],
    spiritTypeOptions: () => SPIRIT_TYPES,
    castSlotLevelRange: () => null,
    resolveStatBlock: steedStatBlock,
    initialFeatureUses: (ctx) => {
      const instance: TrackedCreatureInstance = {
        id: FIND_STEED_SOURCE_KEY,
        sourceKey: FIND_STEED_SOURCE_KEY,
        category: "companion",
        formKey: STEED_TEMPLATE_KEY,
        castSlotLevel: 2,
        currentHitPoints: null,
        temporaryHitPointsMax: null,
        temporaryHitPointsRemaining: null,
        featureUses: {},
      };
      const block = steedStatBlock(ctx, instance);
      if (!block) return {};
      return Object.fromEntries(block.useTrackers.map((tracker) => [tracker.useKey, tracker.maxUses]));
    },
    restPolicy: { shortRest: "none", longRest: "restoreHpAndUses" },
    supportsDismiss: false,
    summonSpellKey: "find-steed",
  });
}