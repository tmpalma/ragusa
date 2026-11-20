import { BEASTS, findByKey } from "../../../data";
import { classSpellAttackBonus } from "../context";
import { registerCreatureSource } from "../registry";
import type { CreatureSourceContext, CreatureSourceRegistry, ResolvedCreatureStatBlock, TrackedCreatureInstance } from "../types";
import { classLevelFor, PRIMAL_COMPANION_SOURCE_KEY, rangerPrimalCompanion } from "../shared";

const FORM_KEYS = ["beast-of-the-land", "beast-of-the-sea", "beast-of-the-sky"] as const;

function rangerLevel(ctx: CreatureSourceContext): number {
  return classLevelFor(ctx, "ranger");
}

function primalHp(ctx: CreatureSourceContext, formKey: string | null): number {
  const level = rangerLevel(ctx);
  if (formKey === "beast-of-the-sky") return 4 + 4 * level;
  return 5 + 5 * level;
}

function scaledAttacks(
  ctx: CreatureSourceContext,
  templateAttacks: ResolvedCreatureStatBlock["attacks"],
): ResolvedCreatureStatBlock["attacks"] {
  const attackBonus = classSpellAttackBonus(ctx, "ranger");
  return templateAttacks.map((attack) => ({
    ...attack,
    toHit: attackBonus,
  }));
}

function primalStatBlock(ctx: CreatureSourceContext, instance: TrackedCreatureInstance): ResolvedCreatureStatBlock | null {
  const formKey = instance.formKey;
  if (!formKey) return null;
  const template = findByKey(BEASTS, formKey);
  if (!template) return null;
  const wis = ctx.abilityModifiers.wis;

  return {
    displayName: template.name,
    ac: 13 + wis,
    maxHitPoints: primalHp(ctx, formKey),
    abilities: template.abilities,
    speeds: template.speeds,
    attacks: scaledAttacks(ctx, template.attacks),
    traits: (template.traits ?? []).map((trait) => ({ key: trait.key, name: trait.name, desc: trait.desc })),
    notes: [],
    useTrackers: [],
  };
}

export function registerPrimalCompanionSource(registry: CreatureSourceRegistry): void {
  registerCreatureSource(registry, {
    sourceKey: PRIMAL_COMPANION_SOURCE_KEY,
    category: "companion",
    titleEntityType: "classes",
    titleEntityKey: "ranger",
    titleField: "subclass.beast-master.feature.primal-companion.name",
    isAvailable: rangerPrimalCompanion,
    defaultInstanceFields: () => ({
      formKey: null,
      featureUses: {},
      summoned: false,
    }),
    formOptions: () => FORM_KEYS.map((key) => ({ key })),
    spiritTypeOptions: () => null,
    castSlotLevelRange: () => null,
    resolveStatBlock: primalStatBlock,
    initialFeatureUses: () => ({}),
    restPolicy: { shortRest: "none", longRest: "restoreHpAndUses" },
    supportsDismiss: false,
  });
}