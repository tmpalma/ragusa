import { ARMOR, DEITIES, MAGIC_ITEMS, WEAPONS, findByKey } from "../../data";
import { DeityFacts } from "../form/DeityFacts";
import type { CurrencyDenomination } from "../../data/types";
import { toolAbility } from "../../data/toolStats";
import { classFeatureMetaForSheet } from "../../domain/classFeatures";
import { useMeasurementSystem } from "../../platform/measurementSystem";
import { resolveEquipmentPick } from "../../domain/equipmentPicks";
import { featWeaponMasteryPicksFromCharacter } from "../../domain/featSlots";
import { localizedVariantDisplayName } from "../../domain/genericVariantDisplay";
import { findGenericVariant } from "../../domain/genericVariantMatcher";
import { wornArmorProficiencyPieces } from "../../domain/genericVariantResolve";
import { overviewGearLines } from "../../domain/overviewGear";
import {
  buildTrainingSummary,
  formatTrainingArmorLine,
  formatTrainingWeaponMasteryLine,
  formatTrainingWeaponsLine,
} from "../../domain/training";
import { formatModifier } from "../../domain/modifiers";
import { speciesFeatureMetaForSheet } from "../../domain/speciesFeatures";
import { toolBonus } from "../../domain/toolBonuses";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { CollapsiblePane } from "../CollapsiblePane";
import { PaneHeader } from "../rest/PaneRestActions";
import { OverviewAttributes } from "./OverviewAttributes";
import { OverviewSkills } from "./OverviewSkills";
import { OverviewHeaderStats } from "./OverviewHeaderStats";
import styles from "./Sheet.module.css";
import { LanguagesSummary } from "./LanguagesSummary";
import { SpellAccessSummary } from "./SpellAccessSummary";
import { SpellcastingSummary } from "./SpellcastingSummary";

const CURRENCY_DENOMINATIONS: CurrencyDenomination[] = ["pp", "gp", "ep", "sp", "cp"];

