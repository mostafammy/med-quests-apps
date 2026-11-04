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
});
