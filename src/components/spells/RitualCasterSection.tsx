import { useMemo } from "react";
import { featGrantSpellsEffects, type FeatChoices } from "../../domain/featEffects";
import {
  featSpellPickOptionsForEffect,
  featSpellPickSlotCount,
  resolveFeatSpellcastingAbility,
} from "../../domain/featGrantSpells";
import { dispatchFeatSpellPick } from "../../domain/featSpellPickDispatch";
import { findActiveFeatSlot } from "../../domain/featSlots";
import { PROFICIENCY_BONUS } from "../../domain/proficiency";
import { featGrantedSpellKeys, filterOwnedSpellPickOptions, findSpellByKey, ownedSpellKeysForCharacter } from "../../domain/spellSelection";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { SpellCappedPickList } from "./SpellCappedPickList";
import styles from "./Spells.module.css";
import sheetStyles from "../sheet/Sheet.module.css";

const RITUAL_CASTER_FEAT_KEY = "ritual-caster";

function spellLabel(spellKey: string, tEntity: ReturnType<typeof useLocale>["tEntity"]): string {
  const spell = findSpellByKey(spellKey);
  return tEntity("catalog.spells", spellKey, "name", spell?.name ?? spellKey);
}

interface RitualCasterSectionProps {
  activeFeatKeys: string[];
  featChoicesFor: (featKey: string) => FeatChoices;
  ritualSpellKeys: string[];
  embedded?: boolean;
}

export function RitualCasterSection({
  activeFeatKeys,
  featChoicesFor,
  ritualSpellKeys,
  embedded = false,
}: RitualCasterSectionProps) {
  const { character, derived, dispatch } = useCharacter();
  const { t, tEntity } = useLocale();

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

  const ritualSlot = useMemo(
    () => (activeFeatKeys.includes(RITUAL_CASTER_FEAT_KEY) ? findActiveFeatSlot(character, RITUAL_CASTER_FEAT_KEY) : null),
    [activeFeatKeys, character],
  );

  const grantEffect = featGrantSpellsEffects(RITUAL_CASTER_FEAT_KEY)[0];
  const choices = featChoicesFor(RITUAL_CASTER_FEAT_KEY);
  const maxCount = grantEffect ? featSpellPickSlotCount(grantEffect, PROFICIENCY_BONUS) : 0;
  const ritualOptions = grantEffect ? featSpellPickOptionsForEffect(grantEffect, 1) : [];
  const selectedKeys = choices.spellPicks.slice(0, maxCount).filter((key): key is string => key != null);

  const takenFromOtherFeats = useMemo(
    () =>
      featGrantedSpellKeys({
        activeFeatKeys,
        featChoicesFor,
      }),
    [activeFeatKeys, featChoicesFor],
  );

  const spellcastingAbility = grantEffect ? resolveFeatSpellcastingAbility(grantEffect, choices) : null;

  if (!ritualSlot || !grantEffect || maxCount === 0) return null;

  const allowedOptions = filterOwnedSpellPickOptions(
    ritualOptions.filter((key) => !takenFromOtherFeats.has(key)),
    ownedSpellKeys,
    selectedKeys,
  );

  const featTitle = tEntity("catalog.feats", RITUAL_CASTER_FEAT_KEY, "name", "Ritual Caster");

  return (
    <section className={embedded ? styles.featSpellcastingGroup : styles.section}>
      {embedded ? (
        <p className={styles.groupLabel}>{featTitle}</p>
      ) : (
        <h3>{featTitle}</h3>
      )}
      {spellcastingAbility ? (
        <p className={styles.groupLabel}>
          {t("spells.abilityModifier", { ability: t(`rules.ability.${spellcastingAbility}`) })}
        </p>
      ) : null}

      <div className={styles.pickerGroup}>
        <SpellCappedPickList
          id="ritual-caster-pick-select"
          showSelectedList
          groupLabel={t("spells.ritualCasterChoose", {
            count: selectedKeys.length,
            max: maxCount,
          })}
          comboboxLabel={t("spells.ritual")}
          allowedOptions={allowedOptions}
          selectedKeys={selectedKeys}
          maxCount={maxCount}
          onAdd={(spellKey) => {
            const pickIndex = choices.spellPicks.slice(0, maxCount).findIndex((pick) => pick == null);
            if (pickIndex < 0) return;
            dispatchFeatSpellPick(dispatch, ritualSlot, pickIndex, spellKey);
          }}
          onRemove={(spellKey) => {
            const index = choices.spellPicks.findIndex((pick) => pick === spellKey);
            if (index >= 0) dispatchFeatSpellPick(dispatch, ritualSlot, index, null);
          }}
        />
      </div>

      {ritualSpellKeys.length > 0 ? (
        <div className={styles.pickerGroup}>
          <p className={styles.groupLabel}>{t("spells.ritualCasterPrepared")}</p>
          <ul className={styles.grantedList}>
            {ritualSpellKeys.map((spellKey) => (
              <li key={spellKey}>{spellLabel(spellKey, tEntity)}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className={sheetStyles.hint}>{t("spells.ritualCasterEmpty")}</p>
      )}
    </section>
  );
}
