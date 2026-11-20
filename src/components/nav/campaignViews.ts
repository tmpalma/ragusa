export const CAMPAIGN_VIEWS = [
  { id: "party", segment: "party", labelKey: "party" },
  { id: "combat", segment: "combat", labelKey: "combat" },
  { id: "items", segment: "items", labelKey: "items" },
] as const;

export type CampaignViewId = (typeof CAMPAIGN_VIEWS)[number]["id"];

const SEGMENT_BY_ID = Object.fromEntries(CAMPAIGN_VIEWS.map((view) => [view.id, view.segment])) as Record<
  CampaignViewId,
  string
>;

const ID_BY_SEGMENT = Object.fromEntries(CAMPAIGN_VIEWS.map((view) => [view.segment, view.id])) as Record<
  string,
  CampaignViewId
>;

export function campaignViewPath(viewId: CampaignViewId): string {
  return `/campaign/${SEGMENT_BY_ID[viewId]}`;
}

export function resolveCampaignViewId(segment: string | undefined): CampaignViewId | null {
  if (!segment) return "party";
  if (segment === "overview") return "party";
  return ID_BY_SEGMENT[segment] ?? null;
}

export function isCampaignRoute(pathname: string): boolean {
  return pathname === "/campaign" || pathname.startsWith("/campaign/");
}
