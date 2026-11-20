import { useMemo } from "react";
import {
  availableFeatSpellOptions,
  featGrantSpellsEffects,
  featGrantedSpellKeysFromChoices,
  padFeatChoicesForFeat,
  FEAT_SPELLS_TAB_TOUCHED_KEYS,
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

interface TouchedFeatSpellsSectionProps {
  activeFeatKeys: string[];
  featChoicesFor: (featKey: string) => FeatChoices;
  embedded?: boolean;
}

export function TouchedFeatSpellsSection({
  activeFeatKeys,
  featChoicesFor,
  embedded = false,
}: TouchedFeatSpellsSectionProps) {
  const { character, derived, dispatch } = useCharacter();
  const { t, tEntity, tGlossary } = useLocale();

  const touchedFeatKeys = useMemo(
    () => activeFeatKeys.filter((featKey) => FEAT_SPELLS_TAB_TOUCHED_KEYS.has(featKey)),
    [activeFeatKeys],
  );

  const takenFromOtherFeats = useMemo(
    () => featGrantedSpellKeysFromChoices(activeFeatKeys, featChoicesFor, ""),
    [activeFeatKeys, featChoicesFor],
  );

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

  if (touchedFeatKeys.length === 0) return null;

  return (
    <>
      {touchedFeatKeys.map((featKey) => {
        const slot = findActiveFeatSlot(character, featKey);
        if (!slot) return null;

        const choices = padFeatChoicesForFeat(featChoicesFor(featKey), featKey);
        const grantEffects = featGrantSpellsEffects(featKey);
        const grantEffect = grantEffects[0];
        if (!grantEffect) return null;

        const spellSlots = featSpellPickSlotCount(grantEffect, PROFICIENCY_BONUS);
        if (spellSlots === 0) return null;

        const pickLevel = grantEffect.spellLevel ?? 1;
        const spellOptions = featSpellPickOptionsForEffect(grantEffect, pickLevel, { activeFeatKeys });
        const pick = choices.spellPicks[0] ?? null;
        const options = availableFeatSpellOptions(
          spellOptions,
          choices.spellPicks,
          0,
          takenFromOtherFeats,
          ownedSpellKeys,
        ).map((key) => ({
          key,
          label: spellLabel(key, tEntity, tGlossary),
        }));

        const fixedSpellKeys = [
          ...(grantEffect.fixedSpellKeys ?? []),
          ...(grantEffect.fixedSpellGrants?.map((grant) => grant.spellKey) ?? []),
        ];

        return (
          <section key={featKey} className={embedded ? styles.featSpellcastingGroup : styles.section}>
            {embedded ? (
              <p className={styles.groupLabel}>{tEntity("catalog.feats", featKey, "name", featKey)}</p>
            ) : (
              <h3>{tEntity("catalog.feats", featKey, "name", featKey)}</h3>
            )}
            {fixedSpellKeys.length > 0 ? (
              <div className={styles.pickerGroup}>
                <p className={styles.groupLabel}>{t("spells.touchedFeatGranted")}</p>
                <ul className={styles.grantedList}>
                  {fixedSpellKeys.map((spellKey) => (
                    <li key={spellKey}>{spellLabel(spellKey, tEntity, tGlossary)}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className={styles.pickerGroup}>
              <Combobox
                id={`touched-feat-${featKey}-spell-pick`}
                label={t("spells.touchedFeatSpellPick")}
                value={pick}
                onChange={(spellKey) => dispatchFeatSpellPick(dispatch, slot, 0, spellKey)}
                options={options}
              />
            </div>
          </section>
        );
      })}
    </>
  );
}
