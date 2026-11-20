import { FEATS, LANGUAGES, findByKey } from "../data";
import type { LanguageId } from "../data/types";
import type { Character } from "../state/characterState";
import {
  grantedLanguageKeys,
  languagePickMaxCount,
  ORIGIN_LANGUAGE_PICK_COUNT,
} from "./languageGrants";

export { ORIGIN_LANGUAGE_PICK_COUNT, languagePickMaxCount };

/** @deprecated Use languagePickMaxCount(character) for the current cap. */
export const LANGUAGE_PICK_COUNT = ORIGIN_LANGUAGE_PICK_COUNT;

const LANGUAGE_KEYS = new Set<string>(LANGUAGES.map((language) => language.key));

export function isValidLanguageKey(key: string): key is LanguageId {
  return LANGUAGE_KEYS.has(key);
}

export function canAddLanguagePick(
  character: Character,
  languageKey: LanguageId,
): boolean {
  const granted = new Set(grantedLanguageKeys(character));
  if (granted.has(languageKey)) return false;
  if (character.languagePicks.length >= languagePickMaxCount(character)) return false;
  if (character.languagePicks.includes(languageKey)) return false;
  return isValidLanguageKey(languageKey);
}

export function languageDisplayName(
  languageKey: LanguageId,
  translate: (catalog: string, key: string, field: string, fallback: string) => string,
): string {
  const language = findByKey(LANGUAGES, languageKey);
  return translate("catalog.languages", languageKey, "name", language?.name ?? languageKey);
}

export function languageGrantSourceLabel(
  grant: import("./languageGrants").LanguageGrant,
  t: (key: string) => string,
  tEntity: (catalog: string, key: string, field: string, fallback: string) => string,
): string {
  if (grant.automatic) return t("character.languageGrantCommon");
  if (grant.featKey) {
    const feat = findByKey(FEATS, grant.featKey);
    return tEntity("catalog.feats", grant.featKey, "name", feat?.name ?? grant.fallbackLabel);
  }
  if (grant.catalogEntityKey) {
    return tEntity("catalog.classes", grant.catalogEntityKey, "name", grant.fallbackLabel);
  }
  return grant.fallbackLabel;
}
