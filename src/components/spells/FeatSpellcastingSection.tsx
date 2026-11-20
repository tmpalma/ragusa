import { useMemo } from "react";
import type { FeatChoices } from "../../domain/featEffects";
import { FEAT_SPELLS_TAB_TOUCHED_KEYS, isMagicInitiateFeatKey } from "../../domain/featEffects";
import { formatModifier } from "../../domain/modifiers";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { ResourceCounter } from "../combat/ResourceCounter";
import { CollapsiblePane } from "../CollapsiblePane";
import combatStyles from "../combat/Combat.module.css";
import sheetStyles from "../sheet/Sheet.module.css";
import { MagicConnoisseurSpellsSection } from "./MagicConnoisseurSpellsSection";
import { MagicInitiateSpellsSection } from "./MagicInitiateSpellsSection";
import { RitualCasterSection } from "./RitualCasterSection";
import { TouchedFeatSpellsSection } from "./TouchedFeatSpellsSection";
import styles from "./Spells.module.css";

const MAGIC_CONNOISSEUR_FEAT_KEY = "magic-connoisseur";

function spellLabel(spellKey: string, tEntity: ReturnType<typeof useLocale>["tEntity"]): string {
  return tEntity("catalog.spells", spellKey, "name", spellKey);
}

export function FeatSpellcastingSection({
  activeFeatKeys,
  featChoicesFor,
  globalFeatSpellcastingEntries,
  globalFeatSpellUseTrackers,
  hasRitualCaster,
  ritualCasterSpellKeys,
}: {
  activeFeatKeys: string[];
  featChoicesFor: (featKey: string) => FeatChoices;
  globalFeatSpellcastingEntries: {
    featKey: string;
    summary: {
      ability: string;
      abilityModifier: number;
      attackBonus: number;
      saveDc: number;
    };
  }[];
  globalFeatSpellUseTrackers: {
    id: string;
    spellKey: string;
    storageKey: string;
    maxUses: number;
  }[];
  hasRitualCaster: boolean;
  ritualCasterSpellKeys: string[];
}) {
  const { character, dispatch } = useCharacter();
  const { t, tEntity } = useLocale();

  const hasMagicInitiate = useMemo(
    () => activeFeatKeys.some((featKey) => isMagicInitiateFeatKey(featKey)),
    [activeFeatKeys],
  );
  const hasTouched = useMemo(
    () => activeFeatKeys.some((featKey) => FEAT_SPELLS_TAB_TOUCHED_KEYS.has(featKey)),
    [activeFeatKeys],
  );
  const hasConnoisseur = activeFeatKeys.includes(MAGIC_CONNOISSEUR_FEAT_KEY);

  const showPane =
    hasMagicInitiate ||
    globalFeatSpellcastingEntries.length > 0 ||
    globalFeatSpellUseTrackers.length > 0 ||
    hasRitualCaster ||
    hasConnoisseur ||
    hasTouched;

  if (!showPane) return null;

  return (
    <section className={`${styles.section} ${styles.featSpellcastingPaneSection}`}>
      <CollapsiblePane title={<h3>{t("spells.featSpellcasting")}</h3>}>
        <div className={styles.featSpellcastingPaneBody}>
          <MagicInitiateSpellsSection
            activeFeatKeys={activeFeatKeys}
            featChoicesFor={featChoicesFor}
            embedded
          />

          {globalFeatSpellcastingEntries.map(({ featKey, summary }) => (
            <div key={featKey} className={styles.featSpellcastingGroup}>
              <p className={styles.groupLabel}>
                {tEntity("catalog.feats", featKey, "name", featKey)}
              </p>
              <div className={sheetStyles.statGrid}>
                <div className={sheetStyles.statCard}>
                  <p className={sheetStyles.statLabel}>
                    {t("spells.abilityModifier", { ability: t(`rules.ability.${summary.ability}`) })}
                  </p>
                  <p className={sheetStyles.statValue}>{formatModifier(summary.abilityModifier)}</p>
                </div>
                <div className={sheetStyles.statCard}>
                  <p className={sheetStyles.statLabel}>{t("spells.spellAttack")}</p>
                  <p className={sheetStyles.statValue}>{formatModifier(summary.attackBonus)}</p>
                </div>
                <div className={sheetStyles.statCard}>
                  <p className={sheetStyles.statLabel}>{t("spells.saveDc")}</p>
                  <p className={sheetStyles.statValue}>{summary.saveDc}</p>
                </div>
              </div>
            </div>
          ))}

          {globalFeatSpellUseTrackers.length > 0 ? (
            <div className={styles.featSpellcastingGroup}>
              <p className={styles.groupLabel}>{t("spells.featSpellFreeCasts")}</p>
              <div className={combatStyles.statRow}>
                {globalFeatSpellUseTrackers.map((tracker) => {
                  const spellName = spellLabel(tracker.spellKey, tEntity);
                  const currentUses = character.featSpellUses[tracker.storageKey] ?? tracker.maxUses;
                  return (
                    <ResourceCounter
                      key={tracker.id}
                      id={`feat-spells-uses-${tracker.storageKey}`}
                      label={t("combat.featSpellUses", { spell: spellName })}
                      current={currentUses}
                      max={tracker.maxUses}
                      decreaseLabel={t("combat.decreaseFeatSpellUses", { spell: spellName })}
                      increaseLabel={t("combat.increaseFeatSpellUses", { spell: spellName })}
                      currentLabel={t("combat.currentFeatSpellUses", { spell: spellName })}
                      onChange={(value) =>
                        dispatch({ type: "SET_FEAT_SPELL_USES", featKey: tracker.storageKey, value })
                      }
                    />
                  );
                })}
              </div>
            </div>
          ) : null}

          {hasRitualCaster ? (
            <RitualCasterSection
              embedded
              activeFeatKeys={activeFeatKeys}
              featChoicesFor={featChoicesFor}
              ritualSpellKeys={ritualCasterSpellKeys}
            />
          ) : null}

          <MagicConnoisseurSpellsSection
            embedded
            activeFeatKeys={activeFeatKeys}
            featChoicesFor={featChoicesFor}
          />

          <TouchedFeatSpellsSection
            embedded
            activeFeatKeys={activeFeatKeys}
            featChoicesFor={featChoicesFor}
          />
        </div>
      </CollapsiblePane>
    </section>
  );
}