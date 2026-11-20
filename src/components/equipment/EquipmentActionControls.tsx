import { useMemo } from "react";
import { MAGIC_ITEMS, findByKey } from "../../data";
import {
  armoryEquipmentActionDisplayName,
  listEquipmentActionDisplays,
  type EquipmentActionDisplay,
} from "../../domain/equipmentActions";
import { resolveEquipmentPick } from "../../domain/equipmentPicks";
import type { StructuredGearDescParts } from "../../domain/adventuringGear";
import { variantRarityLocaleKey } from "../../domain/genericVariantDisplay";
import { collectArmoryChargeTrackers } from "../../domain/genericVariantResolve";
import { findGenericVariant } from "../../domain/genericVariantMatcher";
import {
  armoryRestUsesStorageKey,
  currentEquipmentRestUses,
  equipmentRestUsePoolsForMagicItem,
  equipmentRestUsePoolsForVariant,
  gearRestUsesStorageKey,
  type EquipmentRestUsePool,
} from "../../domain/equipmentRestUses";
import { usesPerRestLabelKey } from "../../domain/combatUseTrackers";
import {
  currentMagicItemCharges,
  magicItemChargeMax,
} from "../../domain/magicItemCharges";
import { useLocale } from "../../i18n/LocaleContext";
import { useMeasurementSystem } from "../../platform/measurementSystem";
import { useCharacter } from "../../state/CharacterContext";
import { ResourceCounter } from "../combat/ResourceCounter";
import { GenericVariantDescription } from "./GenericVariantDescription";
import combatStyles from "../combat/Combat.module.css";
import styles from "./Equipment.module.css";

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

export function EquipmentActionToggle({
  actionKey,
  visible,
}: {
  actionKey: string;
  visible: boolean;
}) {
  const { character, dispatch } = useCharacter();
  const { t } = useLocale();
  if (!visible) return null;
  const pinned = character.equipmentActionKeys.includes(actionKey);
  return (
    <button
      type="button"
      className={styles.equipmentActionToggle}
      onClick={() =>
        dispatch({
          type: pinned ? "REMOVE_EQUIPMENT_ACTION" : "ADD_EQUIPMENT_ACTION",
          actionKey,
        })
      }
    >
      {pinned ? t("equipment.removeFromActions") : t("equipment.addToActions")}
    </button>
  );
}

function restUsesCounterLabel(pool: EquipmentRestUsePool, t: ReturnType<typeof useLocale>["t"]): string {
  const restLabel = t(usesPerRestLabelKey(pool.recovery));
  if (pool.heading) return `${pool.heading} · ${restLabel}`;
  return restLabel;
}

