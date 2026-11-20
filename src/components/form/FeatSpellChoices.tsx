import { useMemo } from "react";
import type { AbilityId } from "../../data/types";
import {
  availableFeatSpellOptions,
  featGrantSpellsEffects,
  featGrantedSpellKeysFromChoices,
  FEAT_SPELLS_TAB_PICK_KEYS,
  padFeatChoicesForFeat,
  type FeatChoices,
} from "../../domain/featEffects";
import {
  featCantripPickSlotCount,
  featSpellPickOptionsForEffect,
  featSpellPickSlotCount,
  magicInitiateFeatKeyFromActive,
  resolveFeatSpellcastingAbility,
  type GrantSpellsEffect,
} from "../../domain/featGrantSpells";
import { localizedSpellPickerLabel, ownedSpellKeysForCharacter } from "../../domain/spellSelection";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { Combobox } from "./Combobox";
import styles from "./Form.module.css";
import { PROFICIENCY_BONUS } from "../../domain/proficiency";

const SPELLCASTING_ABILITIES: AbilityId[] = ["int", "wis", "cha"];

interface FeatSpellChoicesProps {
  featKey: string;
  choices: FeatChoices;
  activeFeatKeys: string[];
  idPrefix: string;
  onSpellcastingAbilityChange: (ability: AbilityId | null) => void;
  onCantripPickChange: (index: number, spellKey: string | null) => void;
  onSpellPickChange: (index: number, spellKey: string | null) => void;
}

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

function featSpellcastingAbilityUi(
  grantEffects: GrantSpellsEffect[],
  choices: FeatChoices,
  activeFeatKeys: string[],
  featChoicesFor: (featKey: string) => FeatChoices,
  t: ReturnType<typeof useLocale>["t"],
  idPrefix: string,
  onSpellcastingAbilityChange: (ability: AbilityId | null) => void,
) {
  const magicInitiateKey = magicInitiateFeatKeyFromActive(activeFeatKeys);
  const magicInitiateChoices = magicInitiateKey ? featChoicesFor(magicInitiateKey) : undefined;
  const needsPicker = grantEffects.some(
    (effect) =>
      !effect.inheritAbilityFromAsi &&
      !effect.inheritAbilityFromMagicInitiate &&
      !effect.fixedSpellcastingAbility,
  );
  if (needsPicker) {
    return (
      <Combobox
        id={`${idPrefix}-spellcasting-ability`}
        label={t("character.featSpellcastingAbility")}
        value={choices.spellcastingAbility}
        onChange={(key) => onSpellcastingAbilityChange(key as AbilityId | null)}
        options={SPELLCASTING_ABILITIES.map((ability) => ({
          key: ability,
          label: t(`rules.ability.${ability}`),
        }))}
      />
    );
  }

  const resolvedAbility = resolveFeatSpellcastingAbility(grantEffects[0]!, choices, {
    magicInitiateChoices,
  });
  if (!resolvedAbility) return null;
  return (
    <p className={styles.meta}>
      {t("character.featSpellcastingAbility")}: {t(`rules.ability.${resolvedAbility}`)}
    </p>
  );
}

