import type { ChangeEvent, ReactNode } from "react";
import { useT } from "../../i18n/LocaleContext";
import styles from "./Form.module.css";

export interface ComboboxOption {
  key: string;
  label: string;
  disabled?: boolean;
  /** When set, the option is rendered inside an optgroup with this label. */
  group?: string;
}

/** Stable sort for select options by visible label (locale-aware). */
export function sortComboboxOptionsByLabel(
  options: ComboboxOption[],
  locale = "en",
): ComboboxOption[] {
  return [...options].sort((left, right) =>
    left.label.localeCompare(right.label, locale, { sensitivity: "base" }),
  );
}

interface ComboboxProps {
  id: string;
  label: string;
  value: string | null;
  onChange: (key: string | null) => void;
  options: ComboboxOption[];
  placeholder?: string;
  describedBy?: string;
  hideLabel?: boolean;
  labelledBy?: string;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
}

export function Combobox({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  describedBy,
  hideLabel = false,
  labelledBy,
  disabled = false,
  className,
  children,
}: ComboboxProps) {
  const t = useT();

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    onChange(event.target.value || null);
  }

  const grouped = new Map<string, ComboboxOption[]>();
  const ungrouped: ComboboxOption[] = [];
  for (const option of options) {
    if (option.group) {
      const list = grouped.get(option.group) ?? [];
      list.push(option);
      grouped.set(option.group, list);
    } else {
      ungrouped.push(option);
    }
  }

  return (
    <div className={className ? `${styles.field} ${className}` : styles.field}>
      {hideLabel ? null : <label htmlFor={id}>{label}</label>}
      <select
        id={id}
        value={value ?? ""}
        onChange={handleChange}
        disabled={disabled}
        aria-labelledby={hideLabel ? labelledBy : undefined}
        aria-describedby={describedBy}
      >
        <option value="">{placeholder ?? t("character.choosePlaceholder")}</option>
        {[...grouped.entries()].map(([groupLabel, groupOptions]) => (
          <optgroup key={groupLabel} label={groupLabel}>
            {groupOptions.map((option) => (
              <option key={option.key} value={option.key} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </optgroup>
        ))}
        {ungrouped.map((option) => (
          <option key={option.key} value={option.key} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      {children}
    </div>
  );
}
