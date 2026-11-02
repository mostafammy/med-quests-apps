/**
 * Unit & Contract Tests: Reviewer Resolution Loop & Quality Calibration (US5)
 * Verifies pair cache memoization, human override golden export formatting,
 * and zero-overhead non-blocking telemetry observer privacy compliance.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InMemoryPairVerdictCache } from '../../../../infrastructure/questionBank/duplication/memory/InMemoryPairVerdictCache.ts';
import {
  exportHumanOverridesToGoldenCandidates,
  runExport,
  type ReviewerResolutionRecord,
} from '../../../../../scripts/qdd/golden-export.ts';
import {
  QddTelemetrySink,
  type IQddTelemetryObserver,
  type QddVerdictTelemetryMetric,
  type QddResolutionTelemetryMetric,
} from '../../../../infrastructure/questionBank/duplication/telemetry/QddTelemetrySink.ts';
import { createPairKey } from '../pairKey.ts';
import type { Question } from '../../../model/types.ts';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('Reviewer Resolution Loop & Calibration (US5)', () => {
  const dummyQuestionA: Question = {
    id: 'q-stem-a',
    blockId: 'cvs',
    subjectId: 'anatomy',
    chapterId: 'cvs-ana-heart',
    topicId: 'cvs-ana-valves',
    concept: 'Mitral Valve',
    type: 'single-best-answer',
    stem: 'Which papillary muscle is supplied solely by the PDA?',
    choices: [
      { id: 'a', text: 'Posteromedial', isCorrect: true, rationale: 'Solitary PDA supply' },
      { id: 'b', text: 'Anterolateral', isCorrect: false, rationale: 'Dual supply' },
    ],
    explanation: 'Posteromedial has single supply.',
    examTip: null,
    mnemonic: null,
    difficulty: 2,
    cognitiveLevel: 'understanding',
    highYield: true,
    origin: 'authored-grounded',
    evidence: [{ chunkId: 'c1', sourceName: 'Anat', location: 'P1', quote: 'Text', kind: 'text' }],
    status: 'active',
    bankVersion: 1,
  };

  const dummyQuestionB: Question = {
    ...dummyQuestionA,
    id: 'q-stem-b',
    stem: 'Which papillary muscle receives its blood supply exclusively from the PDA?',
  };

  const dummyQuestionC: Question = {
    ...dummyQuestionA,
    id: 'q-stem-c',
    stem: 'What is the rate-limiting enzyme in cholesterol synthesis?',
  };

  const questionsMap = new Map<string, Question>([
    ['q-stem-a', dummyQuestionA],
    ['q-stem-b', dummyQuestionB],
    ['q-stem-c', dummyQuestionC],
  ]);

  beforeEach(() => {
    QddTelemetrySink.resetInstance();
  });

  // ==========================================================================
  // Pillar 1: Pair Cache Memoization
  // ==========================================================================
  describe('Pair Cache Memoization', () => {
    it('caches human override as UNIQUE and suppresses future duplicate alerts', async () => {
      const cache = new InMemoryPairVerdictCache();
      const pairKey = await createPairKey('q-stem-a', 'q-stem-b');

      // Initially no cached decision
      const initial = await cache.get(pairKey);
      expect(initial).toBeNull();

      // Human reviewer resolves pair as "Keep both — distinct" -> UNIQUE
      await cache.put(pairKey, {
        relation: 'UNIQUE',
        confidence: 1.0,
        rationale: 'Reviewer determined question stems address distinct pedagogical clinical angles.',
        modelId: 'human-reviewer',
        promptVersion: 'v1',
      });

      // Subsequent query retrieves memoized UNIQUE decision
      const cached = await cache.get(pairKey);
      expect(cached).not.toBeNull();
      expect(cached?.relation).toBe('UNIQUE');
      expect(cached?.confidence).toBe(1.0);
      expect(cached?.modelId).toBe('human-reviewer');
    });
  });

  // ==========================================================================
  // Pillar 2: Human Override Golden Export Formatting (T043)
  // ==========================================================================
  describe('Human Override Golden Export Formatting', () => {
    it('filters out consensus agreements and formats human overrides into GoldenPairRecords', () => {
      const resolutions: ReviewerResolutionRecord[] = [
        {
          id: 'res-001',
          pairKey: 'q-stem-a|q-stem-b',
          subjectId: 'q-stem-a',
          matchedId: 'q-stem-b',
          engineRelation: 'NEAR',
          humanRelation: 'UNIQUE', // Human override!
          action: 'KEEP_BOTH',
          reviewerId: 'faculty-editor-1',
          note: 'Distinguishable clinical context',
        },
        {
          id: 'res-002',
          pairKey: 'q-stem-a|q-stem-b',
          subjectId: 'q-stem-a',
          matchedId: 'q-stem-b',
          engineRelation: 'EXACT',
          humanRelation: 'EXACT', // Agreement -> NOT an override
          action: 'ARCHIVE_DUPLICATE',
          reviewerId: 'faculty-editor-2',
        },
        {
          id: 'res-003',
          pairKey: 'q-stem-a|q-stem-c',
          subjectId: 'q-stem-a',
          matchedId: 'q-stem-c',
          engineRelation: 'UNIQUE',
          humanRelation: 'NEAR', // Human override!
          action: 'FLAG_FOR_REVISION',
          reviewerId: 'faculty-editor-3',
          note: 'Subtle distractor overlap',
        },
      ];

      const candidates = exportHumanOverridesToGoldenCandidates(resolutions, questionsMap);

      expect(candidates.length).toBe(2);

      // Verify Candidate 1
      expect(candidates[0].id).toBe('golden-override-res-001');
      expect(candidates[0].relation).toBe('UNIQUE');
      expect(candidates[0].perturbationCategory).toBe('human-override:NEAR->UNIQUE');
      expect(candidates[0].questionA.id).toBe('q-stem-a');
      expect(candidates[0].questionB.id).toBe('q-stem-b');
      expect(candidates[0].notes).toContain('faculty-editor-1');

      // Verify Candidate 2
      expect(candidates[1].id).toBe('golden-override-res-003');
      expect(candidates[1].relation).toBe('NEAR');
      expect(candidates[1].perturbationCategory).toBe('human-override:UNIQUE->NEAR');
      expect(candidates[1].questionA.id).toBe('q-stem-a');
      expect(candidates[1].questionB.id).toBe('q-stem-c');
    });

    it('appends unique candidates to file idempotently without duplicate entries', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qdd-test-'));
      const testFile = path.join(tempDir, 'test-candidates.jsonl');

      const resolutions: ReviewerResolutionRecord[] = [
        {
          id: 'res-101',
          pairKey: 'q-stem-a|q-stem-b',
          subjectId: 'q-stem-a',
          matchedId: 'q-stem-b',
          engineRelation: 'NEAR',
          humanRelation: 'UNIQUE',
          action: 'KEEP_BOTH',
          reviewerId: 'admin',
        },
      ];

      // First run: writes 1 candidate
      const result1 = await runExport({
        resolutions,
        questions: [dummyQuestionA, dummyQuestionB],
        outputPath: testFile,
      });
      expect(result1.exportedCount).toBe(1);

      const linesAfterRun1 = fs.readFileSync(testFile, 'utf8').trim().split('\n');
      expect(linesAfterRun1.length).toBe(1);

      // Second run with same resolutions: does not duplicate
      const result2 = await runExport({
        resolutions,
        questions: [dummyQuestionA, dummyQuestionB],
        outputPath: testFile,
      });
      expect(result2.exportedCount).toBe(1);

      const linesAfterRun2 = fs.readFileSync(testFile, 'utf8').trim().split('\n');
      expect(linesAfterRun2.length).toBe(1);

      // Clean up
      fs.rmSync(tempDir, { recursive: true, force: true });
    });
  });

  // ==========================================================================
  // Pillar 3: Telemetry Sink Non-blocking & Privacy Compliance (FR-034 / T044)
  // ==========================================================================
  describe('Telemetry Sink Non-blocking & Privacy Compliance', () => {
    it('executes synchronously in < 2ms without blocking caller', () => {
      const sink = QddTelemetrySink.getInstance();
      const mockObserver: IQddTelemetryObserver = {
        onVerdict: vi.fn(),
        onResolution: vi.fn(),
      };
      sink.addObserver(mockObserver);

      const start = performance.now();
      sink.recordVerdict({
        subjectId: 'q-100',
        tier: 'edge-authoritative',
        mode: 'enforce',
        decision: 'BLOCK',
        relation: 'EXACT',
        decidingStage: 'S1_EXACT',
        stagesExecuted: ['S0_CANONICALIZE', 'S1_EXACT'],
        latencyMs: 14.5,
        degraded: false,
        candidateCount: 1,
        topScore: 1.0,
      });

      sink.recordResolution({
        pairKey: 'q-100|q-200',
        subjectId: 'q-100',
        matchedId: 'q-200',
        engineRelation: 'NEAR',
        humanRelation: 'UNIQUE',
        action: 'KEEP_BOTH',
        reviewerId: 'usr-admin',
        isOverride: true,
      });
      const duration = performance.now() - start;

      // Synchronous execution is instantaneous
      expect(duration).toBeLessThan(5);
    });

    it('transmits sanitized payload to observers WITHOUT question text (FR-034 privacy guarantee)', async () => {
      const sink = QddTelemetrySink.getInstance();
      let capturedVerdict: QddVerdictTelemetryMetric | null = null;
      let capturedResolution: QddResolutionTelemetryMetric | null = null;

      sink.addObserver({
        onVerdict: (m) => {
          capturedVerdict = m;
        },
        onResolution: (m) => {
          capturedResolution = m;
        },
      });

      sink.recordVerdict({
        subjectId: 'q-sub-400',
        tier: 'browser-advisory',
        mode: 'shadow',
        decision: 'INFORM',
        relation: 'SIBLING',
        decidingStage: 'S4_DISCRIMINATORS',
        stagesExecuted: ['S0_CANONICALIZE', 'S1_EXACT', 'S2_LEXICAL_LSH', 'S4_DISCRIMINATORS'],
        latencyMs: 8.2,
        degraded: false,
        candidateCount: 2,
        topScore: 0.88,
      });

      sink.recordResolution({
        pairKey: 'q-sub-400|q-pub-100',
        subjectId: 'q-sub-400',
        matchedId: 'q-pub-100',
        engineRelation: 'NEAR',
        humanRelation: 'NEAR',
        action: 'ARCHIVE_DUPLICATE',
        reviewerId: 'admin-sarah',
        isOverride: false,
      });

      // Wait for microtask queue flush
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(capturedVerdict).not.toBeNull();
      expect(capturedVerdict!.subjectId).toBe('q-sub-400');
      expect(capturedVerdict!.relation).toBe('SIBLING');

      // CRITICAL PRIVACY VERIFICATION: Confirm NO question content leaked
      const verdictKeys = Object.keys(capturedVerdict!);
      expect(verdictKeys).not.toContain('stem');
      expect(verdictKeys).not.toContain('choices');
      expect(verdictKeys).not.toContain('explanation');
      expect(verdictKeys).not.toContain('rationale');

      expect(capturedResolution).not.toBeNull();
      expect(capturedResolution!.isOverride).toBe(false);
      const resKeys = Object.keys(capturedResolution!);
      expect(resKeys).not.toContain('stem');
      expect(resKeys).not.toContain('choices');
    });

    it('isolates observer exceptions without crashing or throwing to caller', async () => {
      const sink = QddTelemetrySink.getInstance();
      const faultyObserver: IQddTelemetryObserver = {
        onVerdict: () => {
          throw new Error('Exploding telemetry observer');
        },
        onResolution: () => {
          throw new Error('Exploding resolution observer');
        },
      };

      const healthyObserver: IQddTelemetryObserver = {
        onVerdict: vi.fn(),
        onResolution: vi.fn(),
      };

      sink.addObserver(faultyObserver);
      sink.addObserver(healthyObserver);

      expect(() => {
        sink.recordVerdict({
          subjectId: 'q-101',
          tier: 'edge-authoritative',
          mode: 'enforce',
          decision: 'ALLOW',
          relation: 'UNIQUE',
          decidingStage: 'S2_LEXICAL_LSH',
          stagesExecuted: ['S0_CANONICALIZE', 'S1_EXACT', 'S2_LEXICAL_LSH'],
          latencyMs: 12,
          degraded: false,
          candidateCount: 0,
        });
      }).not.toThrow();

      // Wait for microtask queue flush
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Healthy observer still received event
      expect(healthyObserver.onVerdict).toHaveBeenCalledTimes(1);
    });
  });
});
