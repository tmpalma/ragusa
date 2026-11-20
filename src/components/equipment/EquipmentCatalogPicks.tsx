import { useState } from "react";
import { ARMOR, MAGIC_ITEMS, WEAPONS, findByKey } from "../../data";
import type { CurrencyDenomination } from "../../data/types";
import {
  ATTUNED_SLOT_MAX,
  countAttunedSlots,
  listAttunedDisplayItems,
  maxWondrousAttunementPicks,
  type AttunedArmoryDisplayItem,
  type AttunedDisplayItem,
  type AttunedWondrousDisplayItem,
} from "../../domain/attunement";
import { localizedVariantDisplayName } from "../../domain/genericVariantDisplay";
import { findGenericVariant } from "../../domain/genericVariantMatcher";
import { attunementEligibleCarriedKeys, attunementEligibleMagicItems } from "../../domain/magicItems";
import {
  adventuringGearQuantity,
  hasStructuredGearDesc,
  parseStructuredGearDesc,
  selectedAdventuringGearKeys,
  type AdventuringGearEntry,
  type StructuredGearDescParts,
} from "../../domain/adventuringGear";
import { formatHomebrewRangeLine } from "../../domain/homebrewItemInput";
import { isHomebrewGearKey } from "../../domain/homebrewItems";
import {
  availableEquipmentPickFilters,
  equipmentPickCatalogEntry,
  equipmentPickValueCp,
  filterEquipmentPickCatalog,
  filterEquipmentPickComboboxOptionsByQuery,
  isHomebrewEquipmentPickFilter,
  isMagicEquipmentPickFilter,
  MAGIC_ITEM_RARITY_ORDER,
  mergedEquipmentPickCatalog,
  resolveEquipmentPick,
  sortEquipmentPickComboboxOptionsByLabel,
  sortEquipmentPickEntries,
  type EquipmentPickFilter,
} from "../../domain/equipmentPicks";
import { formatCoinBreakdown, formatItemCost } from "../../domain/equipmentFormat";
import {
  adventuringGearEntryValueCp,
  adventuringGearEntryWeightLb,
  isGearPack,
  packContentMax,
  packExpendableContents,
  resolvedPackRemaining,
} from "../../domain/gearPacks";
import { useLocale } from "../../i18n/LocaleContext";
import { useMeasurementSystem } from "../../platform/measurementSystem";
import { useCharacter } from "../../state/CharacterContext";
import { EquipmentActionToggle } from "./EquipmentActionControls";
import { gearEquipmentActionKey } from "../../domain/equipmentActions";
import { GenericVariantDescription } from "./GenericVariantDescription";
import { CollapsiblePane } from "../CollapsiblePane";
import { ResourceCounter } from "../combat/ResourceCounter";
import { CappedPickList } from "../form/CappedPickList";
import { Combobox } from "../form/Combobox";
import combatStyles from "../combat/Combat.module.css";
import styles from "./Equipment.module.css";

function currencyAbbreviations(t: (key: string) => string): Record<CurrencyDenomination, string> {
  return {
    pp: t("equipment.currencyAbbr.pp"),
    gp: t("equipment.currencyAbbr.gp"),
    ep: t("equipment.currencyAbbr.ep"),
    sp: t("equipment.currencyAbbr.sp"),
    cp: t("equipment.currencyAbbr.cp"),
  };
}

function equipmentFilterLabel(
  filterKey: EquipmentPickFilter,
  t: (key: string) => string,
  tEntity: ReturnType<typeof useLocale>["tEntity"],
): string {
  if (isHomebrewEquipmentPickFilter(filterKey)) {
    return tEntity("catalog.equipment", "", "customItems", "Custom Items");
  }
  if (isMagicEquipmentPickFilter(filterKey)) {
    return t(`equipment.pickFilter.${filterKey}`);
  }
  return t(`equipment.gearCategory.${filterKey}`);
}

