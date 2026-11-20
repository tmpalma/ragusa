import { useMemo, useState } from "react";
import { ARMOR, WEAPONS, findByKey } from "../../data";
import type { ArmorData, GenericVariantData, WeaponData } from "../../data/types";
import { isThrownWeapon, weaponQuantity } from "../../domain/ammunition";
import { hasFreeAttunementSlot } from "../../domain/attunement";
import {
  localizedVariantDisplayName,
  variantRarityLocaleKey,
} from "../../domain/genericVariantDisplay";
import {
  armorForVariant,
  findGenericVariant,
  variantMatchesArmor,
  variantMatchesWeapon,
  variantsForArmor,
  variantsForWeapon,
  weaponsForVariant,
} from "../../domain/genericVariantMatcher";
import { collectArmoryChargeTrackers } from "../../domain/genericVariantResolve";
import { useLocale } from "../../i18n/LocaleContext";
import { useMeasurementSystem } from "../../platform/measurementSystem";
import { useCharacter } from "../../state/CharacterContext";
import type { CharacterArmor, CharacterWeapon } from "../../state/characterState";
import { AmmunitionSection } from "./AmmunitionSection";
import { EnspelledSpellPicker } from "./EnspelledSpellPicker";
import { EquipmentActionToggle } from "./EquipmentActionControls";
import { armoryEquipmentActionKey } from "../../domain/equipmentActions";
import { GenericVariantDescription } from "./GenericVariantDescription";
import { isEnspelledVariantKey } from "../../domain/enspelledVariants";
import { ConfirmRemoveButton } from "../confirm/ConfirmRemoveButton";
import { CollapsiblePane } from "../CollapsiblePane";
import { ResourceCounter } from "../combat/ResourceCounter";
import combatStyles from "../combat/Combat.module.css";
import { Combobox, sortComboboxOptionsByLabel } from "../form/Combobox";
import formStyles from "../form/Form.module.css";
import styles from "./Equipment.module.css";

type ArmoryVariantPiece = {
  id: string;
  key: string;
  variantKey: string;
  kind: "weapon" | "armor";
  attuned?: boolean;
};

export function ArmorySection() {
  const { character } = useCharacter();
  const { t, tEntity } = useLocale();

  const variantPieces = useMemo(() => {
    const pieces: ArmoryVariantPiece[] = [];
    for (const weapon of character.weapons) {
      if (weapon.variantKey) {
        pieces.push({
          id: weapon.id,
          key: weapon.key,
          variantKey: weapon.variantKey,
          kind: "weapon",
          attuned: weapon.attuned,
        });
      }
    }
    for (const armor of character.armor) {
      if (armor.variantKey) {
        pieces.push({
          id: armor.id,
          key: armor.key,
          variantKey: armor.variantKey,
          kind: "armor",
          attuned: armor.attuned,
        });
      }
    }
    return pieces;
  }, [character.weapons, character.armor]);

  return (
    <section className={styles.equipmentSection}>
      <h3>{t("equipment.armory")}</h3>
      <p className={styles.hint}>{t("equipment.armoryHint")}</p>
      <div className={styles.armoryStack}>
        <div className={formStyles.subsection}>
          <h4 id="armory-weapons-heading">{t("equipment.weapons")}</h4>
          <WeaponArmory />
          {character.weapons.length === 0 ? <p className={styles.hint}>{t("equipment.noWeapons")}</p> : null}
        </div>
        <AmmunitionSection />
        <div className={formStyles.subsection}>
          <h4 id="armory-armor-heading">{t("equipment.armor")}</h4>
          <ArmorArmory />
          {character.armor.length === 0 ? <p className={styles.hint}>{t("equipment.noArmor")}</p> : null}
        </div>
      </div>
      {variantPieces.length > 0 ? (
        <div className={styles.armoryDescriptionsPane}>
          <ArmoryDescriptions pieces={variantPieces} tEntity={tEntity} />
        </div>
      ) : null}
    </section>
  );
}

