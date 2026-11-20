import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  CAST_SLOT_LEVEL_MAX,
  type CastSlotPool,
  type CastSpellAvailabilityInput,
  buildCastConfirmResult,
  buildSpellFreeCastSources,
  castSlotLevelSummary,
  castSpellMinimumLevel,
  defaultCastSlotPool,
  initialCastSlotLevel,
  isCastConfirmEnabled,
  showCastSlotPoolChoice,
  type CompanionSummonPayment,
} from "../../domain/castSpell";
import type { CharacterAction } from "../../state/characterState";

export interface CastSpellConfirmPayload {
  actions: CharacterAction[];
  freeCastSourceId: string | null;
  slotLevel: number;
  slotPool: CastSlotPool;
  payment: CompanionSummonPayment;
}
import { useLocale } from "../../i18n/LocaleContext";
import { useBackOverlay } from "../../platform/useBackOverlay";
import { NumericStepper } from "../form/NumericStepper";
import confirmStyles from "../confirm/ConfirmDialog.module.css";
import styles from "./CastSpellDialog.module.css";

export interface CastSpellDialogProps {
  open: boolean;
  spellKey: string;
  spellName: string;
  availability: CastSpellAvailabilityInput;
  onConfirm: (payload: CastSpellConfirmPayload) => void;
  onCancel: () => void;
}

