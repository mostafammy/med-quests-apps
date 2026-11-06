/**
 * Component & Accessibility Test Suite: BlockSwitcher & BlockSwitcherSheet
 * Path: src/ui/app/navigation/__tests__/blockSwitcher.test.tsx
 *
 * Verifies:
 * - Single-block visual parity: renders null when only 1 block visible (INV-5)
 * - WAI-ARIA listbox and combobox accessibility contracts
 * - 44x44 pt minimum touch target boundaries (Apple HIG)
 * - Coverage ring SVG rendering and aria-labels
 * - Mobile bottom sheet modal accessibility & dialog contracts
 * SPEC-010: Multi-Block Curriculum Architecture
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { BlockSwitcher, CoverageRing } from '../BlockSwitcher.tsx';
import { BlockSwitcherSheet } from '../BlockSwitcherSheet.tsx';
import { useBlockContextStore } from '../../../../application/stores/useBlockContextStore.ts';
import type { BlockId } from '../../../../domain/curriculum/ids.ts';
import type { BlockPackDescriptor } from '../../../../domain/curriculum/BootBlockResolver.ts';

function createMockDescriptor(id: string, code: string, nameEn: string, nameAr: string): BlockPackDescriptor {
  return {
    blockId: id as BlockId,
    manifest: {
      schemaVersion: 1,
      block: {
        id: id as BlockId,
        code,
        name: { en: nameEn, ar: nameAr },
        shortName: id.toUpperCase(),
        description: { en: `${nameEn} desc`, ar: `${nameAr} desc` },
        status: id === 'cns' ? 'beta' : 'published',
        catalogOrder: id === 'cvs' ? 1 : 2,
        presentation: {
          glyph: id === 'cns' ? 'brain' : 'heart',
          accent: id === 'cns' ? 'violet' : 'rose',
        },
        aiProfileId: `${id}-profile`,
      },
      subjects: [{ id: 'sub-1' as any, name: { en: 'Subject', ar: 'مادة' }, order: 1 }],
      chapters: [{ id: `${id}-ch-1`, subjectId: 'sub-1' as any, name: { en: 'Chapter', ar: 'فصل' }, order: 1, sourceIds: [] }],
      topics: [{ id: `${id}-ch-1/t-1`, chapterId: `${id}-ch-1`, name: { en: 'Topic', ar: 'موضوع' }, order: 1 }],
      sources: [],
    },
    contentHash: `hash-${id}`,
  };
}

describe('SPEC-010: BlockSwitcher Component & Accessibility', () => {
  beforeEach(() => {
    // Reset block store to baseline
    useBlockContextStore.setState({
      activeBlockId: 'cvs' as BlockId,
      status: 'ready',
      visibleBlocks: [
        createMockDescriptor('cvs', 'Block 206', 'Cardiovascular System', 'الجهاز القلبي الوعائي'),
        createMockDescriptor('cns', 'Block 207', 'Central Nervous System', 'الجهاز العصبي المركزي'),
      ],
    });
  });

  // ==========================================================================
  // INV-5: Visual Parity Under Single Visible Block
  // ==========================================================================
  it('INV-5: renders null when only 1 block is visible, preserving 100% visual parity', () => {
    useBlockContextStore.setState({
      visibleBlocks: [
        createMockDescriptor('cvs', 'Block 206', 'Cardiovascular System', 'الجهاز القلبي الوعائي'),
      ],
    });

    const html = renderToString(<BlockSwitcher />);
    expect(html).toBe('');
  });

  // ==========================================================================
  // WAI-ARIA Combobox & Listbox Pattern
  // ==========================================================================
  it('renders combobox trigger with full ARIA semantics and >= 44x44 pt touch targets', () => {
    const html = renderToString(<BlockSwitcher />);

    // Must be role="combobox"
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-haspopup="listbox"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="curriculum-block-listbox"');

    // Apple HIG 44x44 pt minimum touch target bounds
    expect(html).toContain('min-h-[44px]');
    expect(html).toContain('min-w-[44px]');

    // VoiceOver polite live region
    expect(html).toContain('aria-live="polite"');

    // Shows active block label
    expect(html).toContain('B206');
  });

  // ==========================================================================
  // Coverage Ring Component
  // ==========================================================================
  it('CoverageRing renders accessible SVG circle with correct aria-label and progress arc', () => {
    const html = renderToString(<CoverageRing percent={42} size={24} />);

    expect(html).toContain('aria-label="42% coverage"');
    expect(html).toContain('title="42% answered"');
    expect(html).toContain('<svg');
    expect(html).toContain('stroke-dashoffset');
    expect(html).toContain('42');
  });

  // ==========================================================================
  // Mobile Bottom Sheet Switcher (BlockSwitcherSheet)
  // ==========================================================================
  it('BlockSwitcherSheet renders modal dialog with swipe grabber and block options when open', () => {
    const html = renderToString(
      <BlockSwitcherSheet isOpen={true} onClose={() => {}} />
    );

    // Modal dialog semantics
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-label="Select Curriculum Block"');

    // Both blocks listed
    expect(html).toContain('Cardiovascular System');
    expect(html).toContain('Central Nervous System');
    expect(html).toContain('Block 206');
    expect(html).toContain('Block 207');
    expect(html).toContain('Beta');

    // Apple medium-detent grabber handle present
    expect(html).toContain('cursor-grab');

    // Touch targets >= 52px for thumb reach
    expect(html).toContain('min-h-[52px]');
  });

  it('BlockSwitcherSheet renders null when closed or when only 1 block is visible', () => {
    const closedHtml = renderToString(
      <BlockSwitcherSheet isOpen={false} onClose={() => {}} />
    );
    expect(closedHtml).toBe('');

    useBlockContextStore.setState({
      visibleBlocks: [
        createMockDescriptor('cvs', 'Block 206', 'Cardiovascular System', 'الجهاز القلبي الوعائي'),
      ],
    });

    const singleBlockHtml = renderToString(
      <BlockSwitcherSheet isOpen={true} onClose={() => {}} />
    );
    expect(singleBlockHtml).toBe('');
  });
});
