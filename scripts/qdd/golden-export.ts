/**
 * Script: golden-export.ts
 * Purpose: Export human reviewer overrides from qdd_resolutions into
 * append-only evaluation candidates for the golden benchmark dataset (qdd-golden.vN.jsonl).
 *
 * Implements User Story 5 (T043) - Continuous Quality Calibration Loop.
 * Run with: node --experimental-strip-types scripts/qdd/golden-export.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Question } from '../../src/domain/model/types.ts';
import type {
  DuplicateRelation,
  GoldenPairRecord,
} from './generate-synthetic-golden.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

export interface ReviewerResolutionRecord {
  readonly id: string;
  readonly pairKey: string;
  readonly subjectId: string;
  readonly matchedId: string;
  readonly engineRelation: DuplicateRelation;
  readonly humanRelation: DuplicateRelation;
  readonly action: string;
  readonly reviewerId: string;
  readonly note?: string | null;
  readonly resolvedAt?: string;
}

/**
 * Pure Domain Function: Filters resolutions for human overrides
 * (humanRelation !== engineRelation) and maps them to append-only GoldenPairRecords.
 */
export function exportHumanOverridesToGoldenCandidates(
  resolutions: readonly ReviewerResolutionRecord[],
  questionsById: ReadonlyMap<string, Question>
): readonly GoldenPairRecord[] {
  const candidates: GoldenPairRecord[] = [];

  for (const res of resolutions) {
    // Only human overrides become golden benchmark candidates
    const isOverride = res.humanRelation !== res.engineRelation;
    if (!isOverride) continue;

    const qA = questionsById.get(res.subjectId);
    const qB = questionsById.get(res.matchedId);

    if (!qA || !qB) {
      // If either question is missing from the provided catalog, skip with warning
      continue;
    }

    candidates.push({
      id: `golden-override-${res.id}`,
      relation: res.humanRelation,
      perturbationCategory: `human-override:${res.engineRelation}->${res.humanRelation}`,
      questionA: qA,
      questionB: qB,
      notes: `Reviewer override by ${res.reviewerId} (action: ${res.action}): ${res.note || 'No notes'}`,
    });
  }

  return candidates;
}

/**
 * CLI Execution Handler
 */
export async function runExport(options?: {
  readonly resolutions?: readonly ReviewerResolutionRecord[];
  readonly questions?: readonly Question[];
  readonly outputPath?: string;
}): Promise<{ exportedCount: number; outputPath: string }> {
  const catalogPath = path.join(ROOT_DIR, 'content/cvs/dist/bank.v1.json');
  const targetPath =
    options?.outputPath ||
    path.join(ROOT_DIR, 'test/golden/qdd-golden-candidates.jsonl');

  // Load questions
  let rawQuestions: Question[] = [];
  if (options?.questions) {
    rawQuestions = [...options.questions];
  } else if (fs.existsSync(catalogPath)) {
    const rawData = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    rawQuestions = Array.isArray(rawData) ? rawData : rawData.questions || [];
  }

  const questionsById = new Map<string, Question>();
  for (const q of rawQuestions) {
    questionsById.set(q.id, q);
  }

  // Load resolutions
  const resolutions = options?.resolutions || [];

  const candidatePairs = exportHumanOverridesToGoldenCandidates(
    resolutions,
    questionsById
  );

  if (candidatePairs.length > 0) {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });

    // Read existing IDs to avoid duplicate appends
    const existingIds = new Set<string>();
    if (fs.existsSync(targetPath)) {
      const existingLines = fs.readFileSync(targetPath, 'utf8').split('\n');
      for (const line of existingLines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.id) existingIds.add(parsed.id);
        } catch {
          // ignore malformed lines
        }
      }
    }

    const newCandidates = candidatePairs.filter((c) => !existingIds.has(c.id));
    if (newCandidates.length > 0) {
      const appendData =
        newCandidates.map((c) => JSON.stringify(c)).join('\n') + '\n';
      fs.appendFileSync(targetPath, appendData, 'utf8');
    }
  }

  return {
    exportedCount: candidatePairs.length,
    outputPath: targetPath,
  };
}

// Direct execution guard
if (process.argv[1] === __filename) {
  runExport().then((result) => {
    console.log(
      `QDD Golden Exporter finished: ${result.exportedCount} overrides processed -> ${result.outputPath}`
    );
  });
}
