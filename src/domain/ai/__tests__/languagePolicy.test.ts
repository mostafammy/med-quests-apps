import { describe, it, expect } from 'vitest';
import { ChatLanguagePolicy } from '../languagePolicy.ts';

describe('ChatLanguagePolicy (Pure Domain Strategy)', () => {
  it('resolves Arabic when preference is explicitly "ar"', () => {
    const ctx = ChatLanguagePolicy.resolveChatLanguageContext('ar', 'Explain this in detail');
    expect(ctx.resolvedLanguage).toBe('ar');
    expect(ctx.direction).toBe('rtl');
    expect(ctx.preference).toBe('ar');
    expect(ctx.preserveEnglishMedicalTerms).toBe(true);
  });

  it('resolves English when preference is explicitly "en"', () => {
    const ctx = ChatLanguagePolicy.resolveChatLanguageContext('en', 'ما هو التشخيص؟');
    expect(ctx.resolvedLanguage).toBe('en');
    expect(ctx.direction).toBe('ltr');
    expect(ctx.preference).toBe('en');
  });

  it('auto-resolves Arabic when user types in Arabic', () => {
    const ctx = ChatLanguagePolicy.resolveChatLanguageContext(
      'auto',
      'لماذا اخترت هذا الخيار وما هي الآلية المرضية؟'
    );
    expect(ctx.resolvedLanguage).toBe('ar');
    expect(ctx.direction).toBe('rtl');
  });

  it('auto-resolves English when user types in English', () => {
    const ctx = ChatLanguagePolicy.resolveChatLanguageContext(
      'auto',
      'What is the mechanism of action of hydralazine?'
    );
    expect(ctx.resolvedLanguage).toBe('en');
    expect(ctx.direction).toBe('ltr');
  });

  it('auto-resolves Arabic when user types mixed Arabic with English medical terms', () => {
    const ctx = ChatLanguagePolicy.resolveChatLanguageContext(
      'auto',
      'هل يمكن محاكاة P-V Loop لحالة Aortic Regurgitation؟'
    );
    expect(ctx.resolvedLanguage).toBe('ar');
    expect(ctx.direction).toBe('rtl');
    expect(ctx.detectedInputScript).toBe('mixed');
  });

  it('falls back to provided fallbackLocale on empty text in auto mode', () => {
    const ctxAr = ChatLanguagePolicy.resolveChatLanguageContext('auto', '', 'ar');
    expect(ctxAr.resolvedLanguage).toBe('ar');

    const ctxEn = ChatLanguagePolicy.resolveChatLanguageContext('auto', '', 'en');
    expect(ctxEn.resolvedLanguage).toBe('en');
  });

  it('compiles authoritative Arabic directive with tool protocol guardrails', () => {
    const ctx = ChatLanguagePolicy.resolveChatLanguageContext('ar', '');
    const directive = ChatLanguagePolicy.buildChatLanguageDirective(ctx);

    expect(directive).toContain('اللغة العربية الفصحى الطبية السليمة');
    expect(directive).toContain('CANONICAL USMLE MEDICAL TERMS');
    expect(directive).toContain('STRICT TOOL CALLING PROTOCOL');
    expect(directive).toContain('ALL tool names, parameter keys, and enum values MUST REMAIN IN CANONICAL ENGLISH');
  });

  it('compiles standard English directive when resolved language is English', () => {
    const ctx = ChatLanguagePolicy.resolveChatLanguageContext('en', '');
    const directive = ChatLanguagePolicy.buildChatLanguageDirective(ctx);

    expect(directive).toContain('USMLE Clinical English');
  });
});
