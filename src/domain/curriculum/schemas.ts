/**
 * Domain Schemas & Validation Contracts
 * SPEC-010: Multi-Block Curriculum Architecture
 */

import { z } from 'zod';
import { BlockIdSchema, SubjectKeySchema } from './ids.ts';

export const LocalizedTextSchema = z.object({
  en: z.string().min(1),
  ar: z.string().min(1),
});
export type LocalizedText = z.infer<typeof LocalizedTextSchema>;

export const BlockLifecycleStatusSchema = z.enum(['draft', 'beta', 'published', 'archived']);
export type BlockLifecycleStatus = z.infer<typeof BlockLifecycleStatusSchema>;

export const AccentTokenSchema = z.enum(['rose', 'violet', 'sky', 'amber', 'emerald', 'indigo', 'teal']);
export type AccentToken = z.infer<typeof AccentTokenSchema>;

/** lucide-react icon names permitted for block glyphs (closed set → no arbitrary imports). */
export const BlockGlyphSchema = z.enum([
  'heart',
  'brain',
  'wind',
  'droplets',
  'utensils',
  'bone',
  'flask-conical',
]);
export type BlockGlyph = z.infer<typeof BlockGlyphSchema>;

export const SourceDocumentSchema = z.object({
  id: z.string().min(3),
  subjectId: SubjectKeySchema,
  title: LocalizedTextSchema,
  fileName: z.string().min(1),
  format: z.enum(['PDF', 'PPTX', 'DOCX']),
  extent: z.object({
    unit: z.enum(['pages', 'slides', 'lectures']),
    count: z.number().int().positive(),
  }),
  highlights: z.array(z.string()).max(8).default([]),
});
export type SourceDocument = z.infer<typeof SourceDocumentSchema>;

export const SubjectManifestSchema = z.object({
  id: SubjectKeySchema,
  name: LocalizedTextSchema,
  order: z.number().int().positive(),
});
export type SubjectManifest = z.infer<typeof SubjectManifestSchema>;

export const ChapterManifestSchema = z.object({
  id: z.string().min(3),
  subjectId: SubjectKeySchema,
  name: LocalizedTextSchema,
  order: z.number().int().positive(),
  sourceIds: z.array(z.string()).default([]),
});
export type ChapterManifest = z.infer<typeof ChapterManifestSchema>;

export const TopicManifestSchema = z.object({
  id: z.string().min(3),
  chapterId: z.string().min(3),
  name: LocalizedTextSchema,
  order: z.number().int().positive(),
});
export type TopicManifest = z.infer<typeof TopicManifestSchema>;

export const BlockManifestSchema = z.object({
  schemaVersion: z.literal(1),
  block: z.object({
    id: BlockIdSchema,
    code: z.string().min(1), // e.g. "Block 206"
    name: LocalizedTextSchema, // "Cardiovascular System" / "الجهاز القلبي الوعائي"
    shortName: z.string().min(2).max(6), // "CVS"
    description: LocalizedTextSchema,
    status: BlockLifecycleStatusSchema,
    catalogOrder: z.number().int().nonnegative(),
    presentation: z.object({
      glyph: BlockGlyphSchema,
      accent: AccentTokenSchema,
    }),
    aiProfileId: z.string().min(1),
  }),
  subjects: z.array(SubjectManifestSchema).min(1),
  chapters: z.array(ChapterManifestSchema).min(1),
  topics: z.array(TopicManifestSchema).default([]),
  sources: z.array(SourceDocumentSchema).default([]),
});
export type BlockManifest = z.infer<typeof BlockManifestSchema>;
