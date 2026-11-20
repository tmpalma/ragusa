import type { Character } from "../state/characterState";
import { trackedCreatureRegistry } from "./trackedCreatures/bootstrap";
import { buildCreatureSourceContext } from "./trackedCreatures/context";
import { applyTrackedCreatureRest, syncTrackedCreatures } from "./trackedCreatures/instances";
import type {
  CreatureSourceContext,
  CreatureSourceDefinition,
  ResolvedCreatureStatBlock,
  TrackedCreatureCategory,
  TrackedCreatureInstance,
} from "./trackedCreatures/types";

export type {
  CreatureSourceContext,
  CreatureSourceDefinition,
  ResolvedCreatureStatBlock,
  TrackedCreatureCategory,
  TrackedCreatureInstance,
  SpiritType,
} from "./trackedCreatures/types";

export { trackedCreatureRegistry, resetTrackedCreatureRegistryForTests } from "./trackedCreatures/bootstrap";
export { buildCreatureSourceContext } from "./trackedCreatures/context";
export {
  applyTrackedCreatureRest,
  companionSummonRequirementsMet,
  syncTrackedCreatures,
  trackedCreatureDisplayHp,
  updateTrackedCreatureHp,
} from "./trackedCreatures/instances";

export interface AvailableCreatureSource {
  definition: CreatureSourceDefinition;
  instance: TrackedCreatureInstance;
  statBlock: ResolvedCreatureStatBlock | null;
}

export function availableCreatureSources(
  character: Character,
  filter: { category?: TrackedCreatureCategory } = {},
): AvailableCreatureSource[] {
  const ctx = buildCreatureSourceContext(character);
  const registry = trackedCreatureRegistry();
  const synced = syncTrackedCreatures(
    character,
    ctx,
    registry,
    listAvailableSourceKeys(ctx, registry, filter),
  );

  return listAvailableSourceKeys(ctx, registry, filter).flatMap((sourceKey) => {
    const definition = registry.get(sourceKey);
    if (!definition) return [];
    const instance = synced.find((row) => row.sourceKey === sourceKey);
    if (!instance) return [];
    return [
      {
        definition,
        instance,
        statBlock: definition.resolveStatBlock(ctx, instance),
      },
    ];
  });
}

function listAvailableSourceKeys(
  ctx: CreatureSourceContext,
  registry: ReturnType<typeof trackedCreatureRegistry>,
  filter: { category?: TrackedCreatureCategory },
): string[] {
  const keys: string[] = [];
  for (const definition of registry.values()) {
    if (filter.category && definition.category !== filter.category) continue;
    if (!definition.isAvailable(ctx)) continue;
    keys.push(definition.sourceKey);
  }
  return keys.sort();
}

export function hasAvailableCompanionSlots(character: Character): boolean {
  return availableCreatureSources(character, { category: "companion" }).length > 0;
}

function trackedCreaturesEqual(
  left: TrackedCreatureInstance[],
  right: TrackedCreatureInstance[],
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function withSyncedTrackedCreatures(character: Character): Character {
  const ctx = buildCreatureSourceContext(character);
  const registry = trackedCreatureRegistry();
  const sourceKeys = listAvailableSourceKeys(ctx, registry, { category: "companion" });
  const trackedCreatures = syncTrackedCreatures(character, ctx, registry, sourceKeys);
  if (trackedCreaturesEqual(trackedCreatures, character.trackedCreatures)) return character;
  return { ...character, trackedCreatures };
}

export function applyTrackedCreaturesRest(character: Character, kind: "short" | "long"): Character {
  const ctx = buildCreatureSourceContext(character);
  const registry = trackedCreatureRegistry();
  const trackedCreatures = applyTrackedCreatureRest(character, kind, ctx, registry);
  if (trackedCreatures === character.trackedCreatures) return character;
  return { ...character, trackedCreatures };
}

export function resolveTrackedCreatureStatBlock(
  character: Character,
  instance: TrackedCreatureInstance,
): ResolvedCreatureStatBlock | null {
  const ctx = buildCreatureSourceContext(character);
  const source = trackedCreatureRegistry().get(instance.sourceKey);
  return source ? source.resolveStatBlock(ctx, instance) : null;
}