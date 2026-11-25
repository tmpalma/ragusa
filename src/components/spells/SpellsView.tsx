import { useMemo } from "react";
import { CLASSES, SPELLS, SUBCLASSES, findByKey } from "../../data";
import { effectiveLevelPath, resolvedClassLevels } from "../../domain/classLevels";
import {
  buildFeatSpellcastingEntries,
  buildFeatSpellUseTrackers,
  isMagicInitiateFeatKey,
} from "../../domain/featEffects";
import { featChoicesResolverForCharacter } from "../../domain/featSlots";
import { resolveCombatSpellRange } from "../../domain/spellCombat";
import { grantSpellcastingEffect } from "../../domain/spellcasting";
import { formatModifier } from "../../domain/modifiers";
import {
  activePerClassSpellcasting,
  allPerClassSpellPicks,
  buildAllGrantedSpells,
  buildCharacterSpellEntries,
  allCharacterSpellbookKeys,
  cantripPicksForClass,
  type CharacterSpellEntry,
  classSpellListFor,
  characterOwnedSpellKeys,
  filterOwnedSpellPickOptions,
  findSpellByKey,
  isMulticlassCharacter,
  characterConcentrationSpellKeys,
  characterRitualSpellKeys,
  spellPickLimitsByClass,
  subclassKeyForClass,
  unionCantripPicks,
} from "../../domain/spellSelection";
import {
  allSpellbookKeys,
  preparedSpellPickOptions,
  spellPickLimitsForClass,
  spellbookListKeys,
  spellbookRemoveAction,
  subclassSpellbookPickOptions,
  wizardProgressionSpellbookKeys,
  wizardCopiedSpellbookKeys,
} from "../../domain/spellSelection";
import { effectiveSpellListClassKey } from "../../domain/spellcasting";
import {
  findSubclass,
  subclassSpellbookPickCount,
  subclassSpellbookPickGrants,
} from "../../domain/subclasses";
import { CatalogProse } from "../CatalogProse";
import { ConfirmRemoveButton } from "../confirm/ConfirmRemoveButton";
import { useLocale } from "../../i18n/LocaleContext";
import { useMeasurementSystem } from "../../platform/measurementSystem";
import { useCharacter } from "../../state/CharacterContext";
import { activeFeatKeysFromCharacter } from "../../state/characterState";
import { ResourceCounter } from "../combat/ResourceCounter";
import combatStyles from "../combat/Combat.module.css";
import sheetStyles from "../sheet/Sheet.module.css";
import styles from "./Spells.module.css";
import { FontOfMagicSection, MetamagicSection } from "./SorcererSpellSections";
import { WarlockPactSpellBlocks } from "./WarlockSpellSections";
import { PaneHeader, PaneRestActions } from "../rest/PaneRestActions";
import { SpellCappedPickList } from "./SpellCappedPickList";
import { SpellCastControl } from "./SpellCastControl";
import { CollapsiblePane } from "../CollapsiblePane";
import { FeatSpellcastingSection } from "./FeatSpellcastingSection";
import { ClassSpellPickSection } from "./ClassSpellPickSection";
import { WizardSpellbookSection } from "./WizardSpellbookSection";
import { ConcentrationSection } from "./ConcentrationSection";
import { RitualSpellsSection } from "./RitualSpellsSection";
import { AlwaysPreparedSpellsSection } from "./AlwaysPreparedSpellsSection";

function spellLabel(spellKey: string, tEntity: ReturnType<typeof useLocale>["tEntity"]): string {
  const spell = findSpellByKey(spellKey);
  return tEntity("catalog.spells", spellKey, "name", spell?.name ?? spellKey);
}

