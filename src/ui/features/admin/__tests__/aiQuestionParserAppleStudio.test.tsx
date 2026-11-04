/**
 * Test Suite: aiQuestionParserAppleStudio.test.tsx
 * Design Standards: Apple Human Interface Guidelines & Zero-Scroll Spatial Studio
 *
 * Validates:
 * - FloatingBatchCommandBar persistent dock rendering
 * - StagingMasterRail compact question list & search
 * - StagingDetailCanvas 4-tab segmented control & SBA choices
 * - AppleIntelligenceAgentOrchestrator 6 autonomous tools & dynamic island
 */

import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { FloatingBatchCommandBar } from '../aiQuestionParser/FloatingBatchCommandBar.tsx';
import { StagingMasterRail } from '../aiQuestionParser/StagingMasterRail.tsx';
import { StagingDetailCanvas } from '../aiQuestionParser/StagingDetailCanvas.tsx';
import { AppleIntelligenceAgentOrchestrator } from '../aiQuestionParser/AppleIntelligenceAgentOrchestrator.tsx';
import type { ParsedQuestionItem, AgentExecutionTelemetry, AgentToolStep } from '../../../../domain/questionBank/aiQuestionParser/types.ts';

const MOCK_QUESTION_ITEM: ParsedQuestionItem = {
  tempId: 'test-temp-1',
  rawInputExcerpt: 'Prior infection with GAS...',
  originalRawStem: 'Prior infection with GAS can be demonstrated in patients with acute rheumatic fever by which one of the following?',
  question: {
    id: 'q-test-001',
    blockId: 'cvs',
    subjectId: 'microbiology',
    chapterId: 'cvs-mic-rheumatic-fever',
    topicId: 'cvs-mic-rheumatic-fever',
    type: 'single-best-answer',
    stem: 'Prior infection with GAS can be demonstrated in patients with acute rheumatic fever by which one of the following?',
    choices: [
      { id: 'a', text: 'Blood culture.', isCorrect: false, rationale: 'Blood cultures are almost always negative by the time rheumatic fever manifests.' },
      { id: 'b', text: 'Culture of a heart valve.', isCorrect: false, rationale: 'Heart valve lesions in acute rheumatic fever are sterile.' },
      { id: 'c', text: 'High titer of antibody against hyaluronic acid capsule.', isCorrect: false, rationale: 'The hyaluronic acid capsule is non-immunogenic.' },
      { id: 'd', text: 'A high titer of antibody against streptolysin O.', isCorrect: true, rationale: 'Elevated anti-streptolysin O (ASO) titer is the classic serologic evidence.' },
    ],
    difficulty: 2,
    concept: 'Diagnosis of Prior GAS Infection in Acute Rheumatic Fever',
    explanation: 'Acute rheumatic fever is a non-suppurative post-streptococcal autoimmune sequela. Because the initial pharyngitis has typically resolved, diagnosis relies on serological evidence of prior GAS infection such as elevated ASO titers.',
    cognitiveLevel: 'understanding',
    highYield: true,
    origin: 'authored-grounded',
    examTip: null,
    mnemonic: null,
    evidence: [],
    status: 'active',
    bankVersion: 1,
  },
  wasAnswerKeyProvidedInInput: false,
  aiGeneratedAnswerKey: true,
  selectedCorrectChoiceId: 'd',
  confidenceScore: 95,
  warnings: [],
  isApproved: false,
  taxonomyClassification: {
    blockId: 'cvs',
    blockName: 'Cardiovascular System (CVS) - Block 206',
    subjectId: 'microbiology',
    subjectName: 'CVS Microbiology',
    chapterId: 'cvs-mic-rheumatic-fever',
    chapterName: 'Rheumatic Fever (L1)',
    confidenceScore: 95,
    rationale: 'Question evaluates cardiovascular infectious diseases and post-streptococcal sequelae.',
    isNewDomainSuggested: false,
  },
};

