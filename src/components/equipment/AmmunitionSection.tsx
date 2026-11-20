import { useMemo, useState } from "react";
import { AMMO_TYPES, AMMUNITION_STATS, WEAPONS, findByKey, type AmmoType } from "../../data";
import type { CurrencyDenomination } from "../../data/types";
import { ammunitionRemaining, ammunitionTypeForWeapon, magicAmmoStackRemaining } from "../../domain/ammunition";
import { variantsForAmmunition } from "../../domain/genericVariantMatcher";
import { formatItemCost } from "../../domain/equipmentFormat";
import { useLocale } from "../../i18n/LocaleContext";
import { useMeasurementSystem } from "../../platform/measurementSystem";
import { useCharacter } from "../../state/CharacterContext";
import { ConfirmRemoveButton } from "../confirm/ConfirmRemoveButton";
import { sortComboboxOptionsByLabel } from "../form/Combobox";
import formStyles from "../form/Form.module.css";
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

export function AmmunitionSection() {
  const { character, dispatch } = useCharacter();
  const { t, tEntity, locale } = useLocale();
  const { formatMass } = useMeasurementSystem();
  const [selectedAmmoType, setSelectedAmmoType] = useState<AmmoType>("arrows");
  const [selectedAmmoVariant, setSelectedAmmoVariant] = useState<"mundane" | string>("mundane");
  const ammunitionVariants = useMemo(
    () =>
      sortComboboxOptionsByLabel(
        variantsForAmmunition().map((variant) => ({
          key: variant.key,
          label: tEntity("catalog.genericVariants", variant.key, "name", variant.name),
        })),
        locale,
      ),
    [locale, tEntity],
  );
  const abbreviations = currencyAbbreviations(t);

  function formatAmmoPackLine(type: AmmoType): string {
    const stats = AMMUNITION_STATS[type];
    return t("equipment.ammoPackInfo", {
      packSize: stats.packSize,
      weight: formatMass(stats.packWeightLb),
      cost: formatItemCost(stats.packCost, abbreviations),
      storage: stats.storage,
    });
  }

  function magicAmmoLabel(variantKey: string, type: AmmoType): string {
    const variantName = tEntity("catalog.genericVariants", variantKey, "name", variantKey);
    const typeName = t(`equipment.ammoTypes.${type}`);
    return `${variantName} (${typeName})`;
  }

  function handleAddAmmoPack() {
    if (selectedAmmoVariant === "mundane") {
      dispatch({ type: "ADD_AMMUNITION_PACK", ammoType: selectedAmmoType });
      return;
    }
    dispatch({
      type: "ADD_MAGIC_AMMUNITION_PACK",
      id: crypto.randomUUID(),
      ammoType: selectedAmmoType,
      variantKey: selectedAmmoVariant,
    });
  }

  return (
    <div className={formStyles.subsection}>
      <h4 id="armory-ammunition-heading">{t("equipment.ammunition")}</h4>
      <p className={styles.hint}>{t("equipment.ammunitionHint")}</p>
      <div className={styles.ammoAddRow}>
        <div className={styles.field}>
          <label htmlFor="ammo-type-select">{t("equipment.ammoType")}</label>
          <select
            id="ammo-type-select"
            value={selectedAmmoType}
            onChange={(event) => setSelectedAmmoType(event.target.value as AmmoType)}
          >
            {AMMO_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`equipment.ammoTypes.${type}`)}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="ammo-variant-select">{t("equipment.ammoVariant")}</label>
          <select
            id="ammo-variant-select"
            value={selectedAmmoVariant}
            onChange={(event) => setSelectedAmmoVariant(event.target.value)}
          >
            <option value="mundane">{t("equipment.ammoVariantMundane")}</option>
            {ammunitionVariants.map((variant) => (
              <option key={variant.key} value={variant.key}>
                {variant.label}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className={styles.button} onClick={handleAddAmmoPack}>
          {selectedAmmoVariant === "mundane" ? t("equipment.addAmmoPack") : t("equipment.addMagicAmmoPack")}
        </button>
      </div>
      <ul className={styles.itemList}>
        {AMMO_TYPES.map((type) => {
          const remaining = ammunitionRemaining(character.ammunitionRemaining, type);
          const ownedWeaponUsesType = character.weapons.some((weapon) => {
            const data = findByKey(WEAPONS, weapon.key);
            return data ? ammunitionTypeForWeapon(data) === type : false;
          });
          if (remaining === 0 && !ownedWeaponUsesType) return null;

          return (
            <li key={type}>
              <span>
                <strong>{t(`equipment.ammoTypes.${type}`)}</strong>
                <span className={styles.ammoMeta}>
                  {t("equipment.ammoRemaining", { count: remaining })}
                  {" · "}
                  {formatAmmoPackLine(type)}
                </span>
              </span>
              <div className={styles.quantityControls}>
                <button
                  type="button"
                  className={styles.button}
                  aria-label={t("equipment.decreaseAmmo", { type: t(`equipment.ammoTypes.${type}`) })}
                  disabled={remaining <= 0}
                  onClick={() => dispatch({ type: "SET_AMMUNITION_REMAINING", ammoType: type, value: remaining - 1 })}
                >
                  −
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  aria-label={t("equipment.currentAmmo", { type: t(`equipment.ammoTypes.${type}`) })}
                  value={remaining}
                  onChange={(event) => {
                    const parsed = Number(event.target.value);
                    if (!Number.isFinite(parsed)) return;
                    dispatch({ type: "SET_AMMUNITION_REMAINING", ammoType: type, value: parsed });
                  }}
                />
                <button
                  type="button"
                  className={styles.button}
                  aria-label={t("equipment.increaseAmmo", { type: t(`equipment.ammoTypes.${type}`) })}
                  onClick={() => dispatch({ type: "SET_AMMUNITION_REMAINING", ammoType: type, value: remaining + 1 })}
                >
                  +
                </button>
              </div>
            </li>
          );
        })}
        {character.magicAmmunition.map((stack) => {
          const remaining = magicAmmoStackRemaining(character.magicAmmunition, stack.id);
          if (remaining === 0) return null;
          const label = magicAmmoLabel(stack.variantKey, stack.ammoType);
          return (
            <li key={stack.id}>
              <span>
                <strong>{label}</strong>
                <span className={styles.ammoMeta}>
                  {t("equipment.magicAmmoRemaining", { count: remaining })}
                  {" · "}
                  {formatAmmoPackLine(stack.ammoType)}
                </span>
              </span>
              <div className={styles.quantityControls}>
                <button
                  type="button"
                  className={styles.button}
                  aria-label={t("equipment.decreaseAmmo", { type: label })}
                  disabled={remaining <= 0}
                  onClick={() =>
                    dispatch({ type: "SET_MAGIC_AMMUNITION_REMAINING", id: stack.id, value: remaining - 1 })
                  }
                >
                  −
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  aria-label={t("equipment.currentAmmo", { type: label })}
                  value={remaining}
                  onChange={(event) => {
                    const parsed = Number(event.target.value);
                    if (!Number.isFinite(parsed)) return;
                    dispatch({ type: "SET_MAGIC_AMMUNITION_REMAINING", id: stack.id, value: parsed });
                  }}
                />
                <button
                  type="button"
                  className={styles.button}
                  aria-label={t("equipment.increaseAmmo", { type: label })}
                  onClick={() =>
                    dispatch({ type: "SET_MAGIC_AMMUNITION_REMAINING", id: stack.id, value: remaining + 1 })
                  }
                >
                  +
                </button>
                <ConfirmRemoveButton
                  className={styles.button}
                  itemName={label}
                  onConfirm={() => dispatch({ type: "REMOVE_MAGIC_AMMUNITION", id: stack.id })}
                >
                  {t("equipment.remove")}
                </ConfirmRemoveButton>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
