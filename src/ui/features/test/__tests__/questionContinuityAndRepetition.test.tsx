import { describe, it, expect, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { TestHub } from '../TestHub.tsx';
import { QuickPractice } from '../QuickPractice.tsx';
import { useStatsStore } from '../../../../application/stores/useStatsStore.ts';
import defaultCvsBank from '../../../../../content/cvs/dist/bank.v1.json';
import type { Question } from '../../../../domain/model/types.ts';
import { enDictionary } from '../../../../domain/i18n/dictionaries/en.ts';
import { arDictionary } from '../../../../domain/i18n/dictionaries/ar.ts';

describe('Question Continuity & Zero-Duplicate Repetition Feature', () => {
  const bank = defaultCvsBank as Question[];
  const physiologyQuestions = bank.filter((q) => q.subjectId === 'physiology');

  beforeEach(() => {
    // Reset Zustand store state before each test
    useStatsStore.setState({
      totalAttempts: 0,
      totalAnsweredQuestions: 0,
      overallAccuracy: 0,
      masteryPercentage: 0,
      weakTopicsCount: 0,
      dueReviewsCount: 0,
      topicStats: [],
      mistakeQuestionIds: [],
      answeredQuestionIds: [],
      correctQuestionIds: [],
      isLoading: false,
    });
  });

  it('computes scope coverage accurately when student has solved 20 Physiology questions', () => {
    expect(physiologyQuestions.length).toBe(106);

    // Simulate student having solved the first 20 questions of Physiology (17 correct, 3 mistakes)
    const solved20 = physiologyQuestions.slice(0, 20);
    const answeredIds = solved20.map((q) => q.id);
    const correctIds = solved20.slice(0, 17).map((q) => q.id);
    const mistakeIds = solved20.slice(17, 20).map((q) => q.id);

    useStatsStore.setState({
      answeredQuestionIds: answeredIds,
      correctQuestionIds: correctIds,
      mistakeQuestionIds: mistakeIds,
    });

    const store = useStatsStore.getState();
    const coverage = store.getScopeCoverage(bank, { subjectId: 'physiology' });

    expect(coverage.total).toBe(106);
    expect(coverage.answered).toBe(20);
    expect(coverage.unanswered).toBe(86);
    expect(coverage.correct).toBe(17);
    expect(coverage.incorrect).toBe(3);
    expect(coverage.accuracy).toBe(85);
    expect(coverage.percentComplete).toBe(19);

    // Verify zero duplicates: unanswered IDs must not contain any answered question IDs
    expect(coverage.unansweredIds.length).toBe(86);
    answeredIds.forEach((id) => {
      expect(coverage.unansweredIds).not.toContain(id);
    });
  });

  it('renders the Bank Continuity Progress Card and Repetition Scope Filter in TestHub', () => {
    const html = renderToString(
      <MemoryRouter>
        <TestHub />
      </MemoryRouter>
    );
    const cleanHtml = html.replace(/<!--.*?-->/g, '');

    // 1. Bank Continuity Header & Progress
    expect(cleanHtml).toContain('Bank Continuity');
    expect(cleanHtml).toContain('Fresh Remaining');
    expect(cleanHtml).toContain('Mastered');
    expect(cleanHtml).toContain('Missed');

    // 2. Repetition Scope Filter
    expect(cleanHtml).toContain('Question History &amp; Repetition Scope');
    expect(cleanHtml).toContain('Fresh / Unanswered');
    expect(cleanHtml).toContain('Zero duplicates guarantee');
    expect(cleanHtml).toContain('All Questions');
    expect(cleanHtml).toContain('Missed Only');
  });

  it('renders Repetition Scope Controls in QuickPractice', () => {
    const html = renderToString(
      <MemoryRouter>
        <QuickPractice />
      </MemoryRouter>
    );
    const cleanHtml = html.replace(/<!--.*?-->/g, '');

    expect(cleanHtml).toContain('Question History &amp; Repetition Scope');
    expect(cleanHtml).toContain('Fresh / Unanswered');
    expect(cleanHtml).toContain('All Questions');
    expect(cleanHtml).toContain('Missed Only');
    expect(cleanHtml).toContain('Fresh Pool • Zero Duplicates');
  });

  it('verifies dictionary completeness for English and Arabic translations', () => {
    // English keys
    expect(enDictionary.test.repetitionFilterTitle).toBe('Question History & Repetition Scope');
    expect(enDictionary.test.filterUnanswered).toBe('Fresh / Unanswered');
    expect(enDictionary.test.filterAllPool).toBe('All Questions');
    expect(enDictionary.test.filterIncorrectOnly).toBe('Missed Only');
    expect(enDictionary.test.continueBankCta).toBe('Continue Fresh Questions');
    expect(enDictionary.test.zeroDuplicatesBadge).toBe('Zero Duplicates Guarantee');

    // Arabic keys
    expect(arDictionary.test.repetitionFilterTitle).toBe('نطاق الأسئلة والتكرار');
    expect(arDictionary.test.filterUnanswered).toBe('أسئلة جديدة لم تُحل');
    expect(arDictionary.test.filterAllPool).toBe('جميع الأسئلة');
    expect(arDictionary.test.filterIncorrectOnly).toBe('الأخطاء فقط');
    expect(arDictionary.test.continueBankCta).toBe('استكمال الأسئلة الجديدة');
    expect(arDictionary.test.zeroDuplicatesBadge).toBe('ضمان عدم تكرار الأسئلة');
  });
});