function formatGearPhysicalStats(
  weightLb: number,
  quantity: number,
  cost: { amount: number; denomination: CurrencyDenomination },
  abbreviations: Record<CurrencyDenomination, string>,
  t: (key: string, vars?: Record<string, string | number>) => string,
  formatMass: (pounds: number) => string,
): string {
  const totalWeight = weightLb * quantity;
  const totalCostAmount = cost.amount * quantity;
  const totalCost = formatItemCost({ ...cost, amount: totalCostAmount }, abbreviations);
  const weightLabel = formatMass(totalWeight);
  if (quantity <= 1) {
    return t("equipment.itemStats", { weight: weightLabel, cost: totalCost });
  }
  const unitWeight = formatMass(weightLb);
  const unitCost = formatItemCost(cost, abbreviations);
  return t("equipment.itemStatsWithQuantity", {
    weight: weightLabel,
    cost: totalCost,
    quantity,
    unitWeight,
    unitCost,
  });
}

function formatGearEntryPhysicalStats(
  entry: AdventuringGearEntry,
  weightLb: number,
  abbreviations: Record<CurrencyDenomination, string>,
  t: (key: string, vars?: Record<string, string | number>) => string,
  formatMass: (pounds: number) => string,
): string {
  const effectiveWeight = adventuringGearEntryWeightLb(entry, weightLb);
  const effectiveValueCp = adventuringGearEntryValueCp(entry, equipmentPickValueCp(entry.key, 1));
  const totalCost = formatCoinBreakdown(effectiveValueCp, abbreviations);
  const weightLabel = formatMass(effectiveWeight);
  if (entry.quantity <= 1) {
    return t("equipment.itemStats", { weight: weightLabel, cost: totalCost });
  }
  const unitWeight = formatMass(effectiveWeight / entry.quantity);
  const unitCost = formatCoinBreakdown(effectiveValueCp / entry.quantity, abbreviations);
  return t("equipment.itemStatsWithQuantity", {
    weight: weightLabel,
    cost: totalCost,
    quantity: entry.quantity,
    unitWeight,
    unitCost,
  });
}

function PackSuppliesCounters({ entry }: { entry: AdventuringGearEntry }) {
  const { dispatch } = useCharacter();
  const { t, tEntity } = useLocale();
  const expendables = packExpendableContents(entry.key);
  if (expendables.length === 0) return null;

  const remaining = resolvedPackRemaining(entry);
  return (
    <div className={styles.packSuppliesCounters}>
      {expendables.map((content) => {
        const itemName = tEntity("catalog.adventuringGear", content.itemKey, "name", content.itemKey);
        const max = packContentMax(entry.key, content.itemKey, entry.quantity);
        const current = remaining[content.itemKey] ?? max;
        return (
          <ResourceCounter
            key={content.itemKey}
            id={`pack-${entry.key}-${content.itemKey}-remaining`}
            label={itemName}
            current={current}
            max={max}
            decreaseLabel={t("equipment.decreasePackSupply", { item: itemName })}
            increaseLabel={t("equipment.increasePackSupply", { item: itemName })}
            currentLabel={t("equipment.currentPackSupply", { item: itemName })}
            onChange={(value) =>
              dispatch({
                type: "SET_PACK_CONTENT_REMAINING",
                packKey: entry.key,
                itemKey: content.itemKey,
                value,
              })
            }
          />
        );
      })}
    </div>
  );
}

function formatMagicItemWeight(
  weightLb: number,
  quantity: number,
  t: (key: string, vars?: Record<string, string | number>) => string,
  formatMass: (pounds: number) => string,
): string {
  const totalWeight = weightLb * quantity;
  const weightLabel = formatMass(totalWeight);
  if (quantity <= 1) {
    return t("equipment.itemWeightOnly", { weight: weightLabel });
  }
  const unitWeight = formatMass(weightLb);
  return t("equipment.itemWeightWithQuantity", { weight: weightLabel, quantity, unitWeight });
}

function pickDisplayName(
  key: string,
  tEntity: ReturnType<typeof useLocale>["tEntity"],
): string {
  const resolved = resolveEquipmentPick(key);
  if (!resolved) return key;
  if (resolved.kind === "homebrew") return resolved.record.data.name;
  if (resolved.kind === "gear") {
    return tEntity("catalog.adventuringGear", key, "name", resolved.item.name);
  }
  return tEntity("catalog.magicItems", key, "name", resolved.item.name);
}

