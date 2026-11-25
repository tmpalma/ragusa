import { parseFeatDescriptionReference } from "../../domain/featDescription";
import { useMeasurementSystem } from "../../platform/measurementSystem";
import { CatalogProse } from "../CatalogProse";
import { CombatReferenceOptions } from "../combat/CombatReferenceOptions";
import combatStyles from "../combat/Combat.module.css";

interface GenericVariantDescriptionProps {
  desc: string;
}

/** Renders variant prose; uses named **Ability.** blocks when present (Hammer of Thunderbolts, Energy Bow, etc.). */
export function GenericVariantDescription({ desc }: GenericVariantDescriptionProps) {
  const { formatProse } = useMeasurementSystem();
  const reference = parseFeatDescriptionReference(desc);
  if (reference) {
    return (
      <CombatReferenceOptions
        intro={reference.intro}
        options={reference.options}
        trailing={reference.trailing}
        descriptionClassName={combatStyles.description}
      />
    );
  }

  return <CatalogProse className={combatStyles.description}>{formatProse(desc)}</CatalogProse>;
}