function EquipmentRestUseTrackers({
  pools,
  storageKeyForPool,
  idPrefix,
  featureName,
}: {
  pools: EquipmentRestUsePool[];
  storageKeyForPool: (pool: EquipmentRestUsePool) => string;
  idPrefix: string;
  featureName: string;
}) {
  const { character, dispatch } = useCharacter();
  const { t } = useLocale();
  if (pools.length === 0) return null;

  return (
    <>
      {pools.map((pool) => {
        const storageKey = storageKeyForPool(pool);
        const label = restUsesCounterLabel(pool, t);
        const current = currentEquipmentRestUses(
          character.equipmentRestUsesRemaining,
          storageKey,
          pool.maxUses,
        );
        return (
          <div
            key={pool.id}
            className={`${combatStyles.embeddedTracker} ${combatStyles.weaponResource}`}
          >
            <ResourceCounter
              id={`${idPrefix}-rest-uses-${pool.id}`}
              label={label}
              current={current}
              max={pool.maxUses}
              decreaseLabel={t("combat.decreaseUses", { feature: label })}
              increaseLabel={t("combat.increaseUses", { feature: label })}
              currentLabel={t("combat.currentUses", { feature: featureName })}
              onChange={(value) =>
                dispatch({ type: "SET_EQUIPMENT_REST_USES", storageKey, value })
              }
            />
          </div>
        );
      })}
    </>
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

function EquipmentActionDisplayCard({ display }: { display: EquipmentActionDisplay }) {
  const { character, dispatch } = useCharacter();
  const { t, tEntity } = useLocale();
  const { formatMass, formatProse } = useMeasurementSystem();

  const armoryChargeTracker = useMemo(() => {
    if (display.kind !== "armory") return null;
    const weapons =
      display.pieceKind === "weapon"
        ? character.weapons.filter((piece) => piece.id === display.instanceId)
        : [];
    const armor =
      display.pieceKind === "armor"
        ? character.armor.filter((piece) => piece.id === display.instanceId)
        : [];
    return collectArmoryChargeTrackers({ weapons, armor })[0] ?? null;
  }, [character.armor, character.weapons, display]);

  if (display.kind === "gear-magic") {
    const catalogItem = findByKey(MAGIC_ITEMS, display.catalogKey);
    const name = tEntity("catalog.magicItems", display.catalogKey, "name", catalogItem?.name ?? display.catalogKey);
    const rarity = catalogItem ? t(`equipment.rarity.${catalogItem.rarity}`) : "";
    const category = catalogItem ? t(`equipment.magicItemCategory.${catalogItem.category}`) : "";
    const attuneNote = catalogItem?.requiresAttunement
      ? catalogItem.attuneNote
        ? `${t("equipment.attunement")} (${catalogItem.attuneNote})`
        : t("equipment.attunement")
      : null;
    const attuneStatus =
      catalogItem?.requiresAttunement &&
      (display.isAttuned ? t("equipment.attuned") : t("equipment.notAttuned"));
    const chargeMax = magicItemChargeMax(display.catalogKey);
    const chargeCurrent =
      chargeMax != null
        ? currentMagicItemCharges(
            character.magicItemChargeRemaining,
            display.catalogKey,
            chargeMax,
          )
        : null;

    return (
      <article className={combatStyles.card}>
        <h4 className={combatStyles.featureCardTitle}>{name}</h4>
        <p className={combatStyles.meta}>{[rarity, category, attuneNote, attuneStatus].filter(Boolean).join(" · ")}</p>
        {catalogItem ? (
          <p className={combatStyles.spellMetaLine}>
            {formatMagicItemWeight(catalogItem.weightLb, display.quantity, t, formatMass)}
          </p>
        ) : null}
        {chargeMax != null && chargeCurrent != null ? (
          <div className={`${combatStyles.embeddedTracker} ${combatStyles.weaponResource}`}>
            <ResourceCounter
              id={`equipment-action-charges-${display.catalogKey}`}
              label={name}
              current={chargeCurrent}
              max={chargeMax}
              decreaseLabel={t("equipment.decreaseCharges", { item: name })}
              increaseLabel={t("equipment.increaseCharges", { item: name })}
              currentLabel={t("equipment.currentCharges", { item: name })}
              onChange={(value) =>
                dispatch({
                  type: "SET_MAGIC_ITEM_CHARGE_REMAINING",
                  itemKey: display.catalogKey,
                  value,
                })
              }
            />
          </div>
        ) : null}
        <GenericVariantDescription
          desc={tEntity("catalog.magicItems", display.catalogKey, "desc", catalogItem?.desc ?? "")}
        />
        <EquipmentRestUseTrackers
          pools={equipmentRestUsePoolsForMagicItem(display.catalogKey)}
          storageKeyForPool={(pool) => gearRestUsesStorageKey(display.catalogKey, pool.id)}
          idPrefix={`equipment-action-${display.catalogKey}`}
          featureName={name}
        />
      </article>
    );
  }

  if (display.kind === "gear-mundane") {
    const resolved = resolveEquipmentPick(display.catalogKey);
    if (resolved?.kind !== "gear" && resolved?.kind !== "homebrew") return null;
    const item = resolved.item;
    const name =
      resolved.kind === "homebrew"
        ? resolved.record.data.name
        : tEntity("catalog.adventuringGear", display.catalogKey, "name", item.name);
    const category =
      resolved.kind === "homebrew"
        ? t(`equipment.homebrewCategory.${resolved.record.data.category}`)
        : t(`equipment.gearCategory.${item.category}`);

    return (
      <article className={combatStyles.card}>
        <h4 className={combatStyles.featureCardTitle}>{name}</h4>
        <p className={combatStyles.meta}>{category}</p>
        {display.structuredParts ? (
          <StructuredGearDescSections parts={display.structuredParts} t={t} />
        ) : display.plainDesc ? (
          <p className={combatStyles.description}>
            {formatProse(
              resolved.kind === "homebrew"
                ? resolved.record.data.description
                : tEntity("catalog.adventuringGear", display.catalogKey, "desc", display.plainDesc),
            )}
          </p>
        ) : null}
      </article>
    );
  }

  const variant = findGenericVariant(display.variantKey);
  const name = armoryEquipmentActionDisplayName(display, tEntity);
  const rarity = display.rarity ? t(variantRarityLocaleKey(display.rarity), undefined, display.rarity) : "";
  const attune = variant?.requiresAttunement ? t("equipment.attunement") : null;

  const armoryChargeCurrent = armoryChargeTracker
    ? (character.featSpellUses[armoryChargeTracker.storageKey] ?? armoryChargeTracker.maxUses)
    : null;

  return (
    <article className={combatStyles.card}>
      <h4 className={combatStyles.featureCardTitle}>{name}</h4>
      <p className={combatStyles.meta}>{[rarity, attune].filter(Boolean).join(" · ")}</p>
      {armoryChargeTracker && armoryChargeCurrent != null ? (
        <div className={`${combatStyles.embeddedTracker} ${combatStyles.weaponResource}`}>
          <ResourceCounter
            id={`equipment-action-armory-charges-${display.instanceId}`}
            label={name}
            current={armoryChargeCurrent}
            max={armoryChargeTracker.maxUses}
            decreaseLabel={t("equipment.decreaseCharges", { item: name })}
            increaseLabel={t("equipment.increaseCharges", { item: name })}
            currentLabel={t("equipment.currentCharges", { item: name })}
            onChange={(value) =>
              dispatch({
                type: "SET_FEAT_SPELL_USES",
                featKey: armoryChargeTracker.storageKey,
                value,
              })
            }
          />
        </div>
      ) : null}
      <GenericVariantDescription
        desc={tEntity("catalog.genericVariants", display.variantKey, "desc", variant?.desc ?? "")}
      />
      <EquipmentRestUseTrackers
        pools={equipmentRestUsePoolsForVariant(display.variantKey)}
        storageKeyForPool={(pool) => armoryRestUsesStorageKey(display.instanceId, pool.id)}
        idPrefix={`equipment-action-armory-${display.instanceId}`}
        featureName={name}
      />
    </article>
  );
}

export function EquipmentActionDescriptionsList() {
  const { character } = useCharacter();
  const displays = listEquipmentActionDisplays(character);
  if (displays.length === 0) return null;

  return (
    <div className={combatStyles.cards}>
      {displays.map((display) => (
        <EquipmentActionDisplayCard key={display.actionKey} display={display} />
      ))}
    </div>
  );
}
