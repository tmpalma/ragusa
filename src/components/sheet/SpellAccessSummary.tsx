import { useMemo } from "react";
import {
  buildAllGrantedSpells,
  buildCharacterSpellEntries,
  findSpellByKey,
} from "../../domain/spellSelection";
import { featChoicesResolverForCharacter } from "../../domain/featSlots";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { activeFeatKeysFromCharacter } from "../../state/characterState";
import styles from "./Sheet.module.css";

function spellLabel(
  spellKey: string,
  tEntity: ReturnType<typeof useLocale>["tEntity"],
  t: ReturnType<typeof useLocale>["t"],
): string {
  const spell = findSpellByKey(spellKey);
  const name = tEntity("catalog.spells", spellKey, "name", spell?.name ?? spellKey);
  if (!spell) return name;
  const concentration = spell.concentration ? t("spells.concentrationMark") : "";
  const ritual = spell.ritual ? t("spells.ritualMark") : "";
  return `${name}${concentration}${ritual}`;
}

export function SpellAccessSummary() {
  const { character, derived } = useCharacter();
  const { t, tEntity } = useLocale();

  const activeFeatKeys = useMemo(() => activeFeatKeysFromCharacter(character), [character]);
  const featChoicesFor = useMemo(() => featChoicesResolverForCharacter(character), [character]);

  const spellsByLevel = useMemo(() => {
    const granted = buildAllGrantedSpells({
      speciesCantrips: derived.speciesFeatureContributions.cantrips,
      speciesPreparedSpells: derived.speciesFeatureContributions.preparedSpells,
      classKey: character.classKey,
      subclassKey: character.subclassKey,
      subclassFeatureChoices: character.subclassFeatureChoices,
      classFeatureOptionPicks: character.classFeatureOptionPicks,
      classFeatureSpellPicks: character.classFeatureSpellPicks,
      level: character.level,
      activeFeatKeys,
      featChoicesFor,
      spellSlots: derived.spellcasting?.slotsByLevel,
    });
    const entries = buildCharacterSpellEntries({
      cantripPicks: character.cantripPicks,
      spellPicks: character.spellPicks,
      granted,
      alwaysPreparedPicks: character.alwaysPreparedSpellPicks,
    });
    const buckets = new Map<number, typeof entries>();
    for (const entry of entries) {
      const level = findSpellByKey(entry.spellKey)?.level ?? 0;
      const list = buckets.get(level);
      if (list) {
        list.push(entry);
      } else {
        buckets.set(level, [entry]);
      }
    }
    return [...buckets.entries()].sort((a, b) => a[0] - b[0]);
  }, [
    character,
    derived.speciesFeatureContributions,
    derived.spellcasting?.slotsByLevel,
    activeFeatKeys,
    featChoicesFor,
  ]);

  if (spellsByLevel.length === 0) return null;

  return (
    <section className={styles.section}>
      <h3>{t("sheet.spellList")}</h3>
      {spellsByLevel.map(([level, entries]) => (
        <div key={level} className={styles.spellListGroup}>
          <h4 className={styles.subheading}>
            {level === 0 ? t("spells.levelPaneCantrips") : t("spells.levelPaneSpells", { level })}
          </h4>
          <ul>
            {entries.map((entry) => (
              <li key={entry.spellKey}>{spellLabel(entry.spellKey, tEntity, t)}</li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
