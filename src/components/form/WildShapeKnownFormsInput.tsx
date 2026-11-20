import { wildShapeEligibleBeasts, WILD_SHAPE_KNOWN_FORM_COUNT } from "../../domain/wildShape";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { CappedPickList } from "./CappedPickList";

export function WildShapeKnownFormsInput() {
  const { character, dispatch } = useCharacter();
  const { t, tEntity } = useLocale();

  if (character.classKey !== "druid" || character.level < 2) return null;

  const eligible = wildShapeEligibleBeasts(character.level, character.subclassKey);
  const picked = new Set(character.wildShapeKnownForms);
  const remainingOptions = eligible
    .filter((beast) => !picked.has(beast.key))
    .map((beast) => ({
      key: beast.key,
      label: tEntity("catalog.beasts", beast.key, "name", beast.name),
    }));

  return (
    <CappedPickList
      id="wild-shape-known-form-select"
      groupLabel={t("character.wildShapeKnownForms", {
        count: character.wildShapeKnownForms.length,
        max: WILD_SHAPE_KNOWN_FORM_COUNT,
      })}
      comboboxLabel={t("character.wildShapeKnownForm")}
      options={remainingOptions}
      selectedKeys={character.wildShapeKnownForms}
      maxCount={WILD_SHAPE_KNOWN_FORM_COUNT}
      onAdd={(formKey) => dispatch({ type: "ADD_WILD_SHAPE_KNOWN_FORM", formKey })}
      onRemove={(formKey) => dispatch({ type: "REMOVE_WILD_SHAPE_KNOWN_FORM", formKey })}
      renderSelected={(key) => {
        const beast = eligible.find((entry) => entry.key === key);
        return beast ? tEntity("catalog.beasts", beast.key, "name", beast.name) : key;
      }}
    />
  );
}
