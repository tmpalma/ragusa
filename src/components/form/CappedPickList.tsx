import type { ReactNode } from "react";
import { useState } from "react";
import { ConfirmRemoveButton } from "../confirm/ConfirmRemoveButton";
import { useLocale } from "../../i18n/LocaleContext";
import { Combobox, type ComboboxOption } from "./Combobox";
import styles from "./Form.module.css";

function removeConfirmItemName(
  key: string,
  index: number,
  removeConfirmName: ((key: string, index: number) => string) | undefined,
  renderSelected: (key: string, index: number) => ReactNode,
): string {
  if (removeConfirmName) return removeConfirmName(key, index);
  const rendered = renderSelected(key, index);
  if (typeof rendered === "string" || typeof rendered === "number") return String(rendered);
  return key;
}

export interface CappedPickListAdditionalItem {
  key: string;
  label: ReactNode;
}

export interface CappedPickListProps {
  id: string;
  groupLabel: string;
  comboboxLabel: string;
  placeholder?: string;
  options: ComboboxOption[];
  selectedKeys: string[];
  maxCount?: number;
  onAdd: (key: string) => void;
  onRemove: (key: string, index: number) => void;
  renderSelected: (key: string, index: number) => ReactNode;
  /** Short name for the remove-confirm dialog when `renderSelected` is not plain text. */
  removeConfirmName?: (key: string, index: number) => string;
  /** When false, selected picks are not listed under the combobox (e.g. Spells tab descriptions). */
  showSelectedList?: boolean;
  /** Read-only rows appended after removable picks (e.g. attuned Armory gear). */
  additionalListItems?: CappedPickListAdditionalItem[];
  toolbarExtra?: ReactNode;
  /** When true, the combobox label is hidden and associated with the group label for accessibility. */
  hideComboboxLabel?: boolean;
  /** Optional class for each selected list row (e.g. align Remove with tall content). */
  listItemClassName?: string;
  /** Stack toolbar, combobox, and Add vertically with extra gap. */
  stackedAddRow?: boolean;
  groupLabelClassName?: string;
}

function shouldHideComboboxLabel(groupLabel: string, comboboxLabel: string): boolean {
  const group = groupLabel.trim().toLowerCase();
  const combo = comboboxLabel.trim().toLowerCase();
  if (!combo) return true;
  if (!group) return false;
  if (group === combo) return true;
  if (group.startsWith(combo)) return true;

  const tokens = group.replace(/[()\/—–-]/g, " ").split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    if (token === combo) return true;
    if (token === `${combo}s`) return true;
    if (token.endsWith("s") && token.slice(0, -1) === combo) return true;
    if (token.length > combo.length && token.startsWith(combo)) return true;
  }

  const firstToken = tokens[0];
  if (firstToken && combo.startsWith(firstToken) && firstToken.length >= 4) return true;

  return false;
}

export function CappedPickList({
  id,
  groupLabel,
  comboboxLabel,
  placeholder,
  options,
  selectedKeys,
  maxCount,
  onAdd,
  onRemove,
  renderSelected,
  removeConfirmName,
  showSelectedList = true,
  additionalListItems,
  toolbarExtra,
  hideComboboxLabel = false,
  listItemClassName,
  stackedAddRow = false,
  groupLabelClassName,
}: CappedPickListProps) {
  const { t } = useLocale();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const atMax = maxCount != null && selectedKeys.length >= maxCount;
  const immediateSelect = maxCount === 1;
  const hideComboboxLabelResolved =
    hideComboboxLabel || shouldHideComboboxLabel(groupLabel, comboboxLabel);

  function handleComboboxChange(key: string | null) {
    if (immediateSelect && key) {
      onAdd(key);
      setSelectedKey(null);
      return;
    }
    setSelectedKey(key);
  }

  function handleAdd() {
    if (!selectedKey || atMax) return;
    onAdd(selectedKey);
    setSelectedKey(null);
  }

  return (
    <div className={styles.field}>
      <span
        id={hideComboboxLabelResolved ? `${id}-group-label` : undefined}
        className={groupLabelClassName ? `${styles.groupLabel} ${groupLabelClassName}` : styles.groupLabel}
      >
        {groupLabel}
      </span>
      <div className={stackedAddRow ? `${styles.addRow} ${styles.addRowStacked}` : styles.addRow}>
        <div className={styles.addRowSelect}>
          {toolbarExtra}
          <Combobox
            id={id}
            label={comboboxLabel}
            hideLabel={hideComboboxLabelResolved}
            labelledBy={hideComboboxLabelResolved ? `${id}-group-label` : undefined}
            value={selectedKey}
            onChange={handleComboboxChange}
            options={options}
            placeholder={placeholder ?? t("character.choosePlaceholder")}
            disabled={atMax}
          />
        </div>
        {!immediateSelect ? (
          <div className={styles.addRowActions}>
            <button type="button" onClick={handleAdd} disabled={!selectedKey || atMax}>
              {t("character.add")}
            </button>
          </div>
        ) : null}
      </div>
      {(showSelectedList && selectedKeys.length > 0) || (additionalListItems?.length ?? 0) > 0 ? (
        <ul className={styles.itemList}>
          {showSelectedList
            ? selectedKeys.map((key, index) => (
                <li key={`${key}-${index}`} className={listItemClassName}>
                  <div className={styles.itemListMain}>
                    <span className={styles.itemListName}>{renderSelected(key, index)}</span>
                  </div>
                  <div className={styles.itemListActions}>
                    <ConfirmRemoveButton
                      itemName={removeConfirmItemName(key, index, removeConfirmName, renderSelected)}
                      onConfirm={() => onRemove(key, index)}
                    />
                  </div>
                </li>
              ))
            : null}
          {additionalListItems?.map((item) => (
            <li key={item.key}>
              <div className={styles.itemListMain}>
                <span className={styles.itemListName}>{item.label}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
