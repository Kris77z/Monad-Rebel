'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { LanguageCode } from '@/types/agent';
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  getBrowserLocale,
  normalizeLocale,
  translate,
} from '@/lib/i18n';

interface LocaleContextValue {
  locale: LanguageCode;
  hydrated: boolean;
  setLocale: (locale: LanguageCode) => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function resolveInitialLocale(): LanguageCode {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  return normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY) ?? getBrowserLocale());
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LanguageCode>(DEFAULT_LOCALE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLocaleState(resolveInitialLocale());
    setHydrated(true);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }, [locale]);

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    hydrated,
    setLocale: setLocaleState,
    t: (key, variables) => translate(locale, key, variables),
  }), [hydrated, locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useI18n must be used within LocaleProvider');
  }
  return context;
}
