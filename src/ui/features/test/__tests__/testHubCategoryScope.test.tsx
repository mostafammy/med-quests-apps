import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { TestHub } from '../TestHub.tsx';
import { QuickPractice } from '../QuickPractice.tsx';
import { enDictionary } from '../../../../domain/i18n/dictionaries/en.ts';
import { arDictionary } from '../../../../domain/i18n/dictionaries/ar.ts';

describe('TestHub & QuickPractice Category Scope Option', () => {
  it('renders the "Test All Questions in Category" card in TestHub Section 2', () => {
    const html = renderToString(
      <MemoryRouter>
        <TestHub />
      </MemoryRouter>
    );
    const cleanHtml = html.replace(/<!--.*?-->/g, '');

    // Section 2 Header & Subtitle
    expect(cleanHtml).toContain('2. Scope &amp; Target Curriculum');
    expect(cleanHtml).toContain('Filter questions by medical discipline or specific chapter');

    // Dedicated Category Test Card
    expect(cleanHtml).toContain('Test All Questions in Category');
    expect(cleanHtml).toContain('Practice every question in this category with immediate feedback &amp; rationales');
    expect(cleanHtml).toContain('Select All');
    expect(cleanHtml).toContain('Start All');
  });

  it('renders the "All (X)" option in the Question Count selector', () => {
    const html = renderToString(
      <MemoryRouter>
        <TestHub />
      </MemoryRouter>
    );
    const cleanHtml = html.replace(/<!--.*?-->/g, '');

    // In the question count row, we expect 10, 20, 30, 50, and All (212)
    expect(cleanHtml).toContain('10 Questions');
    expect(cleanHtml).toContain('20 Questions');
    expect(cleanHtml).toContain('30 Questions');
    expect(cleanHtml).toContain('50 Questions');
    expect(cleanHtml).toContain('All (212)');
  });

  it('verifies the Arabic and English i18n dictionary completeness for Category Scope testing', () => {
    // English dictionary definitions
    expect(enDictionary.test.testAllCategory).toBe('Test All Questions in Category');
    expect(enDictionary.test.testAllCategoryDesc).toBe('Practice every question in this category with immediate feedback & rationales');
    expect(enDictionary.test.selectFullCategory).toBe('Select All');
    expect(enDictionary.test.allCategorySelected).toBe('All Selected');
    expect(enDictionary.test.launchFullCategory).toBe('Start All');
    expect(enDictionary.test.allCategoryOption).toBe('All');
    expect(enDictionary.test.fullCategoryBadge).toBe('Full Category');

    // Arabic dictionary translations
    expect(arDictionary.test.testAllCategory).toBe('اختبار جميع أسئلة هذا القسم');
    expect(arDictionary.test.testAllCategoryDesc).toBe('التدرب على جميع أسئلة هذا القسم مع شروحات وتفسيرات فورية');
    expect(arDictionary.test.selectFullCategory).toBe('تحديد الكل');
    expect(arDictionary.test.allCategorySelected).toBe('تم تحديد الكل');
    expect(arDictionary.test.launchFullCategory).toBe('بدء اختبار كامل القسم');
    expect(arDictionary.test.allCategoryOption).toBe('الكل');
    expect(arDictionary.test.fullCategoryBadge).toBe('كامل القسم');
  });

  it('renders the "All (X)" option in QuickPractice', () => {
    const html = renderToString(
      <MemoryRouter>
        <QuickPractice />
      </MemoryRouter>
    );
    const cleanHtml = html.replace(/<!--.*?-->/g, '');

    expect(cleanHtml).toContain('All (212)');
    expect(cleanHtml).toContain('10 Questions');
    expect(cleanHtml).toContain('20 Questions');
  });
});
