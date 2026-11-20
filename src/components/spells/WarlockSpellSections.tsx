import { CLASSES, findByKey } from "../../data";
import {
  allClassCantripKeys,
  allPerClassSpellPicks,
  allRitualLevel1SpellKeys,
  availableSpellOptionsCompact,
  buildAllGrantedSpells,
  initialPactOfTheTomeSpellPicks,
  subclassKeyForClass,
  unionCantripPicks,
} from "../../domain/spellSelection";
import { effectiveLevelPath, resolvedClassLevels } from "../../domain/classLevels";
import type { PactMagicPool } from "../../domain/spellProgression";
import {
  PACT_OF_THE_TOME_KEY,
  PACT_OF_THE_TOME_SPELL_PICKS_KEY,
  selectedClassFeatureOptionPicks,
} from "../../domain/classFeatures";
import { featChoicesResolverForCharacter } from "../../domain/featSlots";
import { activeFeatKeysFromCharacter } from "../../state/characterState";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { ResourceCounter } from "../combat/ResourceCounter";
import combatStyles from "../combat/Combat.module.css";
import { SpellCappedPickList } from "./SpellCappedPickList";
import styles from "./Spells.module.css";

export function WarlockPactSpellBlocks({ embedded = false }: { embedded?: boolean }) {
  const { derived } = useCharacter();
  const { pactMagic } = derived;

  return (
    <>
      {pactMagic ? <PactMagicSlotsSection pactMagic={pactMagic} /> : null}
      <PactOfTheTomeSection embedded={embedded} />
    </>
  );
}

export function PactMagicSlotsSection({ pactMagic }: { pactMagic: PactMagicPool }) {
  const { character, dispatch } = useCharacter();
  const { t } = useLocale();

  const maxSlots = pactMagic.count;
  const currentSlots =
    character.pactSlotRemaining?.slotLevel === pactMagic.slotLevel
      ? character.pactSlotRemaining.count
      : maxSlots;

  return (
    <section className={styles.section}>
      <h3>{t("spells.pactMagicSlots")}</h3>
      <div className={combatStyles.statRow}>
        <ResourceCounter
          id="pact-spell-slots"
          label={t("spells.pactSpellSlots")}
          current={currentSlots}
          max={maxSlots}
          decreaseLabel={t("spells.decreasePactSlot")}
          increaseLabel={t("spells.increasePactSlot")}
          currentLabel={t("spells.currentPactSlots")}
          onChange={(value) =>
            dispatch({
              type: "SET_PACT_SLOT_REMAINING",
              count: value,
              slotLevel: pactMagic.slotLevel,
            })
          }
        />
        <div className={combatStyles.statCard}>
          <p className={combatStyles.statLabel}>{t("spells.spellSlotsLevel")}</p>
          <p className={combatStyles.statValue}>{pactMagic.slotLevel}</p>
        </div>
      </div>
    </section>
  );
}

