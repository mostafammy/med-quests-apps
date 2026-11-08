/**
 * @deprecated SPEC-010: Do not import CVS_TAXONOMY directly in new code.
 * Use useActiveTaxonomy() or BlockCatalog.get(activeBlockId) instead.
 *
 * This file serves as a Strangler Fig adapter preserving 100% backward compatibility
 * for existing modules during the multi-block migration.
 */

import type { Taxonomy } from '../model/types.ts';
import type { BlockManifest } from '../curriculum/schemas.ts';
import cvsManifest from '../../../content/cvs/manifest.json';
import { LegacyTaxonomyAdapter } from '../curriculum/LegacyTaxonomyAdapter.ts';

export const CVS_TAXONOMY: Taxonomy = LegacyTaxonomyAdapter.manifestToTaxonomy(
  cvsManifest as unknown as BlockManifest
);

