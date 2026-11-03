/**
 * Unit Test: ClientQddAuditRunner
 * Verifies local offline-first bank health audit, MinHash LSH collision grouping,
 * Union-Find clustering, and deterministic survivor election.
 */

import { describe, it, expect } from 'vitest';
import { ClientQddAuditRunner, type AuditProgress } from '../ClientQddAuditRunner.ts';
import type { Question } from '../../../model/types.ts';

function createMockQuestion(
  id: string,
  stem: string,
  correctChoice: 'a' | 'b' = 'a',
  status: 'active' | 'quarantined' = 'active',
  evidenceCount = 1
): Question {
  return {
    id,
    blockId: 'cvs',
    subjectId: 'anatomy',
    chapterId: 'embryology',
    topicId: 'embryology/aortic-arches',
    concept: 'Aortic Arch Embryology',
    type: 'single-best-answer',
    stem,
    choices: [
      { id: 'a', text: 'Left 4th arch', isCorrect: correctChoice === 'a', rationale: 'R1' },
      { id: 'b', text: 'Right 4th arch', isCorrect: correctChoice === 'b', rationale: 'R2' },
      { id: 'c', text: '6th arch', isCorrect: false, rationale: 'R3' },
      { id: 'd', text: '3rd arch', isCorrect: false, rationale: 'R4' },
    ],
    explanation: 'Comprehensive medical explanation of aortic arch derivatives.',
    examTip: null,
    mnemonic: null,
    difficulty: 2,
    cognitiveLevel: 'understanding',
    highYield: true,
    origin: 'authored-grounded',
    evidence: Array.from({ length: evidenceCount }).map((_, idx) => ({
      chunkId: `chk-${idx}`,
      sourceName: 'Robbins Pathology',
      location: `p. ${100 + idx}`,
      quote: 'Evidence text citation',
      kind: 'text' as const,
    })),
    status,
    bankVersion: 1,
  };
}

describe('ClientQddAuditRunner', () => {
  it('handles empty questions list gracefully', async () => {
    const runner = new ClientQddAuditRunner();
    const result = await runner.runAudit([]);

    expect(result.job.total).toBe(0);
    expect(result.job.clustersFound).toBe(0);
    expect(result.job.status).toBe('completed');
    expect(result.clusters).toHaveLength(0);
  });

  it('runs audit on unique questions and finds 0 duplicate clusters', async () => {
    const runner = new ClientQddAuditRunner();
    const questions: Question[] = [
      createMockQuestion('q1', 'What structure derives from the left fourth aortic arch in human development?'),
      createMockQuestion('q2', 'During cardiac looping, which direction does the primitive heart tube fold?'),
      createMockQuestion('q3', 'Which embryological structure forms the smooth part of the right atrium?'),
    ];

    const progressTicks: AuditProgress[] = [];
    const result = await runner.runAudit(
      questions,
      'cvs',
      (p) => progressTicks.push(p),
      { chunkSliceSize: 2, sliceDelayMs: 1 }
    );

    expect(result.job.total).toBe(3);
    expect(result.job.processed).toBe(3);
    expect(result.job.clustersFound).toBe(0);
    expect(result.clusters).toHaveLength(0);
    expect(progressTicks.length).toBeGreaterThan(1);
    expect(progressTicks[progressTicks.length - 1].phase).toBe('completed');
  });

  it('identifies planted duplicate questions and elects highest-status canonical survivor', async () => {
    const runner = new ClientQddAuditRunner();
    const qSurvivor = createMockQuestion(
      'q-survivor',
      'What structure derives from the left fourth aortic arch in adult anatomy?',
      'a',
      'active',
      3
    );
    const qDuplicate = createMockQuestion(
      'q-duplicate',
      'What structure derives from the left fourth aortic arch in adult anatomy?',
      'a',
      'quarantined',
      1
    );

    const questions: Question[] = [qSurvivor, qDuplicate];

    const result = await runner.runAudit(questions, 'cvs', undefined, { chunkSliceSize: 10, sliceDelayMs: 1 });

    expect(result.job.clustersFound).toBe(1);
    expect(result.clusters).toHaveLength(1);
    const cluster = result.clusters[0];
    expect(cluster.relation).toBe('EXACT');
    expect(cluster.memberIds).toContain('q-survivor');
    expect(cluster.memberIds).toContain('q-duplicate');
    // q-survivor is active with 3 citations vs quarantined with 1 citation -> must be elected survivor!
    expect(cluster.suggestedSurvivorId).toBe('q-survivor');
  });

  it('identifies CONFLICT duplicates when stems match but correct answers differ', async () => {
    const runner = new ClientQddAuditRunner();
    const q1 = createMockQuestion('q1', 'Which artery supplies the sinoatrial node?', 'a', 'active');
    const q2 = createMockQuestion('q2', 'Which artery supplies the sinoatrial node?', 'b', 'active');

    const result = await runner.runAudit([q1, q2], 'cvs', undefined, { chunkSliceSize: 10, sliceDelayMs: 1 });

    expect(result.clusters).toHaveLength(1);
    expect(result.clusters[0].relation).toBe('CONFLICT');
  });
});
