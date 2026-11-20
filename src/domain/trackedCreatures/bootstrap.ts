import { createCreatureSourceRegistry } from "./registry";
import { registerFindFamiliarSource } from "./sources/findFamiliar";
import { registerFindSteedSource } from "./sources/findSteed";
import { registerPrimalCompanionSource } from "./sources/primalCompanion";
import { registerSteelDefenderSource } from "./sources/steelDefender";

let registry = createCreatureSourceRegistry();

function ensureRegistry(): typeof registry {
  if (registry.size === 0) {
    registerFindFamiliarSource(registry);
    registerFindSteedSource(registry);
    registerPrimalCompanionSource(registry);
    registerSteelDefenderSource(registry);
  }
  return registry;
}

export function trackedCreatureRegistry() {
  return ensureRegistry();
}

export function resetTrackedCreatureRegistryForTests(): void {
  registry = createCreatureSourceRegistry();
  registerFindFamiliarSource(registry);
  registerFindSteedSource(registry);
  registerPrimalCompanionSource(registry);
  registerSteelDefenderSource(registry);
}