function armoryAttunedDisplayName(
  item: AttunedArmoryDisplayItem,
  tEntity: ReturnType<typeof useLocale>["tEntity"],
): string {
  const catalogKey = item.pieceKind === "weapon" ? "catalog.weapons" : "catalog.armor";
  const base =
    item.pieceKind === "weapon"
      ? findByKey(WEAPONS, item.baseKey)
      : findByKey(ARMOR, item.baseKey);
  const baseName = tEntity(catalogKey, item.baseKey, "name", base?.name ?? item.baseKey);
  return localizedVariantDisplayName(baseName, findGenericVariant(item.variantKey), tEntity);
}

function attunedDisplayItemKey(item: AttunedDisplayItem): string {
  return item.source === "wondrous" ? item.key : `armory:${item.instanceId}`;
}

function AttunedWondrousDescriptionCard({
  item,
}: {
  item: AttunedWondrousDisplayItem;
}) {
  const { t, tEntity } = useLocale();
  const { formatMass } = useMeasurementSystem();
  const key = item.key;
  const catalogItem = findByKey(MAGIC_ITEMS, key);
  const name = tEntity("catalog.magicItems", key, "name", catalogItem?.name ?? key);
  const rarity = catalogItem ? t(`equipment.rarity.${catalogItem.rarity}`) : "";
  const category = catalogItem ? t(`equipment.magicItemCategory.${catalogItem.category}`) : "";
  const attune = catalogItem?.attuneNote
    ? `${t("equipment.attunement")} (${catalogItem.attuneNote})`
    : t("equipment.attunement");

  return (
    <article className={combatStyles.card}>
      <h4>{name}</h4>
      <p className={combatStyles.meta}>{[rarity, category, attune].filter(Boolean).join(" · ")}</p>
      {catalogItem ? (
        <p className={combatStyles.spellMetaLine}>{formatMagicItemWeight(catalogItem.weightLb, 1, t, formatMass)}</p>
      ) : null}
      <GenericVariantDescription
        desc={tEntity("catalog.magicItems", key, "desc", catalogItem?.desc ?? "")}
      />
      <EquipmentActionToggle actionKey={gearEquipmentActionKey(key)} visible />
    </article>
  );
}

export function MagicItemsSection() {
  const { character, dispatch } = useCharacter();
  const { t, tEntity } = useLocale();
  const displayItems = listAttunedDisplayItems(character);
  const wondrousDisplayItems = displayItems.filter(
    (item): item is AttunedWondrousDisplayItem => item.source === "wondrous",
  );
  const armoryDisplayItems = displayItems.filter((item): item is AttunedArmoryDisplayItem => item.source === "armory");
  const picked = new Set(character.attunedMagicItemKeys);
  const carriedAttuneKeys = new Set(attunementEligibleCarriedKeys(character.adventuringGear));
  const eligible = attunementEligibleMagicItems().filter((item) => carriedAttuneKeys.has(item.key));
  const options = eligible
    .filter((item) => !picked.has(item.key))
    .sort((a, b) => {
      const rarityDelta =
        MAGIC_ITEM_RARITY_ORDER.indexOf(a.rarity) - MAGIC_ITEM_RARITY_ORDER.indexOf(b.rarity);
      if (rarityDelta !== 0) return rarityDelta;
      return a.name.localeCompare(b.name);
    })
    .map((item) => ({
      key: item.key,
      label: tEntity("catalog.magicItems", item.key, "name", item.name),
      group: t(`equipment.rarity.${item.rarity}`),
    }));

  return (
    <section className={styles.equipmentSection}>
      <h3>{t("equipment.magicItems")}</h3>
      <CappedPickList
        id="attuned-magic-item-select"
        groupLabel={t("equipment.attunedMagicItems", {
          count: countAttunedSlots(character),
          max: ATTUNED_SLOT_MAX,
        })}
        comboboxLabel={t("equipment.magicItem")}
        options={options}
        selectedKeys={character.attunedMagicItemKeys}
        maxCount={maxWondrousAttunementPicks(character)}
        onAdd={(itemKey) => dispatch({ type: "ADD_ATTUNED_MAGIC_ITEM", itemKey })}
        onRemove={(itemKey) => dispatch({ type: "REMOVE_ATTUNED_MAGIC_ITEM", itemKey })}
        renderSelected={(key) => tEntity("catalog.magicItems", key, "name", findByKey(MAGIC_ITEMS, key)?.name ?? key)}
        additionalListItems={armoryDisplayItems.map((item) => ({
          key: attunedDisplayItemKey(item),
          label: (
            <>
              {armoryAttunedDisplayName(item, tEntity)}
              <span className={styles.hint}> ({t("equipment.armory")})</span>
            </>
          ),
        }))}
      />
      {wondrousDisplayItems.length > 0 ? (
        <CollapsiblePane title={t("equipment.magicItemDescriptions")}>
          <div className={combatStyles.cards}>
            {wondrousDisplayItems.map((item) => (
              <AttunedWondrousDescriptionCard key={attunedDisplayItemKey(item)} item={item} />
            ))}
          </div>
        </CollapsiblePane>
      ) : displayItems.length === 0 ? (
        <p className={styles.hint}>{t("equipment.noMagicItems")}</p>
      ) : null}
    </section>
  );
}

