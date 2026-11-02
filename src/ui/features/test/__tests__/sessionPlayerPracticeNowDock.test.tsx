import { describe, it, expect, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SessionPlayer } from '../SessionPlayer.tsx';
import { useQuestionStore } from '../../../../application/stores/useQuestionStore.ts';
import { useLocaleStore } from '../../../../application/stores/useLocaleStore.ts';
import defaultCvsBank from '../../../../../content/cvs/dist/bank.v1.json';
import type { Question } from '../../../../domain/model/types.ts';
import { enDictionary } from '../../../../domain/i18n/dictionaries/en.ts';
import { arDictionary } from '../../../../domain/i18n/dictionaries/ar.ts';

describe('SessionPlayer (/session/practice-now) Apple Floating Command Dock & Finish Practice UX', () => {
  const bank = defaultCvsBank as Question[];

  beforeEach(() => {
    useQuestionStore.setState({
      questions: bank.slice(0, 5),
      activeBlockId: 'cvs',
      isLoading: false,
    });
    useLocaleStore.getState().setLocale('en');
  });

  it('renders the redesigned floating bottom command dock with tactile keycaps and explicit Finish Practice buttons', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/session/practice-now']}>
        <Routes>
          <Route path="/session/:id" element={<SessionPlayer />} />
        </Routes>
      </MemoryRouter>
    );
    const cleanHtml = html.replace(/<!--.*?-->/g, '');

    // 1. Floating command dock container is rendered
    expect(cleanHtml).toContain('data-testid="session-bottom-dock"');

    // 2. Always-visible Finish Practice CTA in both Top Header and Bottom Floating Dock (even at 0 answers)
    expect(cleanHtml).toContain('data-testid="header-finish-session-btn"');
    expect(cleanHtml).toContain('data-testid="dock-finish-session-btn"');
    expect(cleanHtml).toContain('Finish Practice');

    // 3. Individual 1, 2, 3, 4 keycaps + Answer + ← → Navigate + G Grid in the HUD
    expect(cleanHtml).toContain('>1</kbd>');
    expect(cleanHtml).toContain('>2</kbd>');
    expect(cleanHtml).toContain('>3</kbd>');
    expect(cleanHtml).toContain('>4</kbd>');
    expect(cleanHtml).toContain(enDictionary.test.player.answerShortcut);
    expect(cleanHtml).toContain(enDictionary.test.player.navigateShortcut);
    expect(cleanHtml).toContain(enDictionary.test.player.gridShortcut);

    // 4. Back and Next buttons
    expect(cleanHtml).toContain(enDictionary.common.back);
    expect(cleanHtml).toContain(enDictionary.common.next);
  });

  it('renders localized Arabic labels and RTL-safe layout on /session/practice-now', () => {
    expect(arDictionary.test.player.finishPractice).toBe('إنهاء التدريب');
    expect(arDictionary.test.player.finishTest).toBe('إنهاء الاختبار');
    expect(arDictionary.test.player.finishModalTitle).toBe('إنهاء جلسة التدريب؟');
    expect(arDictionary.test.player.confidenceLabel).toBe('معايرة الثقة السريرية:');
    expect(arDictionary.test.player.confidenceGuess).toBe('تخمين');
    expect(arDictionary.test.player.confidenceUnsure).toBe('متردد');
    expect(arDictionary.test.player.confidenceSure).toBe('واثق');
    expect(arDictionary.test.player.gridShortcut).toBe('الشبكة');
  });
});
