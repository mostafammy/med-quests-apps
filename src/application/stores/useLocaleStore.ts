/**
 * Zustand Store: Platform UI Locale & Right-to-Left (BiDi) Synchronization
 *
 * Manages the platform's active UI locale ('en' | 'ar'), document direction ('ltr' | 'rtl'),
 * and provides type-safe dictionary access with zero-flicker DOM synchronization.
 *
 * Adheres to Constitution P4 (Zero-Friction Interaction) and P7 (Clean Architecture).
 */

import { create } from 'zustand';
import type { PlatformLocale, TextDirection, TranslationDictionary } from '../../domain/i18n/types.ts';
import { enDictionary } from '../../domain/i18n/dictionaries/en.ts';
import { arDictionary } from '../../domain/i18n/dictionaries/ar.ts';

const DICTIONARIES: Record<PlatformLocale, TranslationDictionary> = {
  en: enDictionary,
  ar: arDictionary,
};

interface LocaleState {
  locale: PlatformLocale;
  dir: TextDirection;
  isRtl: boolean;
  t: TranslationDictionary;
  setLocale: (locale: PlatformLocale) => void;
  toggleLocale: () => void;
  initLocale: () => () => void;
}

const getStoredLocale = (): PlatformLocale => {
  if (typeof window === 'undefined') return 'en';
  try {
    const stored = localStorage.getItem('mq_locale');
    if (stored === 'ar' || stored === 'en') return stored;
  } catch {}
  return 'en';
};

const applyDocumentLocale = (locale: PlatformLocale, dir: TextDirection) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('lang', locale);
  root.setAttribute('dir', dir);
};

const initialLocale = getStoredLocale();
const initialDir: TextDirection = initialLocale === 'ar' ? 'rtl' : 'ltr';

export const useLocaleStore = create<LocaleState>((set, get) => ({
  locale: initialLocale,
  dir: initialDir,
  isRtl: initialDir === 'rtl',
  t: DICTIONARIES[initialLocale],

  setLocale: (locale: PlatformLocale) => {
    const dir: TextDirection = locale === 'ar' ? 'rtl' : 'ltr';
    try {
      localStorage.setItem('mq_locale', locale);
    } catch {}

    applyDocumentLocale(locale, dir);

    set({
      locale,
      dir,
      isRtl: dir === 'rtl',
      t: DICTIONARIES[locale],
    });
  },

  toggleLocale: () => {
    const next = get().locale === 'en' ? 'ar' : 'en';
    get().setLocale(next);
  },

  initLocale: () => {
    const current = get().locale;
    const dir = current === 'ar' ? 'rtl' : 'ltr';
    applyDocumentLocale(current, dir);
    return () => {};
  },
}));
