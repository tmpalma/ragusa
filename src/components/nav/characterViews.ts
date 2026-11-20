import type { Character } from "../../state/characterState";
import { characterHasCompanionTab } from "../../domain/companions";

export const CHARACTER_VIEWS = [
  { id: "form", segment: "", labelKey: "character" },
  { id: "equipment", segment: "equipment", labelKey: "equipment" },
  { id: "spells", segment: "spells", labelKey: "spells" },
  { id: "companions", segment: "companions", labelKey: "companions" },
  { id: "overview", segment: "overview", labelKey: "overview" },
  { id: "vitals", segment: "vitals", labelKey: "vitals" },
  { id: "actions", segment: "actions", labelKey: "actions" },
] as const;

export type CharacterViewId = (typeof CHARACTER_VIEWS)[number]["id"];

const SEGMENT_BY_ID = Object.fromEntries(CHARACTER_VIEWS.map((view) => [view.id, view.segment])) as Record<
  CharacterViewId,
  string
>;

const ID_BY_SEGMENT = Object.fromEntries(
  CHARACTER_VIEWS.filter((view) => view.segment).map((view) => [view.segment, view.id]),
) as Record<string, CharacterViewId>;

export function characterViewPath(viewId: CharacterViewId): string {
  const segment = SEGMENT_BY_ID[viewId];
  return segment ? `/character/${segment}` : "/character";
}

export function resolveCharacterViewId(segment: string | undefined): CharacterViewId | null {
  if (!segment) return "form";
  if (segment === "combat") return "vitals";
  return ID_BY_SEGMENT[segment] ?? null;
}

export function isCharacterRoute(pathname: string): boolean {
  return pathname === "/character" || pathname.startsWith("/character/");
}

export function visibleCharacterViews(character: Character) {
  if (characterHasCompanionTab(character)) return CHARACTER_VIEWS;
  return CHARACTER_VIEWS.filter((view) => view.id !== "companions");
}
