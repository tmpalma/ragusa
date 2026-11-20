import {
  artificerCreatedItemsMax,
  artificerPlansKnownMax,
  eligibleArtificerPlans,
  findArtificerPlan,
} from "../../domain/artificerPlans";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { CappedPickList } from "./CappedPickList";

export function ArtificerPlansInput() {
  const { character, dispatch } = useCharacter();
  const { t } = useLocale();

  if (character.classKey !== "artificer" || character.level < 2) return null;

  const maxPlans = artificerPlansKnownMax(character.level);
  const maxItems = artificerCreatedItemsMax(character.level);
  const eligible = eligibleArtificerPlans(character.level);
  const pickedPlans = new Set(character.artificerPlanKeys);
  const planOptions = eligible
    .filter((plan) => !pickedPlans.has(plan.key))
    .map((plan) => ({ key: plan.key, label: plan.name }));

  const createdSet = new Set(character.artificerCreatedItemKeys);
  const createdOptions = character.artificerPlanKeys
    .filter((key) => !createdSet.has(key))
    .map((key) => {
      const plan = findArtificerPlan(key);
      return { key, label: plan?.name ?? key };
    });

  return (
    <>
      <CappedPickList
        id="artificer-plan-select"
        groupLabel={t("character.artificerPlansKnown", {
          count: character.artificerPlanKeys.length,
          max: maxPlans,
        })}
        comboboxLabel={t("character.artificerPlanAdd")}
        options={planOptions}
        selectedKeys={character.artificerPlanKeys}
        maxCount={maxPlans}
        onAdd={(planKey) => dispatch({ type: "ADD_ARTIFICER_PLAN", planKey })}
        onRemove={(planKey) => dispatch({ type: "REMOVE_ARTIFICER_PLAN", planKey })}
        renderSelected={(key) => findArtificerPlan(key)?.name ?? key}
      />
      <CappedPickList
        id="artificer-created-item-select"
        groupLabel={t("character.artificerCreatedItems", {
          count: character.artificerCreatedItemKeys.length,
          max: maxItems,
        })}
        comboboxLabel={t("character.artificerCreatedItemAdd")}
        options={createdOptions}
        selectedKeys={character.artificerCreatedItemKeys}
        maxCount={maxItems}
        onAdd={(planKey) => dispatch({ type: "ADD_ARTIFICER_CREATED_ITEM", planKey })}
        onRemove={(planKey) => dispatch({ type: "REMOVE_ARTIFICER_CREATED_ITEM", planKey })}
        renderSelected={(key) => findArtificerPlan(key)?.name ?? key}
      />
    </>
  );
}
