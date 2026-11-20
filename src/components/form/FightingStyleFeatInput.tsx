import { FEATS, findByKey } from "../../data";
import { fightingStyleFeatOptionsForClass } from "../../domain/classFeatures/fightingStyle";
import { featGrantSpellsEffect } from "../../domain/featEffects";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { activeFeatKeysFromCharacter } from "../../state/characterState";
import { FeatCappedPickList } from "./FeatCappedPickList";
import { FeatProficiencyChoices } from "./FeatProficiencyChoices";
import { FeatSpellChoices } from "./FeatSpellChoices";

export function FightingStyleFeatInputAtLevel({ level }: { level: number }) {
  const { character, derived, dispatch } = useCharacter();
  const { t } = useLocale();

  if (!derived.classFeatureContributions.hasFightingStyleFeature) return null;
  if (!character.classKey) return null;

  const grantedAtLevel = derived.classData?.features.find((feature) =>
    feature.effects.some((effect) => effect.type === "fighting_style_feature"),
  )?.grantedAtLevel;
  if (grantedAtLevel !== level) return null;

  const optionKeys = fightingStyleFeatOptionsForClass(character.classKey);
  const feats = optionKeys
    .map((key) => findByKey(FEATS, key))
    .filter((feat): feat is NonNullable<typeof feat> => feat != null);
  const activeFeatKeys = activeFeatKeysFromCharacter(character);
  const grantEffect = character.fightingStyleFeatKey
    ? featGrantSpellsEffect(character.fightingStyleFeatKey)
    : null;

  return (
    <>
      <FeatCappedPickList
        id={`fighting-style-feat-level-${level}`}
        groupLabel={t("character.fightingStyleFeat")}
        comboboxLabel={t("character.feat")}
        value={character.fightingStyleFeatKey}
        onChange={(key) => dispatch({ type: "SET_FIGHTING_STYLE_FEAT", key })}
        feats={feats}
        showCategoryFilter={false}
        placeholder={t("character.choosePlaceholder")}
      />

      {character.fightingStyleFeatKey ? (
        <FeatProficiencyChoices
          featKey={character.fightingStyleFeatKey}
          proficiencyPicks={character.fightingStyleFeatChoices.proficiencyPicks}
          abilityIncreases={character.fightingStyleFeatChoices.abilityIncreases}
          damageTypePick={character.fightingStyleFeatChoices.damageTypePick}
          weaponMasteryPick={character.fightingStyleFeatChoices.weaponMasteryPick}
          idPrefix="fighting-style-feat"
          onPickChange={() => {}}
          onAbilityIncreasesChange={() => {}}
          onDamageTypeChange={(damageType) =>
            dispatch({ type: "SET_FIGHTING_STYLE_FEAT_DAMAGE_TYPE", damageType })
          }
          onWeaponMasteryPickChange={(weaponKey) =>
            dispatch({ type: "SET_FIGHTING_STYLE_FEAT_WEAPON_MASTERY_PICK", weaponKey })
          }
        />
      ) : null}

      {character.fightingStyleFeatKey && grantEffect ? (
        <FeatSpellChoices
          featKey={character.fightingStyleFeatKey}
          choices={character.fightingStyleFeatChoices}
          activeFeatKeys={activeFeatKeys}
          idPrefix="fighting-style-feat"
          onSpellcastingAbilityChange={(ability) =>
            dispatch({ type: "SET_FIGHTING_STYLE_FEAT_SPELLCASTING_ABILITY", ability })
          }
          onCantripPickChange={(index, spellKey) =>
            dispatch({ type: "SET_FIGHTING_STYLE_FEAT_CANTRIP_PICK", index, spellKey })
          }
          onSpellPickChange={() => {}}
        />
      ) : null}
    </>
  );
}
