import { useState } from "react";
import type { AbilityId, BeastFormData } from "../../data/types";
import { traitSlugify } from "../../domain/combatActions";
import { abilityModifier, formatModifier } from "../../domain/modifiers";
import { isInWildShape, WILD_SHAPE_FEATURE_KEY, wildShapeEligibleBeasts } from "../../domain/wildShape";
import { useLocale, type TranslateFn } from "../../i18n/LocaleContext";
import { useMeasurementSystem } from "../../platform/measurementSystem";
import { useCharacter } from "../../state/CharacterContext";
import { CatalogProse } from "../CatalogProse";
import { Combobox } from "../form/Combobox";
import styles from "./Combat.module.css";

const WILD_SHAPE_PHYSICAL_ABILITIES: AbilityId[] = ["str", "dex", "con"];

/** Beast form enter/leave UI for embedding inside the Wild Shape class-feature card. */
export function WildShapeBeastFormSection() {
  const { character, derived, dispatch } = useCharacter();
  const { t, tEntity, tGlossary } = useLocale();
  const { formatProse } = useMeasurementSystem();

  if (character.classKey !== "druid" || character.level < 2) return null;

  const activeForm = derived.wildShapeForm;
  const tracker = derived.activeClassFeatures.find((feature) => feature.key === WILD_SHAPE_FEATURE_KEY);
  const maxUses = tracker?.limitedUses
    ? tracker.limitedUses.kind === "fixed"
      ? tracker.limitedUses.uses
      : 2
    : 2;
  const remainingUses = character.classFeatureUses[WILD_SHAPE_FEATURE_KEY] ?? maxUses;

  const knownOptions = character.wildShapeKnownForms
    .map((key) => {
      const beast = wildShapeEligibleBeasts(character.level, character.subclassKey).find((entry) => entry.key === key);
      if (!beast) return null;
      return {
        key,
        label: tEntity("catalog.beasts", key, "name", beast.name),
      };
    })
    .filter((option): option is { key: string; label: string } => option != null);

  if (isInWildShape(character) && activeForm) {
    const formName = tEntity("catalog.beasts", activeForm.key, "name", activeForm.name);
    return (
      <div className={styles.wildShapeBeastForm}>
        <p className={styles.wildShapeActiveFormName}>{formName}</p>
        <WildShapeFormDetails form={activeForm} t={t} tGlossary={tGlossary} />
        {(activeForm.traits ?? []).map((trait) => (
          <p key={trait.name} className={styles.description}>
            <strong>{trait.name}:</strong>{" "}
            <CatalogProse variant="inline">
              {formatProse(
                tEntity(
                  "catalog.beasts",
                  `${activeForm.key}.trait.${traitSlugify(trait.name)}.desc`,
                  "desc",
                  trait.desc,
                ),
              )}
            </CatalogProse>
          </p>
        ))}
        <button
          type="button"
          className={styles.textButton}
          onClick={() => dispatch({ type: "EXIT_WILD_SHAPE" })}
        >
          {t("combat.wildShapeLeave")}
        </button>
      </div>
    );
  }

  if (knownOptions.length === 0) return null;

  return (
    <WildShapeEnterForm
      knownOptions={knownOptions}
      remainingUses={remainingUses}
      onEnter={(formKey) => dispatch({ type: "ENTER_WILD_SHAPE", formKey })}
    />
  );
}

function WildShapeFormDetails({
  form,
  t,
  tGlossary,
}: {
  form: BeastFormData;
  t: TranslateFn;
  tGlossary: (category: string, sourceText: string) => string;
}) {
  const { formatLength } = useMeasurementSystem();
  const attributeSummary = WILD_SHAPE_PHYSICAL_ABILITIES.map((ability) => {
    const score = form.abilities[ability];
    return `${t(`rules.ability.${ability}`)} ${score} (${formatModifier(abilityModifier(score))})`;
  }).join(", ");

  return (
    <>
      <p className={styles.description}>
        <strong>{t("combat.wildShapeAttributes")}:</strong> {attributeSummary}
      </p>
      {form.speeds.map((speed) => (
        <p key={speed.type} className={styles.description}>
          <strong>{tGlossary("speedType", speed.type)}:</strong> {formatLength(speed.feet)}
        </p>
      ))}
    </>
  );
}

function WildShapeEnterForm({
  knownOptions,
  remainingUses,
  onEnter,
}: {
  knownOptions: { key: string; label: string }[];
  remainingUses: number;
  onEnter: (formKey: string) => void;
}) {
  const { t } = useLocale();
  const defaultKey = knownOptions[0]?.key ?? null;
  const [selectedKey, setSelectedKey] = useState<string | null>(defaultKey);

  return (
    <div className={styles.wildShapeBeastForm}>
      <Combobox
        id="wild-shape-enter-form"
        label={t("combat.wildShapeEnterForm")}
        value={selectedKey}
        onChange={setSelectedKey}
        options={knownOptions}
        placeholder={t("character.choosePlaceholder")}
      />
      <button
        type="button"
        className={styles.textButton}
        disabled={!selectedKey || remainingUses <= 0}
        onClick={() => selectedKey && onEnter(selectedKey)}
      >
        {t("combat.wildShapeAssume")}
      </button>
    </div>
  );
}
