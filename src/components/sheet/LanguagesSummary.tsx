import { allKnownLanguages } from "../../domain/languageGrants";
import { languageDisplayName } from "../../domain/languagePicks";
import { useLocale } from "../../i18n/LocaleContext";
import { useCharacter } from "../../state/CharacterContext";
import styles from "./Sheet.module.css";

export function LanguagesSummary() {
  const { character } = useCharacter();
  const { t, tEntity } = useLocale();

  const languages = allKnownLanguages(character);
  if (languages.length === 0) return null;

  return (
    <section className={styles.section}>
      <h3>{t("sheet.languages")}</h3>
      <ul>
        {languages.map((languageKey) => (
          <li key={languageKey}>{languageDisplayName(languageKey, tEntity)}</li>
        ))}
      </ul>
    </section>
  );
}
