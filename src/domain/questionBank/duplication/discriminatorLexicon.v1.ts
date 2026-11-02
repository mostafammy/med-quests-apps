/**
 * Domain Lexicon: Clinical Discriminators (v1)
 * Curated lexicons for clinical qualifiers that define distinct assessment targets.
 * Presence of a discriminator delta between two items prevents false duplicate merges (P2).
 */

import type { ClinicalDiscriminatorKind } from '../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';

export interface DiscriminatorPattern {
  readonly kind: ClinicalDiscriminatorKind;
  readonly regex: RegExp;
  readonly formatToken: (match: RegExpExecArray) => string;
}

export const CLINICAL_DISCRIMINATOR_PATTERNS: readonly DiscriminatorPattern[] = [
  // 1. NEGATION (Critical pedagogical inverters)
  {
    kind: 'NEGATION',
    regex: /\b(not|except|least\s+likely|false|incorrect|never|without|neither|nor)\b/gi,
    formatToken: (m) => `NEGATION:${m[0].toLowerCase().replace(/\s+/g, '_')}`,
  },

  // 2. LATERALITY (Anatomical spatial orientation)
  {
    kind: 'LATERALITY',
    regex: /\b(left|right|bilateral|unilateral|ipsilateral|contralateral|anterior|posterior|superior|inferior|proximal|distal|medial|lateral)\b/gi,
    formatToken: (m) => `LATERALITY:${m[0].toLowerCase()}`,
  },

  // 3. NUMERIC & QUANTITATIVE THRESHOLDS (Vital signs, lab values, dosages, intervals, ranges)
  {
    kind: 'NUMERIC',
    regex: /\b(phase|stage|type|grade|class)\s*([0-9ivx]+)\b/gi,
    formatToken: (m) => `NUMERIC:${m[1].toLowerCase()}_${m[2].toLowerCase()}`,
  },
  {
    kind: 'NUMERIC',
    regex: /\b(\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?)\s*([a-zA-Z%]+)?/gi,
    formatToken: (m) => `NUMERIC:range_${m[1]}_${m[2]}${m[3] ? `|${m[3].toLowerCase()}` : ''}`,
  },
  {
    kind: 'NUMERIC',
    regex: /\b(\d+(?:\.\d+)?)\s*[-\s]*\s*(mmhg|bpm|mg|g|mcg|ml|l|%|weeks|months|years|days|hours|seconds|second|sec|ms|min|minute|minutes|mmol|meq|cm|mm|c)\b/gi,
    formatToken: (m) => `NUMERIC:${m[1]}|${m[2].toLowerCase()}`,
  },
  {
    kind: 'NUMERIC',
    regex: /\b(\d{2,3}\/\d{2,3})\s*(?:mmhg)?\b/gi, // Blood pressure values e.g. 120/80
    formatToken: (m) => `NUMERIC:${m[1]}|bp`,
  },

  // 4. DEMOGRAPHICS & CLINICAL POPULATION
  {
    kind: 'DEMOGRAPHIC',
    regex: /\b(neonate|infant|child|pediatric|adolescent|adult|geriatric|elderly|male|female|pregnant|postpartum)\b/gi,
    formatToken: (m) => `DEMOGRAPHIC:${m[0].toLowerCase()}`,
  },

  // 5. SUPERLATIVES & CLINICAL PRIORITY
  {
    kind: 'SUPERLATIVE',
    regex: /\b(most\s+common|least\s+common|first[\s-]line|gold\s+standard|definitive|best\s+initial|most\s+likely|least\s+likely|contraindicated)\b/gi,
    formatToken: (m) => `SUPERLATIVE:${m[0].toLowerCase().replace(/[\s-]+/g, '_')}`,
  },

  // 6. TEMPORAL ACUITY
  {
    kind: 'TEMPORAL',
    regex: /\b(acute|subacute|chronic|recurrent|immediate|delayed|paroxysmal)\b/gi,
    formatToken: (m) => `TEMPORAL:${m[0].toLowerCase()}`,
  },
];
