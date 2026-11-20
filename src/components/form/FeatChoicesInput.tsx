import { useCharacter } from "../../state/CharacterContext";
import { activeFeatKeysFromCharacter } from "../../state/characterState";
import { FeatProficiencyChoices } from "./FeatProficiencyChoices";
import { FeatSpellChoices } from "./FeatSpellChoices";
import styles from "./Form.module.css";

export function FeatChoicesInput() {
  const { character, dispatch } = useCharacter();

  if (!character.featKey) return null;

  const activeFeatKeys = activeFeatKeysFromCharacter(character);

  return (
    <div className={styles.field}>
      <FeatProficiencyChoices
        featKey={character.featKey}
        proficiencyPicks={character.featChoices.proficiencyPicks}
        abilityIncreases={character.featChoices.abilityIncreases}
        damageTypePick={character.featChoices.damageTypePick}
        weaponMasteryPick={character.featChoices.weaponMasteryPick}
        idPrefix="feat"
        onPickChange={(index, pick) =>
          dispatch({ type: "SET_FEAT_PROFICIENCY_PICK", index, pick })
        }
        onAbilityIncreasesChange={(abilityIncreases) =>
          dispatch({ type: "SET_FEAT_ABILITY_INCREASES", abilityIncreases })
        }
        onDamageTypeChange={(damageType) =>
          dispatch({ type: "SET_FEAT_DAMAGE_TYPE", damageType })
        }
        onWeaponMasteryPickChange={(weaponKey) =>
          dispatch({ type: "SET_FEAT_WEAPON_MASTERY_PICK", weaponKey })
        }
      />
      <FeatSpellChoices
        featKey={character.featKey}
        choices={character.featChoices}
        activeFeatKeys={activeFeatKeys}
        idPrefix="feat"
        onSpellcastingAbilityChange={(ability) =>
          dispatch({ type: "SET_FEAT_SPELLCASTING_ABILITY", ability })
        }
        onCantripPickChange={(index, spellKey) =>
          dispatch({ type: "SET_FEAT_CANTRIP_PICK", index, spellKey })
        }
        onSpellPickChange={(index, spellKey) =>
          dispatch({ type: "SET_FEAT_SPELL_PICK", index, spellKey })
        }
      />
    </div>
  );
}
