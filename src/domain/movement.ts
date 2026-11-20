import type { SpeciesData } from "../data/types";

export function getSpeeds(
  speciesData: SpeciesData | null,
  walkSpeedOverride: number | null = null,
): { type: string; feet: number }[] {
  const base = speciesData?.speeds ?? [];
  if (walkSpeedOverride == null) return base;
  return base.map((speed) => (speed.type === "walk" ? { ...speed, feet: walkSpeedOverride } : speed));
}
