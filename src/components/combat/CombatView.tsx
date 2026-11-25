import { useMemo, useState, type ChangeEvent, type SyntheticEvent } from "react";
import { findByKey, ARMOR, WEAPONS } from "../../data";
import { buildCombatActions, type CombatCard } from "../../domain/combatActions";
import { ownedMagicItemWeapons } from "../../domain/magicItemWeapons";
import {
  ammoBonusForType,
  ammunitionRemaining,
  ammunitionTypeForWeapon,
  isThrownWeapon,
  magicAmmoStackRemaining,
  magicAmmoStacksForType,
  resolvePreferredMagicAmmoId,
  shouldConsumeAmmunition,
  shouldConsumeThrownQuantity,
  weaponQuantity,
} from "../../domain/ammunition";
import type { AmmoType } from "../../data/ammunitionStats";
import {
  buildCharacterSpellEntries,
  buildAllGrantedSpells,
  findSpellByKey,
  allPerClassSpellPicks,
  isMulticlassCharacter,
  unionCantripPicks,
} from "../../domain/spellSelection";
import { effectiveLevelPath, resolvedClassLevels } from "../../domain/classLevels";
import { buildCombatSpellCards } from "../../domain/spellCombat";
import { buildBeastAttackCards, isInWildShape } from "../../domain/wildShape";
import {
  buildFeatSpellUseTrackers,
  buildFeatSpecialFeatureCards,
  buildFeatUseTrackers,
  type FeatUseTracker,
} from "../../domain/featEffects";
import { featChoicesResolverForCharacter, featWeaponMasteryPicksFromCharacter } from "../../domain/featSlots";
import {
  buildClassFeatureActionCards,
  buildClassFeatureCards,
  buildClassFeaturePoolTrackers,
  buildClassFeatureUseTrackers,
  buildInvocationActionCards,
  buildMasteryRiderCards,
  buildWeaponMasteryEmptyPrompt,
  bardicInspirationDieSides,
  darkOnesBlessingTempHp,
  effectiveWeaponProficiencyGrants,
  type ClassFeatureUseTracker,
} from "../../domain/classFeatures";
import { findSubclass } from "../../domain/subclasses";
import { listEquipmentActionDisplays } from "../../domain/equipmentActions";
import { localizedVariantDisplayName } from "../../domain/genericVariantDisplay";
import { findGenericVariant } from "../../domain/genericVariantMatcher";
import { collectArmoryChargeTrackers } from "../../domain/genericVariantResolve";
import { usesPerRestLabelKey } from "../../domain/combatUseTrackers";
import {
  combatHitPointsMutationForDisplayTarget,
  displayHitPointsAfterBulkChange,
} from "../../domain/hitPoints";
import { formatModifier } from "../../domain/modifiers";
import {
  buildSpeciesFeatureActionCards,
  buildSpeciesFeatureCards,
  buildSpeciesFeatureUseTrackers,
  formatSpeciesFeatureCombatTitle,
  type SpeciesFeatureUseTracker,
} from "../../domain/speciesFeatures";
import { useLocale } from "../../i18n/LocaleContext";
import { useMeasurementSystem } from "../../platform/measurementSystem";
import { localizeCombatCard } from "../../i18n/localizeCombatCard";
import { isNative } from "../../platform/fileIo";
import { useCombatKeepAwake } from "../../platform/useCombatKeepAwake";
import { useCharacter } from "../../state/CharacterContext";
import { activeFeatKeysFromCharacter } from "../../state/characterState";
import { Combobox } from "../form/Combobox";
import styles from "./Combat.module.css";
import { ResourceCounter } from "./ResourceCounter";
import { HitPointsBlock } from "./HitPointsBlock";
import { ConditionsBlock } from "./ConditionsBlock";
import { ConcentrationCheckDialog } from "./ConcentrationCheckDialog";
import { SpellCastControl } from "../spells/SpellCastControl";
import { DeathSavesBlock } from "./DeathSavesBlock";
import { SavingThrowsBlock } from "./SavingThrowsBlock";
import { EldritchInvocationsSection } from "./WarlockCombatSections";
import { WildShapeBeastFormSection } from "./WildShapeCombatPanel";
import { WildShapeKnownFormsInput } from "../form/WildShapeKnownFormsInput";
import { ArmorModelPickList } from "./ArmorModelPickList";
import { ElixirsPickList } from "./ElixirsPickList";
import { ManeuversPickList } from "./ManeuversPickList";

function featUseTrackerLabel(
  tracker: Pick<FeatUseTracker, "featKey" | "labelKey">,
  t: ReturnType<typeof useLocale>["t"],
  tEntity: ReturnType<typeof useLocale>["tEntity"],
): string {
  return tracker.labelKey
    ? t(tracker.labelKey)
    : tEntity("catalog.feats", tracker.featKey, "name", tracker.featKey);
}

function classFeatureUseTrackerLabel(
  tracker: Pick<ClassFeatureUseTracker, "classKey" | "featureKey" | "catalogEntityKey" | "name">,
  level: number,
  t: ReturnType<typeof useLocale>["t"],
  tEntity: ReturnType<typeof useLocale>["tEntity"],
): string {
  if (tracker.featureKey === "combat-superiority") {
    return t("combat.superiorityDice");
  }
  const name = tEntity("catalog.classes", tracker.catalogEntityKey, "name", tracker.name);
  if (tracker.classKey === "bard" && tracker.featureKey === "bardic-inspiration") {
    return t("combat.featureTrackerWithDie", {
      name,
      die: `d${bardicInspirationDieSides(level)}`,
    });
  }
  return name;
}

function embeddedUsesLabel(
  restRecovery: ClassFeatureUseTracker["restRecovery"] | FeatUseTracker["restRecovery"] | SpeciesFeatureUseTracker["restRecovery"] | undefined,
  t: ReturnType<typeof useLocale>["t"],
): string {
  return t(usesPerRestLabelKey(restRecovery));
}

function embeddedClassFeatureUsesLabel(
  tracker: ClassFeatureUseTracker,
  level: number,
  t: ReturnType<typeof useLocale>["t"],
): string {
  if (tracker.classKey === "bard" && tracker.featureKey === "bardic-inspiration") {
    return t("combat.featureTrackerWithDie", {
      name: t("combat.usesPerLongRest"),
      die: `d${bardicInspirationDieSides(level)}`,
    });
  }
  return embeddedUsesLabel(tracker.restRecovery, t);
}

import { PaneHeader, PaneRestActions } from "../rest/PaneRestActions";
import { CollapsiblePane } from "../CollapsiblePane";
import { EquipmentActionDescriptionsList } from "../equipment/EquipmentActionControls";
import { CatalogProse } from "../CatalogProse";
import { CombatReferenceOptions } from "./CombatReferenceOptions";
import { FeatCombatChoices } from "./FeatCombatChoices";

type CombatSessionVariant = "vitals" | "actions";

