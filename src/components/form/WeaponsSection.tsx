import { useMemo, useState } from "react";
import { WEAPONS, findByKey } from "../../data";
import { isThrownWeapon, weaponQuantity } from "../../domain/ammunition";
import { useLocale } from "../../i18n/LocaleContext";
import { useMeasurementSystem } from "../../platform/measurementSystem";
import { useCharacter } from "../../state/CharacterContext";
import { ConfirmRemoveButton } from "../confirm/ConfirmRemoveButton";
import { Combobox } from "./Combobox";
import styles from "./Form.module.css";

export function WeaponsSection({ labelledBy }: { labelledBy?: string }) {
  const { character, dispatch } = useCharacter();
  const { t, tEntity, tGlossary } = useLocale();
  const { formatProse } = useMeasurementSystem();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [addQuantity, setAddQuantity] = useState("1");

  const selectedWeapon = selectedKey ? findByKey(WEAPONS, selectedKey) : null;
  const selectedIsThrown = selectedWeapon ? isThrownWeapon(selectedWeapon) : false;

  const addQuantityValue = useMemo(() => {
    const parsed = Number(addQuantity);
    return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
  }, [addQuantity]);

  function handleAdd() {
    if (!selectedKey) return;
    dispatch({
      type: "ADD_WEAPON",
      key: selectedKey,
      id: crypto.randomUUID(),
      quantity: selectedIsThrown ? addQuantityValue : 1,
    });
    setAddQuantity("1");
  }

  function weaponName(key: string) {
    const data = findByKey(WEAPONS, key);
    if (!data) return key;
    return tEntity("catalog.weapons", data.key, "name", data.name);
  }

  function weaponDetailSuffix(key: string) {
    const data = findByKey(WEAPONS, key);
    if (!data) return "";
    const damageType = tGlossary("damageType", data.damageType);
    const properties = data.properties.map((prop) => formatProse(tGlossary("weaponProperty", prop)));
    return `${t("equipment.weaponDamageSeparator")}${data.damageDice} ${damageType}${
      properties.length
        ? `${t("equipment.weaponPropertiesOpen")}${properties.join(", ")}${t("equipment.weaponPropertiesClose")}`
        : ""
    }`;
  }

  function setAddQuantityValue(nextValue: number) {
    setAddQuantity(String(Math.max(1, Math.floor(nextValue))));
  }

  return (
    <>
      <div className={styles.addRow}>
        <div className={styles.addRowSelect}>
          <Combobox
            id="weapon-select"
            label={t("character.weapon")}
            hideLabel={Boolean(labelledBy)}
            labelledBy={labelledBy}
            value={selectedKey}
            onChange={setSelectedKey}
            options={WEAPONS.map((w) => ({
              key: w.key,
              label: tEntity("catalog.weapons", w.key, "name", w.name),
            }))}
          />
        </div>
        <div className={styles.addRowActions}>
          {selectedIsThrown ? (
            <div className={styles.addQuantityField}>
              <label htmlFor="weapon-add-quantity" className={styles.addQuantityLabel}>
                <span className={styles.quantityLabelFull}>{t("equipment.quantity")}</span>
                <span className={styles.quantityLabelShort}>{t("equipment.quantityShort")}</span>
              </label>
              <div className={styles.quantityStepper}>
                <button
                  type="button"
                  aria-label={t("equipment.decreaseQuantity")}
                  disabled={addQuantityValue <= 1}
                  onClick={() => setAddQuantityValue(addQuantityValue - 1)}
                >
                  −
                </button>
                <input
                  id="weapon-add-quantity"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  aria-label={t("equipment.currentQuantity")}
                  value={addQuantity}
                  onChange={(event) => {
                    const parsed = Number(event.target.value);
                    if (Number.isFinite(parsed)) setAddQuantityValue(parsed);
                  }}
                />
                <button
                  type="button"
                  aria-label={t("equipment.increaseQuantity")}
                  onClick={() => setAddQuantityValue(addQuantityValue + 1)}
                >
                  +
                </button>
              </div>
            </div>
          ) : null}
          <button type="button" onClick={handleAdd} disabled={!selectedKey}>
            {t("character.add")}
          </button>
        </div>
      </div>
      {character.weapons.length > 0 && (
        <ul className={styles.itemList}>
          {character.weapons.map((w) => {
            const data = findByKey(WEAPONS, w.key);
            const thrown = data ? isThrownWeapon(data) : false;
            const quantity = weaponQuantity(w);
            return (
              <li key={w.id}>
                <div className={styles.itemListMain}>
                  <span className={styles.itemListName}>
                    {weaponName(w.key)}
                    <span className={styles.itemDetailSuffix}>{weaponDetailSuffix(w.key)}</span>
                    {thrown ? (
                      <span className={styles.itemQuantityText}>
                        {` ${t("equipment.quantityLabel", { count: quantity })}`}
                      </span>
                    ) : null}
                  </span>
                  {thrown ? (
                    <div className={styles.quantityControls}>
                      <button
                        type="button"
                        aria-label={t("equipment.decreaseQuantity")}
                        disabled={quantity <= 0}
                        onClick={() => dispatch({ type: "SET_WEAPON_QUANTITY", id: w.id, value: quantity - 1 })}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        aria-label={t("equipment.currentQuantity")}
                        value={quantity}
                        onChange={(event) => {
                          const parsed = Number(event.target.value);
                          if (!Number.isFinite(parsed)) return;
                          dispatch({ type: "SET_WEAPON_QUANTITY", id: w.id, value: parsed });
                        }}
                      />
                      <button
                        type="button"
                        aria-label={t("equipment.increaseQuantity")}
                        onClick={() => dispatch({ type: "SET_WEAPON_QUANTITY", id: w.id, value: quantity + 1 })}
                      >
                        +
                      </button>
                    </div>
                  ) : null}
                </div>
                <div className={styles.itemListActions}>
                  <ConfirmRemoveButton
                    itemName={weaponName(w.key)}
                    onConfirm={() => dispatch({ type: "REMOVE_WEAPON", id: w.id })}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
