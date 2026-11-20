import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  createTranslator,
  resolveInitialLocale,
  supportedLocales,
} from "./loadLocales";

export type TranslateFn = (key: string, params?: Record<string, string | number>, fallback?: string) => string;

interface LocaleContextValue {
  locale: string;
  supportedLocales: string[];
  setLocale: (locale: string) => void;
  t: TranslateFn;
  tEntity: (catalogPrefix: string, entityKey: string, field: string, fallback?: string) => string;
  tGlossary: (category: string, sourceText: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState(resolveInitialLocale);

  const t = useMemo(() => createTranslator(locale), [locale]);

  const tEntity = useCallback(
    (catalogPrefix: string, entityKey: string, field: string, fallback?: string) =>
      t(`${catalogPrefix}.${entityKey}.${field}`, undefined, fallback),
    [t],
  );

  const tGlossary = useCallback(
    (category: string, sourceText: string) => {
      const key = `catalog.glossary.${category}.${sourceText}`;
      return t(key, undefined, sourceText);
    },
    [t],
  );

  const setLocale = useCallback((next: string) => {
    if (!(supportedLocales as readonly string[]).includes(next)) return;
    setLocaleState(next);
    localStorage.setItem(LOCALE_STORAGE_KEY, next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    const title = createTranslator(locale)("app.pageTitle", undefined, document.title);
    document.title = title;
  }, [locale]);

  const value = useMemo(
    () => ({ locale, supportedLocales: [...supportedLocales], setLocale, t, tEntity, tGlossary }),
    [locale, setLocale, t, tEntity, tGlossary],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- context + its hook belong together
export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components -- context + its hook belong together
export function useT(): TranslateFn {
  return useLocale().t;
}

// eslint-disable-next-line react-refresh/only-export-components -- re-export locale metadata for tests
export { DEFAULT_LOCALE, supportedLocales };
