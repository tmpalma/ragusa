import { FEATS } from "../../data";
import { catalogSelectLabel } from "../../data/catalogSelectLabel";
import { backgroundFeatOptions } from "../../domain/featEffects";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { FeatCappedPickList } from "./FeatCappedPickList";

export function FeatInput() {
  const { character, dispatch, derived } = useCharacter();
  const { t, tEntity } = useLocale();
  const suggestedKey = derived.backgroundData?.featKey ?? null;

  const takenFeatKeys = new Set(character.extraFeats);
  const selectableFeats = backgroundFeatOptions(FEATS).filter((feat) => !takenFeatKeys.has(feat.key));

  return (
    <FeatCappedPickList
      id="feat-select"
      groupLabel={t("character.feat")}
      comboboxLabel={t("character.feat")}
      value={character.featKey}
      onChange={(key) => dispatch({ type: "SET_FEAT", key })}
      feats={selectableFeats}
      labelForFeat={(feat) => {
        const name = catalogSelectLabel(
          tEntity("catalog.feats", feat.key, "name", feat.name),
          feat,
        );
        return feat.key === suggestedKey ? t("character.suggestedFeat", { name }) : name;
      }}
      placeholder={t("character.choosePlaceholder")}
    />
  );
}
