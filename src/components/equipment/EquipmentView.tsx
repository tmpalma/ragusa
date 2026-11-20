import { useState } from "react";
import type { CurrencyDenomination, ItemCost } from "../../data/types";
import { formatCoinBreakdown, formatItemCost, withItemStats } from "../../domain/equipmentFormat";
import { useLocale } from "../../i18n/LocaleContext";
import { useMeasurementSystem } from "../../platform/measurementSystem";
import { useCharacter } from "../../state/CharacterContext";
import type { CurrencyDenomination as StateCurrencyDenomination } from "../../state/characterState";
import { ConfirmRemoveButton } from "../confirm/ConfirmRemoveButton";
import { CurrencyStepper } from "../form/CurrencyStepper";
import { ArtificerCreatedItemsSection } from "./ArtificerCreatedItemsSection";
import { ArmorySection } from "./ArmorySection";
import { AdventuringGearSection, MagicItemsSection } from "./EquipmentCatalogPicks";
import styles from "./Equipment.module.css";

const CURRENCY_DENOMINATIONS: StateCurrencyDenomination[] = ["pp", "gp", "ep", "sp", "cp"];

function currencyAbbreviations(t: (key: string) => string): Record<CurrencyDenomination, string> {
  return {
    pp: t("equipment.currencyAbbr.pp"),
    gp: t("equipment.currencyAbbr.gp"),
    ep: t("equipment.currencyAbbr.ep"),
    sp: t("equipment.currencyAbbr.sp"),
    cp: t("equipment.currencyAbbr.cp"),
  };
}

