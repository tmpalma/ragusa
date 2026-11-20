import { useMemo } from "react";
import {
  availableFeatSpellOptions,
  featGrantSpellsEffects,
  featGrantedSpellKeysFromChoices,
  padFeatChoicesForFeat,
  type FeatChoices,
} from "../../domain/featEffects";
import { dispatchFeatSpellPick } from "../../domain/featSpellPickDispatch";
import { featSpellPickOptionsForEffect, featSpellPickSlotCount } from "../../domain/featGrantSpells";
import { findActiveFeatSlot } from "../../domain/featSlots";
import { PROFICIENCY_BONUS } from "../../domain/proficiency";
import { localizedSpellPickerLabel, ownedSpellKeysForCharacter } from "../../domain/spellSelection";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { Combobox } from "../form/Combobox";
import styles from "./Spells.module.css";

const MAGIC_CONNOISSEUR_FEAT_KEY = "magic-connoisseur";

function spellLabel(
  spellKey: string,
  tEntity: ReturnType<typeof useLocale>["tEntity"],
  tGlossary: ReturnType<typeof useLocale>["tGlossary"],
): string {
  return localizedSpellPickerLabel(
    spellKey,
    (key, fallback) => tEntity("catalog.spells", key, "name", fallback),
    (school) => tGlossary("spellSchool", school),
  );
}

interface MagicConnoisseurSpellsSectionProps {
  activeFeatKeys: string[];
  featChoicesFor: (featKey: string) => FeatChoices;
  embedded?: boolean;
}

export function MagicConnoisseurSpellsSection({
  activeFeatKeys,
  featChoicesFor,
  embedded = false,
}: MagicConnoisseurSpellsSectionProps) {
  const { character, derived, dispatch } = useCharacter();
  const { t, tEntity, tGlossary } = useLocale();

  const hasFeat = useMemo(() => activeFeatKeys.includes(MAGIC_CONNOISSEUR_FEAT_KEY), [activeFeatKeys]);

  const ownedSpellKeys = useMemo(
    () =>
      ownedSpellKeysForCharacter({
        character,
        speciesCantrips: derived.speciesFeatureContributions.cantrips,
        speciesPreparedSpells: derived.speciesFeatureContributions.preparedSpells,
        activeFeatKeys,
        featChoicesFor,
        spellSlots: derived.spellcasting?.slotsByLevel,
      }),
    [character, derived, activeFeatKeys, featChoicesFor],
  );

  const takenFromOtherFeats = useMemo(
    () => featGrantedSpellKeysFromChoices(activeFeatKeys, featChoicesFor, MAGIC_CONNOISSEUR_FEAT_KEY),
    [activeFeatKeys, featChoicesFor],
  );

  if (!hasFeat) return null;

  const slot = findActiveFeatSlot(character, MAGIC_CONNOISSEUR_FEAT_KEY);
  if (!slot) return null;

  const choices = padFeatChoicesForFeat(featChoicesFor(MAGIC_CONNOISSEUR_FEAT_KEY), MAGIC_CONNOISSEUR_FEAT_KEY);
  const grantEffects = featGrantSpellsEffects(MAGIC_CONNOISSEUR_FEAT_KEY);
  if (grantEffects.length === 0) return null;

  let spellOffset = 0;

  const featTitle = tEntity("catalog.feats", MAGIC_CONNOISSEUR_FEAT_KEY, "name", MAGIC_CONNOISSEUR_FEAT_KEY);

  return (
    <section className={embedded ? styles.featSpellcastingGroup : styles.section}>
      {embedded ? <p className={styles.groupLabel}>{featTitle}</p> : <h3>{featTitle}</h3>}
      {grantEffects.map((grantEffect, effectIndex) => {
        const spellSlots = featSpellPickSlotCount(grantEffect, PROFICIENCY_BONUS);
        const pickLevel = grantEffect.spellLevel ?? 1;
        const spellOptions = featSpellPickOptionsForEffect(grantEffect, pickLevel, { activeFeatKeys });
        const block = (
          <div key={effectIndex} className={styles.pickerGroup}>
            <p className={styles.groupLabel}>{t("spells.featSpellLevelChoose", { level: pickLevel })}</p>
            {choices.spellPicks.slice(spellOffset, spellOffset + spellSlots).map((pick, index) => {
              const pickIndex = spellOffset + index;
              return (
                <Combobox
                  key={pickIndex}
                  id={`magic-connoisseur-spell-${pickIndex}`}
                  label={t("character.featSpellPick", { index: pickIndex + 1 })}
                  value={pick}
                  onChange={(spellKey) => dispatchFeatSpellPick(dispatch, slot, pickIndex, spellKey)}
                  options={availableFeatSpellOptions(
                    spellOptions,
                    choices.spellPicks,
                    pickIndex,
                    takenFromOtherFeats,
                    ownedSpellKeys,
                  ).map((key) => ({
                    key,
                    label: spellLabel(key, tEntity, tGlossary),
                  }))}
                />
              );
            })}
          </div>
        );
        spellOffset += spellSlots;
        return block;
      })}
    </section>
  );
}
