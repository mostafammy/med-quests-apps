import { describe, it, expect } from 'vitest';
import {
  TaxonomyDisplayResolver,
  STANDARD_DISCIPLINE_META,
} from '../TaxonomyDisplayResolver.ts';

describe('TaxonomyDisplayResolver (Human-Readable Curriculum Formatting)', () => {
  describe('humanizeTaxonomySlug', () => {
    it('humanizes chapter slugs with "chap-" prefix', () => {
      expect(TaxonomyDisplayResolver.humanizeTaxonomySlug('chap-white-matter')).toBe('White Matter');
      expect(TaxonomyDisplayResolver.humanizeTaxonomySlug('chapter-cerebral-cortex')).toBe('Cerebral Cortex');
      expect(TaxonomyDisplayResolver.humanizeTaxonomySlug('chap_basal_ganglia')).toBe('Basal Ganglia');
    });

    it('humanizes subject slugs with "Subj-" prefix and preserves medical acronyms', () => {
      expect(TaxonomyDisplayResolver.humanizeTaxonomySlug('Subj-Cns-Anatomy')).toBe('CNS Anatomy');
      expect(TaxonomyDisplayResolver.humanizeTaxonomySlug('subj_cvs_physiology')).toBe('CVS Physiology');
      expect(TaxonomyDisplayResolver.humanizeTaxonomySlug('subject-pns-pathology')).toBe('PNS Pathology');
    });

    it('formats block identifiers with numbers and titles', () => {
      expect(TaxonomyDisplayResolver.humanizeTaxonomySlug('BLOCK-02-SUPRATENTORIAL')).toBe(
        'Block 02: Supratentorial'
      );
    });

    it('preserves lowercase connectors in multi-word titles', () => {
      expect(TaxonomyDisplayResolver.humanizeTaxonomySlug('circle-of-willis')).toBe('Circle of Willis');
    });

    it('returns empty string for undefined or empty input', () => {
      expect(TaxonomyDisplayResolver.humanizeTaxonomySlug('')).toBe('');
      expect(TaxonomyDisplayResolver.humanizeTaxonomySlug(undefined)).toBe('');
    });
  });

  describe('resolveChapterName', () => {
    it('resolves unmapped chapter slugs to Title Case', () => {
      const name = TaxonomyDisplayResolver.resolveChapterName('chap-white-matter');
      expect(name).toBe('White Matter');
    });

    it('resolves registered manifest chapter IDs to their official names', () => {
      // In cns manifest: "cns-ana-cerebral-cortex-vascular" -> "Cerebral Hemispheres, Cortical Areas & Circle of Willis"
      const name = TaxonomyDisplayResolver.resolveChapterName('cns-ana-cerebral-cortex-vascular');
      expect(name).toContain('Cortical Areas');
    });

    it('replaces slug fallback names with clean humanized text', () => {
      const name = TaxonomyDisplayResolver.resolveChapterName('chap-white-matter', 'chap-white-matter');
      expect(name).toBe('White Matter');
    });
  });

  describe('resolveSubjectName', () => {
    it('resolves raw subject slugs to publication-grade names', () => {
      const name = TaxonomyDisplayResolver.resolveSubjectName('Subj-Cns-Anatomy');
      expect(name).toBe('CNS Anatomy');
    });

    it('resolves known manifest subjects', () => {
      const name = TaxonomyDisplayResolver.resolveSubjectName('anatomy', undefined, 'cns');
      expect(name).toContain('Anatomy');
    });
  });

  describe('resolveSubjectMeta', () => {
    it('resolves medical discipline icon and badge for slug containing anatomy', () => {
      const meta = TaxonomyDisplayResolver.resolveSubjectMeta('Subj-Cns-Anatomy');
      expect(meta.icon).toBe(STANDARD_DISCIPLINE_META.anatomy.icon);
    });

    it('resolves physiology icon for physiology slugs', () => {
      const meta = TaxonomyDisplayResolver.resolveSubjectMeta('cns-phy-somatosensory');
      expect(meta.icon).toBe(STANDARD_DISCIPLINE_META.physiology.icon);
    });

    it('falls back to default icon for completely unknown subjects', () => {
      const meta = TaxonomyDisplayResolver.resolveSubjectMeta('completely-unrelated-random');
      expect(meta.icon).toBe('📚');
    });
  });
});
