import { useEffect } from "react";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { useToast } from "../toast/ToastContext";

export function SkillConflictToast() {
  const { character, dispatch } = useCharacter();
  const { t } = useLocale();
  const { showToast } = useToast();

  useEffect(() => {
    if (!character.skillConflictNotice?.length) return;

    const skillNames = character.skillConflictNotice.map((skillId) => t(`rules.skill.${skillId}`)).join(", ");
    showToast(t("character.skillConflictToast", { skills: skillNames }), "info");
    dispatch({ type: "CLEAR_SKILL_CONFLICT_NOTICE" });
  }, [character.skillConflictNotice, dispatch, showToast, t]);

  return null;
}
