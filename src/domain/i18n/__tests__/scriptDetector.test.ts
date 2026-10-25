import { describe, it, expect } from 'vitest';
import { ScriptDirectionDetector } from '../scriptDetector.ts';

describe('ScriptDirectionDetector (Pure Domain Service)', () => {
  it('detects pure English text as English and LTR', () => {
    const text = 'What is the primary hemodynamic mechanism of Aortic Regurgitation?';
    expect(ScriptDirectionDetector.containsArabic(text)).toBe(false);
    expect(ScriptDirectionDetector.detectDominantLanguage(text)).toBe('en');
    expect(ScriptDirectionDetector.detectTextDirection(text)).toBe('ltr');
    expect(ScriptDirectionDetector.detectScriptComposition(text)).toBe('en');
  });

  it('detects pure Arabic text as Arabic and RTL', () => {
    const text = 'ما هو التغير الديناميكي الدموي الأساسي في تضيق الصمام الأبهري؟';
    expect(ScriptDirectionDetector.containsArabic(text)).toBe(true);
    expect(ScriptDirectionDetector.detectDominantLanguage(text)).toBe('ar');
    expect(ScriptDirectionDetector.detectTextDirection(text)).toBe('rtl');
    expect(ScriptDirectionDetector.detectScriptComposition(text)).toBe('ar');
  });

  it('detects mixed clinical text with English medical terms as Arabic intent and RTL', () => {
    const text = 'اشرح لي لماذا الخيار B الذي يذكر Aortic Regurgitation خاطئ في هذه الحالة؟';
    expect(ScriptDirectionDetector.containsArabic(text)).toBe(true);
    expect(ScriptDirectionDetector.detectDominantLanguage(text)).toBe('ar');
    expect(ScriptDirectionDetector.detectTextDirection(text)).toBe('rtl');
    expect(ScriptDirectionDetector.detectScriptComposition(text)).toBe('mixed');
  });

  it('detects text starting with numbers or symbols correctly', () => {
    const textWithLeadingNumber = '1. ما هو التشخيص الأدق؟';
    expect(ScriptDirectionDetector.detectTextDirection(textWithLeadingNumber)).toBe('rtl');

    const englishWithLeadingBullet = '- Simulate the P-V loop for Mitral Stenosis';
    expect(ScriptDirectionDetector.detectTextDirection(englishWithLeadingBullet)).toBe('ltr');
  });

  it('handles empty or whitespace strings gracefully', () => {
    expect(ScriptDirectionDetector.containsArabic('')).toBe(false);
    expect(ScriptDirectionDetector.detectDominantLanguage('')).toBe('en');
    expect(ScriptDirectionDetector.detectTextDirection('')).toBe('ltr');
  });
});
