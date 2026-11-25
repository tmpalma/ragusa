import { CatalogProse } from "../CatalogProse";
import { useMeasurementSystem } from "../../platform/measurementSystem";
import styles from "./Combat.module.css";

export interface CombatReferenceOptionTable {
  headers: string[];
  rows: string[][];
}

export interface CombatReferenceOption {
  key: string;
  name: string;
  desc: string;
  table?: CombatReferenceOptionTable;
}

interface CombatReferenceOptionsProps {
  intro?: string | null;
  options: CombatReferenceOption[];
  /** Defaults to combat card description styling. */
  descriptionClassName?: string;
  /** Optional trailing prose (for example spell tables). */
  trailing?: string | null;
}

/** Intro paragraph plus **Name.** description blocks (Elemental Smite layout). */
export function CombatReferenceOptions({
  intro,
  options,
  descriptionClassName = styles.description,
  trailing,
}: CombatReferenceOptionsProps) {
  const { formatProse } = useMeasurementSystem();

  return (
    <>
      {intro ? (
        <CatalogProse className={descriptionClassName}>{formatProse(intro)}</CatalogProse>
      ) : null}
      {options.map((option) => (
        <div key={option.key}>
          {option.name ? (
            <p className={descriptionClassName}>
              <strong>{option.name}.</strong>
            </p>
          ) : null}
          {option.desc ? (
            <CatalogProse className={descriptionClassName}>{formatProse(option.desc)}</CatalogProse>
          ) : null}
          {option.table ? (
            <table className={styles.referenceTable}>
              <thead>
                <tr>
                  {option.table.headers.map((header) => (
                    <th key={header}>
                      <CatalogProse variant="inline">{formatProse(header)}</CatalogProse>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {option.table.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex}>
                        <CatalogProse variant="inline">{formatProse(cell)}</CatalogProse>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      ))}
      {trailing ? (
        <CatalogProse className={descriptionClassName}>{formatProse(trailing)}</CatalogProse>
      ) : null}
    </>
  );
}