import { useMemo, useState, type MouseEvent } from "react";
import { BEASTS, SPECIES, findByKey } from "../../data";
import { effectiveLevelPath, resolvedClassLevels } from "../../domain/classLevels";
import { buildCastSpellAvailabilityInputFromCharacter } from "../../domain/castSpell";
import type { AvailableCreatureSource } from "../../domain/trackedCreatures";
import { characterRitualSpellKeys } from "../../domain/spellSelection";
import {
  buildCreatureSourceContext,
  companionSummonRequirementsMet,
  trackedCreatureDisplayHp,
  trackedCreatureRegistry,
} from "../../domain/trackedCreatures";
import { featChoicesResolverForCharacter } from "../../domain/featSlots";
import { activeFeatKeysFromCharacter } from "../../state/characterState";
import { CollapsiblePane } from "../CollapsiblePane";
import { Combobox } from "../form/Combobox";
import { NumericStepper } from "../form/NumericStepper";
import { HitPointsBlock } from "../combat/HitPointsBlock";
import { CastSpellDialog } from "../spells/CastSpellDialog";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import spellStyles from "../spells/Spells.module.css";
import { CreatureStatBlock } from "./CreatureStatBlock";
import styles from "./CreaturePane.module.css";

interface CreaturePaneProps {
  entry: AvailableCreatureSource;
}

function paneTitle(entry: AvailableCreatureSource, tEntity: ReturnType<typeof useLocale>["tEntity"]): string {
  const { definition } = entry;
  if (definition.titleField) {
    return tEntity(`catalog.${definition.titleEntityType}`, definition.titleEntityKey, definition.titleField);
  }
  return tEntity(`catalog.${definition.titleEntityType}`, definition.titleEntityKey, "name");
}

