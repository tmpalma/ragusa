import {
  availableFontOfMagicSlotCosts,
  buildClassFeatureUseTrackers,
  classFeatureOptionPickGrantsForSurface,
  classFeatureOptionPickOptions,
  classFeatureOptionPicksForLevel,
  FONT_OF_MAGIC_FEATURE_KEY,
} from "../../domain/classFeatures";
import { findSubclass } from "../../domain/subclasses";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { ResourceCounter } from "../combat/ResourceCounter";
import { MetamagicPickList } from "./MetamagicPickList";
import combatStyles from "../combat/Combat.module.css";
import styles from "./Spells.module.css";

export function FontOfMagicSection() {
  const { character, derived, dispatch } = useCharacter();
  const { t, tEntity } = useLocale();

  if (character.classKey !== "sorcerer" || character.level < 2 || !derived.classData) return null;

  const subclassData = findSubclass(character.classKey, character.subclassKey);
  const tracker = buildClassFeatureUseTrackers(
    derived.classData,
    character.level,
    derived.abilityModifiers,
    subclassData,
    "spells",
  ).find((entry) => entry.featureKey === FONT_OF_MAGIC_FEATURE_KEY);
  if (!tracker) return null;

  const currentSp = character.classFeatureUses[FONT_OF_MAGIC_FEATURE_KEY] ?? tracker.maxUses;
  const slotsByLevel = derived.spellcasting?.slotsByLevel ?? {};
  const slotCosts = availableFontOfMagicSlotCosts(character.level);

  return (
    <section className={styles.section}>
      <h3>{tEntity("catalog.classes", "sorcerer.feature.font-of-magic", "name", tracker.name)}</h3>
      <p className={styles.featureDesc}>
        {tEntity(
          "catalog.classes",
          "sorcerer.feature.font-of-magic",
          "desc",
          "Spend Sorcery Points to create spell slots or convert remaining slots back into points.",
        )}
      </p>
      <div className={combatStyles.statRow}>
        <ResourceCounter
          id="font-of-magic-sorcery-points"
          label={t("spells.sorceryPoints")}
          current={currentSp}
          max={tracker.maxUses}
          decreaseLabel={t("spells.decreaseSorceryPoints")}
          increaseLabel={t("spells.increaseSorceryPoints")}
          currentLabel={t("spells.currentSorceryPoints")}
          onChange={(value) =>
            dispatch({ type: "SET_CLASS_FEATURE_USES", featureKey: FONT_OF_MAGIC_FEATURE_KEY, value })
          }
        />
      </div>

      {slotCosts.length > 0 ? (
        <div className={styles.fontOfMagicTableWrap}>
          <p className={styles.groupLabel}>{t("spells.creatingSpellSlots")}</p>
          <table className={styles.fontOfMagicTable}>
            <thead>
              <tr>
                <th>{t("spells.slotTableLevel")}</th>
                <th>{t("spells.slotTableCost")}</th>
                <th>{t("spells.slotTableMinLevel")}</th>
                <th>{t("spells.slotTableActions")}</th>
              </tr>
            </thead>
            <tbody>
              {slotCosts.map((row) => {
                const maxSlots = slotsByLevel[row.spellLevel] ?? 0;
                const remaining = character.spellSlotRemaining[row.spellLevel] ?? maxSlots;
                const canCreate = currentSp >= row.sorceryPointCost;
                const canConvert = maxSlots > 0 && remaining > 0 && currentSp < tracker.maxUses;
                return (
                  <tr key={row.spellLevel}>
                    <td>{t("spells.nthLevelSlots", { level: row.spellLevel })}</td>
                    <td>{row.sorceryPointCost}</td>
                    <td>{row.minSorcererLevel}</td>
                    <td className={styles.fontOfMagicActions}>
                      <button
                        type="button"
                        className={styles.fontOfMagicButton}
                        disabled={!canCreate}
                        onClick={() =>
                          dispatch({ type: "CREATE_SPELL_SLOT_FROM_SORCERY", spellLevel: row.spellLevel })
                        }
                      >
                        {t("spells.createSpellSlot")}
                      </button>
                      {maxSlots > 0 ? (
                        <button
                          type="button"
                          className={styles.fontOfMagicButton}
                          disabled={!canConvert}
                          onClick={() =>
                            dispatch({ type: "CONVERT_SPELL_SLOT_TO_SORCERY", spellLevel: row.spellLevel })
                          }
                        >
                          {t("spells.convertSpellSlot", { level: row.spellLevel })}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

export function MetamagicSection() {
  const { character, derived } = useCharacter();
  const { tEntity } = useLocale();

  if (character.classKey !== "sorcerer" || character.level < 2 || !derived.classData) return null;

  const grants = classFeatureOptionPickGrantsForSurface(derived.classData, character.level, "spells");
  if (grants.length === 0) return null;

  return (
    <>
      {grants.map((grant) => {
        const picks = classFeatureOptionPicksForLevel(
          derived.classData,
          grant.choiceKey,
          character.level,
          character.classFeatureOptionPicks,
        );
        const options = classFeatureOptionPickOptions(derived.classData, grant.choiceKey);

        return (
          <section key={grant.choiceKey} className={styles.section}>
            <h3>
              {tEntity(
                "catalog.classes",
                `${derived.classData!.key}.feature.${grant.featureKey}`,
                "name",
                grant.featureName,
              )}
            </h3>
            <p className={styles.featureDesc}>
              {tEntity(
                "catalog.classes",
                `${derived.classData!.key}.feature.${grant.featureKey}`,
                "desc",
                "Choose Metamagic options. Spend Sorcery Points manually when you use them.",
              )}
            </p>
            <MetamagicPickList
              choiceKey={grant.choiceKey}
              options={options}
              picks={picks}
              maxCount={grant.count}
            />
          </section>
        );
      })}
    </>
  );
}
