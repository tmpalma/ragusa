import { useMemo } from "react";
import { CLASSES, findByKey } from "../../data";
import type { SpellListMode } from "../../data/types";
import type { SpellPickLimits } from "../../domain/spellSelection";
import {
  allSpellbookKeys,
  cantripPickOptionsForClass,
  cantripPicksForClass,
  preparedSpellPickOptions,
  spellbookListKeys,
  filterOwnedSpellPickOptions,
  spellPicksForClass,
  spellbookPicksForClass,
  spellbookRemoveAction,
  subclassKeyForClass,
  subclassSpellbookPickOptions,
  wizardSpellbookDisplayKeys,
  wizardProgressionSpellbookKeys,
  wizardCopiedSpellbookKeys,
} from "../../domain/spellSelection";
import type { SpellcastingSummary } from "../../domain/spellcasting";
import { grantSpellcastingEffect } from "../../domain/spellcasting";
import {
  findSubclass,
  subclassSpellbookPickCount,
  subclassSpellbookPickGrants,
} from "../../domain/subclasses";
import { useLocale } from "../../i18n/LocaleContext";
import type { Character, CharacterAction } from "../../state/characterState";
import { SpellCappedPickList } from "./SpellCappedPickList";
import { WizardSpellbookSection } from "./WizardSpellbookSection";
import { WarlockPactSpellBlocks } from "./WarlockSpellSections";
import styles from "./Spells.module.css";

export function classSpellPickSectionHasContent(
  limits: SpellPickLimits,
  summary: SpellcastingSummary | null,
  listMode: SpellListMode | null,
  hasSubclassSpellcasting: boolean,
): boolean {
  return (
    summary != null &&
    (listMode != null || hasSubclassSpellcasting) &&
    (limits.cantripSlots > 0 ||
      limits.spellSlots > 0 ||
      (listMode === "spellbook" && limits.spellbookSlots > 0))
  );
}

export interface ClassSpellPickSectionProps {
  character: Character;
  classKey: string;
  classLevel: number;
  limits: SpellPickLimits;
  summary: SpellcastingSummary;
  ownedSpellKeys: Set<string>;
  dispatch: React.Dispatch<CharacterAction>;
  isMulticlass: boolean;
}