export function CreaturePane({ entry }: CreaturePaneProps) {
  const { t, tEntity } = useLocale();
  const { character, derived, dispatch } = useCharacter();
  const { definition, instance, statBlock } = entry;
  const id = instance.id;
  const ctx = useMemo(() => buildCreatureSourceContext(character), [character]);
  const [castDialogOpen, setCastDialogOpen] = useState(false);

  const summonSpellKey = definition.summonSpellKey;
  const spellName = summonSpellKey
    ? tEntity("catalog.spells", summonSpellKey, "name", summonSpellKey)
    : "";

  const activeFeatKeys = useMemo(() => activeFeatKeysFromCharacter(character), [character]);
  const featChoicesFor = useMemo(() => featChoicesResolverForCharacter(character), [character]);
  const speciesData = character.speciesKey ? findByKey(SPECIES, character.speciesKey) : null;

  const ritualSpellKeys = useMemo(() => {
    const classLevels = resolvedClassLevels(effectiveLevelPath(character));
    return characterRitualSpellKeys({
      character,
      classLevels,
      speciesCantrips: derived.speciesFeatureContributions.cantrips,
      speciesPreparedSpells: derived.speciesFeatureContributions.preparedSpells,
      activeFeatKeys,
      featChoicesFor,
      spellSlots: derived.spellcasting?.slotsByLevel,
    });
  }, [character, derived, activeFeatKeys, featChoicesFor]);

  const castAvailability = useMemo(() => {
    if (!summonSpellKey) return null;
    return buildCastSpellAvailabilityInputFromCharacter(
      character,
      derived,
      summonSpellKey,
      activeFeatKeys,
      featChoicesFor,
      speciesData,
      ritualSpellKeys,
    );
  }, [character, derived, summonSpellKey, activeFeatKeys, featChoicesFor, speciesData, ritualSpellKeys]);

  const castAvailabilityWithLabels = useMemo(() => {
    if (!castAvailability) return null;
    return {
      ...castAvailability,
      featNameFor: (featKey: string) => tEntity("catalog.feats", featKey, "name", featKey),
      speciesFeatureNameFor: (featureKey: string, fallback: string) =>
        tEntity("catalog.speciesFeatures", featureKey, "name", fallback),
      classFeatureNameFor: (_featureKey: string, fallback: string) => fallback,
    };
  }, [castAvailability, tEntity]);

  const formOptions = useMemo(() => {
    return definition.formOptions(ctx).map((option) => {
      const beast = findByKey(BEASTS, option.key);
      return {
        key: option.key,
        label: beast?.name ?? tEntity("catalog.beasts", option.key, "name", option.key),
      };
    });
  }, [ctx, definition, tEntity]);

  const spiritOptions = useMemo(() => {
    const spirits = definition.spiritTypeOptions(ctx);
    if (!spirits) return null;
    return spirits.map((spirit) => ({
      key: spirit,
      label: t(`companions.spiritType.${spirit}`),
    }));
  }, [ctx, definition, t]);

  const slotRange = summonSpellKey ? null : definition.castSlotLevelRange(ctx);
  const canSummon = useMemo(
    () => companionSummonRequirementsMet(ctx, trackedCreatureRegistry(), instance),
    [ctx, instance],
  );
  const summoned = instance.summoned === true;
  const showStats = summoned && statBlock != null;

  function handleSummaryActionClick(event: MouseEvent<HTMLButtonElement>, action: () => void) {
    event.preventDefault();
    event.stopPropagation();
    action();
  }

  const summaryActions =
    definition.supportsDismiss && summoned && !instance.dismissed ? (
      <button
        type="button"
        className={spellStyles.spellDescRemove}
        onClick={(event) => handleSummaryActionClick(event, () => dispatch({ type: "DISMISS_TRACKED_CREATURE", id }))}
      >
        {t("companions.dismiss")}
      </button>
    ) : definition.supportsDismiss && summoned && instance.dismissed ? (
      <button
        type="button"
        className={spellStyles.spellDescRemove}
        onClick={(event) => handleSummaryActionClick(event, () => dispatch({ type: "RECALL_TRACKED_CREATURE", id }))}
      >
        {t("companions.recall")}
      </button>
    ) : null;

  const hp = statBlock ? trackedCreatureDisplayHp(instance, statBlock.maxHitPoints) : null;

  function handleSummonedToggle(nextSummoned: boolean) {
    if (summonSpellKey && nextSummoned) {
      setCastDialogOpen(true);
      return;
    }
    dispatch({ type: "SET_TRACKED_CREATURE_SUMMONED", id, summoned: nextSummoned });
  }

  return (
    <CollapsiblePane title={paneTitle(entry, tEntity)} summaryActions={summaryActions}>
      <label className={styles.summonedRow}>
        <input
          type="checkbox"
          checked={summoned}
          disabled={!canSummon && !summoned}
          onChange={(event) => handleSummonedToggle(event.target.checked)}
        />
        <span>{t("companions.summoned", undefined, "Summoned")}</span>
      </label>

      {summonSpellKey && castAvailabilityWithLabels ? (
        <CastSpellDialog
          open={castDialogOpen}
          spellKey={summonSpellKey}
          spellName={spellName}
          availability={castAvailabilityWithLabels}
          onCancel={() => setCastDialogOpen(false)}
          onConfirm={({ actions, payment }) => {
            for (const castAction of actions) {
              dispatch(castAction);
            }
            dispatch({
              type: "SET_TRACKED_CREATURE_SUMMONED",
              id,
              summoned: true,
              payment,
            });
            setCastDialogOpen(false);
          }}
        />
      ) : null}

      {summoned && instance.dismissed ? <p className={styles.dismissed}>{t("companions.dismissed")}</p> : null}

      {formOptions.length > 1 ? (
        <Combobox
          id={`companion-form-${id}`}
          label={t("companions.chooseForm")}
          value={instance.formKey}
          onChange={(formKey) => dispatch({ type: "SET_TRACKED_CREATURE_FORM", id, formKey })}
          options={formOptions}
          placeholder={t("character.choosePlaceholder")}
        />
      ) : null}

      {spiritOptions ? (
        <Combobox
          id={`companion-spirit-${id}`}
          label={t("companions.chooseSpiritType")}
          value={instance.spiritType ?? null}
          onChange={(spiritType) => {
            if (spiritType === "celestial" || spiritType === "fey" || spiritType === "fiend") {
              dispatch({ type: "SET_TRACKED_CREATURE_SPIRIT_TYPE", id, spiritType });
            }
          }}
          options={spiritOptions}
          placeholder={t("character.choosePlaceholder")}
        />
      ) : null}

      {slotRange ? (
        <div className={styles.slotRow}>
          <label htmlFor={`companion-slot-${id}`}>{t("companions.castSlotLevel")}</label>
          <NumericStepper
            id={`companion-slot-${id}`}
            value={instance.castSlotLevel ?? slotRange.min}
            min={slotRange.min}
            max={slotRange.max}
            decreaseLabel={t("combat.decreaseHp")}
            increaseLabel={t("combat.increaseHp")}
            currentLabel={t("companions.castSlotLevel")}
            onChange={(value) => dispatch({ type: "SET_TRACKED_CREATURE_CAST_SLOT_LEVEL", id, castSlotLevel: value })}
            stepperClassName={styles.slotStepper}
          />
        </div>
      ) : null}

      {showStats && statBlock && hp ? (
        <>
          <HitPointsBlock
            maxHp={statBlock.maxHitPoints}
            currentHp={hp.current}
            maxHpBonus={0}
            tempMax={instance.temporaryHitPointsMax}
            tempRemaining={instance.temporaryHitPointsRemaining}
            onHpChange={(value) => dispatch({ type: "SET_TRACKED_CREATURE_CURRENT_HP", id, value })}
            onMaxHpBonusApply={() => undefined}
            onMaxHpBonusClear={() => undefined}
            onTempChange={(max, remaining) => dispatch({ type: "SET_TRACKED_CREATURE_TEMP_HP", id, max, remaining })}
          />

          {statBlock.useTrackers.length > 0 ? (
            <ul className={styles.usesList}>
              {statBlock.useTrackers.map((tracker) => {
                const remaining = instance.featureUses[tracker.useKey] ?? tracker.maxUses;
                return (
                  <li key={tracker.useKey}>
                    <span>{t(tracker.labelKey)}</span>
                    <NumericStepper
                      id={`companion-use-${id}-${tracker.useKey}`}
                      value={remaining}
                      min={0}
                      max={tracker.maxUses}
                      decreaseLabel={t("combat.decreaseHp")}
                      increaseLabel={t("combat.increaseHp")}
                      currentLabel={t(tracker.labelKey)}
                      onChange={(value) =>
                        dispatch({ type: "SET_TRACKED_CREATURE_FEATURE_USE", id, useKey: tracker.useKey, value })
                      }
                      stepperClassName={styles.useStepper}
                    />
                  </li>
                );
              })}
            </ul>
          ) : null}

          <CreatureStatBlock block={statBlock} />
        </>
      ) : null}
    </CollapsiblePane>
  );
}