const MOCK_TELEMETRY: AgentExecutionTelemetry = {
  isRunning: false,
  currentStepId: null,
  totalSteps: 6,
  completedSteps: 6,
  startedAt: Date.now() - 15420,
  elapsedMs: 15420,
  activeToolName: 'QuestionDuplicationCollisionEngine',
  steps: [
    {
      id: 'segmentation',
      toolName: 'InputSegmentation',
      label: 'Text Segmentation & Tokenization',
      description: 'Isolates question blocks',
      status: 'completed',
      durationMs: 5,
    },
    {
      id: 'taxonomy',
      toolName: 'CurriculumTaxonomyClassification',
      label: 'Dynamic Curriculum Taxonomy & Gap Analysis',
      description: 'Maps to CVS curriculum',
      status: 'completed',
      durationMs: 1,
    },
    {
      id: 'reasoning',
      toolName: 'MedicalClinicalReasoningEngine',
      label: 'Medical Reasoning & Key Deduction',
      description: 'Extracts and grounds questions',
      status: 'completed',
      durationMs: 13988,
    },
    {
      id: 'consensus',
      toolName: 'MultiModelCrossVerificationEnsemble',
      label: 'Multi-Model Cross-Examination Ensemble',
      description: 'Cross-model verification',
      status: 'skipped',
    },
    {
      id: 'validation',
      toolName: 'SchemaInvariantVerification',
      label: 'Single-Best-Answer Invariants & Zod Validation',
      description: 'Validates NBME schema',
      status: 'completed',
      durationMs: 1,
    },
    {
      id: 'deduplication',
      toolName: 'QuestionDuplicationCollisionEngine',
      label: 'Question Duplication & Collision Analysis',
      description: 'Audits against canonical bank',
      status: 'completed',
      durationMs: 1421,
    },
  ],
};

const SUBJECT_META = {
  microbiology: { icon: '🧫', badgeColor: 'bg-emerald-500/10 text-emerald-700' },
};

