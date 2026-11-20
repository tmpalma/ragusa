import type { Character } from "../state/characterState";

/** One class entry with its level in that class (not character level). */
export interface ResolvedClassLevel {
  classKey: string;
  classLevel: number;
}

/** Player-facing class line, e.g. "Wizard 3 / Fighter 1". */
export function formatClassLevelLine(
  classLevels: ResolvedClassLevel[],
  className: (classKey: string) => string,
  formatSegment: (className: string, classLevel: number, classKey: string) => string = (
    name,
    level,
  ) => `${name} ${level}`,
  separator = " / ",
): string {
  return classLevels
    .map(({ classKey, classLevel }) => formatSegment(className(classKey), classLevel, classKey))
    .join(separator);
}

/** Aggregate level path into per-class levels in first-taken order. */
export function resolvedClassLevels(levelPath: string[]): ResolvedClassLevel[] {
  const order: string[] = [];
  const counts = new Map<string, number>();

  for (const classKey of levelPath) {
    if (!counts.has(classKey)) {
      order.push(classKey);
      counts.set(classKey, 0);
    }
    counts.set(classKey, counts.get(classKey)! + 1);
  }

  return order.map((classKey) => ({
    classKey,
    classLevel: counts.get(classKey)!,
  }));
}

/** Build a level path from a single class repeated `level` times. */
export function levelPathFromClassKeyAndLevel(classKey: string | null, level: number): string[] {
  if (!classKey || level < 1) return [];
  return Array.from({ length: level }, () => classKey);
}

/** Expand a classLevels stub (first-taken order) into a level path. */
export function levelPathFromClassLevelsStub(
  stub: { classKey: string; level: number }[],
): string[] {
  const path: string[] = [];
  for (const { classKey, level } of stub) {
    for (let i = 0; i < level; i++) {
      path.push(classKey);
    }
  }
  return path;
}

export interface HydrateLevelPathInput {
  levelPath?: string[];
  classLevels?: { classKey: string; level: number }[];
  classKey?: string | null;
  level?: number;
}

/** Prefer saved levelPath, then classLevels stub, then classKey + level. */
export function hydrateLevelPath(input: HydrateLevelPathInput): string[] {
  if (input.levelPath && input.levelPath.length > 0) {
    return input.levelPath;
  }
  if (input.classLevels && input.classLevels.length > 0) {
    return levelPathFromClassLevelsStub(input.classLevels);
  }
  return levelPathFromClassKeyAndLevel(input.classKey ?? null, input.level ?? 1);
}

/** Compact stub form for saves that only know aggregated class levels. */
export function classLevelsStubFromPath(levelPath: string[]): { classKey: string; level: number }[] {
  return resolvedClassLevels(levelPath).map(({ classKey, classLevel }) => ({
    classKey,
    level: classLevel,
  }));
}

/** Effective path when legacy saves omit levelPath but have classKey + level. */
export function effectiveLevelPath(state: Character): string[] {
  let path: string[];
  if (state.levelPath.length > 0) {
    path = state.levelPath;
  } else {
    path = levelPathFromClassKeyAndLevel(state.classKey, state.level);
  }

  if (path.length === 0) return path;

  if (path.length < state.level) {
    const fillClass = path[path.length - 1] ?? state.classKey;
    if (!fillClass) return path;
    return [
      ...path,
      ...Array.from({ length: state.level - path.length }, () => fillClass),
    ];
  }

  if (path.length > state.level) {
    return path.slice(0, state.level);
  }

  return path;
}

function retainSubclassByClassForLevelPath(
  subclassByClass: Record<string, string | null>,
  levelPath: string[],
): Record<string, string | null> {
  const resolved = resolvedClassLevels(levelPath);
  const next: Record<string, string | null> = {};
  for (const { classKey, classLevel } of resolved) {
    if (classLevel >= 3 && subclassByClass[classKey]) {
      next[classKey] = subclassByClass[classKey];
    }
  }
  return next;
}

/** Keep level, classKey, subclassKey, and subclassByClass aligned with levelPath. */
export function syncCharacterLevelAliases(character: Character): Character {
  const levelPath = hydrateLevelPath({
    levelPath: character.levelPath,
    classLevels: character.classLevels,
    classKey: character.classKey,
    level: character.level,
  });
  const level = levelPath.length > 0 ? levelPath.length : character.level;
  const classKey = levelPath[0] ?? character.classKey;
  const subclassByClass = { ...character.subclassByClass };
  if (character.subclassKey && classKey && subclassByClass[classKey] === undefined) {
    subclassByClass[classKey] = character.subclassKey;
  }
  const prunedSubclassByClass = retainSubclassByClassForLevelPath(subclassByClass, levelPath);
  const subclassKey = classKey ? (prunedSubclassByClass[classKey] ?? null) : null;
  const classLevels =
    levelPath.length > 0 ? classLevelsStubFromPath(levelPath) : character.classLevels;

  return {
    ...character,
    levelPath,
    level,
    classKey,
    subclassByClass: prunedSubclassByClass,
    subclassKey,
    ...(classLevels !== undefined ? { classLevels } : {}),
  };
}
