import { FEATS } from "../../data";
import { HUMAN_VERSATILE_FEAT_KEY, originFeats } from "../../domain/featEffects";
import { evaluateFeatPrerequisites } from "../../domain/featPrerequisites";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { activeFeatKeysFromCharacter } from "../../state/characterState";
import { FeatCappedPickList } from "./FeatCappedPickList";
import { FeatProficiencyChoices } from "./FeatProficiencyChoices";
import { FeatSpellChoices } from "./FeatSpellChoices";
import styles from "./Form.module.css";

const ORIGIN_FEATS = originFeats(FEATS);

export function HumanVersatileFeatInput() {
  const { character, dispatch, derived } = useCharacter();
  const { t, tEntity } = useLocale();

  if (character.speciesKey !== "human") return null;

  const extraFeatKey = character.extraFeats[0] ?? null;
  const extraFeatChoices = character.extraFeatChoices[0] ?? {
    proficiencyPicks: [],
    abilityIncreases: {},
    spellcastingAbility: null,
    cantripPicks: [],
    spellPicks: [],
    damageTypePick: null,
    weaponMasteryPick: null,
  };

  const prerequisiteResult = extraFeatKey
    ? evaluateFeatPrerequisites(extraFeatKey, character, derived.classData)
    : { met: true, unmet: [] };

  const takenFeatKeys = new Set(character.featKey ? [character.featKey] : []);
  const activeFeatKeys = activeFeatKeysFromCharacter(character);
  const selectableFeats = ORIGIN_FEATS.filter((feat) => !takenFeatKeys.has(feat.key));

  return (
    <>
      <FeatCappedPickList
        id="human-versatile-feat-select"
        groupLabel={t("character.humanVersatileFeat")}
        comboboxLabel={t("character.feat")}
        value={extraFeatKey}
        onChange={(key) => dispatch({ type: "SET_EXTRA_FEAT", key })}
        feats={selectableFeats}
        showCategoryFilter={false}
        labelForFeat={(feat) => {
          const name = tEntity("catalog.feats", feat.key, "name", feat.name);
          return feat.key === HUMAN_VERSATILE_FEAT_KEY ? t("character.suggestedFeat", { name }) : name;
        }}
        placeholder={t("character.choosePlaceholder")}
      />

      {extraFeatKey ? (
        <>
          {!prerequisiteResult.met ? (
            <p className={styles.warning} role="status">
              {t("character.featPrerequisiteWarning")}
            </p>
          ) : null}
          <FeatProficiencyChoices
            featKey={extraFeatKey}
            proficiencyPicks={extraFeatChoices.proficiencyPicks}
            abilityIncreases={extraFeatChoices.abilityIncreases}
            damageTypePick={extraFeatChoices.damageTypePick}
            weaponMasteryPick={extraFeatChoices.weaponMasteryPick}
            idPrefix="human-versatile-feat"
            onPickChange={(index, pick) =>
              dispatch({ type: "SET_EXTRA_FEAT_PROFICIENCY_PICK", featIndex: 0, pickIndex: index, pick })
            }
            onAbilityIncreasesChange={(abilityIncreases) =>
              dispatch({ type: "SET_EXTRA_FEAT_ABILITY_INCREASES", featIndex: 0, abilityIncreases })
            }
            onDamageTypeChange={(damageType) =>
              dispatch({ type: "SET_EXTRA_FEAT_DAMAGE_TYPE", featIndex: 0, damageType })
            }
            onWeaponMasteryPickChange={(weaponKey) =>
              dispatch({ type: "SET_EXTRA_FEAT_WEAPON_MASTERY_PICK", featIndex: 0, weaponKey })
            }
          />
          <FeatSpellChoices
            featKey={extraFeatKey}
            choices={extraFeatChoices}
            activeFeatKeys={activeFeatKeys}
            idPrefix="human-versatile-feat"
            onSpellcastingAbilityChange={(ability) =>
              dispatch({ type: "SET_EXTRA_FEAT_SPELLCASTING_ABILITY", featIndex: 0, ability })
            }
            onCantripPickChange={(index, spellKey) =>
              dispatch({ type: "SET_EXTRA_FEAT_CANTRIP_PICK", featIndex: 0, pickIndex: index, spellKey })
            }
            onSpellPickChange={(index, spellKey) =>
              dispatch({ type: "SET_EXTRA_FEAT_SPELL_PICK", featIndex: 0, pickIndex: index, spellKey })
            }
          />
        </>
      ) : null}
    </>
  );
}
