import { describe, it, expect, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QuestionBankGovernancePanel } from '../QuestionBankGovernancePanel.tsx';
import { AdminAiQuestionParserLab } from '../aiQuestionParser/AdminAiQuestionParserLab.tsx';
import { AdminAccuracyAuditCenter } from '../accuracyAudit/AdminAccuracyAuditCenter.tsx';
import { useBlockContextStore } from '../../../../application/stores/useBlockContextStore.ts';
import { useBankGovernanceStore } from '../../../../application/stores/useBankGovernanceStore.ts';
import { useAdminAiQuestionParserStore } from '../../../../application/stores/useAdminAiQuestionParserStore.ts';
import { useAdminAccuracyAuditStore } from '../../../../application/stores/useAdminAccuracyAuditStore.ts';
import { useQuestionStore } from '../../../../application/stores/useQuestionStore.ts';
import { useAuthStore } from '../../../../application/stores/useAuthStore.ts';
import { edgeQuestionBankGateway } from '../../../../infrastructure/questionBank/edgeQuestionBankGateway.ts';
import { UniformRandomSamplingStrategy } from '../../../../domain/questionBank/accuracyAudit/sampling/UniformRandomSamplingStrategy.ts';
import { StratifiedSamplingStrategy } from '../../../../domain/questionBank/accuracyAudit/sampling/StratifiedSamplingStrategy.ts';
import type { BlockId } from '../../../../domain/curriculum/ids.ts';
import type { Question } from '../../../../domain/model/types.ts';

