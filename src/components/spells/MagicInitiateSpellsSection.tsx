import { useMemo } from "react";
import type { AbilityId } from "../../data/types";
import {
  availableFeatSpellOptions,
  buildFeatSpellUseTrackers,
  featGrantSpellsEffects,
  featGrantedSpellKeysFromChoices,
  padFeatChoicesForFeat,
  type FeatChoices,
} from "../../domain/featEffects";
import {
  dispatchFeatCantripPick,
  dispatchFeatSpellcastingAbility,
  dispatchFeatSpellPick,
} from "../../domain/featSpellPickDispatch";
import {
  featCantripPickSlotCount,
  featSpellPickOptionsForEffect,
  featSpellPickSlotCount,
  MAGIC_INITIATE_FEAT_KEYS,
  resolveFeatSpellcastingAbility,
} from "../../domain/featGrantSpells";
import { findActiveFeatSlot } from "../../domain/featSlots";
import { formatModifier } from "../../domain/modifiers";
import { computeSpellcasting } from "../../domain/spellcasting";
import { filterOwnedSpellPickOptions, localizedSpellPickerLabel, ownedSpellKeysForCharacter } from "../../domain/spellSelection";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { ResourceCounter } from "../combat/ResourceCounter";
import { CollapsiblePane } from "../CollapsiblePane";
import combatStyles from "../combat/Combat.module.css";
import { Combobox } from "../form/Combobox";
import sheetStyles from "../sheet/Sheet.module.css";
import { SpellCappedPickList } from "./SpellCappedPickList";
import styles from "./Spells.module.css";

const SPELLCASTING_ABILITIES: AbilityId[] = ["int", "wis", "cha"];

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

interface MagicInitiateSpellsSectionProps {
  activeFeatKeys: string[];
  featChoicesFor: (featKey: string) => FeatChoices;
  embedded?: boolean;
}

