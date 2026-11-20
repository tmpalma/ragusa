import type { SkillId } from "../../data/types";
import { useLocale } from "../../i18n/LocaleContext";
import { CappedPickList } from "./CappedPickList";

function useSkillName() {
  const { t } = useLocale();
  return (id: SkillId) => t(`rules.skill.${id}`);
}

export function SkillCappedPickList({
  id,
  groupLabel,
  comboboxLabel,
  selectedKeys,
  maxCount,
  options,
  onAdd,
  onRemove,
}: {
  id: string;
  groupLabel: string;
  comboboxLabel: string;
  selectedKeys: SkillId[];
  maxCount: number;
  options: SkillId[];
  onAdd: (skillId: SkillId) => void;
  onRemove: (skillId: SkillId) => void;
}) {
  const skillName = useSkillName();

  return (
    <CappedPickList
      id={id}
      groupLabel={groupLabel}
      comboboxLabel={comboboxLabel}
      options={options.map((skillId) => ({
        key: skillId,
        label: skillName(skillId),
      }))}
      selectedKeys={selectedKeys}
      maxCount={maxCount}
      onAdd={(skillId) => onAdd(skillId as SkillId)}
      onRemove={(skillId) => onRemove(skillId as SkillId)}
      renderSelected={(skillId) => skillName(skillId as SkillId)}
    />
  );
}
