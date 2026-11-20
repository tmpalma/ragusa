import { CLASS_SPELL_LISTS, SPELLS, findByKey } from "../../data";
import type { SpeciesData } from "../../data/types";

export function speciesCantripChoiceListClassKey(
  speciesData: SpeciesData | null,
  lineageKey: string | null,
  choiceKey: string,
): string | null {
  if (!speciesData?.choice || !lineageKey) return null;
  const lineage = speciesData.choice.options.find((option) => option.key === lineageKey);
  if (!lineage) return null;
  for (const feature of lineage.features) {
    for (const effect of feature.effects) {
      if (effect.type === "choose_cantrip" && effect.choiceKey === choiceKey) {
        return effect.listClassKey;
      }
    }
  }
  return null;
}

export function speciesCantripChoiceOptions(
  listClassKey: string,
): { key: string; name: string }[] {
  const list = CLASS_SPELL_LISTS[listClassKey];
  if (!list) return [];
  return list.cantrips.map((key) => {
    const spell = findByKey(SPELLS, key);
    return { key, name: spell?.name ?? key };
  });
}

export function isValidSpeciesCantripChoice(listClassKey: string, spellKey: string): boolean {
  return CLASS_SPELL_LISTS[listClassKey]?.cantrips.includes(spellKey) ?? false;
}

export function resolveSpeciesCantripChoice(
  choices: Record<string, string>,
  choiceKey: string,
  defaultSpellKey: string,
): string {
  const pick = choices[choiceKey];
  return pick ?? defaultSpellKey;
}
