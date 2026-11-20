import { useMemo } from "react";
import { findSpellByKey, spellPickerLabel } from "../../domain/spellSelection";
import { enspelledSpellOptions, isEnspelledVariantKey } from "../../domain/enspelledVariants";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { Combobox } from "../form/Combobox";
import combatStyles from "../combat/Combat.module.css";

interface EnspelledSpellPickerProps {
  instanceId: string;
  variantKey: string;
}

export function EnspelledSpellPicker({ instanceId, variantKey }: EnspelledSpellPickerProps) {
  const { character, dispatch } = useCharacter();
  const { t, tEntity, tGlossary } = useLocale();

  const options = useMemo(() => {
    if (!isEnspelledVariantKey(variantKey)) return [];
    return enspelledSpellOptions(variantKey).map((spellKey) => {
      const spell = findSpellByKey(spellKey);
      const name = tEntity("catalog.spells", spellKey, "name", spell?.name ?? spellKey);
      const school = spell?.school ? tGlossary("spellSchool", spell.school) : "";
      return {
        key: spellKey,
        label: school ? spellPickerLabel(name, school) : name,
      };
    });
  }, [variantKey, tEntity, tGlossary]);

  if (options.length === 0) return null;

  const selectedKey = character.enspelledSpellPicks[instanceId] ?? null;

  return (
    <div className={combatStyles.weaponResource}>
      <Combobox
        id={`enspelled-spell-${instanceId}`}
        label={t("equipment.enspelledSpell")}
        value={selectedKey}
        onChange={(spellKey) =>
          dispatch({ type: "SET_ENSPELLED_SPELL", instanceId, spellKey })
        }
        options={options}
        placeholder={t("equipment.enspelledSpellPlaceholder")}
      />
    </div>
  );
}