function CombatSessionPane({ variant }: { variant: CombatSessionVariant }) {
  const { character, derived, dispatch } = useCharacter();
  const { t, tEntity, tGlossary, locale } = useLocale();
  const { formatLength, formatProse } = useMeasurementSystem();
  const { enabled: keepAwakeEnabled, setKeepAwakeEnabled, loaded: keepAwakeLoaded } =
    useCombatKeepAwake(true);
  const [concentrationReminder, setConcentrationReminder] = useState<{
    spellKey: string;
    damageTaken: number;
  } | null>(null);
  const maxHp = derived.hitPoints;
  const currentHp = character.currentHitPoints ?? maxHp;
  const hpReady = maxHp != null && currentHp != null;

  const hitDicePools = derived.hitDicePools;
  const hitDiceReady = hitDicePools.length > 0;

  const spellcastingAbilityLabel = character.speciesSpellcastingAbility
    ? t(`rules.ability.${character.speciesSpellcastingAbility}`)
    : null;

  const levelPath = effectiveLevelPath(character);
  const classLevels = useMemo(() => resolvedClassLevels(levelPath), [levelPath]);
  const isMulticlass = isMulticlassCharacter(character);

  const combinedWeaponMasteryPicks = useMemo(
    () => [
      ...character.weaponMasteryPicks.filter(Boolean),
      ...featWeaponMasteryPicksFromCharacter(character),
    ],
    [character],
  );

  const classFeatureInput = useMemo(
    () => ({
      classData: derived.classData,
      subclassData: findSubclass(character.classKey, character.subclassKey),
      level: character.level,
      subclassFeatureChoices: character.subclassFeatureChoices,
      subclassFeatureOptionPicks: character.subclassFeatureOptionPicks,
      weaponMasteryPicks: combinedWeaponMasteryPicks,
      contributions: derived.classFeatureContributions,
      abilityModifiers: derived.abilityModifiers,
      formatMeta: (key: string, params?: Record<string, string | number>) => t(key, params),
      weaponLabel: (key: string, fallback: string) => tEntity("catalog.weapons", key, "name", fallback),
      masteryLabel: (mastery: string) => tGlossary("weaponProperty", mastery),
    }),
    [
      derived.classData,
      derived.classFeatureContributions,
      derived.abilityModifiers,
      character.classKey,
      character.subclassKey,
      character.subclassFeatureChoices,
      character.subclassFeatureOptionPicks,
      character.level,
      combinedWeaponMasteryPicks,
      t,
      tEntity,
      tGlossary,
    ],
  );

  const speciesFeatureInput = useMemo(
    () => ({
      speciesData: derived.speciesData,
      lineageKey: character.speciesLineageKey,
      level: character.level,
      speciesFeatureChoices: character.speciesFeatureChoices,
      speciesCantripSwapAvailable: character.speciesCantripSwapAvailable,
      contributions: {
        ...derived.speciesFeatureContributions,
        darkvisionFeet: derived.darkvisionFeet,
      },
      spellcastingAbility: spellcastingAbilityLabel,
      formatMeta: (key: string, params?: Record<string, string | number>) => t(key, params),
      formatLength,
    }),
    [
      derived.speciesData,
      derived.speciesFeatureContributions,
      derived.darkvisionFeet,
      character.speciesLineageKey,
      character.speciesFeatureChoices,
      character.speciesCantripSwapAvailable,
      character.level,
      spellcastingAbilityLabel,
      formatLength,
      t,
    ],
  );

  const classUseTrackers = useMemo(
    () =>
      buildClassFeatureUseTrackers(
        derived.classData,
        character.level,
        derived.abilityModifiers,
        findSubclass(character.classKey, character.subclassKey),
        "combat",
        character.subclassFeatureChoices,
      ),
    [
      derived.classData,
      derived.abilityModifiers,
      character.classKey,
      character.subclassKey,
      character.subclassFeatureChoices,
      character.level,
    ],
  );

  const classUseTrackerByKey = useMemo(
    () => new Map(classUseTrackers.map((tracker) => [tracker.featureKey, tracker])),
    [classUseTrackers],
  );

  const classPoolTrackers = useMemo(
    () =>
      buildClassFeaturePoolTrackers(
        derived.classData,
        character.level,
        derived.abilityModifiers,
        findSubclass(character.classKey, character.subclassKey),
      ),
    [
      derived.classData,
      derived.abilityModifiers,
      character.classKey,
      character.subclassKey,
      character.level,
    ],
  );

  const speciesUseTrackerByKey = useMemo(() => {
    const trackers = buildSpeciesFeatureUseTrackers(
      derived.speciesData,
      character.speciesLineageKey,
      character.level,
      derived.abilityModifiers,
    );
    return new Map(trackers.map((tracker) => [tracker.featureKey, tracker]));
  }, [derived.speciesData, character.speciesLineageKey, character.level, derived.abilityModifiers]);

  const masteryRiderCards = useMemo(
    () =>
      buildMasteryRiderCards(
        combinedWeaponMasteryPicks,
        (mastery) => tGlossary("weaponProperty", mastery),
        (mastery) => tGlossary("weaponMasteryDesc", mastery),
      ),
    [combinedWeaponMasteryPicks, tGlossary],
  );

  const weaponMasteryEmptyPrompt = useMemo(
    () =>
      buildWeaponMasteryEmptyPrompt(
        effectiveLevelPath(character),
        combinedWeaponMasteryPicks,
        derived.classFeatureContributions,
      ),
    [character, combinedWeaponMasteryPicks, derived.classFeatureContributions],
  );

  const activeFeatKeys = useMemo(() => activeFeatKeysFromCharacter(character), [character]);

  const featChoicesFor = useMemo(
    () => featChoicesResolverForCharacter(character),
    [character],
  );

  const vitalsSpeciesUseTrackers = useMemo(
    () =>
      buildSpeciesFeatureUseTrackers(
        derived.speciesData,
        character.speciesLineageKey,
        character.level,
        derived.abilityModifiers,
      ),
    [derived.speciesData, character.speciesLineageKey, character.level, derived.abilityModifiers],
  );

  const vitalsFeatUseTrackers = useMemo(
    () =>
      buildFeatUseTrackers({
        activeFeatKeys,
        proficiencyBonus: derived.proficiencyBonus,
        abilityModifiers: derived.abilityModifiers,
      }),
    [activeFeatKeys, derived.proficiencyBonus, derived.abilityModifiers],
  );

  const featUseTrackerByKey = useMemo(() => {
    const trackers = buildFeatUseTrackers({
      activeFeatKeys,
      proficiencyBonus: derived.proficiencyBonus,
      abilityModifiers: derived.abilityModifiers,
    });
    return new Map(trackers.map((tracker) => [tracker.featKey, tracker]));
  }, [activeFeatKeys, derived.proficiencyBonus, derived.abilityModifiers]);

  const grantedSpells = useMemo(
    () =>
      buildAllGrantedSpells({
        speciesCantrips: derived.speciesFeatureContributions.cantrips,
        speciesPreparedSpells: derived.speciesFeatureContributions.preparedSpells,
        classKey: character.classKey,
        subclassKey: character.subclassKey,
        subclassFeatureChoices: character.subclassFeatureChoices,
        classFeatureOptionPicks: character.classFeatureOptionPicks,
        classFeatureSpellPicks: character.classFeatureSpellPicks,
        level: character.level,
        activeFeatKeys,
        featChoicesFor,
        spellSlots: derived.spellcasting?.slotsByLevel,
      }),
    [
      derived.speciesFeatureContributions,
      character.classKey,
      character.subclassKey,
      character.subclassFeatureChoices,
      character.classFeatureOptionPicks,
      character.classFeatureSpellPicks,
      character.level,
      activeFeatKeys,
      featChoicesFor,
      derived.spellcasting?.slotsByLevel,
    ],
  );

  const featSpellUseTrackers = useMemo(
    () => buildFeatSpellUseTrackers({ activeFeatKeys, featChoicesFor }),
    [activeFeatKeys, featChoicesFor],
  );

  const featSpellUseBySpellKey = useMemo(() => {
    const map = new Map<string, { storageKey: string; maxUses: number }>();
    for (const tracker of featSpellUseTrackers) {
      map.set(tracker.spellKey, { storageKey: tracker.storageKey, maxUses: tracker.maxUses });
    }
    return map;
  }, [featSpellUseTrackers]);

  const characterSpells = useMemo(() => {
    const spellPicks = isMulticlass
      ? allPerClassSpellPicks(character, classLevels)
      : character.spellPicks;
    return buildCharacterSpellEntries({
      cantripPicks: unionCantripPicks(character),
      spellPicks,
      granted: grantedSpells,
      alwaysPreparedPicks: character.alwaysPreparedSpellPicks,
    });
  }, [character, classLevels, grantedSpells, isMulticlass]);

  const hasMageArmor = useMemo(
    () => characterSpells.some((entry) => entry.spellKey === "mage-armor"),
    [characterSpells],
  );
  const showMageArmorAc =
    hasMageArmor && !derived.isWearingBodyArmor && derived.armorClassWithMageArmorWithoutShield != null;
  const hasEquippedShield = derived.armorClassWithShield !== derived.armorClassWithoutShield;

  const spellCastContext = useMemo(
    () => ({
      classAttackBonus: derived.spellcasting?.attackBonus,
      classSaveDc: derived.spellcasting?.saveDc,
      abilityModifiers: derived.abilityModifiers,
      speciesSpellcastingAbility: character.speciesSpellcastingAbility,
      characterLevel: character.level,
      hasSpellSniper: activeFeatKeys.includes("spell-sniper"),
    }),
    [
      derived.spellcasting?.attackBonus,
      derived.spellcasting?.saveDc,
      derived.abilityModifiers,
      character.speciesSpellcastingAbility,
      character.level,
      activeFeatKeys,
    ],
  );

  const inWildShape = isInWildShape(character);
  const beastAttackCards = useMemo(
    () => (derived.wildShapeForm ? buildBeastAttackCards(derived.wildShapeForm) : undefined),
    [derived.wildShapeForm],
  );

  const spellActions = useMemo(
    () =>
      inWildShape
        ? { action: [], bonus: [], reaction: [] }
        : buildCombatSpellCards(characterSpells, spellCastContext, {
            locale,
            spellName: (key, fallback) => tEntity("catalog.spells", key, "name", fallback),
          }),
    [inWildShape, characterSpells, spellCastContext, locale, tEntity],
  );

  const invocationActions = useMemo(
    () =>
      buildInvocationActionCards({
        classData: derived.classData,
        level: character.level,
        classFeatureOptionPicks: character.classFeatureOptionPicks,
      }),
    [derived.classData, character.level, character.classFeatureOptionPicks],
  );

  const classFeatureActions = useMemo(() => {
    const base = buildClassFeatureActionCards(classFeatureInput);
    const filtered = inWildShape
      ? {
          action: base.action.filter((card) => card.traitSlug !== "wild-shape"),
          bonus: base.bonus.filter((card) => card.traitSlug !== "wild-shape"),
          reaction: base.reaction.filter((card) => card.traitSlug !== "wild-shape"),
        }
      : base;
    return {
      action: [...filtered.action, ...invocationActions.action],
      bonus: [...filtered.bonus, ...invocationActions.bonus],
      reaction: [...filtered.reaction, ...invocationActions.reaction],
    };
  }, [classFeatureInput, invocationActions, inWildShape]);

  const ammoBonusesByType = useMemo(() => {
    const bonuses: Partial<Record<AmmoType, number>> = {};
    for (const type of ["arrows", "bolts", "needles", "sling-bullets", "firearm-bullets"] as AmmoType[]) {
      const bonus = ammoBonusForType(character.magicAmmunition, character.preferredAmmoSource, type);
      if (bonus > 0) bonuses[type] = bonus;
    }
    return bonuses;
  }, [character.magicAmmunition, character.preferredAmmoSource]);

  const magicItemWeapons = useMemo(
    () => ownedMagicItemWeapons(character.adventuringGear),
    [character.adventuringGear],
  );

  const actions = useMemo(
    () =>
      buildCombatActions({
        speciesKey: character.speciesKey,
        weapons: character.weapons,
        abilityModifiers: derived.abilityModifiers,
        feats: derived.feats,
        rangedAttackBonus: derived.featContributions.rangedAttackBonus,
        lightExtraAttackAddsAbilityMod: derived.featContributions.lightExtraAttackAddsAbilityMod,
        unarmedDamageDie: derived.featContributions.unarmedDamageDie,
        weaponMasteryPicks: combinedWeaponMasteryPicks,
        weaponProficiencyGrants: [
          ...effectiveWeaponProficiencyGrants(
            derived.classData,
            character.level,
            character.classFeatureChoices,
            character.subclassKey,
          ),
          ...derived.featContributions.weaponProficiencyGrants.map((proficiency) => ({ kind: proficiency })),
        ],
        martialArtsDie: derived.classFeatureContributions.martialArtsDie,
        classFeatureActions,
        speciesFeatureActions: buildSpeciesFeatureActionCards(speciesFeatureInput),
        spellActions,
        beastAttackCards,
        weaponDamageBonuses: derived.magicItemContributions.weaponDamageBonuses,
        featWeaponDamageRules: derived.featContributions.weaponDamageBonusRules,
        ammoBonusesByType,
        magicItemWeapons,
        battleSmithMagicWeaponAttacks:
          character.classKey === "artificer" &&
          character.subclassKey === "battle-smith" &&
          character.level >= 3,
      }),
    [
      character.speciesKey,
      character.classKey,
      character.subclassKey,
      character.level,
      character.weapons,
      magicItemWeapons,
      combinedWeaponMasteryPicks,
      character.classFeatureChoices,
      derived.classData,
      derived.abilityModifiers,
      derived.feats,
      derived.featContributions.rangedAttackBonus,
      derived.featContributions.lightExtraAttackAddsAbilityMod,
      derived.featContributions.unarmedDamageDie,
      derived.magicItemContributions.weaponDamageBonuses,
      derived.featContributions.weaponDamageBonusRules,
      derived.classFeatureContributions.martialArtsDie,
      classFeatureActions,
      speciesFeatureInput,
      spellActions,
      beastAttackCards,
      ammoBonusesByType,
    ],
  );

  const classFeatureCards = useMemo(
    () => buildClassFeatureCards(classFeatureInput),
    [classFeatureInput],
  );

  const speciesFeatureCards = useMemo(
    () => buildSpeciesFeatureCards(speciesFeatureInput),
    [speciesFeatureInput],
  );

  const featSpecialFeatureCards = useMemo(
    () =>
      buildFeatSpecialFeatureCards({
        feats: derived.feats,
        level: character.level,
        abilityModifiers: derived.abilityModifiers,
        featChoicesFor,
      }),
    [derived.feats, character.level, derived.abilityModifiers, featChoicesFor],
  );

  const armorChargeTrackers = useMemo(
    () => collectArmoryChargeTrackers({ weapons: [], armor: character.armor }),
    [character.armor],
  );

  const hasSpeciesSpecialTraitsContent = speciesFeatureCards.length > 0;
  const hasFeatSpecialTraitsContent = featSpecialFeatureCards.length > 0;
  const hasSpecialTraitsContent = hasSpeciesSpecialTraitsContent || hasFeatSpecialTraitsContent;
  const showSpecialTraitsSection = hasSpecialTraitsContent;

  const hasWarlockInvocations =
    character.classKey === "warlock" &&
    derived.classData != null &&
    character.level >= 1;
  const hasClassFeaturesContent =
    hitDiceReady ||
    classUseTrackers.length > 0 ||
    classPoolTrackers.length > 0 ||
    classFeatureCards.length > 0 ||
    masteryRiderCards.length > 0 ||
    weaponMasteryEmptyPrompt != null ||
    hasWarlockInvocations;

  const actionSubsections = useMemo(() => {
    const { spells, attacks, phbActions } = partitionActionColumnCards(actions.actions);
    return [
      { id: "spells", title: t("combat.actionSubsection.spells"), cards: spells },
      { id: "attacks", title: t("combat.actionSubsection.attacks"), cards: attacks },
      { id: "actions", title: t("combat.actionSubsection.actions"), cards: phbActions },
    ].filter((subsection) => subsection.cards.length > 0);
  }, [actions.actions, t]);

  function scheduleConcentrationReminder(damageTaken: number) {
    if (damageTaken <= 0 || character.concentrationSpellKey == null) return;
    const spellKey = character.concentrationSpellKey;
    const open = () => setConcentrationReminder({ spellKey, damageTaken });
    requestAnimationFrame(open);
  }

  function applyHitPointsDisplayTarget(
    displayTarget: number,
    options?: { concentrationDamageTaken?: number },
  ) {
    if (maxHp == null) return;
    const baseCurrent = character.currentHitPoints ?? maxHp;
    const mutation = combatHitPointsMutationForDisplayTarget({
      maxHitPoints: maxHp,
      baseCurrent,
      temporaryHitPointsMax: character.temporaryHitPointsMax,
      temporaryHitPointsRemaining: character.temporaryHitPointsRemaining,
      displayTarget,
    });
    if (!mutation) return;
    if (mutation.kind === "damage") {
      dispatch({ type: "APPLY_DAMAGE", amount: mutation.amount });
      scheduleConcentrationReminder(options?.concentrationDamageTaken ?? mutation.amount);
      return;
    }
    dispatch({ type: "SET_CURRENT_HIT_POINTS", value: mutation.baseValue ?? maxHp });
  }

  function setCurrentHp(displayValue: number) {
    applyHitPointsDisplayTarget(displayValue);
  }

  function applyBulkHitPointsChange(mode: "damage" | "heal", amount: number) {
    if (maxHp == null) return;
    const tempRemaining = character.temporaryHitPointsRemaining ?? 0;
    const tempActive = character.temporaryHitPointsMax != null && tempRemaining > 0;
    const baseCurrent = character.currentHitPoints ?? maxHp;
    const displayCurrent = baseCurrent + (tempActive ? tempRemaining : 0);
    const displayCap = maxHp + (tempActive ? tempRemaining : 0);
    const displayTarget = displayHitPointsAfterBulkChange({
      displayCurrent,
      displayCap,
      mode,
      amount,
    });
    applyHitPointsDisplayTarget(
      displayTarget,
      mode === "damage" ? { concentrationDamageTaken: amount } : undefined,
    );
  }

  function setTempHp(max: number | null, remaining?: number | null) {
    dispatch({ type: "SET_TEMPORARY_HIT_POINTS", max, remaining });
  }

  function applyMaxHpBonus(amount: number) {
    dispatch({ type: "APPLY_HIT_POINT_MAX_BONUS", amount });
  }

  function clearMaxHpBonus() {
    dispatch({ type: "CLEAR_HIT_POINT_MAX_BONUS" });
  }

  function setDeathSaves(successes?: number, failures?: number) {
    dispatch({ type: "SET_DEATH_SAVES", successes, failures });
  }

  function setHeroicInspiration(value: number) {
    dispatch({ type: "SET_HEROIC_INSPIRATION", value });
  }

  function setHitDiceRemaining(die: number, value: number) {
    dispatch({ type: "SET_HIT_DICE_REMAINING", die, value });
  }

  function setClassFeatureUses(featureKey: string, value: number) {
    dispatch({ type: "SET_CLASS_FEATURE_USES", featureKey, value });
  }

  function setClassFeaturePoolRemaining(featureKey: string, value: number) {
    dispatch({ type: "SET_CLASS_FEATURE_POOL_REMAINING", featureKey, value });
  }

  function setSpeciesFeatureUses(featureKey: string, value: number) {
    dispatch({ type: "SET_SPECIES_FEATURE_USES", featureKey, value });
  }

  function setFeatSpellUses(featKey: string, value: number) {
    dispatch({ type: "SET_FEAT_SPELL_USES", featKey, value });
  }

  function setWeaponQuantity(weaponId: string, value: number) {
    dispatch({ type: "SET_WEAPON_QUANTITY", id: weaponId, value });
  }

  function setAmmunitionRemaining(ammoType: NonNullable<ReturnType<typeof ammunitionTypeForWeapon>>, value: number) {
    dispatch({ type: "SET_AMMUNITION_REMAINING", ammoType, value });
  }

  function setMagicAmmunitionRemaining(stackId: string, value: number) {
    dispatch({ type: "SET_MAGIC_AMMUNITION_REMAINING", id: stackId, value });
  }

  function setPreferredAmmoSource(ammoType: AmmoType, magicStackId: string | null) {
    dispatch({ type: "SET_PREFERRED_AMMO_SOURCE", ammoType, magicStackId });
  }

  function handleKeepAwakeChange(event: ChangeEvent<HTMLInputElement>) {
    void setKeepAwakeEnabled(event.target.checked);
  }

  const equipmentActionDisplays = useMemo(
    () => listEquipmentActionDisplays(character),
    [character],
  );

  const showVitals = variant === "vitals";
  const showActions = variant === "actions";
  const panelId = showVitals ? "panel-vitals" : "panel-actions";
  const panelTitle = showVitals ? t("combat.vitalsTitle") : t("combat.actionsTitle");

  const hasVitalsResources =
    hitDiceReady ||
    classUseTrackers.length > 0 ||
    classPoolTrackers.length > 0 ||
    vitalsSpeciesUseTrackers.length > 0 ||
    vitalsFeatUseTrackers.length > 0 ||
    armorChargeTrackers.length > 0;

  return (
    <div className={styles.pane} role="tabpanel" id={panelId} aria-labelledby={panelId}>
      <PaneHeader title={panelTitle} actions={<PaneRestActions />} />

      {isNative && keepAwakeLoaded ? (
        <label className={styles.keepAwakeToggle}>
          <input
            type="checkbox"
            checked={keepAwakeEnabled}
            onChange={handleKeepAwakeChange}
          />
          <span>{t("combat.keepScreenOn")}</span>
        </label>
      ) : null}

      {showVitals ? (
      <div className={styles.combatHeaderStats}>
        {hpReady ? (
          <HitPointsBlock
            maxHp={maxHp}
            currentHp={currentHp}
            maxHpBonus={character.hitPointMaxBonus}
            tempMax={character.temporaryHitPointsMax}
            tempRemaining={character.temporaryHitPointsRemaining}
            onHpChange={setCurrentHp}
            onHpBulkChange={applyBulkHitPointsChange}
            onMaxHpBonusApply={applyMaxHpBonus}
            onMaxHpBonusClear={clearMaxHpBonus}
            onTempChange={setTempHp}
          />
        ) : (
          <div className={styles.statCard}>
            <p className={styles.statLabel}>{t("combat.hitPoints")}</p>
            <p className={styles.statValue}>{t("combat.emptyColumn")}</p>
          </div>
        )}

        <div className={styles.secondaryStatRow}>
          <ResourceCounter
            id="heroic-inspiration"
            label={t("combat.heroicInspiration")}
            current={character.heroicInspiration}
            max={1}
            decreaseLabel={t("combat.decreaseUses", { feature: t("combat.heroicInspiration") })}
            increaseLabel={t("combat.increaseUses", { feature: t("combat.heroicInspiration") })}
            currentLabel={t("combat.currentUses", { feature: t("combat.heroicInspiration") })}
            onChange={setHeroicInspiration}
          />

          <div className={`${styles.statCard} ${styles.acCardCompact} ${styles.acCardWide}`}>
            <p className={styles.statLabel}>{t("combat.armorClass")}</p>
            <div className={styles.acVariants}>
              {showMageArmorAc ? (
                <>
                  {hasEquippedShield ? (
                    <div className={styles.acVariant}>
                      <span className={styles.acVariantLabel}>{t("combat.mageArmorWithShield")}</span>
                      <span className={styles.acVariantValue}>{derived.armorClassWithMageArmor}</span>
                    </div>
                  ) : null}
                  <div className={styles.acVariant}>
                    <span className={styles.acVariantLabel}>{t("combat.mageArmor")}</span>
                    <span className={styles.acVariantValue}>
                      {derived.armorClassWithMageArmorWithoutShield}
                    </span>
                  </div>
                </>
              ) : null}
              {hasEquippedShield ? (
                <div className={styles.acVariant}>
                  <span className={styles.acVariantLabel}>{t("combat.armorWithShield")}</span>
                  <span className={styles.acVariantValue}>{derived.armorClassWithShield}</span>
                </div>
              ) : null}
              <div className={styles.acVariant}>
                <span className={styles.acVariantLabel}>{t("combat.armor")}</span>
                <span className={styles.acVariantValue}>{derived.armorClassWithoutShield}</span>
              </div>
            </div>
          </div>

          <div className={`${styles.statCard} ${styles.initiativeCardCompact}`}>
            <p className={styles.statLabel}>{t("combat.initiative")}</p>
            <p className={styles.statValue}>{formatModifier(derived.initiative)}</p>
          </div>

          <div className={styles.statCard}>
            <p className={styles.statLabel}>{t("combat.passivePerception")}</p>
            <p className={styles.statValue}>{10 + derived.skillBonuses.perception}</p>
          </div>
        </div>
      </div>
      ) : null}

      {showVitals ? (
      <CollapsiblePane
        defaultOpen
        title={<span className={styles.sectionCaption}>{t("combat.savingThrows")}</span>}
      >
        <SavingThrowsBlock derived={derived} />
      </CollapsiblePane>
      ) : null}

      {showVitals ? (
      <CollapsiblePane
        defaultOpen={false}
        title={<span className={styles.sectionCaption}>{t("combat.conditions")}</span>}
      >
        <ConditionsBlock />
      </CollapsiblePane>
      ) : null}

      {showVitals ? (
        <ConcentrationCheckDialog
          open={concentrationReminder != null}
          spellKey={concentrationReminder?.spellKey ?? null}
          damageTaken={concentrationReminder?.damageTaken ?? 0}
          constitutionSaveModifier={derived.savingThrows.con.modifier}
          hasWarCaster={activeFeatKeys.includes("war-caster")}
          onDismiss={() => setConcentrationReminder(null)}
        />
      ) : null}

      {showVitals ? (
      <CollapsiblePane
        defaultOpen={false}
        title={<span className={styles.sectionCaption}>{t("combat.deathSavingThrows")}</span>}
      >
        <DeathSavesBlock
          successes={character.deathSaveSuccesses}
          failures={character.deathSaveFailures}
          onSuccessesChange={(value) => setDeathSaves(value, undefined)}
          onFailuresChange={(value) => setDeathSaves(undefined, value)}
          onReset={() => setDeathSaves(0, 0)}
        />
      </CollapsiblePane>
      ) : null}

      {showVitals && hasVitalsResources ? (
        <CollapsiblePane
          defaultOpen
          title={<span className={styles.sectionCaption}>{t("combat.sessionResources")}</span>}
        >
          <div className={styles.statRow}>
            {hitDicePools.map((pool) => (
              <ResourceCounter
                key={pool.die}
                id={`current-hit-dice-${pool.die}`}
                label={t("combat.hitDice", { die: pool.die })}
                current={pool.current}
                max={pool.max}
                decreaseLabel={t("combat.decreaseHitDice")}
                increaseLabel={t("combat.increaseHitDice")}
                currentLabel={t("combat.currentHitDice")}
                onChange={(value) => setHitDiceRemaining(pool.die, value)}
              />
            ))}
            {classPoolTrackers.map((tracker) => {
              const currentHp = character.classFeaturePoolRemaining[tracker.featureKey] ?? 0;
              const featureName = tEntity(
                "catalog.classes",
                tracker.catalogEntityKey,
                "name",
                tracker.name,
              );
              return (
                <ResourceCounter
                  key={tracker.id}
                  id={`class-feature-pool-${tracker.featureKey}`}
                  label={featureName}
                  current={currentHp}
                  max={tracker.maxHp}
                  decreaseLabel={t("combat.decreaseUses", { feature: featureName })}
                  increaseLabel={t("combat.increaseUses", { feature: featureName })}
                  currentLabel={t("combat.currentUses", { feature: featureName })}
                  onChange={(value) => setClassFeaturePoolRemaining(tracker.featureKey, value)}
                />
              );
            })}
            {classUseTrackers.map((tracker) => {
              const currentUses = character.classFeatureUses[tracker.featureKey] ?? tracker.maxUses;
              const featureName = classFeatureUseTrackerLabel(
                tracker,
                character.level,
                t,
                tEntity,
              );
              return (
                <ResourceCounter
                  key={tracker.id}
                  id={`class-feature-uses-${tracker.featureKey}`}
                  label={featureName}
                  current={currentUses}
                  max={tracker.maxUses}
                  decreaseLabel={t("combat.decreaseUses", { feature: featureName })}
                  increaseLabel={t("combat.increaseUses", { feature: featureName })}
                  currentLabel={t("combat.currentUses", { feature: featureName })}
                  onChange={(value) => setClassFeatureUses(tracker.featureKey, value)}
                />
              );
            })}
            {vitalsSpeciesUseTrackers.map((tracker) => {
              const currentUses = character.speciesFeatureUses[tracker.featureKey] ?? tracker.maxUses;
              const featureName = formatSpeciesFeatureCombatTitle(
                tracker.speciesKey,
                tracker.featureKey,
                tracker.name,
                t,
                tEntity,
              );
              return (
                <ResourceCounter
                  key={tracker.id}
                  id={`species-feature-uses-${tracker.featureKey}`}
                  label={featureName}
                  current={currentUses}
                  max={tracker.maxUses}
                  decreaseLabel={t("combat.decreaseUses", { feature: featureName })}
                  increaseLabel={t("combat.increaseUses", { feature: featureName })}
                  currentLabel={t("combat.currentUses", { feature: featureName })}
                  onChange={(value) => setSpeciesFeatureUses(tracker.featureKey, value)}
                />
              );
            })}
            {vitalsFeatUseTrackers.map((tracker) => {
              const currentUses = character.featSpellUses[tracker.featKey] ?? tracker.maxUses;
              const featureName = featUseTrackerLabel(tracker, t, tEntity);
              return (
                <ResourceCounter
                  key={tracker.id}
                  id={`feat-uses-${tracker.featKey}`}
                  label={featureName}
                  current={currentUses}
                  max={tracker.maxUses}
                  decreaseLabel={t("combat.decreaseUses", { feature: featureName })}
                  increaseLabel={t("combat.increaseUses", { feature: featureName })}
                  currentLabel={t("combat.currentUses", { feature: featureName })}
                  onChange={(value) => setFeatSpellUses(tracker.featKey, value)}
                />
              );
            })}
            {armorChargeTrackers.map((tracker) => {
              const piece = character.armor.find((armor) => armor.id === tracker.instanceId);
              const armorData = piece ? findByKey(ARMOR, piece.key) : null;
              const baseName = armorData
                ? tEntity("catalog.armor", piece!.key, "name", armorData.name)
                : tracker.instanceId;
              const featureName = localizedVariantDisplayName(
                baseName,
                findGenericVariant(piece?.variantKey),
                tEntity,
              );
              const currentUses = character.featSpellUses[tracker.storageKey] ?? tracker.maxUses;
              return (
                <ResourceCounter
                  key={tracker.storageKey}
                  id={`armory-charges-${tracker.instanceId}`}
                  label={featureName}
                  current={currentUses}
                  max={tracker.maxUses}
                  decreaseLabel={t("combat.decreaseUses", { feature: featureName })}
                  increaseLabel={t("combat.increaseUses", { feature: featureName })}
                  currentLabel={t("combat.currentUses", { feature: featureName })}
                  onChange={(value) => setFeatSpellUses(tracker.storageKey, value)}
                />
              );
            })}
          </div>
        </CollapsiblePane>
      ) : null}

      {showActions && showSpecialTraitsSection ? (
        <CollapsiblePane title={<span className={styles.sectionCaption}>{t("combat.racialFeatures")}</span>}>
          <>
            {hasSpeciesSpecialTraitsContent ? (
                <div className={styles.specialTraitsGroup}>
                  <p className={styles.groupLabel}>{t("combat.specialTraitsSpecies")}</p>
                  {speciesFeatureCards.length > 0 ? (
                    <div className={styles.cards}>
                      {speciesFeatureCards.map((card) => (
                        <article key={card.id} className={styles.card}>
                          <h4 className={styles.featureCardTitle}>
                            {formatSpeciesFeatureCombatTitle(
                              card.speciesKey,
                              card.featureKey,
                              card.name,
                              t,
                              tEntity,
                              card.name,
                            )}
                          </h4>
                          {card.cantripChoice ? (
                            <Combobox
                              id={`species-feature-cantrip-${card.featureKey}`}
                              label={t("combat.speciesFeature.cantripChoice")}
                              value={card.cantripChoice.selectedSpellKey}
                              disabled={!card.cantripChoice.cantripSwapAvailable}
                              describedBy={
                                card.cantripChoice.cantripSwapAvailable
                                  ? undefined
                                  : `species-feature-cantrip-hint-${card.featureKey}`
                              }
                              onChange={(key) =>
                                dispatch({
                                  type: "SET_SPECIES_FEATURE_CHOICE",
                                  choiceKey: card.cantripChoice!.choiceKey,
                                  spellKey: key,
                                })
                              }
                              options={card.cantripChoice.options.map((option) => ({
                                key: option.key,
                                label: option.name,
                              }))}
                            >
                              {!card.cantripChoice.cantripSwapAvailable ? (
                                <p
                                  id={`species-feature-cantrip-hint-${card.featureKey}`}
                                  className={styles.meta}
                                >
                                  {t("combat.speciesFeature.cantripSwapAfterLongRest")}
                                </p>
                              ) : null}
                            </Combobox>
                          ) : null}
                          {card.meta ? <p className={styles.meta}>{card.meta}</p> : null}
                          <CatalogProse className={styles.description}>
                            {formatProse(
                              tEntity(
                                "catalog.species",
                                `${card.speciesKey}.trait.${card.featureKey}`,
                                "desc",
                                card.description,
                              ),
                            )}
                          </CatalogProse>
                        </article>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {hasFeatSpecialTraitsContent ? (
                <div
                  className={
                    hasSpeciesSpecialTraitsContent
                      ? `${styles.specialTraitsGroup} ${styles.specialTraitsGroupSeparated}`
                      : styles.specialTraitsGroup
                  }
                >
                  <p className={styles.groupLabel}>{t("combat.specialTraitsFeats")}</p>
                  {featSpecialFeatureCards.length > 0 ? (
                  <div className={styles.cards}>
                    {featSpecialFeatureCards.map((card) => (
                      <article key={card.id} className={styles.card}>
                        <h4 className={styles.featureCardTitle}>
                          {tEntity("catalog.feats", card.featKey, "name", card.name)}
                        </h4>
                        {card.referenceOptions ? (
                          <CombatReferenceOptions
                            intro={card.description}
                            options={card.referenceOptions}
                            trailing={card.referenceTrailing}
                          />
                        ) : (
                          <CatalogProse className={styles.description}>
                            {formatProse(tEntity("catalog.feats", card.featKey, "desc", card.description))}
                          </CatalogProse>
                        )}
                        <FeatCombatChoices featKey={card.featKey} />
                        {card.meta && card.featKey === "inspiring-leader" ? (
                          <p className={styles.meta}>
                            {t("combat.inspiringLeaderTempHp", { value: card.meta })}
                          </p>
                        ) : null}
                        {card.referenceTable ? (
                          <CollapsiblePane
                            title={card.referenceTableTitle || t("combat.featReferenceTable")}
                            variant="nested"
                          >
                            <table className={styles.referenceTable}>
                              <thead>
                                <tr>
                                  <th>{t("combat.wildMagicSurgeRoll")}</th>
                                  <th>{t("combat.wildMagicSurgeEffect")}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {card.referenceTable.map((option) => (
                                  <tr key={option.key}>
                                    <td>{option.name}</td>
                                    <td>
                                      <CatalogProse variant="inline">{formatProse(option.desc)}</CatalogProse>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </CollapsiblePane>
                        ) : null}
                      </article>
                    ))}
                  </div>
                  ) : null}
                </div>
              ) : null}
          </>
        </CollapsiblePane>
      ) : null}

      {showActions ? (
      <CollapsiblePane title={<span className={styles.sectionCaption}>{t("combat.classFeatures")}</span>}>
        {!hasClassFeaturesContent ? (
          <p className={styles.empty}>{t("combat.noClassFeatures")}</p>
        ) : (
          <>
            <EldritchInvocationsSection />

            {classFeatureCards.length > 0 || masteryRiderCards.length > 0 || weaponMasteryEmptyPrompt ? (
              <div className={styles.cards}>
                {classFeatureCards.map((card) => (
                  <article
                    key={card.id}
                    className={card.featureKey === "wild-shape" ? `${styles.card} ${styles.wildShapeCard}` : styles.card}
                  >
                    <h4 className={styles.featureCardTitle}>
                      {card.combatParentName
                        ? t("combat.nestedClassFeatureTitle", {
                            classFeatureName: card.combatParentName,
                            abilityName: tEntity(
                              "catalog.classes",
                              card.catalogEntityKey,
                              "name",
                              card.name,
                            ),
                          })
                        : tEntity(
                            "catalog.classes",
                            card.catalogEntityKey,
                            "name",
                            card.name,
                          )}
                    </h4>
                    {card.featureKey === "combat-superiority" && card.optionPicks ? (
                      <ManeuversPickList
                        options={card.optionPicks.options}
                        picks={card.optionPicks.picks}
                        maxCount={card.optionPicks.count}
                        abilityModifiers={derived.abilityModifiers}
                      />
                    ) : card.featureKey === "experimental-elixir" && card.optionPicks ? (
                      <ElixirsPickList
                        options={card.optionPicks.options}
                        picks={card.optionPicks.picks}
                        maxCount={card.optionPicks.count}
                      />
                    ) : card.optionPicks ? (
                      card.optionPicks.picks.map((pick, index) => {
                        const taken = card.optionPicks!.picks.filter(
                          (entry, entryIndex) => entryIndex !== index && entry != null,
                        );
                        const availableOptions = card.optionPicks!.options.filter((option) => {
                          if (option.repeatable) return true;
                          return !taken.includes(option.key);
                        });
                        const selectedOption = card.optionPicks!.options.find((option) => option.key === pick);
                        const comboboxOptions =
                          pick && selectedOption && !availableOptions.some((option) => option.key === pick)
                            ? [...availableOptions, selectedOption]
                            : availableOptions;

                        return (
                          <div key={`${card.optionPicks!.choiceKey}-${index}`} className={styles.invocationPickGroup}>
                            <Combobox
                              id={`class-feature-option-pick-${card.featureKey}-${index}`}
                              label={t("character.subclassFeatureOptionPick", { index: index + 1 })}
                              value={pick}
                              onChange={(optionKey) =>
                                dispatch({
                                  type: "SET_SUBCLASS_FEATURE_OPTION_PICK",
                                  choiceKey: card.optionPicks!.choiceKey,
                                  index,
                                  optionKey,
                                })
                              }
                              options={comboboxOptions.map((option) => ({
                                key: option.key,
                                label: option.name,
                              }))}
                              placeholder={t("character.choosePlaceholder")}
                            />
                            {selectedOption ? (
                              <CatalogProse className={styles.description}>
                                {formatProse(selectedOption.desc)}
                              </CatalogProse>
                            ) : null}
                          </div>
                        );
                      })
                    ) : null}
                    {card.choice && card.featureKey === "armor-model" ? (
                      <ArmorModelPickList
                        choiceKey={card.choice.choiceKey}
                        options={card.choice.options}
                        selectedOptionKey={card.choice.selectedOptionKey}
                      />
                    ) : card.choice ? (
                      <Combobox
                        id={`class-feature-choice-${card.featureKey}-${card.choice.choiceKey}`}
                        label={
                          card.featureKey === "star-map"
                            ? t("combat.starMapForm")
                            : t("character.subclassFeatureChoice")
                        }
                        value={card.choice.selectedOptionKey}
                        onChange={(key) =>
                          dispatch({
                            type: "SET_SUBCLASS_FEATURE_CHOICE",
                            choiceKey: card.choice!.choiceKey,
                            optionKey: key,
                          })
                        }
                        options={card.choice.options.map((option) => ({
                          key: option.key,
                          label: option.name,
                        }))}
                        placeholder={t("character.choosePlaceholder")}
                      />
                    ) : null}
                    {card.featureKey === "wild-shape" ? (
                      <>
                        <WildShapeBeastFormSection />
                        <WildShapeKnownFormsInput />
                      </>
                    ) : null}
                    {card.meta ? <p className={styles.meta}>{card.meta}</p> : null}
                    {card.featureKey === "dark-ones-blessing" ? (
                      <button
                        type="button"
                        className={styles.applyTempHpButton}
                        onClick={() =>
                          dispatch({
                            type: "APPLY_TEMPORARY_HIT_POINTS_GRANT",
                            amount: darkOnesBlessingTempHp(derived.abilityModifiers.cha, character.level),
                          })
                        }
                      >
                        {t("combat.applyTempHp")}
                      </button>
                    ) : null}
                    {card.featureKey !== "wild-shape" ? (
                      <CatalogProse className={styles.description}>
                        {formatProse(
                          (card.choice?.selectedOptionKey && card.featureKey !== "armor-model") ||
                            card.referenceOptions
                            ? card.description
                            : tEntity(
                                "catalog.classes",
                                card.catalogEntityKey,
                                "desc",
                                card.description,
                              ),
                        )}
                      </CatalogProse>
                    ) : null}
                    {card.referenceOptions ? (
                      card.featureKey === "wild-magic-surge" ? (
                        <CollapsiblePane title={t("combat.wildMagicSurgeTable")} variant="nested">
                          <table className={styles.referenceTable}>
                            <thead>
                              <tr>
                                <th>{t("combat.wildMagicSurgeRoll")}</th>
                                <th>{t("combat.wildMagicSurgeEffect")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {card.referenceOptions.map((option) => (
                                <tr key={option.key}>
                                  <td>{option.name}</td>
                                  <td>
                                    <CatalogProse variant="inline">{formatProse(option.desc)}</CatalogProse>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </CollapsiblePane>
                      ) : (
                        <CombatReferenceOptions options={card.referenceOptions} />
                      )
                    ) : null}
                  </article>
                ))}

                {weaponMasteryEmptyPrompt ? (
                  <article className={styles.card}>
                    <h4 className={styles.featureCardTitle}>{t("combat.weaponMasteryRidersTitle")}</h4>
                    <p className={styles.description}>
                      {t("combat.classFeature.weaponMasteryEmpty", { count: weaponMasteryEmptyPrompt.count })}
                    </p>
                  </article>
                ) : null}

                {masteryRiderCards.map((card) => (
                  <article key={card.id} className={styles.card}>
                    <h4 className={styles.featureCardTitle}>{card.name}</h4>
                    <CatalogProse className={styles.description}>
                      {formatProse(card.description)}
                    </CatalogProse>
                  </article>
                ))}
              </div>
            ) : null}
          </>
        )}
      </CollapsiblePane>
      ) : null}

      {showActions && equipmentActionDisplays.length > 0 ? (
        <CollapsiblePane title={<span className={styles.sectionCaption}>{t("combat.equipmentActions")}</span>}>
          <EquipmentActionDescriptionsList />
        </CollapsiblePane>
      ) : null}

      {showActions ? (
      <div className={styles.columns}>
        <ActionColumn
          title={t("combat.actions")}
          subsections={actionSubsections}
          characterLevel={character.level}
          extraAttackCount={derived.extraAttackCount}
          characterWeapons={character.weapons}
          ammunitionRemaining={character.ammunitionRemaining}
          magicAmmunition={character.magicAmmunition}
          preferredAmmoSource={character.preferredAmmoSource}
          featSpellUses={character.featSpellUses}
          featSpellUseBySpellKey={featSpellUseBySpellKey}
          featUseTrackerByKey={featUseTrackerByKey}
          speciesFeatureUses={character.speciesFeatureUses}
          speciesUseTrackerByKey={speciesUseTrackerByKey}
          classFeatureUses={character.classFeatureUses}
          classUseTrackerByKey={classUseTrackerByKey}
          onWeaponQuantityChange={setWeaponQuantity}
          onAmmunitionRemainingChange={setAmmunitionRemaining}
          onMagicAmmunitionRemainingChange={setMagicAmmunitionRemaining}
          onPreferredAmmoSourceChange={setPreferredAmmoSource}
          onFeatSpellUsesChange={setFeatSpellUses}
          onSpeciesFeatureUsesChange={setSpeciesFeatureUses}
          onClassFeatureUsesChange={setClassFeatureUses}
          t={t}
          tEntity={tEntity}
          tGlossary={tGlossary}
        />
        <ActionColumn
          title={t("combat.bonusActions")}
          cards={actions.bonusActions}
          empty={t("combat.noBonusActions")}
          characterLevel={character.level}
          extraAttackCount={derived.extraAttackCount}
          characterWeapons={character.weapons}
          ammunitionRemaining={character.ammunitionRemaining}
          magicAmmunition={character.magicAmmunition}
          preferredAmmoSource={character.preferredAmmoSource}
          featSpellUses={character.featSpellUses}
          featSpellUseBySpellKey={featSpellUseBySpellKey}
          featUseTrackerByKey={featUseTrackerByKey}
          speciesFeatureUses={character.speciesFeatureUses}
          speciesUseTrackerByKey={speciesUseTrackerByKey}
          classFeatureUses={character.classFeatureUses}
          classUseTrackerByKey={classUseTrackerByKey}
          onWeaponQuantityChange={setWeaponQuantity}
          onAmmunitionRemainingChange={setAmmunitionRemaining}
          onMagicAmmunitionRemainingChange={setMagicAmmunitionRemaining}
          onPreferredAmmoSourceChange={setPreferredAmmoSource}
          onFeatSpellUsesChange={setFeatSpellUses}
          onSpeciesFeatureUsesChange={setSpeciesFeatureUses}
          onClassFeatureUsesChange={setClassFeatureUses}
          t={t}
          tEntity={tEntity}
          tGlossary={tGlossary}
        />
        <ActionColumn
          title={t("combat.reactions")}
          cards={actions.reactions}
          characterLevel={character.level}
          extraAttackCount={derived.extraAttackCount}
          characterWeapons={character.weapons}
          ammunitionRemaining={character.ammunitionRemaining}
          magicAmmunition={character.magicAmmunition}
          preferredAmmoSource={character.preferredAmmoSource}
          featSpellUses={character.featSpellUses}
          featSpellUseBySpellKey={featSpellUseBySpellKey}
          featUseTrackerByKey={featUseTrackerByKey}
          speciesFeatureUses={character.speciesFeatureUses}
          speciesUseTrackerByKey={speciesUseTrackerByKey}
          classFeatureUses={character.classFeatureUses}
          classUseTrackerByKey={classUseTrackerByKey}
          onWeaponQuantityChange={setWeaponQuantity}
          onAmmunitionRemainingChange={setAmmunitionRemaining}
          onMagicAmmunitionRemainingChange={setMagicAmmunitionRemaining}
          onPreferredAmmoSourceChange={setPreferredAmmoSource}
          onFeatSpellUsesChange={setFeatSpellUses}
          onSpeciesFeatureUsesChange={setSpeciesFeatureUses}
          onClassFeatureUsesChange={setClassFeatureUses}
          t={t}
          tEntity={tEntity}
          tGlossary={tGlossary}
        />
      </div>
      ) : null}
    </div>
  );
}

export function VitalsView() {
  return <CombatSessionPane variant="vitals" />;
}

export function ActionsView() {
  return <CombatSessionPane variant="actions" />;
}

function partitionActionColumnCards(cards: CombatCard[]) {
  const spells: CombatCard[] = [];
  const attacks: CombatCard[] = [];
  const phbActions: CombatCard[] = [];

  for (const card of cards) {
    if (card.kind === "spell") {
      spells.push(card);
    } else if (card.kind === "weapon" || card.kind === "unarmed-strike" || card.kind === "beast-attack" || card.attackMeta) {
      attacks.push(card);
    } else {
      phbActions.push(card);
    }
  }

  return { spells, attacks, phbActions };
}

type ActionCardTitleEmphasis = "spellAttack";

function actionCardTitleClass(
  card: CombatCard,
  titleEmphasis: ActionCardTitleEmphasis | undefined,
  stylesModule: typeof styles,
): string | undefined {
  if (card.kind === "class-feature" || card.kind === "species-trait") {
    return stylesModule.featureActionTitle;
  }
  if (titleEmphasis === "spellAttack") {
    return stylesModule.spellAttackTitle;
  }
  return undefined;
}

function ActionColumn({
  title,
  cards,
  subsections,
  empty,
  characterWeapons,
  ammunitionRemaining: ammoRemaining,
  magicAmmunition,
  preferredAmmoSource,
  featSpellUses,
  featSpellUseBySpellKey,
  featUseTrackerByKey,
  speciesFeatureUses,
  speciesUseTrackerByKey,
  classFeatureUses,
  classUseTrackerByKey,
  onWeaponQuantityChange,
  onAmmunitionRemainingChange,
  onMagicAmmunitionRemainingChange,
  onPreferredAmmoSourceChange,
  onFeatSpellUsesChange,
  onSpeciesFeatureUsesChange,
  onClassFeatureUsesChange,
  characterLevel,
  extraAttackCount,
  t,
  tEntity,
  tGlossary,
}: {
  title: string;
  cards?: CombatCard[];
  subsections?: { id: string; title: string; cards: CombatCard[] }[];
  empty?: string;
  characterLevel: number;
  extraAttackCount: number;
  characterWeapons: ReturnType<typeof useCharacter>["character"]["weapons"];
  ammunitionRemaining: ReturnType<typeof useCharacter>["character"]["ammunitionRemaining"];
  magicAmmunition: ReturnType<typeof useCharacter>["character"]["magicAmmunition"];
  preferredAmmoSource: ReturnType<typeof useCharacter>["character"]["preferredAmmoSource"];
  featSpellUses: ReturnType<typeof useCharacter>["character"]["featSpellUses"];
  featSpellUseBySpellKey: Map<string, { storageKey: string; maxUses: number }>;
  featUseTrackerByKey: Map<string, FeatUseTracker>;
  speciesFeatureUses: ReturnType<typeof useCharacter>["character"]["speciesFeatureUses"];
  speciesUseTrackerByKey: Map<string, SpeciesFeatureUseTracker>;
  classFeatureUses: ReturnType<typeof useCharacter>["character"]["classFeatureUses"];
  classUseTrackerByKey: Map<string, ClassFeatureUseTracker>;
  onWeaponQuantityChange: (weaponId: string, value: number) => void;
  onAmmunitionRemainingChange: (
    ammoType: NonNullable<ReturnType<typeof ammunitionTypeForWeapon>>,
    value: number,
  ) => void;
  onMagicAmmunitionRemainingChange: (stackId: string, value: number) => void;
  onPreferredAmmoSourceChange: (ammoType: AmmoType, magicStackId: string | null) => void;
  onFeatSpellUsesChange: (storageKey: string, value: number) => void;
  onSpeciesFeatureUsesChange: (featureKey: string, value: number) => void;
  onClassFeatureUsesChange: (featureKey: string, value: number) => void;
  t: ReturnType<typeof useLocale>["t"];
  tEntity: ReturnType<typeof useLocale>["tEntity"];
  tGlossary: ReturnType<typeof useLocale>["tGlossary"];
}) {
  const resolvedCards = cards ?? subsections?.flatMap((subsection) => subsection.cards) ?? [];
  const cardListProps = {
    characterLevel,
    extraAttackCount,
    characterWeapons,
    ammunitionRemaining: ammoRemaining,
    magicAmmunition,
    preferredAmmoSource,
    featSpellUses,
    featSpellUseBySpellKey,
    featUseTrackerByKey,
    speciesFeatureUses,
    speciesUseTrackerByKey,
    classFeatureUses,
    classUseTrackerByKey,
    onWeaponQuantityChange,
    onAmmunitionRemainingChange,
    onMagicAmmunitionRemainingChange,
    onPreferredAmmoSourceChange,
    onFeatSpellUsesChange,
    onSpeciesFeatureUsesChange,
    onClassFeatureUsesChange,
    t,
    tEntity,
    tGlossary,
  };

  return (
    <CollapsiblePane title={title}>
      {resolvedCards.length === 0 ? (
        <p className={styles.empty}>{empty ?? t("combat.emptyColumn")}</p>
      ) : subsections ? (
        <div className={styles.actionSubsections}>
          {subsections.map((subsection) => (
            <CollapsiblePane
              key={subsection.id}
              title={subsection.title}
              variant="nested"
              defaultOpen={false}
            >
              <ActionCardList
                cards={subsection.cards}
                titleEmphasis={
                  subsection.id === "spells" || subsection.id === "attacks" ? "spellAttack" : undefined
                }
                {...cardListProps}
              />
            </CollapsiblePane>
          ))}
        </div>
      ) : (
        <ActionCardList cards={resolvedCards} {...cardListProps} />
      )}
    </CollapsiblePane>
  );
}

function ActionCardList({
  cards,
  titleEmphasis,
  characterWeapons,
  ammunitionRemaining: ammoRemaining,
  magicAmmunition,
  preferredAmmoSource,
  featSpellUses,
  featSpellUseBySpellKey,
  featUseTrackerByKey,
  speciesFeatureUses,
  speciesUseTrackerByKey,
  classFeatureUses,
  classUseTrackerByKey,
  onWeaponQuantityChange,
  onAmmunitionRemainingChange,
  onMagicAmmunitionRemainingChange,
  onPreferredAmmoSourceChange,
  onFeatSpellUsesChange,
  onSpeciesFeatureUsesChange,
  onClassFeatureUsesChange,
  characterLevel,
  extraAttackCount,
  t,
  tEntity,
  tGlossary,
}: {
  cards: CombatCard[];
  titleEmphasis?: ActionCardTitleEmphasis;
  characterLevel: number;
  extraAttackCount: number;
  characterWeapons: ReturnType<typeof useCharacter>["character"]["weapons"];
  ammunitionRemaining: ReturnType<typeof useCharacter>["character"]["ammunitionRemaining"];
  magicAmmunition: ReturnType<typeof useCharacter>["character"]["magicAmmunition"];
  preferredAmmoSource: ReturnType<typeof useCharacter>["character"]["preferredAmmoSource"];
  featSpellUses: ReturnType<typeof useCharacter>["character"]["featSpellUses"];
  featSpellUseBySpellKey: Map<string, { storageKey: string; maxUses: number }>;
  featUseTrackerByKey: Map<string, FeatUseTracker>;
  speciesFeatureUses: ReturnType<typeof useCharacter>["character"]["speciesFeatureUses"];
  speciesUseTrackerByKey: Map<string, SpeciesFeatureUseTracker>;
  classFeatureUses: ReturnType<typeof useCharacter>["character"]["classFeatureUses"];
  classUseTrackerByKey: Map<string, ClassFeatureUseTracker>;
  onWeaponQuantityChange: (weaponId: string, value: number) => void;
  onAmmunitionRemainingChange: (
    ammoType: NonNullable<ReturnType<typeof ammunitionTypeForWeapon>>,
    value: number,
  ) => void;
  onMagicAmmunitionRemainingChange: (stackId: string, value: number) => void;
  onPreferredAmmoSourceChange: (ammoType: AmmoType, magicStackId: string | null) => void;
  onFeatSpellUsesChange: (storageKey: string, value: number) => void;
  onSpeciesFeatureUsesChange: (featureKey: string, value: number) => void;
  onClassFeatureUsesChange: (featureKey: string, value: number) => void;
  t: ReturnType<typeof useLocale>["t"];
  tEntity: ReturnType<typeof useLocale>["tEntity"];
  tGlossary: ReturnType<typeof useLocale>["tGlossary"];
}) {
  return (
    <div className={styles.cards}>
      {cards.map((card) => (
        <CombatActionCard
          key={card.id}
          card={card}
          titleEmphasis={titleEmphasis}
          extraAttackCount={extraAttackCount}
          characterWeapons={characterWeapons}
          ammunitionRemaining={ammoRemaining}
          magicAmmunition={magicAmmunition}
          preferredAmmoSource={preferredAmmoSource}
          featSpellUses={featSpellUses}
          featSpellUseBySpellKey={featSpellUseBySpellKey}
          featUseTrackerByKey={featUseTrackerByKey}
          speciesFeatureUses={speciesFeatureUses}
          speciesUseTrackerByKey={speciesUseTrackerByKey}
          classFeatureUses={classFeatureUses}
          classUseTrackerByKey={classUseTrackerByKey}
          characterLevel={characterLevel}
          onWeaponQuantityChange={onWeaponQuantityChange}
          onAmmunitionRemainingChange={onAmmunitionRemainingChange}
          onMagicAmmunitionRemainingChange={onMagicAmmunitionRemainingChange}
          onPreferredAmmoSourceChange={onPreferredAmmoSourceChange}
          onFeatSpellUsesChange={onFeatSpellUsesChange}
          onSpeciesFeatureUsesChange={onSpeciesFeatureUsesChange}
          onClassFeatureUsesChange={onClassFeatureUsesChange}
          t={t}
          tEntity={tEntity}
          tGlossary={tGlossary}
        />
      ))}
    </div>
  );
}

function CombatActionCard({
  card,
  titleEmphasis,
  characterLevel,
  extraAttackCount,
  characterWeapons,
  ammunitionRemaining: ammoRemaining,
  magicAmmunition,
  preferredAmmoSource,
  featSpellUses,
  featSpellUseBySpellKey,
  featUseTrackerByKey,
  speciesFeatureUses,
  speciesUseTrackerByKey,
  classFeatureUses,
  classUseTrackerByKey,
  onWeaponQuantityChange,
  onAmmunitionRemainingChange,
  onMagicAmmunitionRemainingChange,
  onPreferredAmmoSourceChange,
  onFeatSpellUsesChange,
  onSpeciesFeatureUsesChange,
  onClassFeatureUsesChange,
  t,
  tEntity,
  tGlossary,
}: {
  card: CombatCard;
  titleEmphasis?: ActionCardTitleEmphasis;
  characterWeapons: ReturnType<typeof useCharacter>["character"]["weapons"];
  ammunitionRemaining: ReturnType<typeof useCharacter>["character"]["ammunitionRemaining"];
  magicAmmunition: ReturnType<typeof useCharacter>["character"]["magicAmmunition"];
  preferredAmmoSource: ReturnType<typeof useCharacter>["character"]["preferredAmmoSource"];
  featSpellUses: ReturnType<typeof useCharacter>["character"]["featSpellUses"];
  featSpellUseBySpellKey: Map<string, { storageKey: string; maxUses: number }>;
  featUseTrackerByKey: Map<string, FeatUseTracker>;
  speciesFeatureUses: ReturnType<typeof useCharacter>["character"]["speciesFeatureUses"];
  speciesUseTrackerByKey: Map<string, SpeciesFeatureUseTracker>;
  classFeatureUses: ReturnType<typeof useCharacter>["character"]["classFeatureUses"];
  classUseTrackerByKey: Map<string, ClassFeatureUseTracker>;
  onWeaponQuantityChange: (weaponId: string, value: number) => void;
  onAmmunitionRemainingChange: (
    ammoType: NonNullable<ReturnType<typeof ammunitionTypeForWeapon>>,
    value: number,
  ) => void;
  onMagicAmmunitionRemainingChange: (stackId: string, value: number) => void;
  onPreferredAmmoSourceChange: (ammoType: AmmoType, magicStackId: string | null) => void;
  onFeatSpellUsesChange: (storageKey: string, value: number) => void;
  onSpeciesFeatureUsesChange: (featureKey: string, value: number) => void;
  onClassFeatureUsesChange: (featureKey: string, value: number) => void;
  characterLevel: number;
  extraAttackCount: number;
  t: ReturnType<typeof useLocale>["t"];
  tEntity: ReturnType<typeof useLocale>["tEntity"];
  tGlossary: ReturnType<typeof useLocale>["tGlossary"];
}) {
  const [open, setOpen] = useState(false);
  const { formatProse } = useMeasurementSystem();
  const localized = localizeCombatCard(card, t, tEntity, tGlossary, formatProse);
  const titleClassName = actionCardTitleClass(card, titleEmphasis, styles);
  const weaponResource = resolveWeaponResource(
    card,
    characterWeapons,
    ammoRemaining,
    magicAmmunition,
    preferredAmmoSource,
    onWeaponQuantityChange,
    onAmmunitionRemainingChange,
    onMagicAmmunitionRemainingChange,
    onPreferredAmmoSourceChange,
    t,
    tEntity,
  );
  const featSpellResource = resolveFeatSpellResource(
    card,
    featSpellUseBySpellKey,
    featSpellUses,
    onFeatSpellUsesChange,
    t,
    localized.name,
  );

  function handleToggle(event: SyntheticEvent<HTMLDetailsElement>) {
    setOpen(event.currentTarget.open);
  }

  return (
    <details className={styles.card} open={open} onToggle={handleToggle}>
      <summary className={styles.cardSummary}>
        <span className={styles.cardSummaryLeading}>
          <h4 className={titleClassName}>
            {localized.name}
            {card.kind === "weapon" && extraAttackCount >= 2 ? (
              <>
                {" "}
                <span className={styles.spellTitleMeta}>
                  ({t("combat.extraAttackCount", { count: extraAttackCount })})
                </span>
              </>
            ) : null}
            {card.kind === "spell" && localized.spellLevelSchool ? (
              <>
                {" "}
                <span className={styles.spellTitleMeta}>({localized.spellLevelSchool})</span>
              </>
            ) : null}
          </h4>
          <span aria-hidden="true" className={styles.expandIndicator}>
            {open ? "(-)" : "(+)"}
          </span>
        </span>
      </summary>
      <div className={styles.cardBody}>
        {card.kind !== "spell" && localized.meta ? (
          <p className={styles.meta}>{localized.meta}</p>
        ) : null}
        {localized.offHandMeta ? (
          <p className={styles.metaOffHand}>{localized.offHandMeta}</p>
        ) : null}
        {localized.spellLines?.map((line) => (
          <p key={line} className={styles.spellMetaLine}>
            {line}
          </p>
        ))}
        {card.kind === "spell" && localized.spellAttackLine ? (
          <p className={styles.meta}>{localized.spellAttackLine}</p>
        ) : null}
        {card.kind === "spell" && localized.spellDamageLine ? (
          <p className={styles.meta}>{localized.spellDamageLine}</p>
        ) : null}
        {card.kind === "spell" && localized.meta ? (
          <p className={styles.meta}>{localized.meta}</p>
        ) : null}
        {weaponResource ? (
          <div className={styles.weaponResource}>
            {weaponResource.ammoSource ? (
              <div className={styles.ammoSource}>
                <label htmlFor={`${card.id}-ammo-source`}>{weaponResource.ammoSource.label}</label>
                <select
                  id={`${card.id}-ammo-source`}
                  value={weaponResource.ammoSource.value}
                  onChange={(event) => weaponResource.ammoSource!.onChange(event.target.value)}
                >
                  {weaponResource.ammoSource.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <ResourceCounter
              id={`${card.id}-remaining`}
              label={weaponResource.label}
              current={weaponResource.current}
              decreaseLabel={weaponResource.decreaseLabel}
              increaseLabel={weaponResource.increaseLabel}
              currentLabel={weaponResource.currentLabel}
              onChange={weaponResource.onChange}
            />
          </div>
        ) : null}
        {featSpellResource ? (
          <div className={styles.weaponResource}>
            <ResourceCounter
              id={`${card.id}-feat-spell-uses`}
              label={featSpellResource.label}
              current={featSpellResource.current}
              max={featSpellResource.max}
              decreaseLabel={featSpellResource.decreaseLabel}
              increaseLabel={featSpellResource.increaseLabel}
              currentLabel={featSpellResource.currentLabel}
              onChange={featSpellResource.onChange}
            />
          </div>
        ) : null}
        {card.chargeUses ? (
          <div className={styles.weaponResource}>
            <ResourceCounter
              id={`${card.id}-charges`}
              label={localized.name}
              current={featSpellUses[card.chargeUses.storageKey] ?? card.chargeUses.max}
              max={card.chargeUses.max}
              decreaseLabel={t("combat.decreaseUses", { feature: localized.name })}
              increaseLabel={t("combat.increaseUses", { feature: localized.name })}
              currentLabel={t("combat.currentUses", { feature: localized.name })}
              onChange={(value) => onFeatSpellUsesChange(card.chargeUses!.storageKey, value)}
            />
          </div>
        ) : null}
        {localized.description ? (
          <CatalogProse className={styles.description}>{localized.description}</CatalogProse>
        ) : null}
        {card.useTrackerClassFeatureKey ? (
          (() => {
            const tracker = classUseTrackerByKey.get(card.useTrackerClassFeatureKey);
            if (!tracker) return null;
            const currentUses = classFeatureUses[tracker.featureKey] ?? tracker.maxUses;
            const usesLabel = embeddedClassFeatureUsesLabel(tracker, characterLevel, t);
            return (
              <div className={`${styles.embeddedTracker} ${styles.weaponResource}`}>
                <ResourceCounter
                  id={`${card.id}-class-feature-uses`}
                  label={usesLabel}
                  current={currentUses}
                  max={tracker.maxUses}
                  decreaseLabel={t("combat.decreaseUses", { feature: usesLabel })}
                  increaseLabel={t("combat.increaseUses", { feature: usesLabel })}
                  currentLabel={t("combat.currentUses", { feature: usesLabel })}
                  onChange={(value) => onClassFeatureUsesChange(tracker.featureKey, value)}
                />
              </div>
            );
          })()
        ) : null}
        {card.useTrackerSpeciesFeatureKey ? (
          (() => {
            const tracker = speciesUseTrackerByKey.get(card.useTrackerSpeciesFeatureKey);
            if (!tracker) return null;
            const currentUses = speciesFeatureUses[tracker.featureKey] ?? tracker.maxUses;
            const usesLabel = embeddedUsesLabel(tracker.restRecovery, t);
            return (
              <div className={`${styles.embeddedTracker} ${styles.weaponResource}`}>
                <ResourceCounter
                  id={`${card.id}-species-feature-uses`}
                  label={usesLabel}
                  current={currentUses}
                  max={tracker.maxUses}
                  decreaseLabel={t("combat.decreaseUses", { feature: usesLabel })}
                  increaseLabel={t("combat.increaseUses", { feature: usesLabel })}
                  currentLabel={t("combat.currentUses", { feature: usesLabel })}
                  onChange={(value) => onSpeciesFeatureUsesChange(tracker.featureKey, value)}
                />
              </div>
            );
          })()
        ) : null}
        {card.kind === "feat" && card.referenceOptions ? (
          <CombatReferenceOptions intro={card.referenceIntro} options={card.referenceOptions} />
        ) : null}
        {card.referenceTable ? (
          <CollapsiblePane
            title={card.referenceTableTitle || t("combat.featReferenceTable")}
            variant="nested"
          >
            <table className={styles.referenceTable}>
              <thead>
                <tr>
                  <th>{t("combat.wildMagicSurgeRoll")}</th>
                  <th>{t("combat.wildMagicSurgeEffect")}</th>
                </tr>
              </thead>
              <tbody>
                {card.referenceTable.map((option) => (
                  <tr key={option.key}>
                    <td>{option.name}</td>
                    <td>
                      <CatalogProse variant="inline">{formatProse(option.desc)}</CatalogProse>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CollapsiblePane>
        ) : null}
        {card.useTrackerFeatKey ? (
          (() => {
            const tracker = featUseTrackerByKey.get(card.useTrackerFeatKey);
            if (!tracker) return null;
            const currentUses = featSpellUses[tracker.featKey] ?? tracker.maxUses;
            const usesLabel = embeddedUsesLabel(tracker.restRecovery, t);
            return (
              <div className={`${styles.embeddedTracker} ${styles.weaponResource}`}>
                <ResourceCounter
                  id={`feat-uses-${tracker.featKey}-embedded-action`}
                  label={usesLabel}
                  current={currentUses}
                  max={tracker.maxUses}
                  decreaseLabel={t("combat.decreaseUses", { feature: usesLabel })}
                  increaseLabel={t("combat.increaseUses", { feature: usesLabel })}
                  currentLabel={t("combat.currentUses", { feature: usesLabel })}
                  onChange={(value) => onFeatSpellUsesChange(tracker.featKey, value)}
                />
              </div>
            );
          })()
        ) : null}
        {card.kind === "spell" && card.entityKey
          ? findSpellByKey(card.entityKey)?.effectOptions?.map((option) => (
              <p key={option.key} className={styles.description}>
                <strong>{option.name}.</strong>{" "}
                <CatalogProse variant="inline">{formatProse(option.desc)}</CatalogProse>
              </p>
            ))
          : null}
        {card.kind === "spell" && card.entityKey && (card.spellMeta?.level ?? 0) >= 1 ? (
          <SpellCastControl
            spellKey={card.entityKey}
            spellName={localized.name}
            wrapperClassName={styles.spellCastControl}
          />
        ) : null}
      </div>
    </details>
  );
}

function resolveWeaponResource(
  card: CombatCard,
  characterWeapons: ReturnType<typeof useCharacter>["character"]["weapons"],
  ammoRemaining: ReturnType<typeof useCharacter>["character"]["ammunitionRemaining"],
  magicAmmunition: ReturnType<typeof useCharacter>["character"]["magicAmmunition"],
  preferredAmmoSource: ReturnType<typeof useCharacter>["character"]["preferredAmmoSource"],
  onWeaponQuantityChange: (weaponId: string, value: number) => void,
  onAmmunitionRemainingChange: (
    ammoType: NonNullable<ReturnType<typeof ammunitionTypeForWeapon>>,
    value: number,
  ) => void,
  onMagicAmmunitionRemainingChange: (stackId: string, value: number) => void,
  onPreferredAmmoSourceChange: (ammoType: AmmoType, magicStackId: string | null) => void,
  t: ReturnType<typeof useLocale>["t"],
  tEntity: ReturnType<typeof useLocale>["tEntity"],
):
  | {
      label: string;
      current: number;
      decreaseLabel: string;
      increaseLabel: string;
      currentLabel: string;
      onChange: (value: number) => void;
      ammoSource?: {
        label: string;
        value: string;
        options: { value: string; label: string }[];
        onChange: (value: string) => void;
      };
    }
  | null {
  if (card.kind !== "weapon" || !card.id.startsWith("weapon-")) return null;

  const weaponId = card.id.slice("weapon-".length);
  const characterWeapon = characterWeapons.find((weapon) => weapon.id === weaponId);
  if (!characterWeapon) return null;

  const weaponData = findByKey(WEAPONS, characterWeapon.key);
  if (!weaponData) return null;

  if (isThrownWeapon(weaponData)) {
    if (!shouldConsumeThrownQuantity(characterWeapon)) return null;
    const current = weaponQuantity(characterWeapon);
    const weaponName = tEntity("catalog.weapons", characterWeapon.key, "name", weaponData.name);
    return {
      label: t("combat.weaponRemaining.thrown"),
      current,
      decreaseLabel: t("combat.weaponRemaining.decreaseThrown", { weapon: weaponName }),
      increaseLabel: t("combat.weaponRemaining.increaseThrown", { weapon: weaponName }),
      currentLabel: t("combat.weaponRemaining.currentThrown", { weapon: weaponName }),
      onChange: (value) => onWeaponQuantityChange(weaponId, value),
    };
  }

  const ammoType = ammunitionTypeForWeapon(weaponData);
  if (!ammoType) return null;
  if (!shouldConsumeAmmunition(characterWeapon)) return null;

  const ammoName = t(`equipment.ammoTypes.${ammoType}`);
  const magicStacks = magicAmmoStacksForType(magicAmmunition, ammoType).filter(
    (stack) => magicAmmoStackRemaining(magicAmmunition, stack.id) > 0,
  );
  const preferredMagicId = resolvePreferredMagicAmmoId(magicAmmunition, preferredAmmoSource, ammoType);
  const usingMagic = preferredMagicId != null;
  const current = usingMagic
    ? magicAmmoStackRemaining(magicAmmunition, preferredMagicId)
    : ammunitionRemaining(ammoRemaining, ammoType);

  const ammoSource =
    magicStacks.length > 0
      ? {
          label: t("combat.weaponRemaining.ammoSource"),
          value: usingMagic ? preferredMagicId! : "mundane",
          options: [
            {
              value: "mundane",
              label: t("combat.weaponRemaining.mundaneAmmo", { type: ammoName }),
            },
            ...magicStacks.map((stack) => ({
              value: stack.id,
              label: `${tEntity("catalog.genericVariants", stack.variantKey, "name", stack.variantKey)} (${ammoName})`,
            })),
          ],
          onChange: (value: string) => {
            if (value === "mundane") onPreferredAmmoSourceChange(ammoType, null);
            else onPreferredAmmoSourceChange(ammoType, value);
          },
        }
      : undefined;

  return {
    label: t("combat.weaponRemaining.ammunition", { type: ammoName }),
    current,
    decreaseLabel: t("combat.weaponRemaining.decreaseAmmo", { type: ammoName }),
    increaseLabel: t("combat.weaponRemaining.increaseAmmo", { type: ammoName }),
    currentLabel: t("combat.weaponRemaining.currentAmmo", { type: ammoName }),
    onChange: (value) => {
      if (usingMagic && preferredMagicId) onMagicAmmunitionRemainingChange(preferredMagicId, value);
      else onAmmunitionRemainingChange(ammoType, value);
    },
    ammoSource,
  };
}

function resolveFeatSpellResource(
  card: CombatCard,
  featSpellUseBySpellKey: Map<string, { storageKey: string; maxUses: number }>,
  featSpellUses: ReturnType<typeof useCharacter>["character"]["featSpellUses"],
  onFeatSpellUsesChange: (storageKey: string, value: number) => void,
  t: ReturnType<typeof useLocale>["t"],
  spellName: string,
):
  | {
      label: string;
      current: number;
      max: number;
      decreaseLabel: string;
      increaseLabel: string;
      currentLabel: string;
      onChange: (value: number) => void;
    }
  | null {
  if (card.kind !== "spell" || !card.entityKey) return null;

  const tracker = featSpellUseBySpellKey.get(card.entityKey);
  if (!tracker) return null;

  const current = featSpellUses[tracker.storageKey] ?? tracker.maxUses;
  return {
    label: t("combat.featSpellFreeCast"),
    current,
    max: tracker.maxUses,
    decreaseLabel: t("combat.decreaseFeatSpellUses", { spell: spellName }),
    increaseLabel: t("combat.increaseFeatSpellUses", { spell: spellName }),
    currentLabel: t("combat.currentFeatSpellUses", { spell: spellName }),
    onChange: (value) => onFeatSpellUsesChange(tracker.storageKey, value),
  };
}
