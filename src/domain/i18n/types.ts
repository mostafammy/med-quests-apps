/**
 * Pure Domain Types for Internationalization (i18n) & Right-to-Left (BiDi)
 * Adheres to Constitution P6 (Strict TypeScript, Zero `any`, Zod Boundaries)
 * and P7 (Clean Architecture: Domain has zero browser/React dependencies).
 */

import { z } from 'zod';

// ============================================================================
// 1. Platform UI Locale & Directionality
// ============================================================================

export const PlatformLocaleSchema = z.enum(['en', 'ar']);
export type PlatformLocale = z.infer<typeof PlatformLocaleSchema>;

export type TextDirection = 'ltr' | 'rtl';

export interface LocaleMetadata {
  readonly code: PlatformLocale;
  readonly nativeName: string; // 'English' | 'العربية'
  readonly englishName: string; // 'English' | 'Arabic'
  readonly direction: TextDirection;
  readonly fontFamilyVar: string;
}

export const SUPPORTED_LOCALES: Record<PlatformLocale, LocaleMetadata> = {
  en: {
    code: 'en',
    nativeName: 'English',
    englishName: 'English',
    direction: 'ltr',
    fontFamilyVar: 'var(--font-sans)',
  },
  ar: {
    code: 'ar',
    nativeName: 'العربية',
    englishName: 'Arabic',
    direction: 'rtl',
    fontFamilyVar: 'var(--font-arabic)',
  },
};

// ============================================================================
// 2. AI Chat-Scoped Language Preference & Resolution Contracts
// ============================================================================

/**
 * User's preferred language for the AI Cognitive Co-Pilot in Chat ONLY.
 * - 'auto': Mirrors the language of the student's chat message automatically (default).
 * - 'en': Always respond in English (USMLE standard clinical English).
 * - 'ar': Always respond in Arabic (Modern Standard Medical Arabic with English
 *         canonical USMLE terms preserved in parentheses).
 */
export const AiChatLanguagePreferenceSchema = z.enum(['auto', 'en', 'ar']);
export type AiChatLanguagePreference = z.infer<typeof AiChatLanguagePreferenceSchema>;

export type ResolvedChatLanguage = 'en' | 'ar';

export interface ResolvedChatLanguageContext {
  readonly preference: AiChatLanguagePreference;
  readonly resolvedLanguage: ResolvedChatLanguage;
  readonly direction: TextDirection;
  readonly detectedInputScript: 'en' | 'ar' | 'mixed';
  readonly preserveEnglishMedicalTerms: boolean;
}

// ============================================================================
// 3. Compile-Time Type-Safe Translation Dictionary Contract (LSP)
// ============================================================================

export interface TranslationDictionary {
  readonly common: {
    readonly appName: string;
    readonly examPrepBadge: string;
    readonly saveAndApply: string;
    readonly saved: string;
    readonly cancel: string;
    readonly close: string;
    readonly loading: string;
    readonly languageLabel: string;
    readonly languageToggleAria: string;
  };
  readonly nav: {
    readonly dashboard: string;
    readonly test: string;
    readonly review: string;
    readonly curriculum: string;
    readonly studio: string;
    readonly admin: string;
    readonly activeBlockPrefix: string;
  };
  readonly copilot: {
    readonly title: string;
    readonly subtitle: string;
    readonly emptyTitle: string;
    readonly emptyDescription: string;
    readonly inputPlaceholder: string;
    readonly inputStreamingPlaceholder: string;
    readonly reasoningBadge: string;
    readonly clearConversation: string;
    readonly stopGeneration: string;
    readonly sendMessage: string;
    readonly expandWidth: string;
    readonly collapseWidth: string;
    readonly closeCopilot: string;
    readonly chatLanguagePillTooltip: string;
    readonly starterPrompts: readonly [string, string, string];
    readonly diagnostics: {
      readonly analyzingVignette: string;
      readonly readingTelemetry: string;
      readonly evaluatingBias: string;
      readonly runningGeneric: string;
    };
    readonly settings: {
      readonly modalTitle: string;
      readonly modalSubtitle: string;
      readonly chatLanguageLabel: string;
      readonly chatLanguageSubtext: string;
      readonly langAuto: string;
      readonly langAutoDesc: string;
      readonly langEnglish: string;
      readonly langEnglishDesc: string;
      readonly langArabic: string;
      readonly langArabicDesc: string;
      readonly chooseModelLabel: string;
      readonly advancedCustomModel: string;
      readonly persistedNotice: string;
    };
  };
}
