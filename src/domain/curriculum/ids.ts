/**
 * Domain Identity Primitives & Branded Types
 * SPEC-010: Multi-Block Curriculum Architecture
 */

import { z } from 'zod';

declare const brand: unique symbol;
export type Brand<T, B extends string> = T & { readonly [brand]: B };

/** `cvs`, `cns`, `rrs` … lowercase slug, 2–12 chars. */
export type BlockId = Brand<string, 'BlockId'>;

/** Block-LOCAL discipline key (`anatomy`). NOT globally unique — see ADR-010-01. */
export type SubjectKey = Brand<string, 'SubjectKey'>;

/** Globally unique; MUST start with `${blockId}-` (TI-4). */
export type ChapterId = Brand<string, 'ChapterId'>;

/** Globally unique; MUST start with `${chapterId}/` (TI-5). */
export type TopicId = Brand<string, 'TopicId'>;

export type SourceId = Brand<string, 'SourceId'>;

export const BlockIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9]{1,11}$/, 'BlockId must be a lowercase slug (2–12 chars)')
  .transform((s) => s as BlockId);

export const SubjectKeySchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]{1,31}$/)
  .transform((s) => s as SubjectKey);

/** The globally unique identity of a subject. */
export interface SubjectRef {
  readonly blockId: BlockId;
  readonly subjectId: SubjectKey;
}

/** Canonical string form for maps/caches: `cns:anatomy`. */
export const subjectRefKey = (ref: SubjectRef): string => `${ref.blockId}:${ref.subjectId}`;

/** The single sanctioned legacy default. Allowed ONLY in the boot resolver & pack normalizer. */
export const LEGACY_DEFAULT_BLOCK_ID = 'cvs' as BlockId;
