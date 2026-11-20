import type { CreatureSourceDefinition, CreatureSourceRegistry } from "./types";

export function createCreatureSourceRegistry(): CreatureSourceRegistry {
  return new Map();
}

export function registerCreatureSource(
  registry: CreatureSourceRegistry,
  definition: CreatureSourceDefinition,
): void {
  registry.set(definition.sourceKey, definition);
}

export function getCreatureSource(
  registry: CreatureSourceRegistry,
  sourceKey: string,
): CreatureSourceDefinition | undefined {
  return registry.get(sourceKey);
}