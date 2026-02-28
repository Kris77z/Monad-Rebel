import type { LanguageCode } from "./types.js";

export function isChineseLocale(locale: LanguageCode): boolean {
  return locale === "zh-CN";
}

export function getOutputLanguageLabel(locale: LanguageCode): string {
  return isChineseLocale(locale) ? "Simplified Chinese" : "English";
}

export function localizeByLocale<T>(locale: LanguageCode, variants: { en: T; zh: T }): T {
  return isChineseLocale(locale) ? variants.zh : variants.en;
}

export function buildOutputLanguageInstruction(input: {
  locale: LanguageCode;
  outputType?: "text" | "json";
}): string {
  const { locale, outputType = "text" } = input;
  if (outputType === "json") {
    return localizeByLocale(locale, {
      en:
        "Return valid JSON only. Keep JSON keys and schema field names exactly as required. Human-readable string values must be in English.",
      zh:
        "Return valid JSON only. Keep JSON keys and schema field names exactly as required. Do not translate keys. Human-readable string values must be in Simplified Chinese."
    });
  }

  return localizeByLocale(locale, {
    en: "Respond entirely in English.",
    zh: "Respond entirely in Simplified Chinese."
  });
}
