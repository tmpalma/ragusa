import type { Character } from "../state/characterState";
import { availableCreatureSources, type AvailableCreatureSource } from "./trackedCreatures";

export function availableCompanions(character: Character): AvailableCreatureSource[] {
  return availableCreatureSources(character, { category: "companion" });
}

export function characterHasCompanionTab(character: Character): boolean {
  return availableCompanions(character).length > 0;
}