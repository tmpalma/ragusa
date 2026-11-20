import { ARTIFICER_PLANS, type ArtificerPlanData } from "../data/artificerPlanCatalog.js";

export { ARTIFICER_PLANS, type ArtificerPlanData };

export function artificerPlansKnownMax(level: number): number {
  if (level < 2) return 0;
  if (level < 6) return 4;
  if (level < 10) return 5;
  return 6;
}

export function artificerCreatedItemsMax(level: number): number {
  if (level < 2) return 0;
  if (level < 6) return 2;
  if (level < 10) return 3;
  return 4;
}

export function eligibleArtificerPlans(level: number): ArtificerPlanData[] {
  return ARTIFICER_PLANS.filter((plan) => plan.minArtificerLevel <= level);
}

export function findArtificerPlan(key: string): ArtificerPlanData | undefined {
  return ARTIFICER_PLANS.find((plan) => plan.key === key);
}

export function initialArtificerPlanKeys(): string[] {
  return [];
}

export function initialArtificerCreatedItemKeys(): string[] {
  return [];
}

export function canAddArtificerPlan(
  planKeys: readonly string[],
  planKey: string,
  level: number,
): boolean {
  if (level < 2) return false;
  if (planKeys.includes(planKey)) return false;
  if (planKeys.length >= artificerPlansKnownMax(level)) return false;
  return eligibleArtificerPlans(level).some((plan) => plan.key === planKey);
}

export function canAddArtificerCreatedItem(
  planKeys: readonly string[],
  createdKeys: readonly string[],
  planKey: string,
  level: number,
): boolean {
  if (level < 2) return false;
  if (!planKeys.includes(planKey)) return false;
  if (createdKeys.includes(planKey)) return false;
  if (createdKeys.length >= artificerCreatedItemsMax(level)) return false;
  return findArtificerPlan(planKey) != null;
}

export function retainArtificerStateForLevel(
  state: {
    classKey: string | null;
    artificerPlanKeys: string[];
    artificerCreatedItemKeys: string[];
  },
  level: number,
): { artificerPlanKeys: string[]; artificerCreatedItemKeys: string[] } {
  if (state.classKey !== "artificer" || level < 2) {
    return { artificerPlanKeys: [], artificerCreatedItemKeys: [] };
  }
  const eligible = new Set(eligibleArtificerPlans(level).map((plan) => plan.key));
  const artificerPlanKeys = state.artificerPlanKeys
    .filter((key) => eligible.has(key))
    .slice(0, artificerPlansKnownMax(level));
  const known = new Set(artificerPlanKeys);
  const artificerCreatedItemKeys = state.artificerCreatedItemKeys
    .filter((key) => known.has(key))
    .slice(0, artificerCreatedItemsMax(level));
  return { artificerPlanKeys, artificerCreatedItemKeys };
}
