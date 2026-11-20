import { useMemo } from "react";
import type { ComboboxOption } from "../form/Combobox";
import { Combobox } from "../form/Combobox";
import type { DerivedStats } from "../../domain/deriveCharacter";
import { effectiveLevelPath, resolvedClassLevels } from "../../domain/classLevels";
import { featChoicesResolverForCharacter } from "../../domain/featSlots";
import { characterConcentrationSpellKeys, findSpellByKey } from "../../domain/spellSelection";
import { useLocale } from "../../i18n/LocaleContext";
import { activeFeatKeysFromCharacter, type Character } from "../../state/characterState";
import { CollapsiblePane } from "../CollapsiblePane";
import spellStyles from "../spells/Spells.module.css";
import styles from "./Sheet.module.css";

function hasWarlockLevels(derived: DerivedStats): boolean {
  return derived.perClassSpellcasting.some(
    (entry) => entry.classKey === "warlock" && entry.classLevel > 0,
  );
}

export function MagicSummary({
  memberId,
  character,
  derived,
  onConcentrationChange,
  defaultOpen = true,
}: {
  memberId: string;
  character: Character;
  derived: DerivedStats;
  onConcentrationChange: (spellKey: string | null) => void;
  defaultOpen?: boolean;
}) {
  const { t, tEntity } = useLocale();
  const pactMagic = derived.pactMagic;
  const isWarlock = hasWarlockLevels(derived);

  const slotsByLevel = derived.spellcasting?.slotsByLevel ?? {};
  const slotLevels = useMemo(
    () =>
      Object.keys(slotsByLevel)
        .map(Number)
        .filter((level) => (slotsByLevel[level] ?? 0) > 0)
        .sort((a, b) => a - b),
    [slotsByLevel],
  );

  const classLevels = useMemo(() => resolvedClassLevels(effectiveLevelPath(character)), [character]);
  const activeFeatKeys = useMemo(() => activeFeatKeysFromCharacter(character), [character]);
  const featChoicesFor = useMemo(() => featChoicesResolverForCharacter(character), [character]);

  const concentrationSpellKeys = useMemo(
    () =>
      characterConcentrationSpellKeys({
        character,
        classLevels,
        speciesCantrips: derived.speciesFeatureContributions.cantrips,
        speciesPreparedSpells: derived.speciesFeatureContributions.preparedSpells,
        activeFeatKeys,
        featChoicesFor,
        spellSlots: derived.spellcasting?.slotsByLevel,
      }),
    [
      character,
      classLevels,
      derived.speciesFeatureContributions,
      derived.spellcasting?.slotsByLevel,
      activeFeatKeys,
      featChoicesFor,
    ],
  );

  const concentrationOptions = useMemo((): ComboboxOption[] => {
    return concentrationSpellKeys.map((spellKey) => {
      const spell = findSpellByKey(spellKey);
      return {
        key: spellKey,
        label: tEntity("catalog.spells", spellKey, "name", spell?.name ?? spellKey),
      };
    });
  }, [concentrationSpellKeys, tEntity]);

  const hasSlots = isWarlock ? pactMagic != null : slotLevels.length > 0;
  const hasConcentration = concentrationSpellKeys.length > 0;

  if (!hasSlots && !hasConcentration) return null;

  return (
    <CollapsiblePane title={t("sheet.magic")} defaultOpen={defaultOpen}>
      {hasSlots ? (
        <section className={styles.section}>
          <h3>{isWarlock ? t("sheet.pactMagic") : t("sheet.spellSlots")}</h3>
          {isWarlock && pactMagic ? (
            <div className={styles.statGrid}>
              <div className={styles.statCard}>
                <p className={styles.statLabel}>{t("sheet.pactSpellSlots")}</p>
                <p className={styles.statValue}>{pactMagic.count}</p>
              </div>
              <div className={styles.statCard}>
                <p className={styles.statLabel}>{t("sheet.spellSlotsLevel")}</p>
                <p className={styles.statValue}>{pactMagic.slotLevel}</p>
              </div>
            </div>
          ) : (
            <div className={styles.statGrid}>
              {slotLevels.map((level) => (
                <div key={level} className={styles.statCard}>
                  <p className={styles.statLabel}>{t("sheet.nthLevelSpellSlots", { level })}</p>
                  <p className={styles.statValue}>{slotsByLevel[level]}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}
      {hasConcentration ? (
        <section
          className={`${styles.section} ${spellStyles.concentrationSection} ${hasSlots ? styles.magicConcentrationSection : ""}`}
        >
          <h3>{t("spells.concentration")}</h3>
          <Combobox
            id={`campaign-member-${memberId}-concentration-spell`}
            label={t("spells.concentrationSpell")}
            value={character.concentrationSpellKey}
            onChange={onConcentrationChange}
            options={concentrationOptions}
            placeholder={t("spells.concentrationSpellPlaceholder")}
            className={spellStyles.concentrationSpellField}
          />
        </section>
      ) : null}
    </CollapsiblePane>
  );
}