function ArmoryDescriptions({
  pieces,
  tEntity,
}: {
  pieces: ArmoryVariantPiece[];
  tEntity: ReturnType<typeof useLocale>["tEntity"];
}) {
  const { t } = useLocale();

  return (
    <CollapsiblePane title={t("equipment.armoryDescriptions")} variant="nested">
      <div className={combatStyles.cards}>
        {pieces.map((piece) => {
          const variant = findGenericVariant(piece.variantKey);
          const baseName =
            piece.kind === "weapon"
              ? (() => {
                  const data = findByKey(WEAPONS, piece.key);
                  return data
                    ? tEntity("catalog.weapons", data.key, "name", data.name)
                    : piece.key;
                })()
              : (() => {
                  const data = findByKey(ARMOR, piece.key);
                  return data ? tEntity("catalog.armor", data.key, "name", data.name) : piece.key;
                })();
          const displayName = localizedVariantDisplayName(baseName, variant, tEntity);
          const rarity = variant ? t(variantRarityLocaleKey(variant.rarity), undefined, variant.rarity) : "";
          const attune = variant?.requiresAttunement ? t("equipment.attunement") : null;
          return (
            <article key={piece.id} className={combatStyles.card}>
              <h4>{displayName}</h4>
              <p className={combatStyles.meta}>{[rarity, attune].filter(Boolean).join(" · ")}</p>
              <GenericVariantDescription
                desc={tEntity("catalog.genericVariants", piece.variantKey, "desc", variant?.desc ?? "")}
              />
              {isEnspelledVariantKey(piece.variantKey) ? (
                <EnspelledSpellPicker instanceId={piece.id} variantKey={piece.variantKey} />
              ) : null}
              <EquipmentActionToggle
                actionKey={armoryEquipmentActionKey(piece.id)}
                visible={!variant?.requiresAttunement || Boolean(piece.attuned)}
              />
            </article>
          );
        })}
      </div>
    </CollapsiblePane>
  );
}

function ArmoryRowCharges({
  piece,
  kind,
  displayName,
}: {
  piece: CharacterWeapon | CharacterArmor;
  kind: "weapon" | "armor";
  displayName: string;
}) {
  const { character, dispatch } = useCharacter();
  const { t } = useLocale();

  const tracker = useMemo(() => {
    const trackers = collectArmoryChargeTrackers(
      kind === "weapon" ? { weapons: [piece], armor: [] } : { weapons: [], armor: [piece] },
    );
    return trackers[0] ?? null;
  }, [piece, kind]);

  if (!tracker) return null;

  const currentUses = character.featSpellUses[tracker.storageKey] ?? tracker.maxUses;

  return (
    <div className={combatStyles.weaponResource}>
      <ResourceCounter
        id={`armory-equipment-charges-${tracker.instanceId}`}
        label={displayName}
        current={currentUses}
        max={tracker.maxUses}
        decreaseLabel={t("equipment.decreaseCharges", { item: displayName })}
        increaseLabel={t("equipment.increaseCharges", { item: displayName })}
        currentLabel={t("equipment.currentCharges", { item: displayName })}
        onChange={(value) => dispatch({ type: "SET_FEAT_SPELL_USES", featKey: tracker.storageKey, value })}
      />
    </div>
  );
}