export function SheetPane() {
  const { character, derived } = useCharacter();
  const { t, tEntity, tGlossary } = useLocale();
  const { system, formatLength, formatMass } = useMeasurementSystem();
  const selectedDeity = findByKey(DEITIES, character.deityKey);

  const grantedArmorPieceLabels = wornArmorProficiencyPieces(character.armor).map((piece) => {
    const base = tEntity("catalog.armor", piece.key, "name", piece.key);
    return localizedVariantDisplayName(base, findGenericVariant(piece.variantKey), tEntity);
  });
  const training = buildTrainingSummary({
    classData: derived.classData,
    level: character.level,
    classFeatureChoices: character.classFeatureChoices,
    subclassKey: character.subclassKey,
    featContributions: derived.featContributions,
    grantedArmorPieceLabels,
  });
  const trainingArmor = formatTrainingArmorLine(training, t);
  const trainingWeapons = formatTrainingWeaponsLine(training, t);
  const masteryWeaponKeys = [
    ...character.weaponMasteryPicks.filter(Boolean),
    ...featWeaponMasteryPicksFromCharacter(character),
  ];
  const trainingWeaponMastery =
    masteryWeaponKeys.length > 0
      ? formatTrainingWeaponMasteryLine(masteryWeaponKeys, (weaponKey) =>
          tEntity("catalog.weapons", weaponKey, "name", weaponKey),
        )
      : null;

  const gearLines = overviewGearLines(character, {
    weaponName: (key) => tEntity("catalog.weapons", key, "name", findByKey(WEAPONS, key)?.name ?? key),
    armorName: (key) => tEntity("catalog.armor", key, "name", findByKey(ARMOR, key)?.name ?? key),
    variantGearName: (baseName, variantKey) =>
      localizedVariantDisplayName(baseName, findGenericVariant(variantKey), tEntity),
    gearPickName: (key) => {
      const resolved = resolveEquipmentPick(key);
      if (!resolved) return key;
      if (resolved.kind === "homebrew") return resolved.record.data.name;
      if (resolved.kind === "gear") {
        return tEntity("catalog.adventuringGear", key, "name", resolved.item.name);
      }
      return tEntity("catalog.magicItems", key, "name", resolved.item.name);
    },
    magicItemName: (key) =>
      tEntity("catalog.magicItems", key, "name", findByKey(MAGIC_ITEMS, key)?.name ?? key),
    artificerCreatedItemName: (key) => {
      const magicItem = findByKey(MAGIC_ITEMS, key);
      if (magicItem) return tEntity("catalog.magicItems", key, "name", magicItem.name);
      const variant = findGenericVariant(key);
      if (variant) return tEntity("catalog.genericVariants", key, "name", variant.name);
      return key;
    },
    ammoTypeName: (type) => t(`equipment.ammoTypes.${type}`),
    magicAmmoName: (variantKey, ammoType) =>
      localizedVariantDisplayName(
        t(`equipment.ammoTypes.${ammoType}`),
        findGenericVariant(variantKey),
        tEntity,
      ),
  });
  const overCapacity = derived.carrying.currentLb > derived.carrying.carryLb;
  const nearCapacity =
    !overCapacity && derived.carrying.carryLb > 0 && derived.carrying.currentLb >= derived.carrying.carryLb * 0.8;

  return (
    <div className={styles.pane}>
      <PaneHeader title={character.name || t("sheet.unnamedCharacter")} />
      <OverviewHeaderStats character={character} derived={derived} />

      <OverviewAttributes derived={derived} />

      <section className={styles.section}>
        <h3>{t("sheet.explorationAndMovement")}</h3>
        <div className={styles.explorationGrid}>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>{t("sheet.movementSpeed")}</p>
            {derived.speeds.length > 0 ? (
              <ul className={styles.speedLines}>
                {derived.speeds.map((s) => (
                  <li key={s.type}>
                    {t("rules.speedList", {
                      type: tGlossary("speedType", s.type),
                      feet: formatLength(s.feet),
                    })}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.statValueSmall}>{t("rules.emDash")}</p>
            )}
          </div>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>{t("sheet.darkvision")}</p>
            <p className={styles.statValueSmall}>
              {derived.darkvisionFeet > 0 ? formatLength(derived.darkvisionFeet) : t("rules.emDash")}
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h3>{t("sheet.proficiencies")}</h3>
        <div className={styles.contentPane}>
          <div className={styles.trainingRow}>
            <span className={styles.trainingLabel}>{t("sheet.trainingArmor")}</span>
            <span className={styles.trainingChips}>{trainingArmor}</span>
          </div>
          <div className={styles.trainingRow}>
            <span className={styles.trainingLabel}>{t("sheet.trainingWeapons")}</span>
            <span className={styles.trainingChips}>{trainingWeapons}</span>
          </div>
          {trainingWeaponMastery ? (
            <div className={styles.trainingRow}>
              <span className={styles.trainingLabel}>{t("sheet.trainingWeaponMastery")}</span>
              <span className={styles.trainingChips}>{trainingWeaponMastery}</span>
            </div>
          ) : null}
        </div>
      </section>

      <section className={styles.section}>
        <h3>{t("sheet.skillsAndTools")}</h3>

        <OverviewSkills character={character} derived={derived} />

        {character.proficientTools.length > 0 ? (
          <CollapsiblePane title={t("sheet.tools")}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("sheet.tool")}</th>
                  <th>{t("sheet.ability")}</th>
                  <th>{t("sheet.bonus")}</th>
                </tr>
              </thead>
              <tbody>
                {character.proficientTools.map((toolId) => {
                  const ability = toolAbility(toolId);
                  return (
                    <tr key={toolId}>
                      <td>{t(`rules.tool.${toolId}`)}</td>
                      <td>{t(`rules.ability.${ability}`)}</td>
                      <td>{formatModifier(toolBonus(derived.abilityModifiers, toolId))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CollapsiblePane>
        ) : null}
      </section>

      <SpellcastingSummary />

      <section className={styles.section}>
        <h3>{t("sheet.classFeatures")}</h3>
        {derived.activeClassFeatures.length === 0 ? (
          <p className={styles.hint}>{t("rules.emDash")}</p>
        ) : (
          <ul>
            {derived.activeClassFeatures.map((feature) => {
              const meta = derived.classData
                ? classFeatureMetaForSheet(
                    derived.classData.key,
                    feature.key,
                    derived.classFeatureContributions,
                    character.level,
                  )
                : null;
              return (
                <li key={feature.key}>
                  {tEntity(
                    "catalog.classes",
                    `${derived.classData!.key}.feature.${feature.key}`,
                    "name",
                    feature.name,
                  )}
                  {meta ? ` (${meta})` : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h3>{t("sheet.speciesFeatures")}</h3>
        {derived.activeSpeciesFeatures.length === 0 ? (
          <p className={styles.hint}>{t("rules.emDash")}</p>
        ) : (
          <ul>
            {derived.activeSpeciesFeatures.map((feature) => {
              const meta = derived.speciesData
                ? speciesFeatureMetaForSheet(
                    derived.speciesData.key,
                    feature.key,
                    {
                      ...derived.speciesFeatureContributions,
                      darkvisionFeet: derived.darkvisionFeet,
                    },
                    system,
                  )
                : null;
              return (
                <li key={feature.key}>
                  {tEntity(
                    "catalog.species",
                    `${derived.speciesData!.key}.feature.${feature.key}`,
                    "name",
                    feature.name,
                  )}
                  {meta ? ` (${meta})` : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h3>{t("sheet.feats")}</h3>
        {derived.feats.length === 0 ? (
          <p className={styles.hint}>{t("rules.emDash")}</p>
        ) : (
          <ul>
            {derived.feats.map((feat) => (
              <li key={feat.key}>{tEntity("catalog.feats", feat.key, "name", feat.name)}</li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h3>{t("sheet.gear")}</h3>

        {gearLines.length > 0 ? (
          <ul className={styles.gearList}>
            {gearLines.map((line, index) => (
              <li key={`${index}-${line}`}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className={styles.hint}>{t("sheet.noGear")}</p>
        )}
      </section>

      <section className={styles.section}>
        <h3>{t("equipment.carryingCapacity")}</h3>
        <dl
          className={`${styles.capacityGrid} ${overCapacity ? styles.overCapacity : nearCapacity ? styles.nearCapacity : ""}`}
        >
          <div>
            <dt>{t("equipment.carried")}</dt>
            <dd>
              {formatMass(derived.carrying.currentLb)}
            </dd>
          </div>
          <div>
            <dt>{t("equipment.maxCarry")}</dt>
            <dd>
              {formatMass(derived.carrying.carryLb)}
            </dd>
          </div>
          <div>
            <dt>{t("equipment.maxDragLiftPush")}</dt>
            <dd>
              {formatMass(derived.carrying.dragLiftPushLb)}
            </dd>
          </div>
        </dl>
        {overCapacity ? <p className={styles.overCapacityHint}>{t("equipment.overCapacityHint")}</p> : null}
      </section>

      <section className={styles.section}>
        <h3>{t("equipment.money")}</h3>
        <div className={styles.purse}>
          {CURRENCY_DENOMINATIONS.map((denomination) => (
            <div key={denomination} className={styles.coin}>
              <span className={styles.coinLabel}>
                {t(`equipment.currency.${denomination}`)}{" "}
                <span className={styles.abbr}>({t(`equipment.currencyAbbr.${denomination}`)})</span>
              </span>
              <span className={styles.coinValue}>{character.currency[denomination]}</span>
            </div>
          ))}
        </div>
      </section>

      {character.alignmentKey && (
        <section className={styles.section}>
          <h3>{t("sheet.alignment")}</h3>
          <p>{character.alignmentDescription}</p>
        </section>
      )}

      {selectedDeity && (
        <section className={styles.section}>
          <h3>{t("sheet.deity")}</h3>
          <p className={styles.deityName}>
            {tEntity("catalog.deities", selectedDeity.key, "name", selectedDeity.name)}
          </p>
          <DeityFacts deity={selectedDeity} />
        </section>
      )}

      <LanguagesSummary />

      <SpellAccessSummary />

      {character.backstory && (
        <section className={styles.section}>
          <h3>{t("sheet.backstory")}</h3>
          <p className={styles.backstory}>{character.backstory}</p>
        </section>
      )}

    </div>
  );
}
