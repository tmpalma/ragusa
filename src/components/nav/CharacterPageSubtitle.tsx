import { CLASSES, findByKey } from "../../data";
import { formatCharacterPageSubtitle } from "../../domain/characterSubtitle";
import { isInitialCharacter } from "../../domain/characterFile";
import { findSubclass } from "../../domain/subclasses";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";

export function CharacterPageSubtitle() {
  const { character } = useCharacter();
  const { t, tEntity } = useLocale();

  if (isInitialCharacter(character)) {
    return t("app.subtitle");
  }

  const subclassNameForClass = (classKey: string): string | null => {
    const subclassKey = character.subclassByClass[classKey] ?? null;
    if (!subclassKey) return null;
    const subclass = findSubclass(classKey, subclassKey);
    if (!subclass) return null;
    return tEntity(
      "catalog.classes",
      `${classKey}.subclass.${subclassKey}`,
      "name",
      subclass.name,
    );
  };

  const subtitle = formatCharacterPageSubtitle(
    character,
    (classKey) => {
      const classData = findByKey(CLASSES, classKey);
      return tEntity("catalog.classes", classKey, "name", classData?.name ?? classKey);
    },
    subclassNameForClass,
    (name, subclass, level) =>
      t("app.characterClassLevelSegmentWithSubclass", {
        className: name,
        subclassName: subclass,
        level,
      }),
    (name, level) => t("app.characterClassLevelSegment", { className: name, level }),
    (name, classLine) => t("app.characterSubtitle", { name, classLine }),
    t("sheet.unnamedCharacter"),
  );

  if (subtitle) return subtitle;

  const name = character.name.trim();
  return name || t("app.subtitle");
}
