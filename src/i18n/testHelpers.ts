import { createTranslator, getMessages } from "./loadLocales";

export const englishT = createTranslator("en");

export function englishEntityName(catalog: string, key: string | null | undefined, fallback = ""): string {
  if (!key) return fallback;
  const messages = getMessages("en");
  return messages[`${catalog}.${key}.name`] ?? fallback;
}
