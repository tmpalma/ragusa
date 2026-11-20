import {
  effectiveLevelPath,
  formatClassLevelLine,
  resolvedClassLevels,
  type ResolvedClassLevel,
} from "./classLevels";
import type { Character } from "../state/characterState";

export function formatCharacterPageClassLine(
  classLevels: ResolvedClassLevel[],
  className: (classKey: string) => string,
  subclassName: (classKey: string) => string | null,
  formatWithSubclass: (className: string, subclassName: string, level: number) => string,
  formatWithoutSubclass: (className: string, level: number) => string,
): string {
  return formatClassLevelLine(
    classLevels,
    className,
    (name, level, classKey) => {
      const subclass = subclassName(classKey);
      if (subclass) {
        return formatWithSubclass(name, subclass, level);
      }
      return formatWithoutSubclass(name, level);
    },
  );
}

export function formatCharacterPageSubtitle(
  character: Character,
  className: (classKey: string) => string,
  subclassName: (classKey: string) => string | null,
  formatWithSubclass: (className: string, subclassName: string, level: number) => string,
  formatWithoutSubclass: (className: string, level: number) => string,
  formatSubtitle: (name: string, classLine: string) => string,
  unnamedName: string,
): string | null {
  const classLevels = resolvedClassLevels(effectiveLevelPath(character));
  if (classLevels.length === 0) return null;

  const classLine = formatCharacterPageClassLine(
    classLevels,
    className,
    subclassName,
    formatWithSubclass,
    formatWithoutSubclass,
  );
  const name = character.name.trim() || unnamedName;
  return formatSubtitle(name, classLine);
}
