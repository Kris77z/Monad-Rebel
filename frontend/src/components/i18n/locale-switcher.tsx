'use client';

import { useI18n } from './locale-provider';
import { SUPPORTED_LOCALES } from '@/lib/i18n';

export function LocaleSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="inline-flex items-center rounded-full border border-border bg-background/70 p-0.5 text-[10px]">
      {SUPPORTED_LOCALES.map((option) => {
        const active = option === locale;
        return (
          <button
            key={option}
            type="button"
            onClick={() => setLocale(option)}
            className={`rounded-full px-2 py-1 transition-colors ${
              active
                ? 'bg-warm-900 text-warm-100'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t(`locale.${option}`)}
          </button>
        );
      })}
    </div>
  );
}