export function CastSpellDialog({
  open,
  spellKey,
  spellName,
  availability,
  onConfirm,
  onCancel,
}: CastSpellDialogProps) {
  const { t } = useLocale();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const freeCastGroupId = useId();

  const spellMinLevel = castSpellMinimumLevel(spellKey) ?? 1;
  const freeCastSources = useMemo(
    () => buildSpellFreeCastSources(availability),
    [availability],
  );

  const [slotLevel, setSlotLevel] = useState(spellMinLevel);
  const [slotPool, setSlotPool] = useState<CastSlotPool>("spell");
  const [freeCastSourceId, setFreeCastSourceId] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      const initialLevel = initialCastSlotLevel(spellMinLevel, availability);
      setSlotLevel(initialLevel);
      setSlotPool(defaultCastSlotPool(availability, initialLevel));
      setFreeCastSourceId(null);
      dialog.showModal();
      return;
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, spellMinLevel, availability]);

  useEffect(() => {
    if (freeCastSourceId) return;
    setSlotPool(defaultCastSlotPool(availability, slotLevel));
  }, [availability, slotLevel, freeCastSourceId]);

  useBackOverlay(open, onCancel);

  const usingFreeCast = freeCastSourceId != null;
  const levelSummary = castSlotLevelSummary(availability, usingFreeCast ? spellMinLevel : slotLevel);
  const poolChoiceVisible = !usingFreeCast && showCastSlotPoolChoice(availability, slotLevel);
  const confirmEnabled = isCastConfirmEnabled({
    freeCastSourceId,
    slotLevel: usingFreeCast ? spellMinLevel : slotLevel,
    slotPool,
    input: availability,
  });

  const slotHintParts: string[] = [];
  if (levelSummary.spellSlotsMax > 0) {
    slotHintParts.push(
      t(
        "spells.castRemainingSpellSlots",
        { remaining: levelSummary.spellSlotsRemaining, max: levelSummary.spellSlotsMax },
        "Spell slots: {remaining} of {max}",
      ),
    );
  }
  if (levelSummary.pactSlotsMax > 0) {
    slotHintParts.push(
      t(
        "spells.castRemainingPactSlots",
        { remaining: levelSummary.pactSlotsRemaining, max: levelSummary.pactSlotsMax },
        "Pact slots: {remaining} of {max}",
      ),
    );
  }
  if (slotHintParts.length === 0) {
    slotHintParts.push(t("spells.castNoSlotsAtLevel", undefined, "No spell slots at this level."));
  }

  function handleCancel() {
    onCancel();
  }

  function handleConfirm() {
    if (!confirmEnabled) return;
    const resolvedLevel = usingFreeCast ? spellMinLevel : slotLevel;
    const result = buildCastConfirmResult({
      freeCastSourceId,
      slotLevel: resolvedLevel,
      slotPool,
      input: availability,
    });
    if (!result) return;
    onConfirm({
      actions: result.actions,
      freeCastSourceId,
      slotLevel: resolvedLevel,
      slotPool,
      payment: result.payment,
    });
  }

  return (
    <dialog
      ref={dialogRef}
      className={confirmStyles.dialog}
      onCancel={handleCancel}
      onClose={handleCancel}
      aria-labelledby="cast-spell-dialog-title"
    >
      <div className={confirmStyles.content}>
        <h2 id="cast-spell-dialog-title" className={styles.title}>
          {t("spells.castDialogTitle", { spell: spellName }, "Cast {spell}")}
        </h2>

        <div className={styles.field}>
          <p className={styles.fieldLabel}>
            {t("spells.castSlotLevel", undefined, "Slot level")}
          </p>
          <NumericStepper
            id="cast-spell-slot-level"
            value={usingFreeCast ? spellMinLevel : slotLevel}
            min={spellMinLevel}
            max={CAST_SLOT_LEVEL_MAX}
            disabled={usingFreeCast}
            decreaseLabel={t("spells.castDecreaseSlotLevel", undefined, "Decrease slot level")}
            increaseLabel={t("spells.castIncreaseSlotLevel", undefined, "Increase slot level")}
            currentLabel={t("spells.castCurrentSlotLevel", undefined, "Spell slot level")}
            onChange={(value) => setSlotLevel(value)}
          />
          <p className={styles.slotHint}>{slotHintParts.join(" · ")}</p>
        </div>

        {poolChoiceVisible ? (
          <div className={styles.poolRow} role="radiogroup" aria-label={t("spells.castPoolChoice", undefined, "Spend")}>
            <p className={styles.fieldLabel}>{t("spells.castPoolChoice", undefined, "Spend")}</p>
            <label className={styles.poolOption}>
              <input
                type="radio"
                name="cast-slot-pool"
                value="spell"
                checked={slotPool === "spell"}
                onChange={() => setSlotPool("spell")}
              />
              <span>{t("spells.castPoolSpellSlot", undefined, "Spell slot")}</span>
            </label>
            <label className={styles.poolOption}>
              <input
                type="radio"
                name="cast-slot-pool"
                value="pact"
                checked={slotPool === "pact"}
                onChange={() => setSlotPool("pact")}
              />
              <span>{t("spells.castPoolPactSlot", undefined, "Pact slot")}</span>
            </label>
          </div>
        ) : null}

        {freeCastSources.length > 0 ? (
          <div className={styles.field}>
            <p className={styles.fieldLabel}>
              {t("spells.castWithoutSlotHeading", undefined, "Free cast")}
            </p>
            <div className={styles.freeCastList} role="radiogroup" aria-labelledby="cast-spell-dialog-title">
              <label className={styles.freeCastOption}>
                <input
                  type="radio"
                  name={freeCastGroupId}
                  checked={freeCastSourceId === null}
                  onChange={() => setFreeCastSourceId(null)}
                />
                <span>{t("spells.castWithSpellSlot", undefined, "Use a spell slot")}</span>
              </label>
              {freeCastSources.map((source) => {
                const disabled = source.remaining <= 0;
                const label = disabled
                  ? t(
                      "spells.castWithoutSlotNoneLeft",
                      { source: source.label },
                      "Cast without a spell slot ({source}) — none left",
                    )
                  : t(
                      "spells.castWithoutSlot",
                      { source: source.label },
                      "Cast without a spell slot ({source})",
                    );
                return (
                  <label
                    key={source.id}
                    className={`${styles.freeCastOption} ${disabled ? styles.freeCastOptionDisabled : ""}`.trim()}
                  >
                    <input
                      type="radio"
                      name={freeCastGroupId}
                      disabled={disabled}
                      checked={freeCastSourceId === source.id}
                      onChange={() => setFreeCastSourceId(source.id)}
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className={confirmStyles.actions}>
          <button type="button" className={confirmStyles.buttonSecondary} onClick={handleCancel}>
            {t("spells.castCancel", undefined, "Cancel")}
          </button>
          <button
            type="button"
            className={confirmStyles.button}
            disabled={!confirmEnabled}
            onClick={handleConfirm}
          >
            {t("spells.cast", undefined, "Cast")}
          </button>
        </div>
      </div>
    </dialog>
  );
}