function StructuredGearDescSections({
  parts,
  t,
}: {
  parts: StructuredGearDescParts;
  t: (key: string) => string;
}) {
  const { formatProse } = useMeasurementSystem();
  const sections = [
    { key: "ability", label: t("equipment.toolSection.ability"), text: parts.ability },
    { key: "utilize", label: t("equipment.toolSection.utilize"), text: parts.utilize },
    { key: "craft", label: t("equipment.toolSection.craft"), text: parts.craft },
  ].filter((section) => section.text);

  return sections.map((section) => (
    <p key={section.key} className={combatStyles.description}>
      <strong>{section.label}</strong> {formatProse(section.text!)}
    </p>
  ));
}

function AdventuringGearDescriptionCard({
  entry,
  isAttuned,
}: {
  entry: AdventuringGearEntry;
  isAttuned: boolean;
}) {
  const { dispatch } = useCharacter();
  const { t, tEntity } = useLocale();
  const { formatMass, formatProse, formatLength } = useMeasurementSystem();
  const { key: itemKey, quantity } = entry;
  const resolved = resolveEquipmentPick(itemKey);
  const abbreviations = currencyAbbreviations(t);
  const name = pickDisplayName(itemKey, tEntity);

  if (!resolved) {
    return (
      <article className={combatStyles.card}>
        <h4>{name}</h4>
        {isHomebrewGearKey(itemKey) ? (
          <p className={styles.hint}>{t("equipment.homebrewUnavailable")}</p>
        ) : null}
      </article>
    );
  }

  if (resolved.kind === "homebrew") {
    const { record, item } = resolved;
    const category = t(`equipment.homebrewCategory.${record.data.category}`);
    const weightLabel =
      quantity <= 1
        ? formatMass(item.weightLb, record.data.weightKg)
        : t("equipment.itemWeightWithQuantity", {
            weight: formatMass(item.weightLb * quantity, record.data.weightKg),
            quantity,
            unitWeight: formatMass(item.weightLb, record.data.weightKg),
          });
    const totalCostAmount = item.cost.amount * quantity;
    const costLabel = formatItemCost({ ...item.cost, amount: totalCostAmount }, abbreviations);
    const statsLine = t("equipment.itemStats", { weight: weightLabel, cost: costLabel });
    const rangeLine = record.data.range
      ? t("equipment.homebrewRange", {
          range: formatHomebrewRangeLine(record.data.range, (feet, meters) => formatLength(feet, meters)),
        })
      : null;
    return (
      <article className={combatStyles.card}>
        <h4>{name}</h4>
        <p className={combatStyles.meta}>{category}</p>
        <p className={combatStyles.spellMetaLine}>{statsLine}</p>
        {rangeLine ? <p className={combatStyles.spellMetaLine}>{rangeLine}</p> : null}
        <div className={combatStyles.weaponResource}>
          <ResourceCounter
            id={`adventuring-gear-${itemKey}-quantity`}
            label={t("equipment.gearQuantity")}
            current={quantity}
            decreaseLabel={t("equipment.decreaseQuantity")}
            increaseLabel={t("equipment.increaseQuantity")}
            currentLabel={t("equipment.currentQuantity")}
            onChange={(value) => dispatch({ type: "SET_ADVENTURING_GEAR_QUANTITY", itemKey, value })}
          />
        </div>
        {item.desc ? (
          <p className={combatStyles.description}>{formatProse(item.desc)}</p>
        ) : (
          <p className={styles.hint}>{t("equipment.noItemDescription")}</p>
        )}
        <EquipmentActionToggle actionKey={gearEquipmentActionKey(itemKey)} visible />
      </article>
    );
  }

  if (resolved.kind === "magic") {
    const item = resolved.item;
    const rarity = t(`equipment.rarity.${item.rarity}`);
    const category = t(`equipment.magicItemCategory.${item.category}`);
    const attuneNote = item.requiresAttunement
      ? item.attuneNote
        ? `${t("equipment.attunement")} (${item.attuneNote})`
        : t("equipment.attunement")
      : null;
    const attuneStatus =
      item.requiresAttunement && (isAttuned ? t("equipment.attuned") : t("equipment.notAttuned"));
    return (
      <article className={combatStyles.card}>
        <h4>{name}</h4>
        <p className={combatStyles.meta}>
          {[rarity, category, attuneNote, attuneStatus].filter(Boolean).join(" · ")}
        </p>
        <p className={combatStyles.spellMetaLine}>{formatMagicItemWeight(item.weightLb, quantity, t, formatMass)}</p>
        <div className={combatStyles.weaponResource}>
          <ResourceCounter
            id={`adventuring-gear-${itemKey}-quantity`}
            label={t("equipment.gearQuantity")}
            current={quantity}
            decreaseLabel={t("equipment.decreaseQuantity")}
            increaseLabel={t("equipment.increaseQuantity")}
            currentLabel={t("equipment.currentQuantity")}
            onChange={(value) => dispatch({ type: "SET_ADVENTURING_GEAR_QUANTITY", itemKey, value })}
          />
        </div>
        <GenericVariantDescription desc={tEntity("catalog.magicItems", itemKey, "desc", item.desc)} />
        <EquipmentActionToggle
          actionKey={gearEquipmentActionKey(itemKey)}
          visible={!item.requiresAttunement || isAttuned}
        />
      </article>
    );
  }

  const item = resolved.item;
  const category = t(`equipment.gearCategory.${item.category}`);
  const statsLine = isGearPack(itemKey)
    ? formatGearEntryPhysicalStats(entry, item.weightLb, abbreviations, t, formatMass)
    : formatGearPhysicalStats(item.weightLb, quantity, item.cost, abbreviations, t, formatMass);
  const structuredParts = hasStructuredGearDesc(item.desc) ? parseStructuredGearDesc(item.desc) : null;

  return (
    <article className={combatStyles.card}>
      <h4>{name}</h4>
      <p className={combatStyles.meta}>{category}</p>
      <p className={combatStyles.spellMetaLine}>{statsLine}</p>
      <div className={combatStyles.weaponResource}>
        <ResourceCounter
          id={`adventuring-gear-${itemKey}-quantity`}
          label={t("equipment.gearQuantity")}
          current={quantity}
          decreaseLabel={t("equipment.decreaseQuantity")}
          increaseLabel={t("equipment.increaseQuantity")}
          currentLabel={t("equipment.currentQuantity")}
          onChange={(value) => dispatch({ type: "SET_ADVENTURING_GEAR_QUANTITY", itemKey, value })}
        />
      </div>
      {isGearPack(itemKey) ? <PackSuppliesCounters entry={entry} /> : null}
      {structuredParts ? (
        <StructuredGearDescSections parts={structuredParts} t={t} />
      ) : item.desc ? (
        <p className={combatStyles.description}>
          {formatProse(tEntity("catalog.adventuringGear", itemKey, "desc", item.desc))}
        </p>
      ) : (
        <p className={styles.hint}>{t("equipment.noItemDescription")}</p>
      )}
      <EquipmentActionToggle actionKey={gearEquipmentActionKey(itemKey)} visible />
    </article>
  );
}

