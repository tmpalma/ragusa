import type { AbilityId } from "../../data/types";
import { formatModifier, abilityModifier } from "../../domain/modifiers";
import type { ResolvedCreatureStatBlock } from "../../domain/trackedCreatures";
import { useLocale } from "../../i18n/LocaleContext";
import { useMeasurementSystem } from "../../platform/measurementSystem";
import styles from "./CreatureStatBlock.module.css";

const PHYSICAL_ABILITIES: AbilityId[] = ["str", "dex", "con", "int", "wis", "cha"];

interface CreatureStatBlockProps {
  block: ResolvedCreatureStatBlock;
  formLabel?: string;
}

export function CreatureStatBlock({ block, formLabel }: CreatureStatBlockProps) {
  const { t, tGlossary } = useLocale();
  const { formatLength } = useMeasurementSystem();

  const attributeSummary = PHYSICAL_ABILITIES.map((ability) => {
    const score = block.abilities[ability];
    return `${t(`rules.ability.${ability}`)} ${score} (${formatModifier(abilityModifier(score))})`;
  }).join(", ");

  return (
    <div className={styles.block}>
      {formLabel ? (
        <p className={styles.line}>
          <strong>{formLabel}</strong>
        </p>
      ) : null}
      <p className={styles.line}>
        <strong>{t("companions.statBlock.ac")}:</strong> {block.ac}
      </p>
      <p className={styles.line}>
        <strong>{t("combat.wildShapeAttributes")}:</strong> {attributeSummary}
      </p>
      <p className={styles.line}>
        <strong>{t("companions.statBlock.speeds")}:</strong>{" "}
        {block.speeds.map((speed) => `${tGlossary("speedType", speed.type)} ${formatLength(speed.feet)}`).join(", ")}
      </p>
      {block.attacks.length > 0 ? (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>{t("companions.statBlock.attacks")}</p>
          <ul className={styles.list}>
            {block.attacks.map((attack) => (
              <li key={attack.name}>
                <strong>{attack.name}</strong> — {formatModifier(attack.toHit)},{" "}
                {attack.damage} {tGlossary("damageType", attack.damageType)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {block.traits.length > 0 ? (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>{t("companions.statBlock.traits")}</p>
          <ul className={styles.list}>
            {block.traits.map((trait) => (
              <li key={trait.key ?? trait.name}>
                <strong>{trait.name}</strong> — {trait.desc}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {block.notes.map((noteKey) => (
        <p key={noteKey} className={styles.note}>
          {t(noteKey)}
        </p>
      ))}
    </div>
  );
}