function WeaponArmory() {
  const { character, dispatch } = useCharacter();
  const { t, tEntity, tGlossary, locale } = useLocale();
  const { formatMass, formatProse } = useMeasurementSystem();
  const [variantKey, setVariantKey] = useState<string | null>(null);
  const [baseKey, setBaseKey] = useState<string | null>(null);
  const [addQuantity, setAddQuantity] = useState("1");

  const selectedVariant = findGenericVariant(variantKey);
  const selectedWeapon = baseKey ? findByKey(WEAPONS, baseKey) : null;
  const selectedIsThrown = selectedWeapon ? isThrownWeapon(selectedWeapon) : false;
  const canAttuneMore = hasFreeAttunementSlot(character);

  const addQuantityValue = useMemo(() => {
    const parsed = Number(addQuantity);
    return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
  }, [addQuantity]);

  const variantOptions = useMemo(
    () =>
      sortComboboxOptionsByLabel(
        variantsForWeapon(selectedWeapon).map((row) => ({
          key: row.key,
          label: tEntity("catalog.genericVariants", row.key, "name", row.name),
        })),
        locale,
      ),
    [locale, selectedWeapon, tEntity],
  );

  const baseOptions = useMemo(
    () =>
      sortComboboxOptionsByLabel(
        weaponsForVariant(selectedVariant).map((row) => ({
          key: row.key,
          label: tEntity("catalog.weapons", row.key, "name", row.name),
        })),
        locale,
      ),
    [locale, selectedVariant, tEntity],
  );

  function handleVariantChange(key: string | null) {
    const next = findGenericVariant(key);
    setVariantKey(key);
    if (selectedWeapon && !variantMatchesWeapon(next, selectedWeapon)) {
      setBaseKey(null);
    }
  }

  function handleBaseChange(key: string | null) {
    const nextWeapon = key ? findByKey(WEAPONS, key) : null;
    setBaseKey(key);
    if (nextWeapon && selectedVariant && !variantMatchesWeapon(selectedVariant, nextWeapon)) {
      setVariantKey(null);
    }
  }

  function handleAdd() {
    if (!baseKey) return;
    dispatch({
      type: "ADD_WEAPON",
      key: baseKey,
      id: crypto.randomUUID(),
      quantity: selectedIsThrown ? addQuantityValue : 1,
      ...(variantKey ? { variantKey } : {}),
    });
    setAddQuantity("1");
  }

  function weaponName(key: string) {
    const data = findByKey(WEAPONS, key);
    if (!data) return key;
    return tEntity("catalog.weapons", data.key, "name", data.name);
  }

  function weaponDetailSuffix(data: WeaponData | undefined, quantity = 1) {
    if (!data) return "";
    const damageType = tGlossary("damageType", data.damageType);
    const properties = data.properties.map((prop) => formatProse(tGlossary("weaponProperty", prop)));
    const weight = formatMass(data.weightLb * quantity);
    return `${t("equipment.weaponDamageSeparator")}${data.damageDice} ${damageType}${
      properties.length
        ? `${t("equipment.weaponPropertiesOpen")}${properties.join(", ")}${t("equipment.weaponPropertiesClose")}`
        : ""
    }${t("equipment.statsSeparator")} ${weight}`;
  }

  function setAddQuantityValue(nextValue: number) {
    setAddQuantity(String(Math.max(1, Math.floor(nextValue))));
  }

  return (
    <>
      <div className={formStyles.addRow}>
        <div className={formStyles.addRowSelect}>
          <Combobox
            id="armory-weapon-base"
            label={t("equipment.baseWeapon")}
            value={baseKey}
            onChange={handleBaseChange}
            options={baseOptions}
          />
        </div>
        <div className={formStyles.addRowSelect}>
          <Combobox
            id="armory-weapon-variant"
            label={t("equipment.variant")}
            value={variantKey}
            onChange={handleVariantChange}
            options={variantOptions}
            placeholder={t("equipment.variantNone")}
          />
        </div>
        <div className={formStyles.addRowActions}>
          {selectedIsThrown ? (
            <div className={formStyles.addQuantityField}>
              <label htmlFor="armory-weapon-add-quantity" className={formStyles.addQuantityLabel}>
                <span className={formStyles.quantityLabelFull}>{t("equipment.quantity")}</span>
                <span className={formStyles.quantityLabelShort}>{t("equipment.quantityShort")}</span>
              </label>
              <div className={formStyles.quantityStepper}>
                <button
                  type="button"
                  aria-label={t("equipment.decreaseQuantity")}
                  disabled={addQuantityValue <= 1}
                  onClick={() => setAddQuantityValue(addQuantityValue - 1)}
                >
                  −
                </button>
                <input
                  id="armory-weapon-add-quantity"
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
          <button type="button" onClick={handleAdd} disabled={!baseKey}>
            {t("character.add")}
          </button>
        </div>
      </div>
      {character.weapons.length > 0 && (
        <ul className={formStyles.itemList}>
          {character.weapons.map((w) => {
            const data = findByKey(WEAPONS, w.key);
            const variant = findGenericVariant(w.variantKey);
            const thrown = data ? isThrownWeapon(data) : false;
            const quantity = weaponQuantity(w);
            const displayName = localizedVariantDisplayName(weaponName(w.key), variant, tEntity);
            const attuneBlocked = Boolean(variant?.requiresAttunement) && !w.attuned && !canAttuneMore;
            return (
              <li key={w.id}>
                <div className={styles.armoryRowBody}>
                  <div className={formStyles.itemListMain}>
                    <span className={formStyles.itemListName}>
                      {displayName}
                      {variant ? (
                        <span className={formStyles.itemDetailSuffix}>
                          {` · ${t(variantRarityLocaleKey(variant.rarity), undefined, variant.rarity)}`}
                        </span>
                      ) : null}
                      <span className={formStyles.itemDetailSuffix}>{weaponDetailSuffix(data ?? undefined, quantity)}</span>
                      {thrown ? (
                        <span className={formStyles.itemQuantityText}>
                          {` ${t("equipment.quantityLabel", { count: quantity })}`}
                        </span>
                      ) : null}
                    </span>
                    {thrown ? (
                      <div className={formStyles.quantityControls}>
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
                  <ArmoryRowCharges piece={w} kind="weapon" displayName={displayName} />
                </div>
                <div className={`${formStyles.itemListActions} ${styles.armoryRowActions}`}>
                  <AttuneCheckbox
                    checked={Boolean(w.attuned)}
                    variant={variant}
                    disabled={attuneBlocked}
                    onChange={(attuned) => dispatch({ type: "SET_WEAPON_ATTUNED", id: w.id, attuned })}
                  />
                  <ConfirmRemoveButton
                    itemName={displayName}
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

function ArmorArmory() {
  const { character, dispatch } = useCharacter();
  const { t, tEntity, locale } = useLocale();
  const { formatMass } = useMeasurementSystem();
  const [variantKey, setVariantKey] = useState<string | null>(null);
  const [baseKey, setBaseKey] = useState<string | null>(null);

  const selectedVariant = findGenericVariant(variantKey);
  const selectedArmor = baseKey ? findByKey(ARMOR, baseKey) : null;
  const canAttuneMore = hasFreeAttunementSlot(character);

  const variantOptions = useMemo(
    () =>
      sortComboboxOptionsByLabel(
        variantsForArmor(selectedArmor).map((row) => ({
          key: row.key,
          label: tEntity("catalog.genericVariants", row.key, "name", row.name),
        })),
        locale,
      ),
    [locale, selectedArmor, tEntity],
  );

  const baseOptions = useMemo(
    () =>
      sortComboboxOptionsByLabel(
        armorForVariant(selectedVariant).map((row) => ({
          key: row.key,
          label: tEntity("catalog.armor", row.key, "name", row.name),
        })),
        locale,
      ),
    [locale, selectedVariant, tEntity],
  );

  function handleVariantChange(key: string | null) {
    const next = findGenericVariant(key);
    setVariantKey(key);
    if (selectedArmor && !variantMatchesArmor(next, selectedArmor)) {
      setBaseKey(null);
    }
  }

  function handleBaseChange(key: string | null) {
    const nextArmor = key ? findByKey(ARMOR, key) : null;
    setBaseKey(key);
    if (nextArmor && selectedVariant && !variantMatchesArmor(selectedVariant, nextArmor)) {
      setVariantKey(null);
    }
  }

  function handleAdd() {
    if (!baseKey) return;
    dispatch({
      type: "ADD_ARMOR",
      key: baseKey,
      id: crypto.randomUUID(),
      ...(variantKey ? { variantKey } : {}),
    });
  }

  function armorName(key: string) {
    const data = findByKey(ARMOR, key);
    if (!data) return key;
    return tEntity("catalog.armor", data.key, "name", data.name);
  }

  function armorDetailSuffix(data: ArmorData | undefined) {
    if (!data) return "";
    const dexSuffix = data.acAddDexMod ? t("equipment.dexSuffix") : "";
    return `${t("equipment.acFormat", { base: data.acBase, dexSuffix })}${t("equipment.statsSeparator")} ${formatMass(data.weightLb)}`;
  }

  return (
    <>
      <div className={formStyles.addRow}>
        <div className={formStyles.addRowSelect}>
          <Combobox
            id="armory-armor-base"
            label={t("equipment.baseArmor")}
            value={baseKey}
            onChange={handleBaseChange}
            options={baseOptions}
          />
        </div>
        <div className={formStyles.addRowSelect}>
          <Combobox
            id="armory-armor-variant"
            label={t("equipment.variant")}
            value={variantKey}
            onChange={handleVariantChange}
            options={variantOptions}
            placeholder={t("equipment.variantNone")}
          />
        </div>
        <div className={formStyles.addRowActions}>
          <button type="button" onClick={handleAdd} disabled={!baseKey}>
            {t("character.add")}
          </button>
        </div>
      </div>
      {character.armor.length > 0 && (
        <ul className={formStyles.itemList}>
          {character.armor.map((a) => {
            const data = findByKey(ARMOR, a.key);
            const variant = findGenericVariant(a.variantKey);
            const isShield = a.key === "shield";
            const displayName = localizedVariantDisplayName(armorName(a.key), variant, tEntity);
            const attuneBlocked = Boolean(variant?.requiresAttunement) && !a.attuned && !canAttuneMore;
            return (
              <li key={a.id}>
                <div className={styles.armoryRowBody}>
                  <div className={formStyles.itemListMain}>
                    <label className={formStyles.wornLabel}>
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
                    <span className={formStyles.itemListName}>
                      {displayName}
                      {variant ? (
                        <span className={formStyles.itemDetailSuffix}>
                          {` · ${t(variantRarityLocaleKey(variant.rarity), undefined, variant.rarity)}`}
                        </span>
                      ) : null}
                      <span className={formStyles.itemDetailSuffix}>{armorDetailSuffix(data ?? undefined)}</span>
                    </span>
                  </div>
                  <ArmoryRowCharges piece={a} kind="armor" displayName={displayName} />
                </div>
                <div className={`${formStyles.itemListActions} ${styles.armoryRowActions}`}>
                  <AttuneCheckbox
                    checked={Boolean(a.attuned)}
                    variant={variant}
                    disabled={attuneBlocked}
                    onChange={(attuned) => dispatch({ type: "SET_ARMOR_ATTUNED", id: a.id, attuned })}
                  />
                  <ConfirmRemoveButton
                    itemName={displayName}
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

function AttuneCheckbox({
  checked,
  variant,
  disabled,
  onChange,
}: {
  checked: boolean;
  variant: GenericVariantData | null;
  disabled: boolean;
  onChange: (attuned: boolean) => void;
}) {
  const { t } = useLocale();
  if (!variant?.requiresAttunement) return null;
  return (
    <label className={formStyles.wornLabel} title={disabled ? t("equipment.attunementSlotsFull") : undefined}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      {t("equipment.attune")}
    </label>
  );
}
