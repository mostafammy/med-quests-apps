import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { ResetBankConfirmationModal } from '../ResetBankConfirmationModal.tsx';
import { QuestionBankStatusPill } from '../QuestionBankStatusPill.tsx';
import { StudioBankSyncDiffCenter } from '../../studio/StudioBankSyncDiffCenter.tsx';
import { Dashboard } from '../../dashboard/Dashboard.tsx';
import { TestHub } from '../../test/TestHub.tsx';
import { enDictionary } from '../../../../domain/i18n/dictionaries/en.ts';

describe('Global Question Bank Reset Feature for All Users', () => {
  it('renders ResetBankConfirmationModal with destructive action and warnings when open', () => {
    const html = renderToString(
      <ResetBankConfirmationModal
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(html).toContain(enDictionary.bank.resetConfirmTitle);
    expect(html).toContain(enDictionary.bank.resetToGlobalBtn);
    expect(html).toContain(enDictionary.bank.resetDescription);
    expect(html).toContain(enDictionary.common.cancel);
  });

  it('renders null when ResetBankConfirmationModal is closed', () => {
    const html = renderToString(
      <ResetBankConfirmationModal
        isOpen={false}
        onClose={() => {}}
      />
    );

    expect(html).toBe('');
  });

  it('renders QuestionBankStatusPill with active block and question count', () => {
    const html = renderToString(
      <MemoryRouter>
        <QuestionBankStatusPill />
      </MemoryRouter>
    );

    expect(html).toContain('206');
    expect(html).toContain('lucide-chevron-down');
  });

  it('includes Reset to Global Bank button on Dashboard for all students', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/']}>
        <Dashboard />
      </MemoryRouter>
    );

    expect(html).toContain(enDictionary.bank.resetToGlobalBtn);
  });

  it('includes Reset to Global Bank action in TestHub before launching exams', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/test']}>
        <TestHub />
      </MemoryRouter>
    );

    expect(html).toContain(enDictionary.bank.resetToGlobalBtn);
  });

  it('renders StudioBankSyncDiffCenter with version comparison, diff counters, and Check for Updates action', () => {
    const html = renderToString(
      <StudioBankSyncDiffCenter onOpenResetModal={() => {}} />
    );

    expect(html).toContain('Global Question Bank Sync');
    expect(html).toContain('Added Questions');
    expect(html).toContain('Edited Questions');
    expect(html).toContain('Deleted / Retired');
    expect(html).toContain('Local Custom');
    expect(html).toContain('Check for Updates');
  });
});
