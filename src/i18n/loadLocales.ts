import { interpolate } from "./parseMessages";
import { getInstalledCatalogMessages } from "./catalogMessages";

export const DEFAULT_LOCALE = "en";
export const LOCALE_STORAGE_KEY = "rpg-dm-locale";

/** Locales with rows in catalog_strings (UI + catalog copy). */
export const supportedLocales = ["en", "pt-BR"] as const;

export type MessageCatalog = Record<string, string>;

export interface LocaleBundle {
  locale: string;
  messages: MessageCatalog;
}

export function getMessages(locale: string): MessageCatalog {
  return getInstalledCatalogMessages(locale);
}

export function resolveInitialLocale(): string {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored && supportedLocales.includes(stored as (typeof supportedLocales)[number])) return stored;

  const browser = navigator.language;
  if (supportedLocales.includes(browser as (typeof supportedLocales)[number])) return browser;

  const prefix = browser.split("-")[0];
  const prefixMatch = supportedLocales.find((entry) => entry === prefix || entry.startsWith(`${prefix}-`));
  if (prefixMatch) return prefixMatch;

  return DEFAULT_LOCALE;
}

export function createTranslator(
  locale: string,
  fallbackLocale: string = DEFAULT_LOCALE,
): (key: string, params?: Record<string, string | number>, fallback?: string) => string {
  return (key, params, explicitFallback) => {
    const primary = getMessages(locale);
    const fallback = locale === fallbackLocale ? primary : getMessages(fallbackLocale);
    const template = primary[key] ?? fallback[key] ?? explicitFallback ?? key;
    return interpolate(template, params);
  };
}
