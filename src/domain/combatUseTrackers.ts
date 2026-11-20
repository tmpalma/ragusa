import type { RestRecovery } from "../data/types";

/** Maps tracker rest recovery to the shared Uses-per-rest combat locale key. */
export function usesPerRestLabelKey(
  recovery?: RestRecovery | "long" | "short",
): "combat.usesPerShortRest" | "combat.usesPerLongRest" {
  if (recovery === "short" || recovery === "shortOne") {
    return "combat.usesPerShortRest";
  }
  return "combat.usesPerLongRest";
}
