/**
 * Domain Service: TaxonomyDisplayResolver
 *
 * Single Responsibility: Resolves raw machine slugs, chapter IDs, and subject IDs
 * into human-readable, board-standard clinical labels and UI metadata.
 *
 * Examples:
 * - "chap-white-matter" -> "White Matter"
 * - "Subj-Cns-Anatomy" -> "CNS Anatomy"
 * - "BLOCK-02-SUPRATENTORIAL" -> "Block 02: Supratentorial"
 * - "cns-ana-cerebral-cortex-vascular" -> Registered Manifest Chapter Title
 */

import cvsManifest from '../../../content/cvs/manifest.json';
import cnsManifest from '../../../content/cns/manifest.json';
import { curriculumTaxonomyRegistry } from './CurriculumTaxonomyRegistry.ts';

interface ManifestItemWithName {
  readonly id: string;
  readonly name?: string | { readonly en?: string; readonly ar?: string };
}

interface BlockManifestLike {
  readonly block?: {
    readonly id: string;
    readonly name?: string | { readonly en?: string; readonly ar?: string };
    readonly shortName?: string;
    readonly code?: string;
  };
  readonly subjects?: readonly ManifestItemWithName[];
  readonly chapters?: readonly ManifestItemWithName[];
}

const MANIFESTS: Record<string, BlockManifestLike> = {
  cvs: cvsManifest as unknown as BlockManifestLike,
  cns: cnsManifest as unknown as BlockManifestLike,
};

export interface SubjectBadgeMeta {
  readonly icon: string;
  readonly badgeColor: string;
}

export const DEFAULT_SUBJECT_META: SubjectBadgeMeta = {
  icon: '📚',
  badgeColor: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/25',
};

export const STANDARD_DISCIPLINE_META: Record<string, SubjectBadgeMeta> = {
  anatomy: {
    icon: '🩺',
    badgeColor: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25',
  },
  physiology: {
    icon: '⚡',
    badgeColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
  },
  histology: {
    icon: '🔬',
    badgeColor: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25',
  },
  microbiology: {
    icon: '🧫',
    badgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
  },
  pathology: {
    icon: '🧬',
    badgeColor: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/25',
  },
  pharmacology: {
    icon: '💊',
    badgeColor: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25',
  },
};

export class TaxonomyDisplayResolver {
  private static readonly KNOWN_ACRONYMS = new Set([
    'cns', 'cvs', 'pns', 'csf', 'mri', 'ct', 'ecg', 'ekg', 'dna', 'rna',
    'usmle', 'nbme', 'sba', 'mcq', 'bbb', 'eeg', 'gerd', 'av', 'sa', 'icu', 'iv'
  ]);

  private static readonly DISCIPLINE_ABBREVIATIONS: Record<string, string> = {
    ana: 'Anatomy',
    phy: 'Physiology',
    his: 'Histology',
    pat: 'Pathology',
    pha: 'Pharmacology',
    mic: 'Microbiology',
  };

  private static readonly LOWERCASE_CONNECTORS = new Set([
    'and', 'or', 'of', 'the', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'vs'
  ]);

  private static extractLocalized(name?: string | { readonly en?: string; readonly ar?: string }): string | null {
    if (!name) return null;
    if (typeof name === 'string') return name.trim();
    if (typeof name === 'object') {
      return (name.en || name.ar || '').trim() || null;
    }
    return null;
  }

  /**
   * Humanizes any raw machine slug or identifier into publication-grade Title Case.
   */
  public static humanizeTaxonomySlug(slug?: string): string {
    if (!slug || typeof slug !== 'string') return '';
    const trimmed = slug.trim();
    if (!trimmed) return '';

    // Check Block format: BLOCK-02-SUPRATENTORIAL or block_01_cardio
    const blockMatch = trimmed.match(/^block[-_](\d+)[-_](.+)$/i);
    if (blockMatch) {
      const blockNum = blockMatch[1];
      const remainder = this.humanizeTaxonomySlug(blockMatch[2]);
      return `Block ${blockNum}: ${remainder}`;
    }

    // Strip common machine prefixes
    let clean = trimmed
      .replace(/^(chap|chapter|ch)[-_]/i, '')
      .replace(/^(subj|subject|sub)[-_]/i, '')
      .replace(/^block[-_]/i, '')
      .trim();

    // If already clean multi-word title with capital letters and no hyphens/underscores
    if (!/[-_/]/.test(clean) && /\s/.test(clean)) {
      return clean;
    }

    // Insert spaces between camelCase or PascalCase transitions (e.g. SubjCnsAnatomy -> Subj Cns Anatomy)
    clean = clean.replace(/([a-z])([A-Z])/g, '$1 $2');

    // Split on delimiters
    const tokens = clean.split(/[-_/\s]+/).filter(Boolean);
    if (tokens.length === 0) return trimmed;

    const formattedTokens = tokens.map((rawToken, idx) => {
      const lower = rawToken.toLowerCase();

      // Check Acronyms (e.g. CNS, CVS, CSF)
      if (this.KNOWN_ACRONYMS.has(lower)) {
        return lower.toUpperCase();
      }

      // Check Discipline abbreviations (e.g. ana -> Anatomy)
      if (this.DISCIPLINE_ABBREVIATIONS[lower]) {
        return this.DISCIPLINE_ABBREVIATIONS[lower];
      }

      // Check Lowercase connectors
      if (idx > 0 && idx < tokens.length - 1 && this.LOWERCASE_CONNECTORS.has(lower)) {
        return lower;
      }

      // Standard Word Capitalization
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    });

    return formattedTokens.join(' ');
  }

