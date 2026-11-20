import { useState } from "react";
import { ARMOR, findByKey } from "../../data";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { ConfirmRemoveButton } from "../confirm/ConfirmRemoveButton";
import { Combobox } from "./Combobox";
import styles from "./Form.module.css";

export function ArmorSection({ labelledBy }: { labelledBy?: string }) {
  const { character, dispatch } = useCharacter();
  const { t, tEntity } = useLocale();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  function handleAdd() {
    if (!selectedKey) return;
    dispatch({ type: "ADD_ARMOR", key: selectedKey, id: crypto.randomUUID() });
  }

  function armorName(key: string) {
    const data = findByKey(ARMOR, key);
    if (!data) return key;
    return tEntity("catalog.armor", data.key, "name", data.name);
  }

  function armorDetailSuffix(key: string) {
    const data = findByKey(ARMOR, key);
    if (!data) return "";
    const dexSuffix = data.acAddDexMod ? t("equipment.dexSuffix") : "";
    return t("equipment.acFormat", { base: data.acBase, dexSuffix });
  }

  return (
    <>
      <div className={styles.addRow}>
        <div className={styles.addRowSelect}>
          <Combobox
            id="armor-select"
            label={t("character.armor")}
            hideLabel={Boolean(labelledBy)}
            labelledBy={labelledBy}
            value={selectedKey}
            onChange={setSelectedKey}
            options={ARMOR.map((a) => ({
              key: a.key,
              label: tEntity("catalog.armor", a.key, "name", a.name),
            }))}
          />
        </div>
        <div className={styles.addRowActions}>
          <button type="button" onClick={handleAdd} disabled={!selectedKey}>
            {t("character.add")}
          </button>
        </div>
      </div>
      {character.armor.length > 0 && (
        <ul className={styles.itemList}>
          {character.armor.map((a) => {
            const isShield = a.key === "shield";
            return (
              <li key={a.id}>
                <div className={styles.itemListMain}>
                  <label className={styles.wornLabel}>
                    <input
                      type={isShield ? "checkbox" : "radio"}
                      name={isShield ? undefined : "worn-armor"}
                      checked={a.worn}
                      onChange={(event) =>
                        dispatch({
                          type: "SET_ARMOR_WORN",
                          id: a.id,
                          worn: isShield ? event.target.checked : true,
                        })
                      }
                    />
                    {isShield ? t("character.equipped") : t("character.worn")}
                  </label>
                  <span className={styles.itemListName}>
                    {armorName(a.key)}
                    <span className={styles.itemDetailSuffix}>{armorDetailSuffix(a.key)}</span>
                  </span>
                </div>
                <div className={styles.itemListActions}>
                  <ConfirmRemoveButton
                    itemName={armorName(a.key)}
                    onConfirm={() => dispatch({ type: "REMOVE_ARMOR", id: a.id })}
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