describe('Global Single Block Switcher & Ingestion Approval Integrity (Apple Standards)', () => {
  beforeEach(async () => {
    // Elevate to platform owner / admin to render governance panels
    await useAuthStore.getState().elevateToPlatformOwner();

    useBlockContextStore.setState({
      activeBlockId: 'cvs' as BlockId,
      status: 'ready',
    });
  });

  it('verifies QuestionBankGovernancePanel contains NO interactive block select, only read-only indicator pill', () => {
    useBlockContextStore.setState({ activeBlockId: 'cvs' as BlockId });

    const html = renderToString(
      <MemoryRouter>
        <QuestionBankGovernancePanel />
      </MemoryRouter>
    );

    // Must NOT have interactive select for Block
    expect(html).not.toContain('aria-label="Select Curriculum Block"');
    // Must contain the Apple-grade read-only indicator pill
    expect(html).toContain('data-testid="governance-active-block-pill"');
    expect(html).toContain('Block 206');
  });

  it('reactively switches active block in Admin Governance and AI Parser when Navbar switches to CNS', () => {
    // Initial state: CVS
    expect(useBlockContextStore.getState().activeBlockId).toBe('cvs');

    // Switch block via global store (driven by Navbar)
    useBlockContextStore.setState({ activeBlockId: 'cns' as BlockId });

    // Both Admin stores must synchronously/reactively match CNS
    expect(useBankGovernanceStore.getState().activeBlockId).toBe('cns');
    expect(useAdminAiQuestionParserStore.getState().targetBlockId).toBe('cns');

    const html = renderToString(
      <MemoryRouter>
        <QuestionBankGovernancePanel />
      </MemoryRouter>
    );

    expect(html).toContain('data-testid="governance-active-block-pill"');
    expect(html).toContain('Block 207');
    expect(html).toContain('Central Nervous System');
  });

  it('verifies AdminAiQuestionParserLab contains NO block selector select element', async () => {
    await useAuthStore.getState().elevateToPlatformOwner();
    useBlockContextStore.setState({ activeBlockId: 'cns' as BlockId });

    const html = renderToString(
      <MemoryRouter>
        <AdminAiQuestionParserLab />
      </MemoryRouter>
    );

    // Target Curriculum Block select dropdown is removed
    expect(html).not.toContain('Target Curriculum Block</label><select');
    // Read-only indicator pill is displayed
    expect(html).toContain('data-testid="ai-parser-active-block-pill"');
    expect(html).toContain('Block 207');
    expect(html).toContain('Controlled via Navbar Switcher');
  });

  it('guarantees getLocalCanonicalBank for CNS does NOT seed 335 CVS questions', async () => {
    const cnsBank = (edgeQuestionBankGateway as any).getLocalCanonicalBank('cns');
    // Must start empty or containing only CNS items, NEVER 335 CVS questions!
    expect(cnsBank.length).not.toBe(335);
    const anyCvs = cnsBank.some((q: any) => q.blockId === 'cvs');
    expect(anyCvs).toBe(false);
  });

  it('approving a parsed batch preserves existing questions and appends without reset', async () => {
    useBlockContextStore.setState({ activeBlockId: 'cns' as BlockId });
    useQuestionStore.setState({ activeBlockId: 'cns', questions: [] });

    // Seed 2 existing questions in CNS
    const initialQ1: Question = {
      id: 'q-cns-ana-001',
      blockId: 'cns',
      subjectId: 'anatomy',
      chapterId: 'cns-ana-embryology-meninges-csf',
      topicId: 'cns-ana-embryology-meninges-csf/neural-tube-defects',
      concept: 'Neural Tube Defects',
      type: 'single-best-answer',
      stem: 'Which embryological failure leads to anencephaly during neural development?',
      choices: [
        { id: 'a', text: 'Failure of anterior neuropore closure', isCorrect: true, rationale: 'Correct.' },
        { id: 'b', text: 'Failure of posterior neuropore closure', isCorrect: false, rationale: 'Incorrect.' },
        { id: 'c', text: 'Failure of caudal eminence formation', isCorrect: false, rationale: 'Incorrect.' },
        { id: 'd', text: 'Failure of neural crest migration', isCorrect: false, rationale: 'Incorrect.' },
      ],
      explanation: 'Anencephaly results from failure of the anterior (rostral) neuropore to close at day 25.',
      examTip: 'Anterior = Anencephaly; Posterior = Spina bifida.',
      mnemonic: null,
      difficulty: 2,
      cognitiveLevel: 'understanding',
      highYield: true,
      origin: 'authored-grounded',
      evidence: [{ chunkId: 'SRC-CNS-1', sourceName: 'CNS Core', location: 'Ch 1', quote: 'Anterior neuropore failure causes anencephaly.', kind: 'text' }],
      status: 'active',
      bankVersion: 2,
    };

    const res = await edgeQuestionBankGateway.createCanonicalQuestions({
      questions: [initialQ1],
      actorId: 'usr_admin',
      actorDisplayName: 'Admin',
      actorRole: 'admin',
    });
    if (!res.ok) {
      console.error('createCanonicalQuestions error:', res.error);
    }

    await useQuestionStore.getState().loadQuestions('cns');
    expect(useQuestionStore.getState().questions.length).toBe(1);

    // Now commit a second question via AI Question Parser store
    const newQ2: Question = {
      id: 'q-cns-ana-002',
      blockId: 'cns',
      subjectId: 'anatomy',
      chapterId: 'cns-ana-embryology-meninges-csf',
      topicId: 'cns-ana-embryology-meninges-csf/meninges-and-dural-folds',
      concept: 'Dural venous sinuses',
      type: 'single-best-answer',
      stem: 'Which dural reflection separates the cerebral hemispheres from the cerebellum?',
      choices: [
        { id: 'a', text: 'Tentorium cerebelli', isCorrect: true, rationale: 'Correct.' },
        { id: 'b', text: 'Falx cerebri', isCorrect: false, rationale: 'Incorrect.' },
        { id: 'c', text: 'Falx cerebelli', isCorrect: false, rationale: 'Incorrect.' },
        { id: 'd', text: 'Diaphragma sellae', isCorrect: false, rationale: 'Incorrect.' },
      ],
      explanation: 'The tentorium cerebelli is a crescent-shaped fold of dura mater.',
      examTip: 'Tentorium covers cerebellum.',
      mnemonic: null,
      difficulty: 1,
      cognitiveLevel: 'recall',
      highYield: true,
      origin: 'authored-grounded',
      evidence: [{ chunkId: 'SRC-CNS-2', sourceName: 'CNS Core', location: 'Ch 2', quote: 'Tentorium cerebelli separates occipital lobes from cerebellum.', kind: 'text' }],
      status: 'active',
      bankVersion: 2,
    };

    useAdminAiQuestionParserStore.setState({
      parsedQuestions: [{
        tempId: 'temp_2',
        rawInputExcerpt: 'Which dural reflection...',
        question: newQ2,
        wasAnswerKeyProvidedInInput: true,
        aiGeneratedAnswerKey: false,
        selectedCorrectChoiceId: 'a',
        confidenceScore: 98,
        warnings: [],
        isApproved: true,
      }],
      selectedTempIds: new Set(['temp_2']),
    });

    const commitSuccess = await useAdminAiQuestionParserStore.getState().commitToGlobalQuestionBank(true);
    expect(commitSuccess).toBe(true);

    // Questions must be cumulative: 1 initial + 1 new = 2 questions (never reset to 1)
    expect(useQuestionStore.getState().questions.length).toBe(2);
    expect(useQuestionStore.getState().questions.map((q) => q.id)).toEqual(['q-cns-ana-001', 'q-cns-ana-002']);
  });

  it('reactively switches active block in AdminAccuracyAuditCenter and prevents x.subjectId undefined crash on empty/filtered pool', async () => {
    await useAuthStore.getState().elevateToPlatformOwner();
    useBlockContextStore.setState({ activeBlockId: 'cns' as BlockId });

    // Store must be in sync with CNS
    expect(useAdminAccuracyAuditStore.getState().samplingConfig.blockId).toBe('cns');

    const html = renderToString(
      <MemoryRouter>
        <AdminAccuracyAuditCenter />
      </MemoryRouter>
    );

    // Verify read-only active block pill is rendered
    expect(html).toContain('data-testid="accuracy-audit-active-block-pill"');
    expect(html).toContain('Block 207');
    expect(html).toContain('Central Nervous System');

    // Verify sampling strategies NEVER crash on empty pools or mismatched blocks
    const uniformStrategy = new UniformRandomSamplingStrategy();
    const stratifiedStrategy = new StratifiedSamplingStrategy('stratified_by_subject');

    expect(() => {
      const res = uniformStrategy.sample([], {
        strategyType: 'uniform_random',
        sampleSize: 20,
        blockId: 'cns',
      });
      expect(res.sampledQuestions).toEqual([]);
      expect(res.sampleSize).toBe(0);
    }).not.toThrow();

    expect(() => {
      const res = stratifiedStrategy.sample([], {
        strategyType: 'stratified_by_subject',
        sampleSize: 20,
        blockId: 'cns',
      });
      expect(res.sampledQuestions).toEqual([]);
      expect(res.sampleSize).toBe(0);
    }).not.toThrow();
  });
});