export function PactOfTheTomeSection({ embedded = false }: { embedded?: boolean }) {
  const { character, derived, dispatch } = useCharacter();
  const { t } = useLocale();

  const classLevels = resolvedClassLevels(effectiveLevelPath(character));
  const warlockEntry = classLevels.find((entry) => entry.classKey === "warlock");
  if (!warlockEntry) return null;

  const warlockLevel = warlockEntry.classLevel;
  const warlockClassData = findByKey(CLASSES, "warlock");
  const warlockSubclassKey = subclassKeyForClass(character, "warlock");

  if (!warlockClassData) return null;

  const hasTome = selectedClassFeatureOptionPicks(
    warlockClassData,
    "eldritch-invocations",
    warlockLevel,
    character.classFeatureOptionPicks,
  ).some((option) => option.key === PACT_OF_THE_TOME_KEY);
  if (!hasTome) return null;

  const activeFeatKeys = activeFeatKeysFromCharacter(character);
  const featChoicesFor = featChoicesResolverForCharacter(character);
  const grantedKeys = new Set(
    buildAllGrantedSpells({
      speciesCantrips: derived.speciesFeatureContributions.cantrips,
      speciesPreparedSpells: derived.speciesFeatureContributions.preparedSpells,
      classKey: "warlock",
      subclassKey: warlockSubclassKey,
      subclassFeatureChoices: character.subclassFeatureChoices,
      classFeatureOptionPicks: character.classFeatureOptionPicks,
      classFeatureSpellPicks: {},
      level: warlockLevel,
      activeFeatKeys,
      featChoicesFor,
    }).map((entry) => entry.spellKey),
  );
  for (const pick of [...unionCantripPicks(character), ...allPerClassSpellPicks(character, classLevels)]) {
    grantedKeys.add(pick);
  }

  const picks =
    character.classFeatureSpellPicks[PACT_OF_THE_TOME_SPELL_PICKS_KEY] ?? initialPactOfTheTomeSpellPicks();
  const cantripPool = allClassCantripKeys().filter((key) => !grantedKeys.has(key));
  const ritualPool = allRitualLevel1SpellKeys().filter((key) => !grantedKeys.has(key));
  const selectedCantrips = picks.cantrips.filter((pick): pick is string => pick != null);
  const selectedRituals = picks.rituals.filter((pick): pick is string => pick != null);

  function addCantrip(spellKey: string) {
    const index = picks.cantrips.findIndex((pick) => pick == null);
    if (index < 0) return;
    dispatch({
      type: "SET_CLASS_FEATURE_SPELL_PICK",
      featureKey: PACT_OF_THE_TOME_SPELL_PICKS_KEY,
      kind: "cantrip",
      index,
      spellKey,
    });
  }

  function removeCantrip(spellKey: string) {
    const index = picks.cantrips.findIndex((pick) => pick === spellKey);
    if (index < 0) return;
    dispatch({
      type: "SET_CLASS_FEATURE_SPELL_PICK",
      featureKey: PACT_OF_THE_TOME_SPELL_PICKS_KEY,
      kind: "cantrip",
      index,
      spellKey: null,
    });
  }

  function addRitual(spellKey: string) {
    const index = picks.rituals.findIndex((pick) => pick == null);
    if (index < 0) return;
    dispatch({
      type: "SET_CLASS_FEATURE_SPELL_PICK",
      featureKey: PACT_OF_THE_TOME_SPELL_PICKS_KEY,
      kind: "ritual",
      index,
      spellKey,
    });
  }

  function removeRitual(spellKey: string) {
    const index = picks.rituals.findIndex((pick) => pick === spellKey);
    if (index < 0) return;
    dispatch({
      type: "SET_CLASS_FEATURE_SPELL_PICK",
      featureKey: PACT_OF_THE_TOME_SPELL_PICKS_KEY,
      kind: "ritual",
      index,
      spellKey: null,
    });
  }

  return (
    <section
      className={`${styles.section} ${styles.pactOfTheTomePane} ${embedded ? styles.pactOfTheTomePaneSpaced : ""}`}
    >
      <h3>{t("spells.pactOfTheTome")}</h3>
      <p className={styles.featureDesc}>{t("spells.pactOfTheTomeHint")}</p>
      <SpellCappedPickList
        id="pact-of-the-tome-cantrip-select"
        hideComboboxLabel
        groupLabel={t("spells.pactOfTheTomeCantrips", {
          count: selectedCantrips.length,
          max: picks.cantrips.length,
        })}
        comboboxLabel=""
        allowedOptions={availableSpellOptionsCompact(cantripPool, selectedCantrips)}
        selectedKeys={selectedCantrips}
        maxCount={picks.cantrips.length}
        onAdd={addCantrip}
        onRemove={removeCantrip}
      />
      <SpellCappedPickList
        id="pact-of-the-tome-ritual-select"
        hideComboboxLabel
        groupLabel={t("spells.pactOfTheTomeRituals", {
          count: selectedRituals.length,
          max: picks.rituals.length,
        })}
        comboboxLabel=""
        allowedOptions={availableSpellOptionsCompact(ritualPool, selectedRituals)}
        selectedKeys={selectedRituals}
        maxCount={picks.rituals.length}
        onAdd={addRitual}
        onRemove={removeRitual}
      />
    </section>
  );
}
