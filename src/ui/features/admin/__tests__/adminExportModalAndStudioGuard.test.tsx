import { describe, it, expect, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QuestionStudio } from '../../studio/QuestionStudio.tsx';
import { AdminExportBankModal } from '../AdminExportBankModal.tsx';
import { useAuthStore } from '../../../../application/stores/useAuthStore.ts';

describe('QuestionStudio & Admin Export Isolation Tests (Apple Zero-Leak Standards)', () => {
  beforeEach(async () => {
    await useAuthStore.getState().signOut();
  });

  it('verifies QuestionStudio completely omits any export button or export controls', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/studio']}>
        <QuestionStudio />
      </MemoryRouter>
    );

    // QuestionStudio must have its title and authoring UI
    expect(html).toContain('Question Authoring Studio');
    // But must NOT contain ANY export button or export function call
    expect(html).not.toContain('Export Bank JSON');
    expect(html).not.toContain('Export Master Bank');
    expect(html).not.toContain('t.studio.exportBtn');
    expect(html).not.toContain('cvs-bank-v1-');
  });

  it('renders the Apple-grade AdminExportBankModal when open with confidentiality badges and admin branding', () => {
    const openHtml = renderToString(
      <AdminExportBankModal
        isOpen={true}
        onClose={() => {}}
        blockId="cvs"
        isAdmin={true}
      />
    );

    expect(openHtml).toContain('Authoritative Question Bank Export');
    expect(openHtml).toContain('Admin Governance Console Exclusive');
    expect(openHtml).toContain('Core Revenue &amp; Intellectual Property Asset');
    expect(openHtml).toContain('Export Master Question Bank');
    expect(openHtml).toContain('Authorized Operator');
  });

  it('returns null when AdminExportBankModal is closed', () => {
    const closedHtml = renderToString(
      <AdminExportBankModal
        isOpen={false}
        onClose={() => {}}
        blockId="cvs"
      />
    );

    expect(closedHtml).toBe('');
  });
});