export function FeatSpellChoices({
  featKey,
  choices,
  activeFeatKeys,
  idPrefix,
  onSpellcastingAbilityChange,
  onCantripPickChange,
  onSpellPickChange,
}: FeatSpellChoicesProps) {
  const { t, tEntity, tGlossary } = useLocale();
  const { character, derived } = useCharacter();

  const grantEffects = featGrantSpellsEffects(featKey);
  const paddedChoices = padFeatChoicesForFeat(choices, featKey);
  const proficiencyBonus = PROFICIENCY_BONUS;

  const featChoicesFor = useMemo(
    () => (key: string) => {
      if (key === featKey) return choices;
      if (key === character.featKey) return character.featChoices;
      if (key === character.fightingStyleFeatKey) return character.fightingStyleFeatChoices;
      const extraIndex = character.extraFeats.indexOf(key);
      if (extraIndex >= 0) return character.extraFeatChoices[extraIndex] ?? choices;
      for (const [levelText, grantedKey] of Object.entries(character.classGrantedFeats)) {
        if (grantedKey === key) {
          return character.classGrantedFeatChoices[Number(levelText)] ?? choices;
        }
      }
      return choices;
    },
    [character, choices, featKey],
  );

  const takenFromOtherFeats = useMemo(
    () => featGrantedSpellKeysFromChoices(activeFeatKeys, featChoicesFor, featKey),
    [activeFeatKeys, featChoicesFor, featKey],
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

  if (grantEffects.length === 0) return null;
  if (FEAT_SPELLS_TAB_PICK_KEYS.has(featKey)) return null;

  let cantripOffset = 0;
  let spellOffset = 0;

  return (
    <div className={styles.field}>
      {featSpellcastingAbilityUi(
        grantEffects,
        paddedChoices,
        activeFeatKeys,
        featChoicesFor,
        t,
        idPrefix,
        onSpellcastingAbilityChange,
      )}

      {grantEffects.map((grantEffect, effectIndex) => {
        const cantripSlots = featCantripPickSlotCount(grantEffect);
        const spellSlots = featSpellPickSlotCount(grantEffect, proficiencyBonus);
        const pickLevel = grantEffect.spellLevel ?? 1;
        const spellOptions = featSpellPickOptionsForEffect(grantEffect, pickLevel, { activeFeatKeys });
        const cantripOptions =
          cantripSlots > 0 ? featSpellPickOptionsForEffect(grantEffect, 0, { activeFeatKeys }) : [];
        const effectId = `${idPrefix}-grant-${effectIndex}`;

        const block = (
          <>
            {grantEffect.fixedSpellKeys?.length ? (
              <div className={styles.field}>
                <span className={styles.groupLabel}>{t("character.featGrantedSpells")}</span>
                <ul>
                  {grantEffect.fixedSpellKeys.map((spellKey) => (
                    <li key={spellKey}>{spellLabel(spellKey, tEntity, tGlossary)}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {grantEffect.fixedSpellGrants?.length ? (
              <div className={styles.field}>
                <span className={styles.groupLabel}>{t("character.featGrantedSpells")}</span>
                <ul>
                  {grantEffect.fixedSpellGrants.map((grant) => (
                    <li key={grant.spellKey}>{spellLabel(grant.spellKey, tEntity, tGlossary)}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {cantripSlots > 0 ? (
              <div className={styles.field}>
                <span className={styles.groupLabel}>
                  {t("character.featCantripsChoose", { count: cantripSlots })}
                </span>
                {paddedChoices.cantripPicks.slice(cantripOffset, cantripOffset + cantripSlots).map((pick, index) => (
                  <Combobox
                    key={index}
                    id={`${effectId}-cantrip-${index}`}
                    label={t("character.featCantripPick", { index: cantripOffset + index + 1 })}
                    value={pick}
                    onChange={(spellKey) => onCantripPickChange(cantripOffset + index, spellKey)}
                    options={availableFeatSpellOptions(
                      cantripOptions,
                      paddedChoices.cantripPicks,
                      cantripOffset + index,
                      takenFromOtherFeats,
                      ownedSpellKeys,
                    ).map((key) => ({
                      key,
                      label: spellLabel(key, tEntity, tGlossary),
                    }))}
                  />
                ))}
              </div>
            ) : null}

            {spellSlots > 0 ? (
              <div className={styles.field}>
                <span className={styles.groupLabel}>
                  {grantEffect.ritualOnly
                    ? t("character.featRitualsChoose", { count: spellSlots })
                    : t("character.featSpellChoose")}
                </span>
                {paddedChoices.spellPicks.slice(spellOffset, spellOffset + spellSlots).map((pick, index) => (
                  <Combobox
                    key={index}
                    id={`${effectId}-spell-${index}`}
                    label={t("character.featSpellPick", { index: spellOffset + index + 1 })}
                    value={pick}
                    onChange={(spellKey) => onSpellPickChange(spellOffset + index, spellKey)}
                    options={availableFeatSpellOptions(
                      spellOptions,
                      paddedChoices.spellPicks,
                      spellOffset + index,
                      takenFromOtherFeats,
                      ownedSpellKeys,
                    ).map((key) => ({
                      key,
                      label: spellLabel(key, tEntity, tGlossary),
                    }))}
                  />
                ))}
              </div>
            ) : null}
          </>
        );

        cantripOffset += cantripSlots;
        spellOffset += spellSlots;
        return <div key={effectIndex}>{block}</div>;
      })}
    </div>
  );
}
