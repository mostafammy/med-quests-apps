/**
 * ScriptDirectionDetector (Pure Domain Service)
 *
 * Ultra-fast (< 0.1ms), zero-dependency Unicode script and BiDi direction analyzer.
 * Uses standard Unicode character ranges to classify text for optimal typographic rendering
 * and AI conversational language routing.
 */

import type { TextDirection } from './types.ts';

// Unicode Regex for Arabic script (Arabic, Supplement, Extended-A, Presentation Forms A & B)
const ARABIC_SCRIPT_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;

// Latin and common Western script
const LATIN_SCRIPT_REGEX = /[A-Za-z]/g;

export class ScriptDirectionDetector {
  /**
   * Checks whether the string contains any Arabic script characters.
   */
  public static containsArabic(text: string): boolean {
    if (!text) return false;
    // Reset regex index state by using test with a fresh regex or test directly
    return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
  }

  /**
   * Resolves the dominant language ('ar' or 'en') based on character frequency ratio.
   * If Arabic characters make up 25% or more of letters, it is resolved as 'ar'
   * (accommodating clinical questions where student writes Arabic with English terms).
   */
  public static detectDominantLanguage(text: string): 'ar' | 'en' {
    if (!text || !text.trim()) return 'en';

    const arabicMatches = text.match(ARABIC_SCRIPT_REGEX);
    const latinMatches = text.match(LATIN_SCRIPT_REGEX);

    const arabicCount = arabicMatches ? arabicMatches.length : 0;
    const latinCount = latinMatches ? latinMatches.length : 0;
    const totalLetters = arabicCount + latinCount;

    if (totalLetters === 0) {
      return this.containsArabic(text) ? 'ar' : 'en';
    }

    // A student typing Arabic often includes English medical terms (e.g. "ما تشخيص Aortic Stenosis؟")
    // If at least 25% of letters are Arabic, treat the intent as Arabic.
    return arabicCount / totalLetters >= 0.25 ? 'ar' : 'en';
  }

  /**
   * Determines script composition: 'ar', 'en', or 'mixed'.
   */
  public static detectScriptComposition(text: string): 'ar' | 'en' | 'mixed' {
    if (!text || !text.trim()) return 'en';

    const hasArabic = this.containsArabic(text);
    const hasLatin = /[A-Za-z]/.test(text);

    if (hasArabic && hasLatin) return 'mixed';
    if (hasArabic) return 'ar';
    return 'en';
  }

  /**
   * Resolves CSS / DOM text direction ('rtl' | 'ltr') based on the first strong directional character
   * or dominant language if no strong directional start is found.
   */
  public static detectTextDirection(text: string): TextDirection {
    if (!text || !text.trim()) return 'ltr';

    // Strip leading punctuation, spaces, numbers, and symbols to find the first strong character
    const cleaned = text.trim().replace(/^[\s\d\p{P}\p{S}]+/u, '');
    if (!cleaned) return 'ltr';

    const firstChar = cleaned.charAt(0);
    if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(firstChar)) {
      return 'rtl';
    }

    return this.detectDominantLanguage(text) === 'ar' ? 'rtl' : 'ltr';
  }
}