export function SpellsView() {
  const { character, derived, dispatch } = useCharacter();
  const { t, tEntity, tGlossary } = useLocale();
  const { formatProse } = useMeasurementSystem();
  const { spellcasting, perClassSpellcasting, classData, speciesFeatureContributions } = derived;

  const levelPath = effectiveLevelPath(character);
  const classLevels = useMemo(() => resolvedClassLevels(levelPath), [levelPath]);
  const isMulticlass = isMulticlassCharacter(character);
  const castingClasses = useMemo(
    () => activePerClassSpellcasting(perClassSpellcasting),
    [perClassSpellcasting],
  );

  const activeFeatKeys = useMemo(() => activeFeatKeysFromCharacter(character), [character]);

  const featChoicesFor = useMemo(
    () => featChoicesResolverForCharacter(character),
    [character],
  );

  const limitsByClass = useMemo(
    () =>
      spellPickLimitsByClass(classLevels, {
        abilityModifiers: derived.abilityModifiers,
        getClassData: (classKey) => findByKey(CLASSES, classKey) ?? null,
        subclassByClass: character.subclassByClass,
        classFeatureChoicesByClass: character.classFeatureChoicesByClass,
        getSubclassData: (subclassKey) => findByKey(SUBCLASSES, subclassKey) ?? null,
      }),
    [
      classLevels,
      derived.abilityModifiers,
      character.subclassByClass,
      character.classFeatureChoicesByClass,
    ],
  );

  const unionCantrips = unionCantripPicks(character);

  const grantedSpells = useMemo(() => {
    const seen = new Set<string>();
    const merged: ReturnType<typeof buildAllGrantedSpells> = [];
    for (const { classKey, classLevel } of classLevels) {
      const subclassKey = subclassKeyForClass(character, classKey);
      const entries = buildAllGrantedSpells({
        speciesCantrips: speciesFeatureContributions.cantrips,
        speciesPreparedSpells: speciesFeatureContributions.preparedSpells,
        classKey,
        subclassKey,
        subclassFeatureChoices: character.subclassFeatureChoices,
        classFeatureOptionPicks: character.classFeatureOptionPicks,
        classFeatureSpellPicks: character.classFeatureSpellPicks,
        level: classLevel,
        activeFeatKeys,
        featChoicesFor,
        spellSlots: spellcasting?.slotsByLevel,
      });
      for (const entry of entries) {
        if (seen.has(entry.spellKey)) continue;
        seen.add(entry.spellKey);
        merged.push(entry);
      }
    }
    return merged;
  }, [
    classLevels,
    speciesFeatureContributions,
    character,
    activeFeatKeys,
    featChoicesFor,
    spellcasting?.slotsByLevel,
  ]);

  const ownedSpellKeys = useMemo(
    () =>
      characterOwnedSpellKeys({
        character,
        classLevels,
        speciesCantrips: speciesFeatureContributions.cantrips,
        speciesPreparedSpells: speciesFeatureContributions.preparedSpells,
        activeFeatKeys,
        featChoicesFor,
        spellSlots: spellcasting?.slotsByLevel,
      }),
    [
      character,
      classLevels,
      speciesFeatureContributions,
      activeFeatKeys,
      featChoicesFor,
      spellcasting?.slotsByLevel,
    ],
  );

  const featSpellcastingEntries = useMemo(
    () =>
      buildFeatSpellcastingEntries({
        activeFeatKeys,
        featChoicesFor,
        abilityModifiers: derived.abilityModifiers,
      }),
    [activeFeatKeys, featChoicesFor, derived.abilityModifiers],
  );

  const concentrationSpellKeys = useMemo(
    () =>
      characterConcentrationSpellKeys({
        character,
        classLevels,
        speciesCantrips: speciesFeatureContributions.cantrips,
        speciesPreparedSpells: speciesFeatureContributions.preparedSpells,
        activeFeatKeys,
        featChoicesFor,
        spellSlots: spellcasting?.slotsByLevel,
      }),
    [
      character,
      classLevels,
      speciesFeatureContributions,
      activeFeatKeys,
      featChoicesFor,
      spellcasting?.slotsByLevel,
    ],
  );

  const ritualSpellKeys = useMemo(
    () =>
      characterRitualSpellKeys({
        character,
        classLevels,
        speciesCantrips: speciesFeatureContributions.cantrips,
        speciesPreparedSpells: speciesFeatureContributions.preparedSpells,
        activeFeatKeys,
        featChoicesFor,
        spellSlots: spellcasting?.slotsByLevel,
      }),
    [
      character,
      classLevels,
      speciesFeatureContributions,
      activeFeatKeys,
      featChoicesFor,
      spellcasting?.slotsByLevel,
    ],
  );

  const hasRitualCaster = activeFeatKeys.includes("ritual-caster");

  const characterSpells = useMemo(() => {
    const grantedForList = hasRitualCaster
      ? grantedSpells.filter((entry) => entry.featKey !== "ritual-caster")
      : grantedSpells;
    const spellPicks = isMulticlass
      ? allPerClassSpellPicks(character, classLevels)
      : character.spellPicks;
    const hasWizardSpellbook = isMulticlass
      ? classLevels.some(
          ({ classKey }) =>
            findByKey(CLASSES, classKey)?.spellProgression?.listMode === "spellbook",
        )
      : classData?.spellProgression?.listMode === "spellbook";
    return buildCharacterSpellEntries({
      cantripPicks: unionCantrips,
      spellPicks,
      granted: grantedForList,
      alwaysPreparedPicks: character.alwaysPreparedSpellPicks,
      ...(hasWizardSpellbook
        ? { spellbookKnownKeys: allCharacterSpellbookKeys(character, classLevels) }
        : {}),
    });
  }, [
    character,
    classLevels,
    grantedSpells,
    hasRitualCaster,
    isMulticlass,
    classData,
    unionCantrips,
  ]);

  const spellsByLevel = useMemo(() => {
    const buckets = new Map<number, typeof characterSpells>();
    for (const entry of characterSpells) {
      const level = findSpellByKey(entry.spellKey)?.level ?? 0;
      const list = buckets.get(level);
      if (list) {
        list.push(entry);
      } else {
        buckets.set(level, [entry]);
      }
    }
    return [...buckets.entries()].sort((a, b) => a[0] - b[0]);
  }, [characterSpells]);

  const primarySubclassKey = character.classKey
    ? subclassKeyForClass(character, character.classKey)
    : null;
  const subclassData = findSubclass(character.classKey, primarySubclassKey);
  const hasSubclassSpellcasting = grantSpellcastingEffect(subclassData, character.level) != null;

  const singleClassLimits = useMemo(
    () =>
      spellPickLimitsForClass(
        classData ?? null,
        derived.abilityModifiers,
        character.level,
        character.classFeatureChoices,
        subclassData,
      ),
    [classData, derived.abilityModifiers, character.level, character.classFeatureChoices, subclassData],
  );

  const spellcastingSlots = spellcasting?.slotsByLevel ?? {};
  const spellcastingSlotLevels = Object.keys(spellcastingSlots)
    .map(Number)
    .sort((a, b) => a - b);
  const hasSpellcastingSlots = spellcastingSlotLevels.length > 0;

  const listMode = singleClassLimits.listMode ?? classData?.spellProgression?.listMode ?? null;
  const showSingleClassPickers =
    !isMulticlass &&
    spellcasting != null &&
    (listMode != null || hasSubclassSpellcasting);
  const isWizard = listMode === "spellbook";
  const hasFeatSpells = grantedSpells.some((entry) => entry.source === "feat");
  const ritualCasterSpellKeys = useMemo(
    () =>
      grantedSpells
        .filter((entry) => entry.featKey === "ritual-caster")
        .map((entry) => entry.spellKey),
    [grantedSpells],
  );

  const featSpellUseTrackers = useMemo(
    () => buildFeatSpellUseTrackers({ activeFeatKeys, featChoicesFor }),
    [activeFeatKeys, featChoicesFor],
  );

  const globalFeatSpellcastingEntries = useMemo(
    () => featSpellcastingEntries.filter((entry) => !isMagicInitiateFeatKey(entry.featKey)),
    [featSpellcastingEntries],
  );

  const globalFeatSpellUseTrackers = useMemo(
    () => featSpellUseTrackers.filter((tracker) => !isMagicInitiateFeatKey(tracker.featKey)),
    [featSpellUseTrackers],
  );

  const preparedLabel =
    listMode === "known"
      ? t("spells.spellsKnown")
      : listMode === "spellbook"
        ? t("spells.spellsPrepared")
        : t("spells.spellsPrepared");

  const cantripOptions = useMemo(() => {
    const keys = new Set<string>();
    for (const { classKey, classLevel } of classLevels) {
      const classEntry = findByKey(CLASSES, classKey);
      const subclassKey = subclassKeyForClass(character, classKey);
      const subclass = findSubclass(classKey, subclassKey);
      const listClassKey = effectiveSpellListClassKey(classEntry ?? null, subclass, classLevel);
      for (const key of classSpellListFor(classKey, listClassKey).cantrips) {
        keys.add(key);
      }
    }
    return filterOwnedSpellPickOptions([...keys], ownedSpellKeys, unionCantrips);
  }, [classLevels, character, ownedSpellKeys, unionCantrips]);
  const spellbookOptions = filterOwnedSpellPickOptions(
    spellbookListKeys(classData ?? null, character.level, subclassData),
    ownedSpellKeys,
    allSpellbookKeys({
      spellbookPicks: character.spellbookPicks,
      spellbookExtraPicks: character.spellbookExtraPicks,
      subclassSpellbookPicks: character.subclassSpellbookPicks,
    }),
  );
  const subclassSpellbookMax = subclassSpellbookPickCount(subclassData, character.level);
  const subclassSpellbookGrants = subclassSpellbookPickGrants(subclassData, character.level);
  const subclassSpellbookSchool = subclassSpellbookGrants[0]?.school;
  const subclassSpellbookAllowed = subclassSpellbookGrants.flatMap((grant: { school: string; maxSpellLevel: number }) =>
    subclassSpellbookPickOptions(
      character.classKey,
      grant.school,
      grant.maxSpellLevel,
      character.level,
    ),
  );
  const spellbookKnownKeys = allSpellbookKeys({
    spellbookPicks: character.spellbookPicks,
    spellbookExtraPicks: character.spellbookExtraPicks,
    subclassSpellbookPicks: character.subclassSpellbookPicks,
  });
  const preparedOptions = (
    isWizard
      ? spellbookKnownKeys
      : preparedSpellPickOptions(character.classKey, character.level, primarySubclassKey)
  );
  const filteredPreparedOptions = filterOwnedSpellPickOptions(
    preparedOptions,
    ownedSpellKeys,
    isWizard ? [...character.spellPicks, ...spellbookKnownKeys] : character.spellPicks,
  );

  const hasSpellSniper = activeFeatKeys.includes("spell-sniper");
  const showCantripUnionPicker =
    !isMulticlass && (spellcasting?.cantripsKnown ?? singleClassLimits.cantripSlots) > 0;
  const showMulticlassClassSections = isMulticlass && castingClasses.length > 0;
  const isSingleClassWarlock = !isMulticlass && character.classKey === "warlock";
  const showSingleClassSpellChoices = showCantripUnionPicker || showSingleClassPickers;

  const showKnownPreparedSpellsHeader = showMulticlassClassSections || spellcasting != null;

  function spellMeta(spellKey: string): string {
    const spell = findSpellByKey(spellKey);
    if (!spell) return "";
    const levelLabel = spell.level === 0 ? t("spells.cantrip") : t("spells.spellLevel", { level: spell.level });
    const ritual = spell.ritual ? ` · ${t("spells.ritual")}` : "";
    const concentration = spell.concentration ? t("spells.concentrationMark") : "";
    const range = formatProse(resolveCombatSpellRange(spell.range, spell.desc, hasSpellSniper));
    return `${levelLabel} · ${spell.school} · ${spell.castingTime} · ${range} · ${spell.components} · ${spell.duration}${concentration}${ritual}`;
  }

  function removeCharacterSpellEntry(entry: CharacterSpellEntry) {
    if (entry.source === "alwaysPrepared") {
      dispatch({ type: "REMOVE_ALWAYS_PREPARED_SPELL_PICK", spellKey: entry.spellKey });
      return;
    }
    if (entry.classFeatureSpellPick) {
      const picks = character.classFeatureSpellPicks[entry.classFeatureSpellPick.featureKey];
      if (!picks) return;
      const pool =
        entry.classFeatureSpellPick.kind === "cantrip" ? picks.cantrips : picks.rituals;
      const index = pool.findIndex((pick) => pick === entry.spellKey);
      if (index < 0) return;
      dispatch({
        type: "SET_CLASS_FEATURE_SPELL_PICK",
        featureKey: entry.classFeatureSpellPick.featureKey,
        kind: entry.classFeatureSpellPick.kind,
        index,
        spellKey: null,
      });
      return;
    }
    if (!entry.pickKind) return;
    removeCharacterSpellPick(entry.pickKind, entry.spellKey);
  }

  function removeCharacterSpellPick(pickKind: "cantrip" | "spell", spellKey: string) {
    if (pickKind === "cantrip") {
      if (isMulticlass) {
        for (const { classKey } of classLevels) {
          if (cantripPicksForClass(character, classKey).includes(spellKey)) {
            dispatch({ type: "REMOVE_CLASS_CANTRIP_PICK", classKey, spellKey });
            return;
          }
        }
        return;
      }
      dispatch({ type: "REMOVE_CANTRIP_PICK", spellKey });
      return;
    }
    if (isMulticlass) {
      for (const { classKey } of classLevels) {
        if (character.spellPicksByClass[classKey]?.includes(spellKey)) {
          dispatch({ type: "REMOVE_CLASS_SPELL_PICK", classKey, spellKey });
          return;
        }
      }
      if (character.spellPicks.includes(spellKey)) {
        dispatch({ type: "REMOVE_SPELL_PICK", spellKey });
      }
      return;
    }
    dispatch({ type: "REMOVE_SPELL_PICK", spellKey });
  }

  return (
    <div className={sheetStyles.pane} role="tabpanel" id="panel-spells" aria-labelledby="tab-spells">
      <PaneHeader title={t("spells.title")} actions={<PaneRestActions />} />

      {!character.classKey ? (
        <p className={sheetStyles.hint}>{t("spells.chooseClass")}</p>
      ) : null}

      {character.classKey && !spellcasting && castingClasses.length === 0 && classData?.casterType === "NONE" && !hasFeatSpells && !hasSubclassSpellcasting ? (
        <p className={sheetStyles.hint}>{t("spells.nonCaster")}</p>
      ) : null}

      {character.classKey && classData && classData.casterType !== "NONE" && !spellcasting && castingClasses.length === 0 && !hasSubclassSpellcasting ? (
        <p className={sheetStyles.hint}>{t("spells.spellcastingLater", { level: classData.spellcastingGainedAtLevel ?? 2 })}</p>
      ) : null}

      {hasSpellcastingSlots ? (
        <section className={`${styles.section} ${styles.spellSlotsSection}`}>
          <h3>{t("spells.spellcastingSlots")}</h3>
          <div className={combatStyles.statRow}>
            {spellcastingSlotLevels.map((spellLevel) => {
              const maxSlots = spellcastingSlots[spellLevel] ?? 0;
              const currentSlots = character.spellSlotRemaining[spellLevel] ?? maxSlots;
              return (
                <ResourceCounter
                  key={spellLevel}
                  id={`spell-slots-level-${spellLevel}`}
                  label={t("spells.nthLevelSlots", { level: spellLevel })}
                  current={currentSlots}
                  max={maxSlots}
                  decreaseLabel={t("spells.decreaseNthSlot", { level: spellLevel })}
                  increaseLabel={t("spells.increaseNthSlot", { level: spellLevel })}
                  currentLabel={t("spells.currentNthSlots", { level: spellLevel })}
                  onChange={(value) => dispatch({ type: "SET_SPELL_SLOT_REMAINING", spellLevel, value })}
                />
              );
            })}
          </div>
        </section>
      ) : null}

      <ConcentrationSection spellKeys={concentrationSpellKeys} />

      <RitualSpellsSection spellKeys={ritualSpellKeys} />

      {showKnownPreparedSpellsHeader ? (
        <section className={`${styles.section} ${styles.knownPreparedSpellsSection}`}>
          <CollapsiblePane
            title={
              <h3 className={styles.knownPreparedSpellsTitle}>{t("spells.knownPreparedSpells")}</h3>
            }
          >
      {showMulticlassClassSections ? (
        <section className={`${styles.section} ${styles.multiclassClassBlocksSection}`}>
          {castingClasses.map(({ classKey, classLevel, summary }) => {
            if (!summary) return null;
            const limits = limitsByClass[classKey];
            if (!limits) return null;
            return (
              <ClassSpellPickSection
                key={classKey}
                character={character}
                classKey={classKey}
                classLevel={classLevel}
                limits={limits}
                summary={summary}
                ownedSpellKeys={ownedSpellKeys}
                dispatch={dispatch}
                isMulticlass={isMulticlass}
              />
            );
          })}
        </section>
      ) : spellcasting ? (
        <section className={`${styles.section} ${styles.classSpellcastingSection}`}>
          <div className={sheetStyles.statGrid}>
            <div className={sheetStyles.statCard}>
              <p className={sheetStyles.statLabel}>
                {t("spells.abilityModifier", { ability: t(`rules.ability.${spellcasting.ability}`) })}
              </p>
              <p className={sheetStyles.statValue}>{formatModifier(spellcasting.abilityModifier)}</p>
            </div>
            <div className={sheetStyles.statCard}>
              <p className={sheetStyles.statLabel}>{t("spells.spellAttack")}</p>
              <p className={sheetStyles.statValue}>{formatModifier(spellcasting.attackBonus)}</p>
            </div>
            <div className={sheetStyles.statCard}>
              <p className={sheetStyles.statLabel}>{t("spells.saveDc")}</p>
              <p className={sheetStyles.statValue}>{spellcasting.saveDc}</p>
            </div>
            {spellcasting.cantripsKnown > 0 ? (
              <div className={sheetStyles.statCard}>
                <p className={sheetStyles.statLabel}>{t("spells.levelPaneCantrips")}</p>
                <p
                  className={`${sheetStyles.statValue} ${
                    unionCantrips.length < spellcasting.cantripsKnown
                      ? sheetStyles.statValueIncomplete
                      : ""
                  }`}
                >
                  {unionCantrips.length} / {spellcasting.cantripsKnown}
                </p>
              </div>
            ) : null}
            {spellcasting.spellsPreparedOrKnown > 0 ? (
              <div className={sheetStyles.statCard}>
                <p className={sheetStyles.statLabel}>{preparedLabel}</p>
                <p
                  className={`${sheetStyles.statValue} ${
                    character.spellPicks.length < spellcasting.spellsPreparedOrKnown
                      ? sheetStyles.statValueIncomplete
                      : ""
                  }`}
                >
                  {character.spellPicks.length} / {spellcasting.spellsPreparedOrKnown}
                </p>
              </div>
            ) : null}
          </div>

          {isSingleClassWarlock ? <WarlockPactSpellBlocks embedded /> : null}

          {showSingleClassSpellChoices ? (
            <>
              {showCantripUnionPicker ? (
                <div className={styles.pickerGroup}>
                  <SpellCappedPickList
                    id="cantrip-pick-select"
                    groupLabel={t("spells.chooseCantrips", {
                      count: unionCantrips.length,
                      max: spellcasting?.cantripsKnown ?? singleClassLimits.cantripSlots,
                    })}
                    comboboxLabel={t("spells.cantrip")}
                    allowedOptions={cantripOptions}
                    selectedKeys={unionCantrips}
                    maxCount={spellcasting?.cantripsKnown ?? singleClassLimits.cantripSlots}
                    onAdd={(spellKey) => dispatch({ type: "ADD_CANTRIP_PICK", spellKey })}
                    onRemove={(spellKey) => dispatch({ type: "REMOVE_CANTRIP_PICK", spellKey })}
                  />
                </div>
              ) : null}

              {showSingleClassPickers ? (
                <>
                  {!showCantripUnionPicker && singleClassLimits.cantripSlots > 0 ? (
                    <div className={styles.pickerGroup}>
                      <SpellCappedPickList
                        id="cantrip-pick-select-inline"
                        groupLabel={t("spells.chooseCantrips", {
                          count: unionCantrips.length,
                          max: singleClassLimits.cantripSlots,
                        })}
                        comboboxLabel={t("spells.cantrip")}
                        allowedOptions={cantripOptions}
                        selectedKeys={unionCantrips}
                        maxCount={singleClassLimits.cantripSlots}
                        onAdd={(spellKey) => dispatch({ type: "ADD_CANTRIP_PICK", spellKey })}
                        onRemove={(spellKey) => dispatch({ type: "REMOVE_CANTRIP_PICK", spellKey })}
                      />
                    </div>
                  ) : null}

                  {isWizard &&
                  (showCantripUnionPicker ||
                    (!showCantripUnionPicker && singleClassLimits.cantripSlots > 0)) ? (
                    <div className={styles.spellPickerSpacer} aria-hidden="true" />
                  ) : null}

                  {isWizard ? (
                    <WizardSpellbookSection
                      id="wizard-spellbook"
                      progressionSpellKeys={
                        character.classKey
                          ? wizardProgressionSpellbookKeys(character, character.classKey)
                          : []
                      }
                      copiedSpellKeys={wizardCopiedSpellbookKeys(character)}
                      copyOptions={spellbookOptions}
                      copyExcludeKeys={spellbookKnownKeys}
                      onCopyAdd={(spellKey) => dispatch({ type: "ADD_SPELLBOOK_EXTRA_PICK", spellKey })}
                      onRemove={(spellKey) => {
                        const action = spellbookRemoveAction(character, spellKey, character.classKey);
                        if (action) dispatch(action);
                      }}
                      knownSpellsPicker={
                        singleClassLimits.spellbookSlots > 0 ? (
                          <SpellCappedPickList
                            id="spellbook-pick-select"
                            showSelectedList={false}
                            groupLabel={t("spells.chooseSpellbook", {
                              count: character.spellbookPicks.length,
                              max: singleClassLimits.spellbookSlots,
                            })}
                            comboboxLabel={t("spells.spell")}
                            allowedOptions={spellbookOptions}
                            selectedKeys={character.spellbookPicks}
                            maxCount={singleClassLimits.spellbookSlots}
                            excludeKeys={spellbookKnownKeys}
                            onAdd={(spellKey) => dispatch({ type: "ADD_SPELLBOOK_PICK", spellKey })}
                            onRemove={(spellKey) => dispatch({ type: "REMOVE_SPELLBOOK_PICK", spellKey })}
                          />
                        ) : null
                      }
                      subclassSavantPicker={
                        subclassSpellbookMax > 0 ? (
                          <SpellCappedPickList
                            id="subclass-spellbook-pick-select"
                            showSelectedList={false}
                            groupLabel={t("spells.chooseSubclassSpellbook", {
                              school: subclassSpellbookSchool
                                ? tGlossary("spellSchool", subclassSpellbookSchool)
                                : subclassSpellbookSchool ?? "",
                              count: character.subclassSpellbookPicks.length,
                              max: subclassSpellbookMax,
                            })}
                            comboboxLabel={t("spells.spell")}
                            allowedOptions={subclassSpellbookAllowed}
                            selectedKeys={character.subclassSpellbookPicks}
                            maxCount={subclassSpellbookMax}
                            excludeKeys={spellbookKnownKeys}
                            onAdd={(spellKey) =>
                              dispatch({ type: "ADD_SUBCLASS_SPELLBOOK_PICK", spellKey })
                            }
                            onRemove={(spellKey) =>
                              dispatch({ type: "REMOVE_SUBCLASS_SPELLBOOK_PICK", spellKey })
                            }
                          />
                        ) : null
                      }
                    />
                  ) : null}

                  {isWizard && singleClassLimits.spellSlots > 0 ? (
                    <div className={styles.spellPickerSpacer} aria-hidden="true" />
                  ) : null}

                  {singleClassLimits.spellSlots > 0 ? (
                    <div className={styles.pickerGroup}>
                      <SpellCappedPickList
                        id="spell-pick-select"
                        groupLabel={
                          listMode === "known"
                            ? t("spells.chooseKnown", {
                                count: character.spellPicks.length,
                                max: singleClassLimits.spellSlots,
                              })
                            : t("spells.choosePrepared", {
                                count: character.spellPicks.length,
                                max: singleClassLimits.spellSlots,
                              })
                        }
                        comboboxLabel={t("spells.spell")}
                        allowedOptions={filteredPreparedOptions}
                        selectedKeys={character.spellPicks}
                        maxCount={singleClassLimits.spellSlots}
                        stackedAddRow
                        levelFilterClassName={`${styles.alwaysPreparedLevelFilter} ${styles.knownPreparedLevelFilterSpacer}`}
                        onAdd={(spellKey) => dispatch({ type: "ADD_SPELL_PICK", spellKey })}
                        onRemove={(spellKey) => dispatch({ type: "REMOVE_SPELL_PICK", spellKey })}
                      />
                    </div>
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}
        </section>
      ) : null}
          </CollapsiblePane>
        </section>
      ) : null}

      <FeatSpellcastingSection
        activeFeatKeys={activeFeatKeys}
        featChoicesFor={featChoicesFor}
        globalFeatSpellcastingEntries={globalFeatSpellcastingEntries}
        globalFeatSpellUseTrackers={globalFeatSpellUseTrackers}
        hasRitualCaster={hasRitualCaster}
        ritualCasterSpellKeys={ritualCasterSpellKeys}
      />

      <FontOfMagicSection />
      <MetamagicSection />

      <AlwaysPreparedSpellsSection />

      {grantedSpells.length > 0 && !showSingleClassPickers && !showMulticlassClassSections ? (
        <section className={styles.section}>
          <h3>{t("spells.grantedSpells")}</h3>
          <ul className={styles.grantedList}>
            {grantedSpells.map((entry) => (
              <li key={entry.spellKey}>{spellLabel(entry.spellKey, tEntity)}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {characterSpells.length > 0 ? (
        <section className={styles.section}>
          <h3>{t("spells.descriptions")}</h3>
          {spellsByLevel.map(([level, entries]) => (
            <CollapsiblePane
              key={level}
              defaultOpen={false}
              title={level === 0 ? t("spells.levelPaneCantrips") : t("spells.levelPaneSpells", { level })}
            >
              <div className={combatStyles.cards}>
                {entries.map((entry) => {
                  const spell = findSpellByKey(entry.spellKey);
                  const removable =
                    entry.source === "alwaysPrepared" || entry.pickKind || entry.classFeatureSpellPick;
                  return (
                    <CollapsiblePane
                      key={entry.spellKey}
                      variant="nested"
                      defaultOpen={false}
                      title={spellLabel(entry.spellKey, tEntity)}
                      summaryActions={
                        removable ? (
                          <ConfirmRemoveButton
                            className={styles.spellDescRemove}
                            stopPropagation
                            itemName={spellLabel(entry.spellKey, tEntity)}
                            onConfirm={() => removeCharacterSpellEntry(entry)}
                          />
                        ) : undefined
                      }
                    >
                      {entry.locked ? (
                        <p className={combatStyles.meta}>{t("spells.alwaysAvailable")}</p>
                      ) : null}
                      <p className={combatStyles.meta}>{spellMeta(entry.spellKey)}</p>
                      <CatalogProse className={combatStyles.description}>
                        {formatProse(
                          tEntity(
                            "catalog.spells",
                            entry.spellKey,
                            "desc",
                            spell?.desc ?? "",
                          ),
                        )}
                      </CatalogProse>
                      {spell?.effectOptions?.map((option) => (
                        <p key={option.key} className={combatStyles.description}>
                          <strong>{option.name}.</strong>{" "}
                          <CatalogProse variant="inline">{formatProse(option.desc)}</CatalogProse>
                        </p>
                      ))}
                      {spell && spell.level >= 1 ? (
                        <SpellCastControl
                          spellKey={entry.spellKey}
                          spellName={spellLabel(entry.spellKey, tEntity)}
                        />
                      ) : null}
                    </CollapsiblePane>
                  );
                })}
              </div>
            </CollapsiblePane>
          ))}
        </section>
      ) : character.classKey && (spellcasting || grantedSpells.length > 0) ? (
        <p className={sheetStyles.hint}>{t("spells.noSpellsSelected")}</p>
      ) : null}

      {SPELLS.length === 0 ? <p className={sheetStyles.hint}>{t("spells.catalogMissing")}</p> : null}
    </div>
  );
}
