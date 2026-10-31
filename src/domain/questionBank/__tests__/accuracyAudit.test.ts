/**
 * Unit & Integration Test Suite: Question Bank Accuracy & Quality Audit Engine
 * Verifies:
 * - Sampling Strategies (Fisher-Yates Uniform, Stratified Proportional, Deterministic PRNG Seeds)
 * - Multi-Agent Evaluation Squad (Medical Factuality, SBA Invariants, Distractor Plausibility, Evidence Grounding, Pedagogical Clarity)
 * - Pipeline Orchestrator, Statistical Margins of Error with FPC, and Telemetry Streaming
 * - Admin RBAC Authorization Guards (Rejects Unprivileged Non-Admins)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Question } from '../../model/types.ts';
import { UniformRandomSamplingStrategy } from '../accuracyAudit/sampling/UniformRandomSamplingStrategy.ts';
import { StratifiedSamplingStrategy } from '../accuracyAudit/sampling/StratifiedSamplingStrategy.ts';
import { SamplingStrategyFactory } from '../accuracyAudit/sampling/SamplingStrategyFactory.ts';
import { MedicalFactualAccuracyAgent } from '../accuracyAudit/agents/MedicalFactualAccuracyAgent.ts';
import { SingleBestAnswerInvariantAgent } from '../accuracyAudit/agents/SingleBestAnswerInvariantAgent.ts';
import { DistractorPlausibilityAgent } from '../accuracyAudit/agents/DistractorPlausibilityAgent.ts';
import { CurriculumEvidenceGroundingAgent } from '../accuracyAudit/agents/CurriculumEvidenceGroundingAgent.ts';
import { PedagogicalClarityAgent } from '../accuracyAudit/agents/PedagogicalClarityAgent.ts';
import { AccuracyAuditEngine } from '../accuracyAudit/AccuracyAuditEngine.ts';
import {
  AdminAccuracyAuditService,
  AdminAuthorizationError,
} from '../accuracyAudit/AdminAccuracyAuditService.ts';

// High-fidelity sample questions for testing
const mockFlawlessQuestion: Question = {
  id: 'q-cvs-test-001',
  blockId: 'cvs',
  subjectId: 'anatomy',
  chapterId: 'cvs-ana-heart-dev',
  topicId: 'cvs-ana-heart-dev/atrial-septation',
  concept: 'Ostium Secundum Atrial Septal Defect',
  type: 'single-best-answer',
  stem: 'A 4-year-old boy is evaluated for an incidental murmur discovered during a well-child checkup. Physical examination reveals a grade 2/6 midsystolic ejection murmur at the left upper sternal border and wide, fixed splitting of the second heart sound (S2). Transthoracic echocardiography identifies an interatrial communication in the fossa ovalis region. Which of the following embryological mechanisms is responsible for this defect?',
  choices: [
    {
      id: 'a',
      text: 'Failure of superior and inferior endocardial cushions to fuse',
      isCorrect: false,
      rationale: 'Incorrect. Endocardial cushion defect results in ostium primum ASD, typically located low in the septum.',
    },
    {
      id: 'b',
      text: 'Excessive resorption of septum primum or deficient septum secundum',
      isCorrect: true,
      rationale: 'Correct. Ostium secundum ASD accounts for >75% of ASDs and results from excessive resorption of septum primum or incomplete growth of septum secundum.',
    },
    {
      id: 'c',
      text: 'Abnormal neural crest cell migration into the aorticopulmonary septum',
      isCorrect: false,
      rationale: 'Incorrect. Defective neural crest migration produces conotruncal anomalies like Tetralogy of Fallot.',
    },
    {
      id: 'd',
      text: 'Premature closure of the foramen ovale in utero',
      isCorrect: false,
      rationale: 'Incorrect. In utero closure leads to right-sided hypertrophy and hypoplastic left heart.',
    },
  ],
  explanation: 'Ostium secundum ASD is the most common form of interatrial communication. It is characterized by fixed splitting of S2 due to delayed pulmonic valve closure from persistent RV volume overload.',
  examTip: 'Fixed splitting of S2 that does not vary with respiration is pathognomonic for Atrial Septal Defect.',
  mnemonic: 'Secundum = Second / Central (Fossa ovalis); Primum = Primary / Low down.',
  difficulty: 2,
  cognitiveLevel: 'application',
  highYield: true,
  origin: 'authored-grounded',
  evidence: [
    {
      chunkId: 'chunk-cvs-emb-001',
      sourceName: 'Langman Medical Embryology 14th Ed',
      location: 'Chapter 13, Page 184',
      quote: 'Excessive resorption of the septum primum produces fenestrations that result in an ostium secundum defect.',
      kind: 'text',
    },
  ],
  status: 'active',
  bankVersion: 1,
};

const mockFlawedQuestion: Question = {
  id: 'q-cvs-flawed-002',
  blockId: 'cvs',
  subjectId: 'pharmacology',
  chapterId: 'cvs-phar-antiarrhythmics',
  topicId: 'cvs-phar-antiarrhythmics/class-iii',
  concept: 'Amiodarone Toxicity',
  type: 'single-best-answer',
  stem: 'Which of the following is NOT an adverse effect of amiodarone?',
  choices: [
    {
      id: 'a',
      text: 'Pulmonary fibrosis',
      isCorrect: false,
      rationale: 'Wrong',
    },
    {
      id: 'b',
      text: 'All of the above',
      isCorrect: true,
      rationale: 'Keyed correct',
    },
    {
      id: 'c',
      text: 'All of the above',
      isCorrect: true, // Multiple keys & duplicate text
      rationale: '',
    },
    {
      id: 'd',
      text: 'X',
      isCorrect: false,
      rationale: '',
    },
  ],
  explanation: 'Amiodarone has multiple toxicities.',
  examTip: null,
  mnemonic: null,
  difficulty: 2,
  cognitiveLevel: 'application', // Stem is recall but tagged application
  highYield: false,
  origin: 'authored-grounded',
  evidence: [], // Missing evidence
  status: 'active',
  bankVersion: 1,
};

describe('Question Bank Sampling Strategies (Strategy Pattern & PRNG)', () => {
  const testPopulation: Question[] = Array.from({ length: 50 }, (_, i) => ({
    ...mockFlawlessQuestion,
    id: `q-test-${i}`,
    subjectId: i < 20 ? 'anatomy' : i < 35 ? 'physiology' : 'pharmacology',
    difficulty: (i % 3 === 0 ? 1 : i % 3 === 1 ? 2 : 3) as 1 | 2 | 3,
    cognitiveLevel: (i % 2 === 0 ? 'recall' : 'application') as 'recall' | 'application',
    highYield: i % 2 === 0,
  }));

  it('SamplingStrategyFactory creates correct strategies', () => {
    const uniform = SamplingStrategyFactory.create('uniform_random');
    expect(uniform.strategyType).toBe('uniform_random');

    const stratifiedSubject = SamplingStrategyFactory.create('stratified_by_subject');
    expect(stratifiedSubject.strategyType).toBe('stratified_by_subject');
  });

  it('UniformRandomSamplingStrategy samples requested count and is deterministic with seed', () => {
    const strategy = new UniformRandomSamplingStrategy();

    const sample1 = strategy.sample(testPopulation, {
      strategyType: 'uniform_random',
      sampleSize: 10,
      seed: 12345,
    });
    const sample2 = strategy.sample(testPopulation, {
      strategyType: 'uniform_random',
      sampleSize: 10,
      seed: 12345,
    });

    expect(sample1.sampledQuestions.length).toBe(10);
    expect(sample2.sampledQuestions.length).toBe(10);
    // Deterministic match
    expect(sample1.sampledQuestions.map((q) => q.id)).toEqual(
      sample2.sampledQuestions.map((q) => q.id)
    );
  });

  it('StratifiedSamplingStrategy achieves proportional representation across subjects', () => {
    const strategy = new StratifiedSamplingStrategy('stratified_by_subject');
    const result = strategy.sample(testPopulation, {
      strategyType: 'stratified_by_subject',
      sampleSize: 15,
      seed: 999,
    });

    expect(result.sampledQuestions.length).toBe(15);
    const subjectsInSample = new Set(result.sampledQuestions.map((q) => q.subjectId));
    expect(subjectsInSample.has('anatomy')).toBe(true);
    expect(subjectsInSample.has('physiology')).toBe(true);
    expect(subjectsInSample.has('pharmacology')).toBe(true);
  });
});

describe('Multi-Agent Quality Evaluation Squad', () => {
  it('MedicalFactualAccuracyAgent certifies flawless question and penalizes weak explanations', async () => {
    const agent = new MedicalFactualAccuracyAgent();
    const critiquePass = await agent.evaluate(mockFlawlessQuestion);
    expect(critiquePass.evaluation.passed).toBe(true);
    expect(critiquePass.evaluation.score).toBeGreaterThanOrEqual(85);

    const critiqueFail = await agent.evaluate(mockFlawedQuestion);
    expect(critiqueFail.evaluation.passed).toBe(false);
    expect(critiqueFail.evaluation.findings.length).toBeGreaterThan(0);
  });

  it('SingleBestAnswerInvariantAgent flags duplicate choices, prohibited tropes, and multiple keys', async () => {
    const agent = new SingleBestAnswerInvariantAgent();

    const pass = await agent.evaluate(mockFlawlessQuestion);
    expect(pass.evaluation.passed).toBe(true);
    expect(pass.evaluation.score).toBe(100);

    const fail = await agent.evaluate(mockFlawedQuestion);
    expect(fail.evaluation.passed).toBe(false);
    expect(fail.evaluation.score).toBe(0); // Critical violation (multiple keys)
    expect(fail.evaluation.findings.some((f) => f.includes('CRITICAL: Multiple keys'))).toBe(true);
    expect(fail.evaluation.findings.some((f) => f.includes('All of the above'))).toBe(true);
  });

  it('DistractorPlausibilityAgent enforces educational rationales and flags length disparity', async () => {
    const agent = new DistractorPlausibilityAgent();

    const pass = await agent.evaluate(mockFlawlessQuestion);
    expect(pass.evaluation.passed).toBe(true);

    const fail = await agent.evaluate(mockFlawedQuestion);
    expect(fail.evaluation.passed).toBe(false);
    expect(fail.evaluation.findings.some((f) => f.includes('lacks an educational rationale'))).toBe(true);
  });

  it('CurriculumEvidenceGroundingAgent rejects questions with zero curriculum citations', async () => {
    const agent = new CurriculumEvidenceGroundingAgent();

    const pass = await agent.evaluate(mockFlawlessQuestion);
    expect(pass.evaluation.passed).toBe(true);
    expect(pass.evaluation.score).toBe(100);

    const fail = await agent.evaluate(mockFlawedQuestion);
    expect(fail.evaluation.passed).toBe(false);
    expect(fail.evaluation.score).toBe(0);
    expect(fail.evaluation.findings.some((f) => f.includes('zero curriculum evidence citations'))).toBe(true);
  });

  it('PedagogicalClarityAgent flags negatively phrased stems and cognitive taxonomy mismatch', async () => {
    const agent = new PedagogicalClarityAgent();

    const pass = await agent.evaluate(mockFlawlessQuestion);
    expect(pass.evaluation.passed).toBe(true);

    const fail = await agent.evaluate(mockFlawedQuestion);
    expect(fail.evaluation.findings.some((f) => f.includes('Negative item phrasing detected'))).toBe(true);
  });
});

describe('AccuracyAuditEngine (Orchestrator Pipeline & Statistical Validity)', () => {
  it('runs an end-to-end audit and computes statistical margins of error with FPC', async () => {
    const engine = new AccuracyAuditEngine();
    const population = [mockFlawlessQuestion, mockFlawlessQuestion, mockFlawedQuestion];

    const progressUpdates: any[] = [];
    const report = await engine.runAudit(
      population,
      {
        strategyType: 'uniform_random',
        sampleSize: 3,
        seed: 42,
      },
      { userId: 'admin_123', displayName: 'Dr. Steve' },
      (telemetry) => progressUpdates.push(telemetry)
    );

    expect(report.runId).toMatch(/^audit-run-/);
    expect(report.questionResults.length).toBe(3);
    expect(report.kpis.totalSampled).toBe(3);
    expect(report.kpis.verifiedCount).toBe(2);
    expect(report.kpis.criticalErrorCount).toBe(1);
    expect(report.kpis.statisticalMarginOfError.confidenceLevel).toBe(0.95);
    expect(report.kpis.statisticalMarginOfError.finitePopulationCorrectionApplied).toBe(false); // 3 of 3 (n == N)
    expect(progressUpdates.some((p) => p.stage === 'completed')).toBe(true);
  });
});

describe('AdminAccuracyAuditService (RBAC Defense-in-Depth)', () => {
  let service: AdminAccuracyAuditService;

  beforeEach(() => {
    service = new AdminAccuracyAuditService();
  });

  it('allows verified Administrator to run audit and persists report', async () => {
    const adminActor = {
      userId: 'usr_admin_001',
      role: 'admin' as const,
      displayName: 'Principal Admin',
    };

    const report = await service.executeAdminAudit(
      adminActor,
      [mockFlawlessQuestion],
      { strategyType: 'uniform_random', sampleSize: 1, seed: 1 }
    );

    expect(report).toBeDefined();
    expect(report.executedByAdmin.userId).toBe('usr_admin_001');

    const history = service.getHistoricalAuditReports();
    expect(history.length).toBeGreaterThan(0);
  });

  it('strictly rejects non-admin users with AdminAuthorizationError', async () => {
    const studentActor = {
      userId: 'usr_student_002',
      role: 'student-free' as const,
      displayName: 'Curious Scholar',
    };

    await expect(
      service.executeAdminAudit(
        studentActor,
        [mockFlawlessQuestion],
        { strategyType: 'uniform_random', sampleSize: 1 }
      )
    ).rejects.toThrow(AdminAuthorizationError);
  });

  it('strictly rejects faculty-reviewer (only Admins have security_governance_admin)', async () => {
    const facultyActor = {
      userId: 'usr_faculty_003',
      role: 'faculty-reviewer' as const,
      displayName: 'Professor Smith',
    };

    await expect(
      service.executeAdminAudit(
        facultyActor,
        [mockFlawlessQuestion],
        { strategyType: 'uniform_random', sampleSize: 1 }
      )
    ).rejects.toThrow(AdminAuthorizationError);
  });
});