export function ClassSpellPickSection({
  character,
  classKey,
  classLevel,
  limits,
  summary,
  ownedSpellKeys,
  dispatch,
  isMulticlass,
}: ClassSpellPickSectionProps) {
  const { t, tEntity, tGlossary } = useLocale();

  const classData = findByKey(CLASSES, classKey);
  const subclassKey = subclassKeyForClass(character, classKey);
  const subclassData = findSubclass(classKey, subclassKey);
  const listMode = limits.listMode ?? classData?.spellProgression?.listMode ?? null;
  const isWizard = listMode === "spellbook";

  const selectedSpellPicks = spellPicksForClass(character, classKey);
  const selectedSpellbookPicks = isMulticlass
    ? spellbookPicksForClass(character, classKey)
    : character.spellbookPicks;
  const selectedCantripPicks = cantripPicksForClass(character, classKey);

  const spellbookOptions = useMemo(
    () =>
      filterOwnedSpellPickOptions(
        spellbookListKeys(classData ?? null, classLevel, subclassData),
        ownedSpellKeys,
        selectedSpellbookPicks,
      ),
    [classData, classLevel, subclassData, ownedSpellKeys, selectedSpellbookPicks],
  );

  const subclassSpellbookMax = subclassSpellbookPickCount(subclassData, classLevel);
  const subclassSpellbookGrants = subclassSpellbookPickGrants(subclassData, classLevel);
  const subclassSpellbookSchool = subclassSpellbookGrants[0]?.school;
  const subclassSpellbookAllowed = subclassSpellbookGrants.flatMap((grant) =>
    subclassSpellbookPickOptions(classKey, grant.school, grant.maxSpellLevel, classLevel),
  );

  const spellbookKnownKeys = useMemo(() => {
    const spellbookPicks = isMulticlass
      ? spellbookPicksForClass(character, classKey)
      : allSpellbookKeys({
          spellbookPicks: character.spellbookPicks,
          spellbookExtraPicks: character.spellbookExtraPicks,
          subclassSpellbookPicks: character.subclassSpellbookPicks,
        });
    if (isWizard && isMulticlass) return spellbookPicks;
    if (isWizard) {
      return allSpellbookKeys({
        spellbookPicks: character.spellbookPicks,
        spellbookExtraPicks: character.spellbookExtraPicks,
        subclassSpellbookPicks: character.subclassSpellbookPicks,
      });
    }
    return spellbookPicks;
  }, [character, classKey, isMulticlass, isWizard]);

  const preparedOptions = useMemo(
    () =>
      filterOwnedSpellPickOptions(
        isWizard
          ? spellbookKnownKeys
          : preparedSpellPickOptions(classKey, classLevel, subclassKey),
        ownedSpellKeys,
        isWizard ? [...selectedSpellPicks, ...spellbookKnownKeys] : selectedSpellPicks,
      ),
    [
      classKey,
      classLevel,
      isWizard,
      ownedSpellKeys,
      selectedSpellPicks,
      spellbookKnownKeys,
      subclassKey,
    ],
  );

  const cantripOptions = useMemo(
    () =>
      filterOwnedSpellPickOptions(
        cantripPickOptionsForClass(classKey, classLevel, character),
        ownedSpellKeys,
        selectedCantripPicks,
      ),
    [classKey, classLevel, character, ownedSpellKeys, selectedCantripPicks],
  );

  const classLabel = tEntity("catalog.classes", classKey, "name", classData?.name ?? classKey);

  const hasSubclassSpellcasting = grantSpellcastingEffect(subclassData, classLevel) != null;
  const showPickers = classSpellPickSectionHasContent(
    limits,
    summary,
    listMode,
    hasSubclassSpellcasting,
  );

  if (!showPickers) return null;

  function addCantripPick(spellKey: string) {
    if (isMulticlass) {
      dispatch({ type: "ADD_CLASS_CANTRIP_PICK", classKey, spellKey });
      return;
    }
    dispatch({ type: "ADD_CANTRIP_PICK", spellKey });
  }

  function removeCantripPick(spellKey: string) {
    if (isMulticlass) {
      dispatch({ type: "REMOVE_CLASS_CANTRIP_PICK", classKey, spellKey });
      return;
    }
    dispatch({ type: "REMOVE_CANTRIP_PICK", spellKey });
  }

  function addSpellPick(spellKey: string) {
    if (isMulticlass) {
      dispatch({ type: "ADD_CLASS_SPELL_PICK", classKey, spellKey });
      return;
    }
    dispatch({ type: "ADD_SPELL_PICK", spellKey });
  }

  function removeSpellPick(spellKey: string) {
    if (isMulticlass) {
      dispatch({ type: "REMOVE_CLASS_SPELL_PICK", classKey, spellKey });
      return;
    }
    dispatch({ type: "REMOVE_SPELL_PICK", spellKey });
  }

  function addSpellbookPick(spellKey: string) {
    if (isMulticlass) {
      dispatch({ type: "ADD_CLASS_SPELLBOOK_PICK", classKey, spellKey });
      return;
    }
    dispatch({ type: "ADD_SPELLBOOK_PICK", spellKey });
  }

  function removeSpellbookPick(spellKey: string) {
    if (isMulticlass) {
      dispatch({ type: "REMOVE_CLASS_SPELLBOOK_PICK", classKey, spellKey });
      return;
    }
    dispatch({ type: "REMOVE_SPELLBOOK_PICK", spellKey });
  }

  return (
    <div className={isMulticlass ? styles.multiclassClassSection : styles.pickerGroup}>
      <p className={isMulticlass ? styles.multiclassClassHeading : styles.groupLabel}>
        {isMulticlass
          ? t("spells.classAtLevel", { className: classLabel, level: classLevel })
          : t("spells.classSpellSection", { className: classLabel })}
      </p>

      {isMulticlass && classKey === "warlock" ? <WarlockPactSpellBlocks embedded /> : null}

      {limits.cantripSlots > 0 && isMulticlass ? (
        <SpellCappedPickList
          id={`cantrip-pick-select-${classKey}`}
          groupLabel={t("spells.chooseCantrips", {
            count: selectedCantripPicks.length,
            max: limits.cantripSlots,
          })}
          comboboxLabel={t("spells.cantrip")}
          allowedOptions={cantripOptions}
          selectedKeys={selectedCantripPicks}
          maxCount={limits.cantripSlots}
          onAdd={addCantripPick}
          onRemove={removeCantripPick}
        />
      ) : null}

      {isWizard && limits.cantripSlots > 0 && isMulticlass ? (
        <div className={styles.spellPickerSpacer} aria-hidden="true" />
      ) : null}

      {isWizard ? (
        <>
          <WizardSpellbookSection
            id={`wizard-spellbook-${classKey}`}
            progressionSpellKeys={wizardProgressionSpellbookKeys(character, classKey)}
            copiedSpellKeys={wizardCopiedSpellbookKeys(character)}
            copyOptions={spellbookOptions}
            copyExcludeKeys={wizardSpellbookDisplayKeys(character, classKey)}
            onCopyAdd={(spellKey) => dispatch({ type: "ADD_SPELLBOOK_EXTRA_PICK", spellKey })}
            onRemove={(spellKey) => {
              const action = spellbookRemoveAction(character, spellKey, classKey);
              if (action) dispatch(action);
            }}
            knownSpellsPicker={
              limits.spellbookSlots > 0 ? (
                <SpellCappedPickList
                  id={`spellbook-pick-select-${classKey}`}
                  showSelectedList={false}
                  groupLabel={t("spells.chooseSpellbook", {
                    count: selectedSpellbookPicks.length,
                    max: limits.spellbookSlots,
                  })}
                  comboboxLabel={t("spells.spell")}
                  allowedOptions={spellbookOptions}
                  selectedKeys={selectedSpellbookPicks}
                  maxCount={limits.spellbookSlots}
                  excludeKeys={wizardSpellbookDisplayKeys(character, classKey)}
                  onAdd={addSpellbookPick}
                  onRemove={removeSpellbookPick}
                />
              ) : null
            }
            subclassSavantPicker={
              subclassSpellbookMax > 0 ? (
                <SpellCappedPickList
                  id={`subclass-spellbook-pick-select-${classKey}`}
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
                  excludeKeys={wizardSpellbookDisplayKeys(character, classKey)}
                  onAdd={(spellKey) => dispatch({ type: "ADD_SUBCLASS_SPELLBOOK_PICK", spellKey })}
                  onRemove={(spellKey) =>
                    dispatch({ type: "REMOVE_SUBCLASS_SPELLBOOK_PICK", spellKey })
                  }
                />
              ) : null
            }
          />
        </>
      ) : null}

      {isWizard && limits.spellSlots > 0 ? (
        <div className={styles.spellPickerSpacer} aria-hidden="true" />
      ) : null}

      {limits.spellSlots > 0 ? (
        <SpellCappedPickList
          id={`spell-pick-select-${classKey}`}
          groupLabel={
            listMode === "known"
              ? t("spells.chooseKnown", {
                  count: selectedSpellPicks.length,
                  max: limits.spellSlots,
                })
              : t("spells.choosePrepared", {
                  count: selectedSpellPicks.length,
                  max: limits.spellSlots,
                })
          }
          comboboxLabel={t("spells.spell")}
          allowedOptions={preparedOptions}
          selectedKeys={selectedSpellPicks}
          maxCount={limits.spellSlots}
          stackedAddRow
          levelFilterClassName={`${styles.alwaysPreparedLevelFilter} ${styles.knownPreparedLevelFilterSpacer}`}
          onAdd={addSpellPick}
          onRemove={removeSpellPick}
        />
      ) : null}
    </div>
  );
}
