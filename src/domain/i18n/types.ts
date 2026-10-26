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
    readonly back: string;
    readonly next: string;
    readonly reset: string;
    readonly finish: string;
    readonly submit: string;
    readonly questions: string;
    readonly accuracy: string;
    readonly all: string;
    readonly enter: string;
    readonly seconds: string;
    readonly minutes: string;
    readonly exit: string;
    readonly exitSession: string;
    readonly highYield: string;
  };
  readonly nav: {
    readonly dashboard: string;
    readonly test: string;
    readonly review: string;
    readonly curriculum: string;
    readonly studio: string;
    readonly admin: string;
    readonly more: string;
    readonly activeBlockPrefix: string;
    readonly dashboardDesc: string;
    readonly testDesc: string;
    readonly reviewDesc: string;
    readonly curriculumDesc: string;
    readonly studioDesc: string;
    readonly adminDesc: string;
  };
  readonly copilot: {
    readonly title: string;
    readonly subtitle: string;
    readonly toggleAria: string;
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
      readonly usmleTermsPreserved: string;
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
  readonly dashboard: {
    readonly badgeExamPrep: string;
    readonly engineBadge: string;
    readonly title: string;
    readonly subtitle: string;
    readonly resetBtn: string;
    readonly mockExamBtn: string;
    readonly continuePractice: string;
    readonly startPractice: string;
    readonly resetModalTitle: string;
    readonly resetModalDesc: string;
    readonly resetConfirmBtn: string;
    readonly resetCancelBtn: string;
    readonly resetting: string;
    readonly overallAccuracy: string;
    readonly accuracySub: string;
    readonly masteryScore: string;
    readonly masterySub: string;
    readonly weakTopics: string;
    readonly weakTopicsSub: string;
    readonly dueReviews: string;
    readonly dueReviewsSub: string;
    readonly quickLaunchTitle: string;
    readonly quickLaunchSub: string;
    readonly mockExamCardTitle: string;
    readonly mockExamCardDesc: string;
    readonly mockExamBadge: string;
    readonly weaknessCardTitle: string;
    readonly weaknessCardDesc: string;
    readonly weaknessBadge: string;
    readonly curriculumCardTitle: string;
    readonly curriculumCardDesc: string;
    readonly curriculumBadge: string;
    readonly taxonomyBreakdownTitle: string;
    readonly taxonomyBreakdownSub: string;
    readonly subjects: {
      readonly anatomy: string;
      readonly histology: string;
      readonly microbiology: string;
      readonly physiology: string;
    };
  };
  readonly test: {
    readonly hubTitle: string;
    readonly hubSubtitle: string;
    readonly practiceMode: string;
    readonly practiceModeDesc: string;
    readonly mockMode: string;
    readonly mockModeDesc: string;
    readonly rapidMode: string;
    readonly rapidModeDesc: string;
    readonly highYieldScope: string;
    readonly curriculumScope: string;
    readonly scopeSubtitle: string;
    readonly filterSubject: string;
    readonly filterChapter: string;
    readonly allSubjects: string;
    readonly allChapters: string;
    readonly questionCount: string;
    readonly highYieldOnly: string;
    readonly highYieldSub: string;
    readonly timedSprint: string;
    readonly timedSprintSub: string;
    readonly matchingQuestions: string;
    readonly launchPractice: string;
    readonly launchMock: string;
    readonly launchRapid: string;
    readonly quickPractice: {
      readonly title: string;
      readonly subtitle: string;
      readonly immediateFeedback: string;
      readonly subjectScope: string;
      readonly targetChapter: string;
      readonly launchBtn: string;
    };
    readonly mockSetup: {
      readonly title: string;
      readonly subtitle: string;
      readonly length: string;
      readonly lengthSub: string;
      readonly duration: string;
      readonly durationSub: string;
      readonly mode: string;
      readonly modeSub: string;
      readonly rulesTitle: string;
      readonly rule1: string;
      readonly rule2: string;
      readonly rule3: string;
      readonly rule4: string;
      readonly startBtn: string;
    };
    readonly player: {
      readonly questionOf: string;
      readonly pacingTarget: string;
      readonly complete: string;
      readonly correctAnswer: string;
      readonly incorrectChoice: string;
      readonly keyOption: string;
      readonly press: string;
      readonly toFinish: string;
      readonly forNextQuestion: string;
      readonly explanationTitle: string;
      readonly examTipTitle: string;
      readonly curriculumRefTitle: string;
      readonly answerShortcut: string;
      readonly navigateShortcut: string;
      readonly submitExam: string;
      readonly finishResults: string;
      readonly next: string;
      readonly flagQuestion: string;
      readonly flagged: string;
      readonly bookmarkQuestion: string;
      readonly bookmarked: string;
      readonly questionMatrixShortcut: string;
      readonly keyShortcut: string;
      readonly yourAnswerCorrect: string;
      readonly yourChoiceIncorrect: string;
      readonly correctAnswerKey: string;
    };
    readonly matrix: {
      readonly title: string;
      readonly subtitle: string;
      readonly tabAll: string;
      readonly tabUnanswered: string;
      readonly tabAnswered: string;
      readonly tabFlagged: string;
      readonly legendCurrent: string;
      readonly legendCorrect: string;
      readonly legendIncorrect: string;
      readonly progress: string;
      readonly close: string;
    };
    readonly strip: {
      readonly overviewGrid: string;
      readonly answered: string;
      readonly flagged: string;
    };
  };
  readonly review: {
    readonly badge: string;
    readonly title: string;
    readonly subtitle: string;
    readonly retestMistakesBtn: string;
    readonly tabWeak: string;
    readonly tabMistakes: string;
    readonly noMistakesTitle: string;
    readonly noMistakesDesc: string;
    readonly noWeakTitle: string;
    readonly noWeakDesc: string;
    readonly attemptsCount: string;
    readonly accuracyPercent: string;
    readonly notAttempted: string;
    readonly startTopicPractice: string;
  };
  readonly curriculum: {
    readonly badge: string;
    readonly title: string;
    readonly subtitle: string;
    readonly launchPractice: string;
    readonly pages: string;
    readonly slides: string;
    readonly lectures: string;
  };
  readonly studio: {
    readonly badge: string;
    readonly title: string;
    readonly subtitle: string;
    readonly selectSubject: string;
    readonly selectChapter: string;
    readonly promptCardTitle: string;
    readonly promptCardSub: string;
    readonly copyPrompt: string;
    readonly promptCopied: string;
    readonly ingestCardTitle: string;
    readonly ingestCardSub: string;
    readonly placeholderJson: string;
    readonly ingestBtn: string;
    readonly exportBtn: string;
    readonly clearBtn: string;
    readonly resetToGlobalBtn: string;
    readonly resetConfirmDialog: string;
    readonly resetSuccessToast: string;
    readonly totalQuestions: string;
    readonly validationSuccess: string;
  };
  readonly bank: {
    readonly title: string;
    readonly resetToGlobalBtn: string;
    readonly resetConfirmTitle: string;
    readonly resetConfirmDialog: string;
    readonly resetSuccessToast: string;
    readonly resetDescription: string;
    readonly resetPreservedLabel: string;
    readonly resetFailed: string;
    readonly syncNowBtn: string;
    readonly syncWarning: string;
    readonly checkUpdatesBtn: string;
    readonly reviewChangesBtn: string;
    readonly syncing: string;
    readonly syncedBadge: string;
    readonly edgeVerified: string;
    readonly activeCanonicalCount: string;
    readonly syncCenter: {
      readonly title: string;
      readonly statusTitle: string;
      readonly officialBank: string;
      readonly blockTitle: string;
      readonly edgeStatus: string;
      readonly deltaLabel: string;
      readonly fetching: string;
      readonly computing: string;
      readonly applying: string;
      readonly resetting: string;
      readonly updateAvailableTitle: string;
      readonly upToDateTitle: string;
      readonly localRetainedTitle: string;
      readonly offlineWarning: string;
      readonly synchronizedTitle: string;
      readonly fetchingBadge: string;
      readonly updateAvailableBadge: string;
      readonly localRetainedBadge: string;
      readonly upToDateBadge: string;
      readonly localLabel: string;
      readonly globalLabel: string;
      readonly questionsShort: string;
      readonly canonicalShort: string;
      readonly checkingEdge: string;
      readonly addedTab: string;
      readonly addedBadge: string;
      readonly editedTab: string;
      readonly editedBadge: string;
      readonly deletedTab: string;
      readonly deletedBadge: string;
      readonly preservedTab: string;
      readonly preservedBadge: string;
      readonly changesDetected: string;
      readonly chooseMerge: string;
      readonly leaveAsIs: string;
      readonly merge: string;
      readonly reviewUpdate: string;
      readonly syncedToast: string;
      readonly inspect: string;
      readonly noItems: string;
      readonly matches: string;
      readonly changedFields: string;
      readonly previousVersion: string;
      readonly newVersion: string;
      readonly addedItemBadge: string;
      readonly editedItemBadge: string;
      readonly deletedItemBadge: string;
      readonly preservedItemBadge: string;
      readonly localRetainedNotice: string;
    };
  };
  readonly postTest: {
    readonly title: string;
    readonly subtitle: string;
    readonly scorePercent: string;
    readonly totalAnswered: string;
    readonly correctCount: string;
    readonly incorrectCount: string;
    readonly unansweredCount: string;
    readonly avgPacing: string;
    readonly secondsPerQ: string;
    readonly retestMistakesBtn: string;
    readonly backToDashboardBtn: string;
    readonly breakdownTitle: string;
    readonly breakdownSub: string;
  };
}