export function MagicInitiateSpellsSection({
  activeFeatKeys,
  featChoicesFor,
  embedded = false,
}: MagicInitiateSpellsSectionProps) {
  const { character, derived, dispatch } = useCharacter();
  const { t, tEntity, tGlossary } = useLocale();

  const magicInitiateFeatKeys = useMemo(
    () =>
      activeFeatKeys.filter((featKey) =>
        MAGIC_INITIATE_FEAT_KEYS.includes(featKey as (typeof MAGIC_INITIATE_FEAT_KEYS)[number]),
      ),
    [activeFeatKeys],
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

  if (magicInitiateFeatKeys.length === 0) return null;

  const paneTitle =
    magicInitiateFeatKeys.length === 1
      ? tEntity("catalog.feats", magicInitiateFeatKeys[0]!, "name", magicInitiateFeatKeys[0]!)
      : t("spells.magicInitiateSection");

  const featBlocks = magicInitiateFeatKeys.map((featKey) => {
        const slot = findActiveFeatSlot(character, featKey);
        if (!slot) return null;

        const choices = padFeatChoicesForFeat(featChoicesFor(featKey), featKey);
        const grantEffect = featGrantSpellsEffects(featKey)[0];
        if (!grantEffect) return null;

        const cantripSlots = featCantripPickSlotCount(grantEffect);
        const spellSlots = featSpellPickSlotCount(grantEffect, derived.proficiencyBonus);
        const cantripOptions = featSpellPickOptionsForEffect(grantEffect, 0, { activeFeatKeys });
        const spellOptions = featSpellPickOptionsForEffect(grantEffect, grantEffect.spellLevel ?? 1, {
          activeFeatKeys,
        });
        const takenFromOtherFeats = featGrantedSpellKeysFromChoices(activeFeatKeys, featChoicesFor, featKey);
        const resolvedAbility = resolveFeatSpellcastingAbility(grantEffect, choices);
        const spellcastingSummary =
          resolvedAbility != null
            ? computeSpellcasting({
                spellcastingAbility: resolvedAbility,
                spellcastingGainedAtLevel: 1,
                slotsByLevel: {},
                abilityModifierValue: derived.abilityModifiers[resolvedAbility],
                proficiencyBonus: derived.proficiencyBonus,
                characterLevel: character.level,
              })
            : null;
        const useTrackers = buildFeatSpellUseTrackers({
          activeFeatKeys: [featKey],
          featChoicesFor: (key) => featChoicesFor(key),
        });
        const selectedCantrips = choices.cantripPicks
          .slice(0, cantripSlots)
          .filter((key): key is string => key != null);

        return (
          <div key={featKey} className={embedded ? styles.featSpellcastingGroup : styles.section}>
            {embedded || magicInitiateFeatKeys.length > 1 ? (
              <p className={styles.groupLabel}>
                {tEntity("catalog.feats", featKey, "name", featKey)}
              </p>
            ) : null}

            {grantEffect.fixedSpellcastingAbility ? (
              <p className={styles.groupLabel}>
                {t("spells.abilityModifier", {
                  ability: t(`rules.ability.${grantEffect.fixedSpellcastingAbility}`),
                })}
              </p>
            ) : (
              <div className={styles.pickerGroup}>
                <Combobox
                  id={`magic-initiate-${featKey}-spellcasting-ability`}
                  label={t("character.featSpellcastingAbility")}
                  value={choices.spellcastingAbility}
                  onChange={(key) =>
                    dispatchFeatSpellcastingAbility(dispatch, slot, key as AbilityId | null)
                  }
                  options={SPELLCASTING_ABILITIES.map((ability) => ({
                    key: ability,
                    label: t(`rules.ability.${ability}`),
                  }))}
                />
              </div>
            )}

            {spellcastingSummary ? (
              <div className={sheetStyles.statGrid}>
                <div className={sheetStyles.statCard}>
                  <p className={sheetStyles.statLabel}>
                    {t("spells.abilityModifier", {
                      ability: t(`rules.ability.${spellcastingSummary.ability}`),
                    })}
                  </p>
                  <p className={sheetStyles.statValue}>{formatModifier(spellcastingSummary.abilityModifier)}</p>
                </div>
                <div className={sheetStyles.statCard}>
                  <p className={sheetStyles.statLabel}>{t("spells.spellAttack")}</p>
                  <p className={sheetStyles.statValue}>{formatModifier(spellcastingSummary.attackBonus)}</p>
                </div>
                <div className={sheetStyles.statCard}>
                  <p className={sheetStyles.statLabel}>{t("spells.saveDc")}</p>
                  <p className={sheetStyles.statValue}>{spellcastingSummary.saveDc}</p>
                </div>
              </div>
            ) : null}

            {cantripSlots > 0 ? (
              <div className={styles.pickerGroup}>
                <SpellCappedPickList
                  id={`magic-initiate-${featKey}-cantrip`}
                  showSelectedList
                  groupLabel={t("spells.chooseCantrips", {
                    count: selectedCantrips.length,
                    max: cantripSlots,
                  })}
                  comboboxLabel={t("spells.cantrip")}
                  allowedOptions={filterOwnedSpellPickOptions(
                    cantripOptions.filter((key) => !takenFromOtherFeats.has(key)),
                    ownedSpellKeys,
                    selectedCantrips,
                  )}
                  selectedKeys={selectedCantrips}
                  maxCount={cantripSlots}
                  onAdd={(spellKey) => {
                    const pickIndex = choices.cantripPicks.slice(0, cantripSlots).findIndex((pick) => pick == null);
                    if (pickIndex < 0) return;
                    dispatchFeatCantripPick(dispatch, slot, pickIndex, spellKey);
                  }}
                  onRemove={(spellKey) => {
                    const pickIndex = choices.cantripPicks
                      .slice(0, cantripSlots)
                      .findIndex((pick) => pick === spellKey);
                    if (pickIndex < 0) return;
                    dispatchFeatCantripPick(dispatch, slot, pickIndex, null);
                  }}
                />
              </div>
            ) : null}

            {spellSlots > 0 ? (
              <div className={styles.pickerGroup}>
                <p className={styles.groupLabel}>{t("character.featSpellChoose")}</p>
                {choices.spellPicks.slice(0, spellSlots).map((pick, index) => (
                  <Combobox
                    key={index}
                    id={`magic-initiate-${featKey}-spell-${index}`}
                    label={t("character.featSpellPick", { index: index + 1 })}
                    value={pick}
                    onChange={(spellKey) => dispatchFeatSpellPick(dispatch, slot, index, spellKey)}
                    options={availableFeatSpellOptions(
                      spellOptions,
                      choices.spellPicks,
                      index,
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

            {useTrackers.length > 0 ? (
              <div className={styles.pickerGroup}>
                <p className={styles.groupLabel}>{t("spells.featSpellFreeCasts")}</p>
                <div className={combatStyles.statRow}>
                  {useTrackers.map((tracker) => {
                    const spellName = spellLabel(tracker.spellKey, tEntity, tGlossary);
                    const currentUses = character.featSpellUses[tracker.storageKey] ?? tracker.maxUses;
                    return (
                      <ResourceCounter
                        key={tracker.id}
                        id={`magic-initiate-${featKey}-free-cast-${tracker.storageKey}`}
                        label={t("combat.featSpellUses", { spell: spellName })}
                        current={currentUses}
                        max={tracker.maxUses}
                        decreaseLabel={t("combat.decreaseFeatSpellUses", { spell: spellName })}
                        increaseLabel={t("combat.increaseFeatSpellUses", { spell: spellName })}
                        currentLabel={t("combat.currentFeatSpellUses", { spell: spellName })}
                        onChange={(value) =>
                          dispatch({ type: "SET_FEAT_SPELL_USES", featKey: tracker.storageKey, value })
                        }
                      />
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        );
      });

  if (embedded) {
    return <>{featBlocks}</>;
  }

  return <CollapsiblePane title={paneTitle}>{featBlocks}</CollapsiblePane>;
}