  /**
   * Resolves a chapter ID into its human-readable title.
   * Checks registry & manifests first, then gracefully humanizes raw slugs.
   */
  public static resolveChapterName(
    chapterId?: string,
    fallbackName?: string,
    blockId?: string
  ): string {
    const rawId = (chapterId || '').trim();
    const candidateFallback = (fallbackName || '').trim();

    // 1. If candidate fallback is already a clean human title (does not contain 'chap-' or slug chars)
    if (
      candidateFallback &&
      candidateFallback !== rawId &&
      !candidateFallback.toLowerCase().startsWith('chap-') &&
      !candidateFallback.toLowerCase().startsWith('chapter-') &&
      !candidateFallback.includes('_')
    ) {
      return candidateFallback;
    }

    if (!rawId) {
      return candidateFallback ? this.humanizeTaxonomySlug(candidateFallback) : 'General Curriculum';
    }

    // 2. Check dynamic curriculum taxonomy registry
    try {
      const regChapters = curriculumTaxonomyRegistry.getChapters();
      const match = regChapters.find((c) => c.id === rawId);
      if (match && match.name) {
        return match.name;
      }
    } catch {
      // Ignore registry error in isolated test environments
    }

    // 3. Check known manifests (CVS, CNS, etc.)
    const manifestsToCheck = blockId && MANIFESTS[blockId]
      ? [MANIFESTS[blockId]]
      : Object.values(MANIFESTS);

    for (const manifest of manifestsToCheck) {
      if (Array.isArray(manifest.chapters)) {
        const found = manifest.chapters.find((c) => c.id === rawId);
        if (found) {
          const name = this.extractLocalized(found.name);
          if (name) return name;
        }
      }
    }

    // 4. Fallback: Humanize the slug (e.g. "chap-white-matter" -> "White Matter")
    return this.humanizeTaxonomySlug(rawId || candidateFallback);
  }

  /**
   * Resolves a subject ID into its human-readable title.
   * Checks registry & manifests first, then gracefully humanizes raw slugs.
   */
  public static resolveSubjectName(
    subjectId?: string,
    fallbackName?: string,
    blockId?: string
  ): string {
    const rawId = (subjectId || '').trim();
    const candidateFallback = (fallbackName || '').trim();

    // 1. If candidate fallback is already a clean human title
    if (
      candidateFallback &&
      candidateFallback !== rawId &&
      !candidateFallback.toLowerCase().startsWith('subj-') &&
      !candidateFallback.toLowerCase().startsWith('subject-') &&
      !candidateFallback.includes('_')
    ) {
      return candidateFallback;
    }

    if (!rawId) {
      return candidateFallback ? this.humanizeTaxonomySlug(candidateFallback) : 'Integrated Medicine';
    }

    // 2. Check dynamic curriculum taxonomy registry
    try {
      const regSubjects = curriculumTaxonomyRegistry.getSubjects();
      const match = regSubjects.find((s) => s.id === rawId);
      if (match && match.name) {
        return match.name;
      }
    } catch {
      // Ignore registry error
    }

    // 3. Check known manifests
    const manifestsToCheck = blockId && MANIFESTS[blockId]
      ? [MANIFESTS[blockId]]
      : Object.values(MANIFESTS);

    for (const manifest of manifestsToCheck) {
      if (Array.isArray(manifest.subjects)) {
        const found = manifest.subjects.find((s) => s.id === rawId);
        if (found) {
          const name = this.extractLocalized(found.name);
          if (name) return name;
        }
      }
    }

    // 4. Fallback: Humanize the slug (e.g. "Subj-Cns-Anatomy" -> "CNS Anatomy")
    return this.humanizeTaxonomySlug(rawId || candidateFallback);
  }

  /**
   * Resolves icon & color styling for a subject, recognizing discipline keywords
   * even inside complex slugs like "Subj-Cns-Anatomy" or "cns-neuroanatomy".
   */
  public static resolveSubjectMeta(
    subjectId?: string,
    customMap?: Record<string, SubjectBadgeMeta>
  ): SubjectBadgeMeta {
    if (!subjectId) return DEFAULT_SUBJECT_META;
    const raw = subjectId.trim();

    // Direct match in custom map
    if (customMap && customMap[raw]) {
      return customMap[raw];
    }

    // Cleaned discipline identification
    const normalized = raw
      .toLowerCase()
      .replace(/^(subj|subject)[-_]/, '')
      .replace(/^(cns|cvs|pns)[-_]/, '')
      .replace(/[-_]/g, ' ');

    for (const [discipline, meta] of Object.entries(STANDARD_DISCIPLINE_META)) {
      if (
        normalized === discipline ||
        normalized.includes(discipline) ||
        (discipline === 'anatomy' && normalized.includes('ana')) ||
        (discipline === 'physiology' && normalized.includes('phy')) ||
        (discipline === 'histology' && normalized.includes('his')) ||
        (discipline === 'pathology' && normalized.includes('pat')) ||
        (discipline === 'pharmacology' && normalized.includes('pha')) ||
        (discipline === 'microbiology' && normalized.includes('mic'))
      ) {
        return meta;
      }
    }

    return DEFAULT_SUBJECT_META;
  }
}
