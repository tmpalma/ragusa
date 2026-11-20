import { FEATS } from "../../data";
import { classHasFeatGrantAtLevel } from "../../domain/classGrantedFeats";
import { evaluateFeatPrerequisites } from "../../domain/featPrerequisites";
import { featGrantSpellsEffect } from "../../domain/featEffects";
import { classGrantedFeatPickerOptions } from "../../domain/featSlots";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { activeFeatKeysFromCharacter } from "../../state/characterState";
import { FeatCappedPickList } from "./FeatCappedPickList";
import { FeatProficiencyChoices } from "./FeatProficiencyChoices";
import { FeatSpellChoices } from "./FeatSpellChoices";
import styles from "./Form.module.css";

export function ClassGrantedFeatInputAtLevel({ level }: { level: number }) {
  const { character, derived, dispatch } = useCharacter();
  const { t } = useLocale();

  if (!derived.classData || !classHasFeatGrantAtLevel(derived.classData, level)) return null;

  const selectedFeatKey = character.classGrantedFeats[level] ?? null;
  const featChoices = character.classGrantedFeatChoices[level] ?? {
    proficiencyPicks: [],
    abilityIncreases: {},
    spellcastingAbility: null,
    cantripPicks: [],
    spellPicks: [],
    damageTypePick: null,
    weaponMasteryPick: null,
  };
  const activeFeatKeys = activeFeatKeysFromCharacter(character);
  const grantEffect = selectedFeatKey ? featGrantSpellsEffect(selectedFeatKey) : null;

  const prerequisiteResult = selectedFeatKey
    ? evaluateFeatPrerequisites(selectedFeatKey, character, derived.classData)
    : { met: true, unmet: [] };

  const options = classGrantedFeatPickerOptions(
    FEATS,
    character,
    level,
    (featKey) => evaluateFeatPrerequisites(featKey, character, derived.classData).met,
  );

  return (
    <>
      <FeatCappedPickList
        id={`class-granted-feat-level-${level}`}
        groupLabel={t("character.classGrantedFeat")}
        comboboxLabel={t("character.feat")}
        value={selectedFeatKey}
        onChange={(key) => dispatch({ type: "SET_CLASS_GRANTED_FEAT", level, key })}
        feats={options}
        placeholder={t("character.choosePlaceholder")}
      />

      {selectedFeatKey ? (
        <>
          {!prerequisiteResult.met ? (
            <p className={styles.warning} role="status">
              {t("character.featPrerequisiteWarning")}
            </p>
          ) : null}
          <FeatProficiencyChoices
            featKey={selectedFeatKey}
            proficiencyPicks={featChoices.proficiencyPicks}
            abilityIncreases={featChoices.abilityIncreases}
            damageTypePick={featChoices.damageTypePick}
            weaponMasteryPick={featChoices.weaponMasteryPick}
            idPrefix={`class-granted-feat-${level}`}
            onPickChange={(pickIndex, pick) =>
              dispatch({ type: "SET_CLASS_GRANTED_FEAT_PROFICIENCY_PICK", level, pickIndex, pick })
            }
            onAbilityIncreasesChange={(abilityIncreases) =>
              dispatch({ type: "SET_CLASS_GRANTED_FEAT_ABILITY_INCREASES", level, abilityIncreases })
            }
            onDamageTypeChange={(damageType) =>
              dispatch({ type: "SET_CLASS_GRANTED_FEAT_DAMAGE_TYPE", level, damageType })
            }
            onWeaponMasteryPickChange={(weaponKey) =>
              dispatch({ type: "SET_CLASS_GRANTED_FEAT_WEAPON_MASTERY_PICK", level, weaponKey })
            }
          />
          {grantEffect ? (
            <FeatSpellChoices
              featKey={selectedFeatKey}
              choices={featChoices}
              activeFeatKeys={activeFeatKeys}
              idPrefix={`class-granted-feat-${level}`}
              onSpellcastingAbilityChange={(ability) =>
                dispatch({ type: "SET_CLASS_GRANTED_FEAT_SPELLCASTING_ABILITY", level, ability })
              }
              onCantripPickChange={(pickIndex, spellKey) =>
                dispatch({ type: "SET_CLASS_GRANTED_FEAT_CANTRIP_PICK", level, pickIndex, spellKey })
              }
              onSpellPickChange={(pickIndex, spellKey) =>
                dispatch({ type: "SET_CLASS_GRANTED_FEAT_SPELL_PICK", level, pickIndex, spellKey })
              }
            />
          ) : null}
        </>
      ) : null}
    </>
  );
}
