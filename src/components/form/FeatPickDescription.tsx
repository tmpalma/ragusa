import { featDescriptionReference } from "../../domain/featDescription";
import {
  featCombatReferenceEffect,
  featCombatReferenceIntro,
  featShouldHideDescriptionTrailing,
  findFeatDefinition,
} from "../../domain/featEffects";
import { useMeasurementSystem } from "../../platform/measurementSystem";
import { CatalogProse } from "../CatalogProse";
import { CombatReferenceOptions } from "../combat/CombatReferenceOptions";
import styles from "./Form.module.css";

interface FeatPickDescriptionProps {
  featKey: string;
  description: string;
}

export function FeatPickDescription({ featKey, description }: FeatPickDescriptionProps) {
  const { formatProse } = useMeasurementSystem();
  const mechanics = featCombatReferenceEffect(findFeatDefinition(featKey));
  const reference = featDescriptionReference(
    description,
    mechanics ? { intro: featCombatReferenceIntro(mechanics), options: mechanics.options } : null,
  );
  if (reference) {
    const trailing = featShouldHideDescriptionTrailing(featKey) ? undefined : reference.trailing;
    return (
      <CombatReferenceOptions
        intro={reference.intro}
        options={reference.options}
        trailing={trailing}
        descriptionClassName={styles.featPickDesc}
      />
    );
  }

  return (
    <CatalogProse className={styles.featPickDesc}>{formatProse(description)}</CatalogProse>
  );
}
