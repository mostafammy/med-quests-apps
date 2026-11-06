/**
 * Multi-Block Bilingual Presentation & BiDi Typography Integration Test (US9)
 * SPEC-010 Phase 9: Bilingual Curriculum Presentation & Arabic Typography
 *
 * Verifies:
 * 1. LegacyTaxonomyAdapter resolves LocalizedText correctly for both 'en' and 'ar'.
 * 2. Fallback to English when an entity's Arabic translation is absent.
 * 3. Document direction ('rtl' / 'ltr') and language attributes synchronize without flicker.
 * 4. Parameterized dictionary strings ({blockName}, {blockCode}) interpolate cleanly in both languages.
 * 5. Preservation of canonical English USMLE acronyms (CVS, CNS, Block 206, Block 207) in Arabic typography.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LegacyTaxonomyAdapter } from '../../curriculum/LegacyTaxonomyAdapter.ts';
import { useLocaleStore } from '../../../application/stores/useLocaleStore.ts';
import cvsManifest from '../../../../content/cvs/manifest.json';
import cnsManifest from '../../../../content/cns/manifest.json';
import type { BlockManifest } from '../../curriculum/schemas.ts';

describe('Multi-Block Bilingual Presentation & Arabic Typography (US9)', () => {
  beforeEach(() => {
    useLocaleStore.getState().setLocale('en');
  });

  describe('LegacyTaxonomyAdapter LocalizedText Resolution', () => {
    it('resolves English entity names when locale is "en"', () => {
      const taxonomy = LegacyTaxonomyAdapter.manifestToTaxonomy(cnsManifest as unknown as BlockManifest, 'en');

      expect(taxonomy.block.name).toBe('Central Nervous System');
      expect(taxonomy.block.code).toBe('Block 207');
      expect(taxonomy.block.description).toContain('Integrated Central Nervous System Block');

      const anatomy = taxonomy.subjects.find((s) => s.id === 'anatomy');
      expect(anatomy?.name).toBe('CNS Neuroanatomy & Embryology');

      const ch1 = taxonomy.chapters[0];
      expect(ch1.name).toBe('Neural Tube, Meninges & CSF Dynamics');
    });

    it('resolves Arabic entity names when locale is "ar"', () => {
      const taxonomy = LegacyTaxonomyAdapter.manifestToTaxonomy(cnsManifest as unknown as BlockManifest, 'ar');

      expect(taxonomy.block.name).toBe('الجهاز العصبي المركزي');
      expect(taxonomy.block.code).toBe('Block 207');
      expect(taxonomy.block.description).toContain('مجمع الجهاز العصبي المركزي');

      const anatomy = taxonomy.subjects.find((s) => s.id === 'anatomy');
      expect(anatomy?.name).toBe('تشريح وأجنة الجهاز العصبي المركزي');

      const ch1 = taxonomy.chapters[0];
      expect(ch1.name).toBe('الأنبوب العصبي، السحايا وديناميكا السائل النخاعي');
    });

    it('resolves CVS entities correctly in both English and Arabic', () => {
      const enTaxonomy = LegacyTaxonomyAdapter.manifestToTaxonomy(cvsManifest as unknown as BlockManifest, 'en');
      expect(enTaxonomy.block.name).toBe('Cardiovascular System');

      const arTaxonomy = LegacyTaxonomyAdapter.manifestToTaxonomy(cvsManifest as unknown as BlockManifest, 'ar');
      expect(arTaxonomy.block.name).toBe('الجهاز القلبي الوعائي');
    });

    it('falls back to English when an entity lacks an Arabic translation', () => {
      const partialManifest = {
        schemaVersion: 1,
        block: {
          id: 'cvs' as any,
          code: 'Block 206',
          name: { en: 'Cardiovascular System' },
          shortName: 'CVS',
          description: { en: 'CVS English Description' },
          status: 'published',
          catalogOrder: 1,
          presentation: { glyph: 'heart', accent: 'rose' },
          aiProfileId: 'cvs-faculty-v1' as any,
        },
        subjects: [
          {
            id: 'anatomy' as any,
            name: { en: 'Anatomy Without Arabic' },
            order: 1,
          },
        ],
        chapters: [
          {
            id: 'cvs-ana-heart' as any,
            subjectId: 'anatomy' as any,
            name: { en: 'Heart Development' },
            order: 1,
            sourceIds: [],
          },
        ],
        topics: [
          {
            id: 'top-1' as any,
            chapterId: 'cvs-ana-heart' as any,
            name: { en: 'Atrial Septation' },
            order: 1,
          },
        ],
      } as unknown as BlockManifest;

      const resolved = LegacyTaxonomyAdapter.manifestToTaxonomy(partialManifest, 'ar');
      expect(resolved.block.name).toBe('Cardiovascular System');
      expect(resolved.block.description).toBe('CVS English Description');
      expect(resolved.subjects[0].name).toBe('Anatomy Without Arabic');
      expect(resolved.chapters[0].name).toBe('Heart Development');
      expect(resolved.topics[0].name).toBe('Atrial Septation');
    });
  });

  describe('BiDi Document Direction & Layout Flipping', () => {
    it('sets RTL direction and lang="ar" on document element when switching to Arabic', () => {
      useLocaleStore.getState().setLocale('ar');
      const state = useLocaleStore.getState();

      expect(state.locale).toBe('ar');
      expect(state.dir).toBe('rtl');
      expect(state.isRtl).toBe(true);

      if (typeof document !== 'undefined') {
        expect(document.documentElement.getAttribute('dir')).toBe('rtl');
        expect(document.documentElement.getAttribute('lang')).toBe('ar');
      }
    });

    it('restores LTR direction and lang="en" when returning to English', () => {
      useLocaleStore.getState().setLocale('ar');
      useLocaleStore.getState().setLocale('en');
      const state = useLocaleStore.getState();

      expect(state.locale).toBe('en');
      expect(state.dir).toBe('ltr');
      expect(state.isRtl).toBe(false);

      if (typeof document !== 'undefined') {
        expect(document.documentElement.getAttribute('dir')).toBe('ltr');
        expect(document.documentElement.getAttribute('lang')).toBe('en');
      }
    });
  });

  describe('Parameterized Curriculum & Test Hub Dictionaries', () => {
    it('formats hubTitle, allSubjects, and dashboard title in English', () => {
      const { t } = useLocaleStore.getState();
      const blockName = 'Central Nervous System';

      const hubTitle = t.test.hubTitle.replace('{blockName}', blockName);
      expect(hubTitle).toBe('Central Nervous System Test Hub');

      const allSubjects = t.test.allSubjects.replace('{blockName}', blockName);
      expect(allSubjects).toBe('All Subjects (Central Nervous System)');

      const dashboardTitle = t.dashboard.title.replace('{blockName}', blockName);
      expect(dashboardTitle).toBe('Central Nervous System Mastery');
    });

    it('formats hubTitle, allSubjects, and dashboard title in Arabic with preserved structure', () => {
      useLocaleStore.getState().setLocale('ar');
      const { t } = useLocaleStore.getState();
      const blockName = 'الجهاز العصبي المركزي';

      const hubTitle = t.test.hubTitle.replace('{blockName}', blockName);
      expect(hubTitle).toBe('مركز اختبارات الجهاز العصبي المركزي');

      const allSubjects = t.test.allSubjects.replace('{blockName}', blockName);
      expect(allSubjects).toBe('جميع المواد (الجهاز العصبي المركزي)');

      const dashboardTitle = t.dashboard.title.replace('{blockName}', blockName);
      expect(dashboardTitle).toBe('إتقان الجهاز العصبي المركزي');
    });

    it('formats mock setup subtitle with both blockName and blockCode', () => {
      // English
      const enT = useLocaleStore.getState().t;
      const enMockSub = enT.test.mockSetup.subtitle
        .replace('{blockName}', 'Central Nervous System')
        .replace('{blockCode}', 'Block 207');
      expect(enMockSub).toBe('Simulate the actual university Central Nervous System (Block 207) Exam with standardized conditions.');

      // Arabic
      useLocaleStore.getState().setLocale('ar');
      const arT = useLocaleStore.getState().t;
      const arMockSub = arT.test.mockSetup.subtitle
        .replace('{blockName}', 'الجهاز العصبي المركزي')
        .replace('{blockCode}', 'Block 207');
      expect(arMockSub).toBe('محاكاة اختبار الجهاز العصبي المركزي (Block 207) الجامعي الفعلي بشروط معيارية.');
    });
  });
});