export function EquipmentView() {
  const { character, derived, dispatch } = useCharacter();
  const { t } = useLocale();
  const { formatMass } = useMeasurementSystem();
  const [itemName, setItemName] = useState("");
  const [itemWeight, setItemWeight] = useState("");
  const [itemCostAmount, setItemCostAmount] = useState("");
  const [itemCostDenomination, setItemCostDenomination] = useState<CurrencyDenomination>("gp");
  const abbreviations = currencyAbbreviations(t);
  const overCapacity = derived.carrying.currentLb > derived.carrying.carryLb;
  const nearCapacity =
    !overCapacity && derived.carrying.carryLb > 0 && derived.carrying.currentLb >= derived.carrying.carryLb * 0.8;
  const gearValueLabel = formatCoinBreakdown(derived.gearValueCp, abbreviations);

  function handleAddItem() {
    const name = itemName.trim();
    const weightLb = Number(itemWeight);
    const costAmount = Number(itemCostAmount);
    if (!name || !Number.isFinite(weightLb) || weightLb < 0) return;
    if (!Number.isFinite(costAmount) || costAmount < 0) return;

    const cost: ItemCost = { amount: costAmount, denomination: itemCostDenomination };
    dispatch({ type: "ADD_INVENTORY_ITEM", id: crypto.randomUUID(), name, weightLb, cost });
    setItemName("");
    setItemWeight("");
    setItemCostAmount("");
  }

  const canAddItem =
    itemName.trim().length > 0 &&
    itemWeight.trim().length > 0 &&
    itemCostAmount.trim().length > 0 &&
    Number.isFinite(Number(itemWeight)) &&
    Number(itemWeight) >= 0 &&
    Number.isFinite(Number(itemCostAmount)) &&
    Number(itemCostAmount) >= 0;

  function formatItemStats(weightLb: number, cost: ItemCost): string {
    return t("equipment.itemStats", {
      weight: formatMass(weightLb),
      cost: formatItemCost(cost, abbreviations),
    });
  }

  function formatMiscItemLine(name: string, weightLb: number, cost: ItemCost): string {
    return withItemStats(name, formatItemStats(weightLb, cost));
  }

  return (
    <div className={styles.pane} role="tabpanel" id="panel-equipment" aria-labelledby="tab-equipment">
      <h2>{t("equipment.title")}</h2>

      <section className={styles.capacitySection}>
        <h3>{t("equipment.carryingCapacity")}</h3>
        <dl
          className={`${styles.capacityGrid} ${overCapacity ? styles.overCapacity : nearCapacity ? styles.nearCapacity : ""}`}
        >
          <div>
            <dt>{t("equipment.carried")}</dt>
            <dd>
              {formatMass(derived.carrying.currentLb)}
            </dd>
          </div>
          <div>
            <dt>{t("equipment.maxCarry")}</dt>
            <dd>
              {formatMass(derived.carrying.carryLb)}
            </dd>
          </div>
          <div>
            <dt>{t("equipment.maxDragLiftPush")}</dt>
            <dd>
              {formatMass(derived.carrying.dragLiftPushLb)}
            </dd>
          </div>
        </dl>
        {overCapacity ? <p className={styles.overCapacityHint}>{t("equipment.overCapacityHint")}</p> : null}
      </section>

      <ArmorySection />

      <ArtificerCreatedItemsSection />

      <MagicItemsSection />
      <AdventuringGearSection />

      <section className={`${styles.equipmentSection} ${styles.miscellaneousSection}`}>
        <h3>{t("equipment.miscellaneous")}</h3>
        <div className={styles.addGrid}>
          <div className={styles.field}>
            <label htmlFor="inventory-item-name">{t("equipment.item")}</label>
            <input
              id="inventory-item-name"
              type="text"
              value={itemName}
              onChange={(event) => setItemName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAddItem();
                }
              }}
              placeholder={t("equipment.itemPlaceholder")}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="inventory-item-weight">{t("equipment.weight")}</label>
            <input
              id="inventory-item-weight"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={itemWeight}
              onChange={(event) => setItemWeight(event.target.value)}
              placeholder={t("equipment.weightPlaceholder")}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="inventory-item-cost">{t("equipment.cost")}</label>
            <div className={styles.costRow}>
              <input
                id="inventory-item-cost"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={itemCostAmount}
                onChange={(event) => setItemCostAmount(event.target.value)}
                placeholder={t("equipment.costPlaceholder")}
              />
              <select
                id="inventory-item-cost-denomination"
                aria-label={t("equipment.costDenomination")}
                value={itemCostDenomination}
                onChange={(event) => setItemCostDenomination(event.target.value as CurrencyDenomination)}
              >
                {CURRENCY_DENOMINATIONS.map((denomination) => (
                  <option key={denomination} value={denomination}>
                    {t(`equipment.currencyAbbr.${denomination}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button type="button" className={styles.button} onClick={handleAddItem} disabled={!canAddItem}>
            {t("equipment.addItem")}
          </button>
        </div>
        {character.inventoryItems.length > 0 ? (
          <ul className={styles.itemList}>
            {character.inventoryItems.map((item) => (
              <li key={item.id}>
                <span>{formatMiscItemLine(item.name, item.weightLb, item.cost)}</span>
                <ConfirmRemoveButton
                  className={styles.button}
                  itemName={item.name}
                  onConfirm={() => dispatch({ type: "REMOVE_INVENTORY_ITEM", id: item.id })}
                >
                  {t("equipment.remove")}
                </ConfirmRemoveButton>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.hint}>{t("equipment.nothingRecorded")}</p>
        )}
      </section>

      <section className={styles.equipmentSection}>
        <h3>{t("equipment.money")}</h3>
        <p className={styles.gearValueHint}>{t("equipment.gearValue", { value: gearValueLabel })}</p>
        <div className={styles.purse}>
          {CURRENCY_DENOMINATIONS.map((denomination) => (
            <div key={denomination} className={styles.coin}>
              <label htmlFor={`currency-${denomination}`}>
                {t(`equipment.currency.${denomination}`)}{" "}
                <span className={styles.abbr}>({t(`equipment.currencyAbbr.${denomination}`)})</span>
              </label>
              <CurrencyStepper
                id={`currency-${denomination}`}
                value={character.currency[denomination]}
                onCommit={(value) =>
                  dispatch({
                    type: "SET_CURRENCY",
                    denomination,
                    value,
                  })
                }
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
