import { WEAPONS } from "../../data";
import type { AbilityId } from "../../data/types";
import {
  availableFeatWeaponMasteryOptions,
  effectiveWeaponProficiencyGrants,
} from "../../domain/classFeatures";
import {
  availableFeatProficiencyOptions,
  featAbilityIncreaseEffect,
  featDamageTypeOptions,
  featNeedsDamageTypePick,
  featNeedsWeaponMasteryPick,
  featFixedToolIdsFromDefinition,
  featProficiencyGrantEffect,
  featSkillPickCount,
  FEAT_COMBAT_DAMAGE_TYPE_PICK_KEYS,
  FEAT_COMBAT_WEAPON_MASTERY_PICK_KEYS,
  type FeatEffect,
  type FeatProficiencyPick,
} from "../../domain/featEffects";
import { buildSkillPickSources, featSkillPicksFromProficiencyChoices } from "../../domain/skillPickSources";
import { expertSkillIds, proficientSkillIds, takenSkillsForFeatPicker } from "../../domain/skillPicks";
import { resolveBackgroundData } from "../../domain/background";
import { findSubclass, subclassFixedSkills } from "../../domain/subclasses";
import { abilityScoresAfterIncreases } from "../../domain/abilityScoreIncreases";
import { evaluateFeatPrerequisites } from "../../domain/featPrerequisites";
import { abilityModifier, formatModifier } from "../../domain/modifiers";
import { featToolPickSlotForId, featToolPicks, mergeProficientTools } from "../../domain/toolPicks";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { AbilityIncreaseInput } from "./AbilityIncreaseInput";
import { Combobox } from "./Combobox";
import { FeatFixedToolPickList } from "./FeatFixedToolPickList";
import { FeatProficiencyCappedPickList } from "./FeatProficiencyCappedPickList";
import { MusicalInstrumentCappedPickList } from "./MusicalInstrumentCappedPickList";
import styles from "./Form.module.css";
import { ABILITIES } from "../../data/skills";

function firstEmptyFeatProficiencySlot(picks: readonly (FeatProficiencyPick | null)[]): number {
  return picks.findIndex((pick) => pick === null);
}

function featUsesCappedMusicalInstrumentPicker(
  grant: Extract<FeatEffect, { type: "grant_skill_proficiencies" }> | null,
): boolean {
  return (
    grant != null &&
    grant.allowSkills === false &&
    grant.toolCategories?.length === 1 &&
    grant.toolCategories[0] === "musicalInstrument"
  );
}

function formatDamageTypeLabel(damageType: string, t: ReturnType<typeof useLocale>["t"]): string {
  const localized = t(`rules.damageType.${damageType}`);
  if (localized !== `rules.damageType.${damageType}`) return localized;
  return damageType.charAt(0).toUpperCase() + damageType.slice(1);
}

interface FeatProficiencyChoicesProps {
  featKey: string;
  proficiencyPicks: (FeatProficiencyPick | null)[];
  abilityIncreases: Partial<Record<AbilityId, number>>;
  damageTypePick: string | null;
  weaponMasteryPick: string | null;
  onPickChange: (index: number, pick: FeatProficiencyPick | null) => void;
  onAbilityIncreasesChange: (abilityIncreases: Partial<Record<AbilityId, number>>) => void;
  onDamageTypeChange: (damageType: string | null) => void;
  onWeaponMasteryPickChange: (weaponKey: string | null) => void;
  idPrefix: string;
}

