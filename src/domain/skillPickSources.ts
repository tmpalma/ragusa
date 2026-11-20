import type { SkillId } from "../data/types";
import { allFeatSkillPicksForCharacter } from "./featEffects";
import {
  mergedClassSkillPickSlots,
  skillPickSourcesFromCharacter,
  type SkillPickSources,
} from "./skillPicks";
import type { Character } from "../state/characterState";
import type { DerivedStats } from "./deriveCharacter";

export function buildSkillPickSources(
  character: Character,
  derived: Pick<DerivedStats, "backgroundData">,
): SkillPickSources {
  return skillPickSourcesFromCharacter({
    backgroundSkills: derived.backgroundData?.skillProficiencies ?? [],
    classSkillPicks: mergedClassSkillPickSlots(
      character.classSkillPicks,
      character.classSkillPicksByClass,
    ),
    featSkillPicks: allFeatSkillPicksForCharacter(character),
    speciesSkillPicks: character.speciesSkillPicks,
    subclassSkillPicks: character.subclassSkillPicks,
    classFeatureSkillPicks: Object.values(character.classFeatureSkillPicks).flat(),
  });
}

export function featSkillPicksFromProficiencyChoices(
  proficiencyPicks: readonly ({ kind: "skill"; id: SkillId } | { kind: "tool"; id: string } | null)[],
): (SkillId | null)[] {
  return proficiencyPicks.map((pick) => (pick?.kind === "skill" ? pick.id : null));
}
