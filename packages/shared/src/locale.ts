import { DEFAULT_LOCALE, FALLBACK_LOCALE, RTL_LOCALES } from './constants.js';
import type { LocaleInfo, TextDirection } from './types.js';

const rtlLanguages = new Set<string>(RTL_LOCALES);

export function normalizeLocale(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = String(raw).trim().replace(/_/g, '-');
  if (!cleaned) return null;
  try {
    const [canonical] = Intl.getCanonicalLocales(cleaned);
    return canonical ?? null;
  } catch {
    return null;
  }
}

export function baseLanguage(locale: string | null | undefined): string {
  return normalizeLocale(locale)?.split('-')[0]?.toLowerCase() ?? '';
}

export function isRtlLocale(locale: string | null | undefined): boolean {
  return rtlLanguages.has(baseLanguage(locale));
}

export function directionFor(locale: string | null | undefined): TextDirection {
  return isRtlLocale(locale) ? 'rtl' : 'ltr';
}

export function resolveLocale(
  raw: string | null | undefined,
  available: readonly string[],
  fallback: string = DEFAULT_LOCALE,
): string {
  const normalized = normalizeLocale(raw);
  const fallbackMatch = available.find((locale) => locale.toLowerCase() === fallback.toLowerCase());
  const safeFallback = fallbackMatch ?? available[0] ?? fallback;

  if (!normalized) return safeFallback;

  const exact = available.find((locale) => locale.toLowerCase() === normalized.toLowerCase());
  if (exact) return exact;

  const [language, region] = normalized.split('-');
  const sameLanguage = available.filter((locale) => baseLanguage(locale) === language.toLowerCase());
  if (sameLanguage.length > 0) {
    if (region) {
      const sameRegion = sameLanguage.find((locale) =>
        locale.toLowerCase().endsWith(`-${region.toLowerCase()}`),
      );
      if (sameRegion) return sameRegion;
    }
    return sameLanguage[0]!;
  }

  return safeFallback;
}

export function localeDisplayName(locale: string, displayLocale: string = locale): string {
  const normalized = normalizeLocale(locale) ?? locale;
  const display = normalizeLocale(displayLocale) ?? displayLocale;
  try {
    const names = new Intl.DisplayNames([display], { type: 'language' });
    return names.of(normalized) ?? normalized;
  } catch {
    return normalized;
  }
}

export function localeInfo(code: string): LocaleInfo {
  const normalized = normalizeLocale(code) ?? code;
  return {
    code: normalized,
    name: localeDisplayName(normalized, 'en-US'),
    nativeName: localeDisplayName(normalized, normalized),
    dir: directionFor(normalized),
  };
}

export function formatNumber(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions,
): string {
  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch {
    return String(value);
  }
}

export function compareLocales(a: LocaleInfo, b: LocaleInfo, displayLocale: string): number {
  try {
    return new Intl.Collator(displayLocale).compare(a.nativeName, b.nativeName);
  } catch {
    return a.code.localeCompare(b.code);
  }
}
