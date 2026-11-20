import {
  artificerCreatedItemLabel,
  listArtificerCreatedItemKeys,
} from "../../domain/artificerCreatedItems";
import { findGenericVariant } from "../../domain/genericVariantMatcher";
import { findArtificerPlan } from "../../domain/artificerPlans";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import styles from "./Equipment.module.css";

export function ArtificerCreatedItemsSection() {
  const { character } = useCharacter();
  const { t, tEntity } = useLocale();

  if (character.classKey !== "artificer" || character.level < 2) return null;

  const createdKeys = listArtificerCreatedItemKeys(character);

  return (
    <section className={styles.equipmentSection}>
      <h3>{t("equipment.artificerCreatedItems")}</h3>
      <p className={styles.hint}>{t("equipment.artificerCreatedItemsHint")}</p>
      {createdKeys.length > 0 ? (
        <ul className={styles.itemList}>
          {createdKeys.map((key) => (
            <li key={key}>
              <span>
                {artificerCreatedItemLabel(key, {
                  magicItemName: (itemKey) =>
                    tEntity("catalog.magicItems", itemKey, "name", itemKey),
                  variantName: (variantKey) =>
                    tEntity(
                      "catalog.genericVariants",
                      variantKey,
                      "name",
                      findGenericVariant(variantKey)?.name ?? variantKey,
                    ),
                  planName: (planKey) => findArtificerPlan(planKey)?.name ?? planKey,
                })}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.hint}>{t("equipment.noArtificerCreatedItems")}</p>
      )}
    </section>
  );
}
