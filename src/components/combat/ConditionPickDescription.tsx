import { parseFeatDescriptionReference } from "../../domain/featDescription";
import { useMeasurementSystem } from "../../platform/measurementSystem";
import { CatalogProse } from "../CatalogProse";
import { CombatReferenceOptions } from "./CombatReferenceOptions";
import styles from "./Combat.module.css";

interface ConditionPickDescriptionProps {
  description: string;
}

/** Renders condition prose as intro + **Name.** effect blocks (Elemental Smite layout). */
export function ConditionPickDescription({ description }: ConditionPickDescriptionProps) {
  const { formatProse } = useMeasurementSystem();
  const reference = parseFeatDescriptionReference(description);
  if (reference) {
    return (
      <div className={styles.conditionPickDescBlocks}>
        <CombatReferenceOptions
          intro={reference.intro}
          options={reference.options}
          trailing={reference.trailing}
          descriptionClassName={styles.conditionPickDesc}
        />
      </div>
    );
  }

  return (
    <CatalogProse className={styles.conditionPickDesc}>{formatProse(description)}</CatalogProse>
  );
}