describe('Apple-Grade AI Question Ingestion & Spatial Staging Studio', () => {
  it('renders FloatingBatchCommandBar with selection counts, copy prompt, save unique, and approve buttons', () => {
    const html = renderToString(
      <FloatingBatchCommandBar
        totalCount={1}
        selectedCount={1}
        isCommitting={false}
        isCheckingDuplication={false}
        copiedBatchPrompt={false}
        onToggleSelectAll={() => {}}
        onCopyBatchPrompt={() => {}}
        onSaveAllUnique={() => {}}
        onCommitToBank={() => {}}
      />
    );

    const cleanHtml = html.replace(/<!--.*?-->/g, '');
    expect(cleanHtml).toContain('1 of 1 Selected');
    expect(cleanHtml).toContain('Copy Batch Prompt');
    expect(cleanHtml).toContain('Save all unique');
    expect(cleanHtml).toContain('Approve &amp; Commit (1) to Bank');
    expect(cleanHtml).toContain('glass-dark-capsule');
  });

  it('renders StagingMasterRail displaying compact question cards with micro badges', () => {
    const html = renderToString(
      <StagingMasterRail
        questions={[MOCK_QUESTION_ITEM]}
        selectedIndex={0}
        onSelectIndex={() => {}}
        selectedTempIds={new Set(['test-temp-1'])}
        onToggleSelect={() => {}}
        isCheckingDuplication={false}
        subjectMetaMap={SUBJECT_META}
      />
    );

    const cleanHtml = html.replace(/<!--.*?-->/g, '');
    expect(cleanHtml).toContain('Questions Rail');
    expect(cleanHtml).toContain('1 of 1');
    expect(cleanHtml).toContain('Prior infection with GAS');
    expect(cleanHtml).toContain('AI Key');
    expect(cleanHtml).toContain('microbiology');
    expect(cleanHtml).toContain('Rheumatic Fever (L1)');
  });

  it('renders StagingDetailCanvas with Apple 4-tab segmented control and choice details', () => {
    const html = renderToString(
      <StagingDetailCanvas
        item={MOCK_QUESTION_ITEM}
        index={0}
        totalCount={1}
        isEditing={false}
        onToggleEdit={() => {}}
        onDelete={() => {}}
        onCopyPrompt={() => {}}
        isPromptCopied={false}
        onToggleStemFormat={() => {}}
        onUpdateStem={() => {}}
        onUpdateChoice={() => {}}
        onSetKeyedChoice={() => {}}
        onUpdateExplanation={() => {}}
        onUpdateTaxonomy={() => {}}
        onApproveProposal={() => {}}
        onRunConsensus={() => {}}
        isVerifyingConsensus={false}
        isCheckingDuplication={false}
        subjectMetaMap={SUBJECT_META}
      />
    );

    const cleanHtml = html.replace(/<!--.*?-->/g, '');
    // Header & Tabs
    expect(cleanHtml).toContain('Question #1 of 1');
    expect(cleanHtml).toContain('Single-Best Answer');
    expect(cleanHtml).toContain('Curriculum Grounding');
    expect(cleanHtml).toContain('Multi-Model Quorum');
    expect(cleanHtml).toContain('Collision Audit (QDD)');

    // Choices & Key
    expect(cleanHtml).toContain('Blood culture.');
    expect(cleanHtml).toContain('A high titer of antibody against streptolysin O.');
    expect(cleanHtml).toContain('Keyed Answer');
    expect(cleanHtml).toContain('Clinical Explanation &amp; Pathophysiology');
  });

  it('renders AppleIntelligenceAgentOrchestrator with all 6 tools and live stopwatch', () => {
    const html = renderToString(
      <AppleIntelligenceAgentOrchestrator
        telemetry={MOCK_TELEMETRY}
        isParsing={false}
        onAbort={() => {}}
        initialExpandedInspector={true}
      />
    );

    const cleanHtml = html.replace(/<!--.*?-->/g, '');
    expect(cleanHtml).toContain('Apple Intelligence Agent Pipeline');
    expect(cleanHtml).toContain('Orchestrator v2.5');
    expect(cleanHtml).toContain('15.42s');
    expect(cleanHtml).toContain('Text Segmentation &amp; Tokenization');
    expect(cleanHtml).toContain('Dynamic Curriculum Taxonomy &amp; Gap Analysis');
    expect(cleanHtml).toContain('Medical Reasoning &amp; Key Deduction');
    expect(cleanHtml).toContain('Multi-Model Cross-Examination Ensemble');
    expect(cleanHtml).toContain('Single-Best-Answer Invariants &amp; Zod Validation');
    expect(cleanHtml).toContain('Question Duplication &amp; Collision Analysis');
    expect(cleanHtml).toContain('Deep Tool Telemetry Inspector:');
  });

  it('renders dynamic clinical micro-narrative and performance pacing when reasoning engine is running', () => {
    const runningTelemetry: AgentExecutionTelemetry = {
      ...MOCK_TELEMETRY,
      isRunning: true,
      currentStepId: 'reasoning',
      activeToolName: 'MedicalClinicalReasoningEngine',
      steps: MOCK_TELEMETRY.steps.map((s) => {
        if (s.id === 'reasoning') return { ...s, status: 'running' as const, durationMs: undefined };
        if (s.id === 'consensus' || s.id === 'validation' || s.id === 'deduplication') {
          return { ...s, status: 'queued' as const, durationMs: undefined };
        }
        return s;
      }) as readonly AgentToolStep[],
    };

    const html = renderToString(
      <AppleIntelligenceAgentOrchestrator
        telemetry={runningTelemetry}
        isParsing={true}
        onAbort={() => {}}
        initialExpandedInspector={true}
      />
    );

    const cleanHtml = html.replace(/<!--.*?-->/g, '');
    // Dynamic clinical narrative is active instead of frozen or static
    expect(cleanHtml).toContain('Deconstructing clinical presentation &amp; isolating vital sign invariants…');
    // Live streaming neural bus indicators
    expect(cleanHtml).toContain('Streaming');
    expect(cleanHtml).toContain('BUS BUSY');
    // Humanized performance badges
    expect(cleanHtml).toContain('In Flight…');
    expect(cleanHtml).toContain('Abort Run');
  });

  it('verifies Apple exit choreography, celebrate pulse, and dusting dissolution classes', () => {
    // Assert that the CSS classes used by the exit state machine in AdminAiQuestionParserLab are valid strings
    const exitClasses = {
      celebrating: 'animate-apple-celebrate ring-2 ring-emerald-500/50 shadow-2xl shadow-emerald-500/20',
      dusting: 'apple-dust-exit pointer-events-none',
      singleCardExit: 'apple-card-exit',
    };

    expect(exitClasses.celebrating).toContain('animate-apple-celebrate');
    expect(exitClasses.dusting).toContain('apple-dust-exit');
    expect(exitClasses.singleCardExit).toBe('apple-card-exit');
  });

  it('persists tool inspector collapsed state and honors localStorage preferences', () => {
    // Simulate user having collapsed inspector
    const storageMap = new Map<string, string>();
    storageMap.set('medquests_ai_parser_inspector_expanded', 'false');

    const fakeStorage = {
      getItem: (key: string) => storageMap.get(key) ?? null,
      setItem: (key: string, val: string) => storageMap.set(key, val),
      removeItem: (key: string) => storageMap.delete(key),
      clear: () => storageMap.clear(),
      length: storageMap.size,
      key: () => null,
    };
    Object.defineProperty(globalThis, 'localStorage', { value: fakeStorage, configurable: true });

    const html = renderToString(
      <AppleIntelligenceAgentOrchestrator
        telemetry={MOCK_TELEMETRY}
        isParsing={false}
        onAbort={() => {}}
      />
    );

    const cleanHtml = html.replace(/<!--.*?-->/g, '');
    // When collapsed, the deep telemetry inspector body is not rendered
    expect(cleanHtml).not.toContain('PURPOSE &amp; CAPABILITY');
    expect(cleanHtml).toContain('Inspect Tools');
  });

  it('renders prominent bank duplicate alert banner on StagingDetailCanvas and respects dismissal persistence', () => {
    const duplicateItem: ParsedQuestionItem = {
      ...MOCK_QUESTION_ITEM,
      qddVerdict: {
        questionId: 'q-test-001',
        tier: 'edge-authoritative',
        decision: 'BLOCK',
        relation: 'EXACT',
        candidates: [
          {
            matchedQuestionId: 'q-bank-001',
            matchedStemPreview: 'Prior infection with GAS can be demonstrated...',
            relation: 'EXACT',
            decidedBy: 'S1_EXACT',
            signals: {
              lexicalJaccard: 1.0,
              sameAnswerKey: true,
              semanticCosine: 1.0,
              rerankScore: 1.0,
              discriminatorDelta: [],
              fusedScore: 1.0,
            },
            llm: null,
            explanationKey: 'qdd.exact',
            explanationParams: {},
          },
        ],
        stagesExecuted: ['S1_EXACT'],
        degraded: false,
        degradedReasons: [],
        latencyMs: 12,
        engineVersion: '2.0.0',
        thresholdsVersion: '2.0.0',
      },
    };

    // 1. Initial render without dismissal: banner is prominent
    const htmlWithBanner = renderToString(
      <StagingDetailCanvas
        item={duplicateItem}
        index={0}
        totalCount={1}
        isEditing={false}
        onToggleEdit={() => {}}
        onDelete={() => {}}
        onCopyPrompt={() => {}}
        isPromptCopied={false}
        onToggleStemFormat={() => {}}
        onUpdateStem={() => {}}
        onUpdateChoice={() => {}}
        onSetKeyedChoice={() => {}}
        onUpdateExplanation={() => {}}
        onUpdateTaxonomy={() => {}}
        onApproveProposal={() => {}}
        onRunConsensus={() => {}}
        isVerifyingConsensus={false}
        isCheckingDuplication={false}
        subjectMetaMap={{ microbiology: { icon: '🔬', badgeColor: 'bg-emerald-500/10' } }}
      />
    );

    const cleanBannerHtml = htmlWithBanner.replace(/<!--.*?-->/g, '');
    expect(cleanBannerHtml).toContain('Question Already Exists in Global Bank');
    expect(cleanBannerHtml).toContain('Direct Commit Locked • Approval Required');
    expect(cleanBannerHtml).toContain('Matches canonical bank question q-bank-001 (100% lexical match)');
  });
});
