import { useMemo, useState } from "react";
import {
  availableSpellOptionsCompact,
  filterSpellKeysByLevel,
  findSpellByKey,
  spellPickerLabel,
  uniqueSpellLevels,
} from "../../domain/spellSelection";
import { useLocale } from "../../i18n/LocaleContext";
import { CappedPickList } from "../form/CappedPickList";
import { Combobox, sortComboboxOptionsByLabel } from "../form/Combobox";
import styles from "./Spells.module.css";

function spellOptionLabel(
  spellKey: string,
  tEntity: ReturnType<typeof useLocale>["tEntity"],
  tGlossary: ReturnType<typeof useLocale>["tGlossary"],
): string {
  const spell = findSpellByKey(spellKey);
  const name = tEntity("catalog.spells", spellKey, "name", spell?.name ?? spellKey);
  if (!spell?.school) return name;
  return spellPickerLabel(name, tGlossary("spellSchool", spell.school));
}

export function SpellCappedPickList({
  id,
  groupLabel,
  comboboxLabel,
  allowedOptions,
  selectedKeys,
  maxCount,
  excludeKeys = [],
  showSelectedList = false,
  hideComboboxLabel = false,
  stackedAddRow = false,
  groupLabelClassName,
  levelFilterClassName,
  onAdd,
  onRemove,
}: {
  id: string;
  groupLabel: string;
  comboboxLabel: string;
  allowedOptions: string[];
  selectedKeys: string[];
  maxCount?: number;
  excludeKeys?: string[];
  showSelectedList?: boolean;
  hideComboboxLabel?: boolean;
  stackedAddRow?: boolean;
  groupLabelClassName?: string;
  levelFilterClassName?: string;
  onAdd: (spellKey: string) => void;
  onRemove: (spellKey: string) => void;
}) {
  const { locale, t, tEntity, tGlossary } = useLocale();
  const [filterLevel, setFilterLevel] = useState<number | null>(null);
  const availableLevels = uniqueSpellLevels(allowedOptions);
  const showLevelFilter = availableLevels.length > 1;
  const remaining = availableSpellOptionsCompact(allowedOptions, [...selectedKeys, ...excludeKeys]);
  const filtered = filterSpellKeysByLevel(remaining, showLevelFilter ? filterLevel : null);
  const comboboxOptions = useMemo(
    () =>
      sortComboboxOptionsByLabel(
        filtered.map((key) => ({
          key,
          label: spellOptionLabel(key, tEntity, tGlossary),
        })),
        locale,
      ),
    [filtered, locale, tEntity, tGlossary],
  );

  const toolbarExtra = showLevelFilter ? (
    <Combobox
      id={`${id}-level-filter`}
      className={
        levelFilterClassName
          ? `${styles.spellLevelFilter} ${levelFilterClassName}`
          : styles.spellLevelFilter
      }
      label={t("spells.spellLevelFilter")}
      value={filterLevel != null ? String(filterLevel) : null}
      onChange={(key) => setFilterLevel(key ? Number(key) : null)}
      placeholder={t("spells.allSpellLevels")}
      options={availableLevels.map((level) => ({
        key: String(level),
        label: String(level),
      }))}
    />
  ) : null;

  return (
    <CappedPickList
      id={id}
      groupLabel={groupLabel}
      comboboxLabel={comboboxLabel}
      options={comboboxOptions}
      selectedKeys={selectedKeys}
      maxCount={maxCount}
      showSelectedList={showSelectedList}
      hideComboboxLabel={hideComboboxLabel}
      onAdd={onAdd}
      onRemove={onRemove}
      renderSelected={(key) => spellOptionLabel(key, tEntity, tGlossary)}
      toolbarExtra={toolbarExtra}
      stackedAddRow={stackedAddRow}
      groupLabelClassName={groupLabelClassName}
    />
  );
}
