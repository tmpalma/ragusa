import { useMemo } from "react";
import type { ComboboxOption } from "../form/Combobox";
import { Combobox } from "../form/Combobox";
import { concentrationSpellMaxRounds, findSpellByKey } from "../../domain/spellSelection";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { CollapsiblePane } from "../CollapsiblePane";
import { ResourceCounter } from "../combat/ResourceCounter";
import formStyles from "../form/Form.module.css";
import styles from "./Spells.module.css";

export interface ConcentrationSectionProps {
  spellKeys: string[];
}

export function ConcentrationSection({ spellKeys }: ConcentrationSectionProps) {
  const { character, dispatch } = useCharacter();
  const { t, tEntity } = useLocale();

  const options = useMemo((): ComboboxOption[] => {
    return spellKeys.map((spellKey) => {
      const spell = findSpellByKey(spellKey);
      return {
        key: spellKey,
        label: tEntity("catalog.spells", spellKey, "name", spell?.name ?? spellKey),
      };
    });
  }, [spellKeys, tEntity]);

  const maxRounds =
    character.concentrationSpellKey == null
      ? null
      : concentrationSpellMaxRounds(character.concentrationSpellKey);
  const currentRounds = maxRounds == null ? null : (character.concentrationRoundsRemaining ?? maxRounds);

  if (spellKeys.length === 0) return null;

  return (
    <section className={`${styles.section} ${styles.concentrationSection}`}>
      <CollapsiblePane title={<h3>{t("spells.concentration")}</h3>}>
      <div className={styles.concentrationRow}>
        <Combobox
          id="concentration-spell-select"
          label={t("spells.concentrationSpell")}
          value={character.concentrationSpellKey}
          onChange={(spellKey) => dispatch({ type: "SET_CONCENTRATION_SPELL", spellKey })}
          options={options}
          placeholder={t("spells.concentrationSpellPlaceholder")}
          className={styles.concentrationSpellField}
        />
        {maxRounds != null && currentRounds != null ? (
          <div className={styles.concentrationRoundsCounter}>
            <ResourceCounter
              id="concentration-rounds-remaining"
              label={t("spells.concentrationRounds")}
              current={currentRounds}
              max={maxRounds}
              decreaseLabel={t("spells.decreaseConcentrationRound")}
              increaseLabel={t("spells.increaseConcentrationRound")}
              currentLabel={t("spells.currentConcentrationRounds")}
              inputClassName={styles.concentrationRoundsInput}
              onChange={(value) => dispatch({ type: "SET_CONCENTRATION_ROUNDS", value })}
            />
          </div>
        ) : null}
      </div>
      <p className={formStyles.hint}>
        {t("spells.concentrationCheckRule", {
          ability: t("rules.ability.con"),
          saveDcRule: t("spells.concentrationSaveDcRule"),
        })}
      </p>
      </CollapsiblePane>
    </section>
  );
}
