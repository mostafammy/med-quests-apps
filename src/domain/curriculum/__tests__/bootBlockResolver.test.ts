import { describe, it, expect } from 'vitest';
import { BootBlockResolver } from '../BootBlockResolver.ts';
import type { BlockPackDescriptor } from '../BootBlockResolver.ts';

describe('BootBlockResolver (FR-011 Precedence)', () => {
  const resolver = new BootBlockResolver();

  const packs: BlockPackDescriptor[] = [
    {
      blockId: 'cvs' as any,
      manifest: {
        schemaVersion: 1,
        block: {
          id: 'cvs' as any,
          code: 'Block 206',
          name: { en: 'Cardiovascular', ar: 'قلبي' },
          shortName: 'CVS',
          description: { en: '', ar: '' },
          status: 'published',
          catalogOrder: 1,
          presentation: { glyph: 'heart', accent: 'rose' },
          aiProfileId: 'cvs-faculty-v1',
        },
        subjects: [],
        chapters: [],
        topics: [],
        sources: [],
      },
      contentHash: 'hash-cvs',
    },
    {
      blockId: 'cns' as any,
      manifest: {
        schemaVersion: 1,
        block: {
          id: 'cns' as any,
          code: 'Block 207',
          name: { en: 'CNS', ar: 'عصبي' },
          shortName: 'CNS',
          description: { en: '', ar: '' },
          status: 'published',
          catalogOrder: 2,
          presentation: { glyph: 'brain', accent: 'violet' },
          aiProfileId: 'cns-faculty-v1',
        },
        subjects: [],
        chapters: [],
        topics: [],
        sources: [],
      },
      contentHash: 'hash-cns',
    },
  ];

  it('prefers a valid deep-link query parameter over persisted state', () => {
    const result = resolver.resolve({
      deepLink: 'cns',
      persisted: 'cvs',
      visible: packs,
    });

    expect(result.blockId).toBe('cns');
    expect(result.reason).toBe('deep-link');
    expect(result.notice).toBe('none');
  });

  it('falls back to persisted state if deep link is invalid', () => {
    const result = resolver.resolve({
      deepLink: 'invalid-block',
      persisted: 'cns',
      visible: packs,
    });

    expect(result.blockId).toBe('cns');
    expect(result.reason).toBe('boot');
    expect(result.notice).toBe('deep-link-invalid');
  });

  it('falls back to first published block if persisted state is unavailable', () => {
    const result = resolver.resolve({
      deepLink: null,
      persisted: 'archived-block',
      visible: packs,
    });

    expect(result.blockId).toBe('cvs');
    expect(result.reason).toBe('boot');
    expect(result.notice).toBe('persisted-unavailable');
  });

  it('falls back to LEGACY_DEFAULT_BLOCK_ID if visible list is empty', () => {
    const result = resolver.resolve({
      deepLink: null,
      persisted: null,
      visible: [],
    });

    expect(result.blockId).toBe('cvs');
    expect(result.reason).toBe('fallback-unavailable');
  });
});
