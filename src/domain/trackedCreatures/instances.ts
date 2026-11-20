import type { Character } from "../../state/characterState";
import { applyDamageToCharacter } from "../temporaryHitPoints";
import type { CreatureSourceContext, CreatureSourceRegistry, TrackedCreatureInstance } from "./types";
import { clampCreatureHpWhenMaxChanges } from "./shared";

const COMPANION_SOURCE_KEYS = new Set([
  "find-familiar",
  "find-steed",
  "primal-companion",
  "steel-defender",
]);

function isCompanionInstance(instance: TrackedCreatureInstance): boolean {
  return instance.category === "companion" && COMPANION_SOURCE_KEYS.has(instance.sourceKey);
}

export function defaultFeatureUsesForSource(
  registry: CreatureSourceRegistry,
  ctx: CreatureSourceContext,
  sourceKey: string,
): Record<string, number> {
  const source = registry.get(sourceKey);
  return source ? source.initialFeatureUses(ctx) : {};
}

export function createDefaultCompanionInstance(
  registry: CreatureSourceRegistry,
  ctx: CreatureSourceContext,
  sourceKey: string,
): TrackedCreatureInstance {
  const source = registry.get(sourceKey);
  if (!source) {
    throw new Error(`Unknown creature source: ${sourceKey}`);
  }
  const defaults = source.defaultInstanceFields(ctx);
  return {
    id: sourceKey,
    sourceKey,
    category: source.category,
    formKey: defaults.formKey ?? null,
    spiritType: defaults.spiritType,
    castSlotLevel: defaults.castSlotLevel,
    currentHitPoints: null,
    temporaryHitPointsMax: null,
    temporaryHitPointsRemaining: null,
    featureUses: defaults.featureUses ?? defaultFeatureUsesForSource(registry, ctx, sourceKey),
    dismissed: defaults.dismissed ?? false,
    summoned: defaults.summoned ?? false,
  };
}

export function companionSummonRequirementsMet(
  ctx: CreatureSourceContext,
  registry: CreatureSourceRegistry,
  instance: TrackedCreatureInstance,
): boolean {
  const source = registry.get(instance.sourceKey);
  if (!source) return false;
  const forms = source.formOptions(ctx);
  if (forms.length > 1 && instance.formKey == null) return false;
  const spirits = source.spiritTypeOptions(ctx);
  if (spirits != null && spirits.length > 0 && instance.spiritType == null) return false;
  return true;
}

export function syncTrackedCreatures(
  character: Character,
  ctx: CreatureSourceContext,
  registry: CreatureSourceRegistry,
  availableSourceKeys: string[],
): TrackedCreatureInstance[] {
  const existingBySource = new Map(
    character.trackedCreatures.filter(isCompanionInstance).map((row) => [row.sourceKey, row]),
  );

  const next: TrackedCreatureInstance[] = [];
  for (const sourceKey of availableSourceKeys) {
    const source = registry.get(sourceKey);
    if (!source || source.category !== "companion") continue;

    const previous = existingBySource.get(sourceKey);
    const defaults = source.defaultInstanceFields(ctx);
    const instance: TrackedCreatureInstance = previous
      ? {
          ...previous,
          category: source.category,
          summoned: previous.summoned ?? defaults.summoned ?? false,
        }
      : createDefaultCompanionInstance(registry, ctx, sourceKey);

    const statBlock = source.resolveStatBlock(ctx, instance);
    if (statBlock) {
      const previousMax =
        previous != null
          ? (source.resolveStatBlock(ctx, previous)?.maxHitPoints ?? statBlock.maxHitPoints)
          : statBlock.maxHitPoints;
      instance.currentHitPoints = clampCreatureHpWhenMaxChanges(
        previousMax,
        statBlock.maxHitPoints,
        instance.currentHitPoints,
      );
    }

    const expectedUses = defaultFeatureUsesForSource(registry, ctx, sourceKey);
    for (const [useKey, max] of Object.entries(expectedUses)) {
      if (instance.featureUses[useKey] == null) instance.featureUses = { ...instance.featureUses, [useKey]: max };
      else if (instance.featureUses[useKey] > max) {
        instance.featureUses = { ...instance.featureUses, [useKey]: max };
      }
    }

    next.push(instance);
  }

  const passthrough = character.trackedCreatures.filter((row) => !isCompanionInstance(row));
  return [...next, ...passthrough];
}

export function applyTrackedCreatureRest(
  character: Character,
  kind: "short" | "long",
  ctx: CreatureSourceContext,
  registry: CreatureSourceRegistry,
): TrackedCreatureInstance[] {
  if (character.trackedCreatures.length === 0) return character.trackedCreatures;

  let changed = false;
  const next = character.trackedCreatures.map((instance) => {
    const source = registry.get(instance.sourceKey);
    if (!source) return instance;

    const policy = source.restPolicy;
    if (kind === "short" && policy.shortRest === "none") return instance;

    let updated = instance;

    if (kind === "long" && policy.longRest === "restoreHpAndUses") {
      updated = {
        ...updated,
        currentHitPoints: null,
        temporaryHitPointsMax: null,
        temporaryHitPointsRemaining: null,
        featureUses: defaultFeatureUsesForSource(registry, ctx, instance.sourceKey),
      };
    }

    if (updated !== instance) changed = true;
    return updated;
  });

  return changed ? next : character.trackedCreatures;
}

export function updateTrackedCreatureHp(
  instance: TrackedCreatureInstance,
  maxHp: number,
  displayValue: number,
): TrackedCreatureInstance {
  const baseCurrent = instance.currentHitPoints ?? maxHp;
  const tempRemaining = instance.temporaryHitPointsRemaining ?? 0;
  const tempActive =
    instance.temporaryHitPointsMax != null && tempRemaining > 0;
  const displayCurrent = baseCurrent + (tempActive ? tempRemaining : 0);

  if (displayValue >= displayCurrent) {
    const newBase = Math.min(maxHp, displayValue - (tempActive ? tempRemaining : 0));
    const baseValue = newBase >= maxHp ? null : newBase;
    return { ...instance, currentHitPoints: baseValue };
  }

  const result = applyDamageToCharacter({
    maxHitPoints: maxHp,
    currentHitPoints: instance.currentHitPoints,
    temporaryHitPointsMax: instance.temporaryHitPointsMax,
    temporaryHitPointsRemaining: instance.temporaryHitPointsRemaining,
    damage: displayCurrent - displayValue,
  });

  return {
    ...instance,
    currentHitPoints: result.currentHitPoints,
    temporaryHitPointsMax: result.temporaryHitPointsMax,
    temporaryHitPointsRemaining: result.temporaryHitPointsRemaining,
  };
}

export function trackedCreatureDisplayHp(
  instance: TrackedCreatureInstance,
  maxHp: number,
): { current: number; max: number } {
  const base = instance.currentHitPoints ?? maxHp;
  const temp =
    instance.temporaryHitPointsMax != null && (instance.temporaryHitPointsRemaining ?? 0) > 0
      ? (instance.temporaryHitPointsRemaining ?? 0)
      : 0;
  return { current: base + temp, max: maxHp };
}