export function FeatProficiencyChoices({
  featKey,
  proficiencyPicks,
  abilityIncreases,
  damageTypePick,
  weaponMasteryPick,
  onPickChange,
  onAbilityIncreasesChange,
  onDamageTypeChange,
  onWeaponMasteryPickChange,
  idPrefix,
}: FeatProficiencyChoicesProps) {
  const { character, derived } = useCharacter();
  const { t, tEntity, tGlossary } = useLocale();
  const prerequisiteResult = evaluateFeatPrerequisites(featKey, character, derived.classData);
  const pickCount = featSkillPickCount(featKey);
  const abilityEffect = featAbilityIncreaseEffect(featKey);
  const proficiencyGrant = featProficiencyGrantEffect(featKey);
  const fixedToolIds = featFixedToolIdsFromDefinition(featKey);

  const sources = buildSkillPickSources(character, derived);
  const featSkillPicks = featSkillPicksFromProficiencyChoices(proficiencyPicks);
  const takenTools = mergeProficientTools(
    character.backgroundToolPicks,
    character.classToolPicks,
    [],
  );

  const allowedAbilitySet = new Set<AbilityId>(
    abilityEffect?.allowedAbilities ?? ABILITIES.map(({ id }) => id),
  );
  const pointsSpent = Object.values(abilityIncreases).reduce((sum, value) => sum + (value ?? 0), 0);
  const scoresBeforeFeats = abilityScoresAfterIncreases(character.abilityScores, character.abilityScoreIncreases);
  const showDamageTypePicker =
    featNeedsDamageTypePick(featKey) && !FEAT_COMBAT_DAMAGE_TYPE_PICK_KEYS.has(featKey);
  const showWeaponMasteryPicker =
    featNeedsWeaponMasteryPick(featKey) && !FEAT_COMBAT_WEAPON_MASTERY_PICK_KEYS.has(featKey);
  const extraWeaponProficiencies = [
    ...effectiveWeaponProficiencyGrants(
      derived.classData,
      character.level,
      character.classFeatureChoices,
      character.subclassKey,
    ),
    ...derived.featContributions.weaponProficiencyGrants.map((proficiency) => ({ kind: proficiency })),
  ];
  const weaponMasteryOptions = availableFeatWeaponMasteryOptions(derived.classData, extraWeaponProficiencies);
  const backgroundData = resolveBackgroundData(character);
  const subclassFixed = subclassFixedSkills(findSubclass(character.classKey, character.subclassKey));
  const proficientSkills = proficientSkillIds(
    backgroundData?.skillProficiencies ?? [],
    character.classSkillPicks,
    featSkillPicks,
    character.speciesSkillPicks,
    character.subclassSkillPicks,
    Object.values(character.classFeatureSkillPicks).flat(),
    subclassFixed,
  );
  const expertSkills = expertSkillIds(
    backgroundData?.skillProficiencies ?? [],
    character.classSkillPicks,
    featSkillPicks,
    character.expertiseSkillPicks,
    character.speciesSkillPicks,
    character.subclassSkillPicks,
    Object.values(character.classFeatureSkillPicks).flat(),
    subclassFixed,
  );
  const proficiencyContext = { featKey, proficientSkills, expertSkills };

  function weaponLabel(weaponKey: string): string {
    const weapon = WEAPONS.find((entry) => entry.key === weaponKey);
    const name = tEntity("catalog.weapons", weaponKey, "name", weapon?.name ?? weaponKey);
    return weapon?.mastery ? `${name} (${tGlossary("weaponProperty", weapon.mastery)})` : name;
  }

  return (
    <>
      {!prerequisiteResult.met ? (
        <p className={styles.warning} role="status">
          {t("character.featPrerequisiteWarning")}
        </p>
      ) : null}

      {pickCount > 0 && featKey === "skill-expert" ? (
        <>
          {[0, 1].map((slotIndex) => {
            const options = availableFeatProficiencyOptions(
              proficiencyPicks,
              takenSkillsForFeatPicker(sources, featSkillPicks, slotIndex),
              takenTools,
              slotIndex,
              proficiencyGrant,
              { ...proficiencyContext, featKey },
            ).filter((option): option is Extract<FeatProficiencyPick, { kind: "skill" }> => option.kind === "skill");
            const currentPick = proficiencyPicks[slotIndex];
            return (
              <Combobox
                key={slotIndex}
                id={`${idPrefix}-skill-expert-${slotIndex}`}
                label={
                  slotIndex === 0
                    ? t("character.featSkillProficiencyPickLabel")
                    : t("character.featSkillExpertisePickLabel")
                }
                value={currentPick?.kind === "skill" ? currentPick.id : null}
                onChange={(skillId) =>
                  onPickChange(slotIndex, skillId ? { kind: "skill", id: skillId as import("../../data/types").SkillId } : null)
                }
                options={options.map((option) => ({
                  key: option.id,
                  label: t(`rules.skill.${option.id}` as `rules.skill.${typeof option.id}`),
                }))}
              />
            );
          })}
        </>
      ) : pickCount > 0 ? (
        featUsesCappedMusicalInstrumentPicker(proficiencyGrant) ? (
          <MusicalInstrumentCappedPickList
            id={`${idPrefix}-musical-instrument-select`}
            selectedKeys={featToolPicks(proficiencyPicks)}
            maxCount={pickCount}
            options={availableFeatProficiencyOptions(
              proficiencyPicks,
              takenSkillsForFeatPicker(sources, featSkillPicks, -1),
              takenTools,
              -1,
              proficiencyGrant,
            )
              .filter((option): option is Extract<FeatProficiencyPick, { kind: "tool" }> => option.kind === "tool")
              .map((option) => option.id)}
            onAdd={(toolId) => {
              const index = firstEmptyFeatProficiencySlot(proficiencyPicks);
              if (index < 0) return;
              onPickChange(index, { kind: "tool", id: toolId });
            }}
            onRemove={(toolId) => {
              const index = featToolPickSlotForId(proficiencyPicks, toolId);
              if (index < 0) return;
              onPickChange(index, null);
            }}
          />
        ) : (
          <FeatProficiencyCappedPickList
            id={`${idPrefix}-proficiency-select`}
            proficiencyPicks={proficiencyPicks}
            maxCount={pickCount}
            takenSkills={takenSkillsForFeatPicker(sources, featSkillPicks, -1)}
            takenTools={takenTools}
            proficiencyGrant={proficiencyGrant}
            proficiencyContext={proficiencyContext}
            onPickChange={onPickChange}
          />
        )
      ) : null}

      {fixedToolIds.length > 0 ? (
        <FeatFixedToolPickList id={`${idPrefix}-fixed-tools`} toolIds={fixedToolIds} />
      ) : null}

      {showDamageTypePicker ? (
        <Combobox
          id={`${idPrefix}-damage-type`}
          label={t("character.featDamageType")}
          value={damageTypePick}
          onChange={(key) => onDamageTypeChange(key)}
          options={featDamageTypeOptions(featKey).map((damageType) => ({
            key: damageType,
            label: formatDamageTypeLabel(damageType, t),
          }))}
        />
      ) : null}

      {showWeaponMasteryPicker ? (
        <Combobox
          id={`${idPrefix}-weapon-mastery`}
          label={t("character.featWeaponMasteryPick")}
          value={weaponMasteryPick}
          onChange={(key) => onWeaponMasteryPickChange(key)}
          options={weaponMasteryOptions.map((weapon) => ({
            key: weapon.key,
            label: weaponLabel(weapon.key),
          }))}
        />
      ) : null}

      {abilityEffect ? (
        <div className={styles.field}>
          <span className={styles.groupLabel}>
            {t("character.featAbilityIncrease", { points: abilityEffect.points, max: abilityEffect.maxScore })}
          </span>
          <p className={styles.hint}>
            {t("character.featAbilityPointsUsed", {
              spent: pointsSpent,
              total: abilityEffect.points,
            })}
          </p>
          <table className={`${styles.skillsTable} ${styles.abilityTable}`}>
            <thead>
              <tr>
                <th scope="col">{t("character.abilityColumn")}</th>
                <th scope="col">{t("character.featValueBeforeColumn")}</th>
                <th scope="col">{t("character.featIncreaseColumn")}</th>
                <th scope="col">{t("character.valueColumn")}</th>
                <th scope="col" className={styles.abilityModifierCol}>
                  {t("character.modifierColumn")}
                </th>
              </tr>
            </thead>
            <tbody>
              {ABILITIES.map(({ id }) => {
                const baseScore = scoresBeforeFeats[id];
                const currentIncrease = abilityIncreases[id] ?? 0;
                const pointsSpentElsewhere = pointsSpent - currentIncrease;
                const remainingPoints = abilityEffect.points - pointsSpentElsewhere;
                const allowed = allowedAbilitySet.has(id);
                const maxIncrease = allowed
                  ? Math.min(remainingPoints, Math.max(0, abilityEffect.maxScore - baseScore))
                  : 0;
                const scoreBeforeThisFeat = derived.abilityScores[id] - currentIncrease;
                const scoreAfterThisFeat = scoreBeforeThisFeat + currentIncrease;
                const modifier = formatModifier(abilityModifier(scoreAfterThisFeat));

                return (
                  <tr key={id}>
                    <th scope="row">{t(`rules.ability.${id}`)}</th>
                    <td className={styles.abilityValueCell}>{scoreBeforeThisFeat}</td>
                    <td>
                      <AbilityIncreaseInput
                        id={`${idPrefix}-ability-${id}`}
                        ability={id}
                        value={currentIncrease}
                        max={maxIncrease}
                        disabled={!allowed}
                        onCommit={(ability, nextValue) =>
                          onAbilityIncreasesChange({
                            ...abilityIncreases,
                            [ability]: nextValue,
                          })
                        }
                      />
                    </td>
                    <td className={styles.abilityValueCell}>{scoreAfterThisFeat}</td>
                    <td className={`${styles.abilityModifierCell} ${styles.abilityModifierCol}`}>{modifier}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
