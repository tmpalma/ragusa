import { BEASTS, findByKey } from "../../../data";
import { classSpellAttackBonus } from "../context";
import { registerCreatureSource } from "../registry";
import type { CreatureSourceContext, CreatureSourceRegistry, ResolvedCreatureStatBlock, TrackedCreatureInstance } from "../types";
import { artificerSteelDefender, classLevelFor, STEEL_DEFENDER_SOURCE_KEY } from "../shared";

const TEMPLATE_KEY = "steel-defender";
const REPAIR_USES = 3;

function artificerLevel(ctx: CreatureSourceContext): number {
  return classLevelFor(ctx, "artificer");
}

function defenderStatBlock(ctx: CreatureSourceContext, _instance: TrackedCreatureInstance): ResolvedCreatureStatBlock | null {
  const template = findByKey(BEASTS, TEMPLATE_KEY);
  if (!template) return null;
  const int = ctx.abilityModifiers.int;
  const level = artificerLevel(ctx);
  const attackBonus = classSpellAttackBonus(ctx, "artificer");

  const attacks = template.attacks.map((attack) => ({
    ...attack,
    toHit: attackBonus,
    damage: `1d8+2+${int}`,
  }));

  return {
    displayName: template.name,
    ac: 12 + int,
    maxHitPoints: 5 + 5 * level,
    abilities: template.abilities,
    speeds: template.speeds,
    attacks,
    traits: (template.traits ?? []).map((trait) => ({ key: trait.key, name: trait.name, desc: trait.desc })),
    notes: [],
    useTrackers: [{ useKey: "repair", labelKey: "companions.uses.repair", maxUses: REPAIR_USES }],
  };
}

export function registerSteelDefenderSource(registry: CreatureSourceRegistry): void {
  registerCreatureSource(registry, {
    sourceKey: STEEL_DEFENDER_SOURCE_KEY,
    category: "companion",
    titleEntityType: "classes",
    titleEntityKey: "artificer",
    titleField: "subclass.battle-smith.feature.steel-defender.name",
    isAvailable: artificerSteelDefender,
    defaultInstanceFields: () => ({
      formKey: TEMPLATE_KEY,
      featureUses: { repair: REPAIR_USES },
      summoned: false,
    }),
    formOptions: () => [{ key: TEMPLATE_KEY }],
    spiritTypeOptions: () => null,
    castSlotLevelRange: () => null,
    resolveStatBlock: defenderStatBlock,
    initialFeatureUses: () => ({ repair: REPAIR_USES }),
    restPolicy: { shortRest: "none", longRest: "restoreHpAndUses" },
    supportsDismiss: false,
  });
}