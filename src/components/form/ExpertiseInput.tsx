import { allFeatSkillPicksForCharacter } from "../../domain/featEffects";
import {
  availableExpertiseSkillOptions,
  compactSkillPicks,
  firstEmptySkillPickSlot,
  proficientSkillIds,
  skillPickSlotForId,
  takenExpertSkillsForExpertisePicker,
} from "../../domain/skillPicks";
import { hasExpertiseGrantedAtLevel } from "../../domain/classFeatures";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { SkillCappedPickList } from "./SkillCappedPickList";

export function ExpertiseInput({ levelBlock }: { levelBlock: number }) {
  const { character, derived, dispatch } = useCharacter();
  const { t } = useLocale();
  const { expertiseCount } = derived.classFeatureContributions;

  if (character.level < levelBlock) return null;
  if (!hasExpertiseGrantedAtLevel(derived.classData, levelBlock)) return null;
  if (expertiseCount <= 0) return null;

  const proficientSkills = proficientSkillIds(
    derived.backgroundData?.skillProficiencies ?? [],
    character.classSkillPicks,
    allFeatSkillPicksForCharacter(character),
    character.speciesSkillPicks,
    character.subclassSkillPicks,
    Object.values(character.classFeatureSkillPicks).flat(),
  );

  const picks =
    character.expertiseSkillPicks.length === expertiseCount
      ? character.expertiseSkillPicks
      : Array.from({ length: expertiseCount }, () => null);
  const selectedKeys = compactSkillPicks(picks);

  return (
    <SkillCappedPickList
      id="expertise-skill-select"
      groupLabel={t("character.expertiseChooseCounted", {
        count: selectedKeys.length,
        max: expertiseCount,
      })}
      comboboxLabel={t("character.skill")}
      selectedKeys={selectedKeys}
      maxCount={expertiseCount}
      options={availableExpertiseSkillOptions(
        proficientSkills,
        picks,
        -1,
        takenExpertSkillsForExpertisePicker(picks, -1),
      )}
      onAdd={(skillId) => {
        const index = firstEmptySkillPickSlot(picks);
        if (index < 0) return;
        dispatch({ type: "SET_EXPERTISE_SKILL_PICK", index, skill: skillId });
      }}
      onRemove={(skillId) => {
        const index = skillPickSlotForId(picks, skillId);
        if (index < 0) return;
        dispatch({ type: "SET_EXPERTISE_SKILL_PICK", index, skill: null });
      }}
    />
  );
}
