// Pure, runtime-agnostic rules. No esm.sh imports, no Deno globals, no I/O.
import { LibraryOpError } from "../errors.ts";

/** A character may sit in at most one campaign. */
export function assertCharacterNotSeated(existingMembership: unknown): void {
  if (existingMembership) {
    throw new LibraryOpError("character_already_seated", "That character is already in a campaign.");
  }
}

/** Unseating requires the character's membership to be in that campaign. */
export function assertMembershipInCampaign<T extends { campaign_id: unknown }>(
  membership: T | null | undefined,
  campaignId: string,
): T {
  if (!membership || membership.campaign_id !== campaignId) {
    throw new LibraryOpError("not_found", "Membership not found.");
  }
  return membership;
}

/** Next seat sort order: one past the highest existing, or 0 when empty. */
export function nextSortOrder(siblings: ReadonlyArray<{ sort_order: unknown }>): number {
  let sortOrder = 0;
  for (const row of siblings) {
    sortOrder = Math.max(sortOrder, (row.sort_order as number) + 1);
  }
  return sortOrder;
}

/** Number of memberships per campaign id. */
export function countMembersByCampaign(
  memberships: ReadonlyArray<{ campaign_id: unknown }>,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of memberships) {
    const id = row.campaign_id as string;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}
