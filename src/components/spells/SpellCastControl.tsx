import { useMemo, useState } from "react";
import { SPECIES, findByKey } from "../../data";
import { buildCastSpellAvailabilityInputFromCharacter } from "../../domain/castSpell";
import { featChoicesResolverForCharacter } from "../../domain/featSlots";
import { activeFeatKeysFromCharacter } from "../../state/characterState";
import { useCharacter } from "../../state/CharacterContext";
import { useLocale } from "../../i18n/LocaleContext";
import styles from "./Spells.module.css";
import { CastSpellDialog } from "./CastSpellDialog";

export function SpellCastControl({
  spellKey,
  spellName,
  wrapperClassName,
}: {
  spellKey: string;
  spellName: string;
  wrapperClassName?: string;
}) {
  const { character, derived, dispatch } = useCharacter();
  const { t, tEntity } = useLocale();
  const [open, setOpen] = useState(false);

  const activeFeatKeys = useMemo(() => activeFeatKeysFromCharacter(character), [character]);
  const featChoicesFor = useMemo(
    () => featChoicesResolverForCharacter(character),
    [character],
  );
  const speciesData = character.speciesKey ? findByKey(SPECIES, character.speciesKey) : null;

  const availability = useMemo(
    () =>
      buildCastSpellAvailabilityInputFromCharacter(
        character,
        derived,
        spellKey,
        activeFeatKeys,
        featChoicesFor,
        speciesData,
      ),
    [character, derived, spellKey, activeFeatKeys, featChoicesFor, speciesData],
  );

  const availabilityWithLabels = useMemo(
    () => ({
      ...availability,
      featNameFor: (featKey: string) => tEntity("catalog.feats", featKey, "name", featKey),
      speciesFeatureNameFor: (featureKey: string, fallback: string) =>
        tEntity("catalog.speciesFeatures", featureKey, "name", fallback),
      classFeatureNameFor: (_featureKey: string, fallback: string) => fallback,
    }),
    [availability, tEntity],
  );

  return (
    <div className={wrapperClassName ?? styles.spellCastControl}>
      <button type="button" className={styles.spellDescRemove} onClick={() => setOpen(true)}>
        {t("spells.cast", undefined, "Cast")}
      </button>
      <CastSpellDialog
        open={open}
        spellKey={spellKey}
        spellName={spellName}
        availability={availabilityWithLabels}
        onCancel={() => setOpen(false)}
        onConfirm={({ actions }) => {
          for (const action of actions) {
            dispatch(action);
          }
          setOpen(false);
        }}
      />
    </div>
  );
}