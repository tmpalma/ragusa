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
      {intro ? <p className={descriptionClassName}>{formatProse(intro)}</p> : null}
      {options.map((option) => (
        <div key={option.key}>
          {option.name || option.desc ? (
            <p className={descriptionClassName}>
              {option.name ? (
                <>
                  <strong>{option.name}.</strong>{" "}
                </>
              ) : null}
              {option.desc ? formatProse(option.desc) : null}
            </p>
          ) : null}
          {option.table ? (
            <table className={styles.referenceTable}>
              <thead>
                <tr>
                  {option.table.headers.map((header) => (
                    <th key={header}>{formatProse(header)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {option.table.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex}>{formatProse(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      ))}
      {trailing ? <p className={descriptionClassName}>{formatProse(trailing)}</p> : null}
    </>
  );
}
