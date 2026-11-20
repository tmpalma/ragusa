import { LANGUAGES } from "../../data";
import type { LanguageId } from "../../data/types";
import {
  automaticLanguageGrants,
  grantedLanguageKeys,
  languagePickMaxCount,
} from "../../domain/languageGrants";
import {
  languageDisplayName,
  languageGrantSourceLabel,
} from "../../domain/languagePicks";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import { CappedPickList } from "./CappedPickList";
import styles from "./Form.module.css";

export function LanguagesInput() {
  const { character, dispatch } = useCharacter();
  const { t, tEntity } = useLocale();

  const granted = automaticLanguageGrants(character);
  const grantedKeys = new Set(grantedLanguageKeys(character));
  const maxCount = languagePickMaxCount(character);
  const picked = new Set(character.languagePicks);
  const remainingOptions = LANGUAGES.filter(
    (language) => !picked.has(language.key) && !grantedKeys.has(language.key),
  )
    .sort((left, right) => {
      if (left.category !== right.category) {
        return left.category === "common" ? -1 : 1;
      }
      return left.name.localeCompare(right.name);
    })
    .map((language) => ({
      key: language.key,
      label: languageDisplayName(language.key, tEntity),
      group: t(`character.languageGroup.${language.category}`),
    }));

  return (
    <div className={styles.field}>
      {granted.length > 0 && (
        <>
          <span className={styles.groupLabel}>{t("character.languagesGranted")}</span>
          <ul className={styles.itemList}>
            {granted.map((grant) => (
              <li key={grant.languageKey}>
                <div className={styles.itemListMain}>
                  <span className={styles.itemListName}>{languageDisplayName(grant.languageKey, tEntity)}</span>
                  <span className={styles.hint}>{languageGrantSourceLabel(grant, t, tEntity)}</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <CappedPickList
        id="language-select"
        groupLabel={t("character.languagesChoose", {
          count: character.languagePicks.length,
          max: maxCount,
        })}
        comboboxLabel={t("character.languagePick")}
        options={remainingOptions}
        selectedKeys={character.languagePicks}
        maxCount={maxCount}
        onAdd={(languageKey) => dispatch({ type: "ADD_LANGUAGE_PICK", languageKey })}
        onRemove={(languageKey) => dispatch({ type: "REMOVE_LANGUAGE_PICK", languageKey })}
        renderSelected={(languageKey) => languageDisplayName(languageKey as LanguageId, tEntity)}
      />
    </div>
  );
}
