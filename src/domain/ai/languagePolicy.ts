/**
 * ChatLanguagePolicy (Pure Domain Strategy)
 *
 * Implements the Strategy Pattern to resolve the effective language context for an AI chat turn,
 * and compiles the chat-scoped prompt directive for SystemPromptBuilder.
 *
 * Adheres to Constitution P6 (Strict TypeScript) and P7 (Clean Architecture: Zero React/browser dependencies).
 */

import { ScriptDirectionDetector } from '../i18n/scriptDetector.ts';
import type {
  AiChatLanguagePreference,
  ResolvedChatLanguage,
  ResolvedChatLanguageContext,
} from '../i18n/types.ts';

export class ChatLanguagePolicy {
  /**
   * Resolves the effective language context for an individual chat turn.
   *
   * Resolution Strategy:
   * 1. 'ar': Always resolve to Arabic.
   * 2. 'en': Always resolve to English.
   * 3. 'auto': Dynamically inspect the incoming user message using Unicode script detection.
   *    If the student types Arabic (even with embedded English terms), resolve to Arabic.
   *    If no user message is present or script is Latin, default to fallbackLocale (default: 'en').
   */
  public static resolveChatLanguageContext(
    preference: AiChatLanguagePreference = 'auto',
    userMessage: string = '',
    fallbackLocale: ResolvedChatLanguage = 'en'
  ): ResolvedChatLanguageContext {
    let resolvedLanguage: ResolvedChatLanguage;

    const detectedScript = ScriptDirectionDetector.detectScriptComposition(userMessage);

    switch (preference) {
      case 'ar':
        resolvedLanguage = 'ar';
        break;
      case 'en':
        resolvedLanguage = 'en';
        break;
      case 'auto':
      default: {
        if (!userMessage || !userMessage.trim()) {
          resolvedLanguage = fallbackLocale;
        } else {
          resolvedLanguage = ScriptDirectionDetector.detectDominantLanguage(userMessage);
        }
        break;
      }
    }

    return {
      preference,
      resolvedLanguage,
      direction: resolvedLanguage === 'ar' ? 'rtl' : 'ltr',
      detectedInputScript: detectedScript,
      preserveEnglishMedicalTerms: true,
    };
  }

  /**
   * Compiles the high-authority Medical Faculty Chat Language Directive for SystemPromptBuilder.
   *
   * CRITICAL ARCHITECTURAL BOUNDARY:
   * Informs the model how to formulate its conversational response prose, while strictly
   * enforcing that all tool invocations and JSON schemas remain in canonical English.
   */
  public static buildChatLanguageDirective(context: ResolvedChatLanguageContext): string {
    if (context.resolvedLanguage === 'ar') {
      return (
        `CHAT RESPONSE LANGUAGE & BILINGUAL MEDICAL TERMINOLOGY DIRECTIVE:\n` +
        `1. PROSE LANGUAGE: You MUST synthesize your conversational response in clear, authoritative, high-yield Modern Standard Medical Arabic (اللغة العربية الفصحى الطبية السليمة).\n` +
        `2. CANONICAL USMLE MEDICAL TERMS: Because the student is preparing for USMLE / International Cardiovascular Board exams, you MUST ALWAYS include canonical English medical terms, diagnoses, anatomic structures, and hemodynamic variables in parentheses next to their Arabic translation.\n` +
        `   * Canonical Examples:\n` +
        `     - "تضيق الصمام الأبهري (Aortic Stenosis) يؤدي إلى زيادة الحمل البعدي (Afterload)..."\n` +
        `     - "النفخة الانقباضية القذفية (Systolic Ejection Murmur) التي تشع للشرايين السباتية (Carotid Radiation)..."\n` +
        `     - "نتاج القلب (Cardiac Output - CO) والضغط الشرياني الوسطي (MAP)..."\n` +
        `3. EXAM CHOICE REFERENCES: Always refer to question options using their English letters: Option A, Option B, Option C, Option D, Option E (e.g. "الخيار Option B خاطئ لأن...").\n` +
        `4. STRICT TOOL CALLING PROTOCOL (MACHINE-TO-MACHINE CONTRACT):\n` +
        `   * When calling ANY of the 9 autonomous tools (simulate_hemodynamic_pv_loop, calculate_cardiovascular_equation, etc.), ALL tool names, parameter keys, and enum values MUST REMAIN IN CANONICAL ENGLISH.\n` +
        `   * NEVER translate tool parameters or function names to Arabic (e.g. always use lesion: "aortic_stenosis", state: "acute").\n` +
        `5. STRUCTURED CALLOUT HEADERS: Format high-yield takeaways using recognized headers (e.g. "**قاعدة الاختبار (BOARD EXAM RULE):**", "**مرساة الذاكرة (MEMORY ANCHOR):**", "**فخ الخيارات المضللة (DISTRACTOR TRAP):**").`
      );
    }

    return (
      `CHAT RESPONSE LANGUAGE DIRECTIVE:\n` +
      `Respond in concise, authoritative, high-yield USMLE Clinical English.\n` +
      `Focus on first-principles pathophysiology and definitive clinical pivot findings.`
    );
  }
}