export function AdventuringGearSection() {
  const { character, dispatch } = useCharacter();
  const { locale, t, tEntity } = useLocale();
  const [filterKey, setFilterKey] = useState<EquipmentPickFilter | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const catalog = mergedEquipmentPickCatalog();
  const selectedKeys = selectedAdventuringGearKeys(character.adventuringGear);
  const picked = new Set(selectedKeys);
  const attunedKeys = new Set(character.attunedMagicItemKeys);
  const availableFilters = availableEquipmentPickFilters(catalog);
  const showTypeFilter = availableFilters.length > 1;
  const filteredCatalog = filterEquipmentPickCatalog(catalog, picked, showTypeFilter ? filterKey : null);
  const localizedOptions = filteredCatalog.map((entry) => ({
    key: entry.key,
    label:
      entry.filterKey === "homebrew"
        ? entry.name
        : entry.kind === "gear"
          ? tEntity("catalog.adventuringGear", entry.key, "name", entry.name)
          : tEntity("catalog.magicItems", entry.key, "name", entry.name),
    group: filterKey == null ? equipmentFilterLabel(entry.filterKey, t, tEntity) : undefined,
  }));
  const options = sortEquipmentPickComboboxOptionsByLabel(
    filterEquipmentPickComboboxOptionsByQuery(localizedOptions, searchQuery, locale),
    locale,
  );

  const toolbarExtra = (
    <div className={styles.gearPickerToolbar}>
      <div className={`${styles.field} ${styles.gearSearchField}`}>
        <label htmlFor="adventuring-gear-search">
          {tEntity("catalog.equipment", "", "gearSearch", "Search Items")}
        </label>
        <input
          id="adventuring-gear-search"
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={tEntity("catalog.equipment", "", "gearSearchPlaceholder", "Name or part of name…")}
          autoComplete="off"
        />
      </div>
      {showTypeFilter ? (
        <Combobox
          id="adventuring-gear-type-filter"
          className={styles.gearTypeFilter}
          label={t("equipment.gearTypeFilter")}
          value={filterKey}
          onChange={(key) => setFilterKey((key as EquipmentPickFilter | null) ?? null)}
          placeholder={t("equipment.allGearTypes")}
          options={availableFilters.map((key) => ({
            key,
            label: equipmentFilterLabel(key, t, tEntity),
          }))}
        />
      ) : null}
    </div>
  );

  const sortedKeys = sortEquipmentPickEntries(character.adventuringGear.map((entry) => entry.key));
  const sortOrder = new Map(sortedKeys.map((key, index) => [key, index]));
  const sortedEntries = [...character.adventuringGear].sort(
    (left, right) => (sortOrder.get(left.key) ?? 0) - (sortOrder.get(right.key) ?? 0),
  );
  return (
    <section className={styles.equipmentSection}>
      <h3>{t("equipment.adventuringGear")}</h3>
      <CappedPickList
        id="adventuring-gear-select"
        groupLabel={t("equipment.chooseAdventuringGear", { count: selectedKeys.length })}
        comboboxLabel={t("equipment.gearItem")}
        options={options}
        selectedKeys={selectedKeys}
        onAdd={(itemKey) => dispatch({ type: "ADD_ADVENTURING_GEAR", itemKey })}
        onRemove={(itemKey) => dispatch({ type: "REMOVE_ADVENTURING_GEAR", itemKey })}
        renderSelected={(key) => {
          const name = pickDisplayName(key, tEntity);
          const quantity = adventuringGearQuantity(character.adventuringGear, key);
          const catalogEntry = equipmentPickCatalogEntry(key);
          let label = quantity > 1 ? `${name} ×${quantity}` : name;
          if (catalogEntry?.requiresAttunement) {
            label += attunedKeys.has(key)
              ? ` (${t("equipment.attuned")})`
              : ` (${t("equipment.notAttuned")})`;
          }
          return label;
        }}
        toolbarExtra={toolbarExtra}
      />
      {character.adventuringGear.length > 0 ? (
        <CollapsiblePane title={t("equipment.adventuringGearDescriptions")} defaultOpen={false}>
          <div className={combatStyles.cards}>
            {sortedEntries.map((entry) => (
              <AdventuringGearDescriptionCard
                key={entry.key}
                entry={entry}
                isAttuned={attunedKeys.has(entry.key)}
              />
            ))}
          </div>
        </CollapsiblePane>
      ) : (
        <p className={styles.hint}>{t("equipment.noAdventuringGear")}</p>
      )}
    </section>
  );
}
