import { useMemo, useState } from "react";
import { FEATS, findByKey } from "../../data";
import type { FeatData } from "../../data/types";
import {
  availableFeatCategories,
  compareFeatsByCategoryThenName,
  excludeHiddenFeatPickerCategories,
  filterFeatsByCategory,
} from "../../domain/featCategories";
import { featMechanicsSummary } from "../../domain/featEffects";
import { useLocale } from "../../i18n/LocaleContext";
import { CappedPickList } from "./CappedPickList";
import { Combobox } from "./Combobox";
import { FeatPickDescription } from "./FeatPickDescription";
import styles from "./Form.module.css";

function featCategoryLabel(
  category: string,
  t: (key: string, params?: Record<string, string | number>, fallback?: string) => string,
): string {
  return t(`character.featCategory.${category}`, undefined, category);
}

export interface FeatCappedPickListProps {
  id: string;
  groupLabel: string;
  comboboxLabel: string;
  feats: FeatData[];
  value: string | null;
  onChange: (key: string | null) => void;
  labelForFeat?: (feat: FeatData) => string;
  placeholder?: string;
  showCategoryFilter?: boolean;
}

export function FeatCappedPickList({
  id,
  groupLabel,
  comboboxLabel,
  feats,
  value,
  onChange,
  labelForFeat,
  placeholder,
  showCategoryFilter = true,
}: FeatCappedPickListProps) {
  const { t, tEntity } = useLocale();
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const pickerFeats = useMemo(() => excludeHiddenFeatPickerCategories(feats), [feats]);
  const categories = useMemo(() => availableFeatCategories(pickerFeats), [pickerFeats]);
  const categoryFilterVisible = showCategoryFilter && categories.length > 1;

  const filteredFeats = useMemo(() => {
    let list = filterFeatsByCategory(pickerFeats, categoryFilterVisible ? categoryFilter : null);
    if (value) {
      const selected = findByKey(feats, value) ?? findByKey(FEATS, value);
      if (selected && !list.some((feat) => feat.key === value)) {
        list = [...list, selected].sort(compareFeatsByCategoryThenName);
      }
    }
    return list;
  }, [pickerFeats, categoryFilter, categoryFilterVisible, value]);

  const remainingOptions = filteredFeats
    .filter((feat) => feat.key !== value)
    .map((feat) => ({
      key: feat.key,
      label: labelForFeat?.(feat) ?? tEntity("catalog.feats", feat.key, "name", feat.name),
      group:
        categoryFilterVisible && categoryFilter == null
          ? featCategoryLabel(feat.category, t)
          : undefined,
    }));

  const categoryFilterToolbar = categoryFilterVisible ? (
    <Combobox
      id={`${id}-category-filter`}
      className={styles.featCategoryFilter}
      label={t("character.featCategoryFilter")}
      value={categoryFilter}
      onChange={setCategoryFilter}
      placeholder={t("character.allFeatCategories")}
      options={categories.map((category) => ({
        key: category,
        label: featCategoryLabel(category, t),
      }))}
    />
  ) : null;

  return (
    <CappedPickList
      id={id}
      groupLabel={groupLabel}
      comboboxLabel={comboboxLabel}
      placeholder={placeholder ?? t("character.choosePlaceholder")}
      options={remainingOptions}
      selectedKeys={value ? [value] : []}
      maxCount={1}
      onAdd={(key) => onChange(key)}
      onRemove={() => onChange(null)}
      toolbarExtra={categoryFilterToolbar}
      removeConfirmName={(key) => {
        const feat = findByKey(feats, key) ?? findByKey(FEATS, key);
        if (!feat) return key;
        return labelForFeat?.(feat) ?? tEntity("catalog.feats", feat.key, "name", feat.name);
      }}
      renderSelected={(key) => {
        const feat = findByKey(feats, key) ?? findByKey(FEATS, key);
        if (!feat) return key;

        const name = labelForFeat?.(feat) ?? tEntity("catalog.feats", feat.key, "name", feat.name);
        const mechanics = featMechanicsSummary(feat.key, t);
        const desc = tEntity("catalog.feats", feat.key, "desc", feat.desc);

        return (
          <div className={styles.featPickEntry}>
            <span className={styles.featPickName}>{name}</span>
            {mechanics ? <span className={styles.featPickMechanics}>{mechanics}</span> : null}
            <FeatPickDescription featKey={feat.key} description={desc} />
          </div>
        );
      }}
    />
  );
}
