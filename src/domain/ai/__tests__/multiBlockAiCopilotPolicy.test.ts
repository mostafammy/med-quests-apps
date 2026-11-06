import { describe, it, expect } from 'vitest';
import { SystemPromptBuilder } from '../systemPromptBuilder.ts';
import {
  defaultBlockAiProfileRegistry,
  CANONICAL_AI_PROFILES,
} from '../../curriculum/BlockAiProfileRegistry.ts';
import { agentToolRegistry } from '../tools/toolRegistry.ts';
import type { ToolExecutionContext } from '../tools/toolTypes.ts';

describe('Multi-Block AI Copilot Policy (SPEC-010 Phase 7)', () => {
  const cvsProfile = defaultBlockAiProfileRegistry.get('cvs-faculty-v1');
  const cnsProfile = defaultBlockAiProfileRegistry.get('cns-faculty-v1');
  const genericProfile = defaultBlockAiProfileRegistry.get('generic-faculty-v1');

  describe('SystemPromptBuilder Multi-Block Persona Specialization', () => {
    it('injects Cardiovascular Faculty persona and board context for CVS', () => {
      const prompt = new SystemPromptBuilder()
        .withRolePersona(cvsProfile)
        .withToolOrchestrationRules(cvsProfile)
        .build();

      expect(prompt).toContain('Socratic Cardiovascular Faculty Mentor & Pathophysiologist');
      expect(prompt).toContain('Cardiovascular Pathophysiology & Hemodynamics');
      expect(prompt).toContain('University Block 206 (CVS)');
      expect(prompt).toContain('simulate_hemodynamic_pv_loop');
      expect(prompt).toContain('calculate_cardiovascular_equation');
      expect(prompt).not.toContain('localize_neuro_lesion');
    });

    it('injects Neuroscience Faculty persona and board context for CNS, strictly excluding hemodynamics', () => {
      const prompt = new SystemPromptBuilder()
        .withRolePersona(cnsProfile)
        .withToolOrchestrationRules(cnsProfile)
        .build();

      expect(prompt).toContain('Socratic Neuroscience Faculty Mentor & Clinical Neurologist');
      expect(prompt).toContain('Neuroscience, Neuroanatomy & Clinical Neurology');
      expect(prompt).toContain('University Block 207 (CNS)');
      // Hemodynamic tools MUST be excluded
      expect(prompt).not.toContain('simulate_hemodynamic_pv_loop');
      expect(prompt).not.toContain('calculate_cardiovascular_equation');
      // Neuro tools included
      expect(prompt).toContain('localize_neuro_lesion');
      expect(prompt).toContain('explain_cranial_nerve_pathway');
    });

    it('falls back gracefully to neutral medical faculty mentor for generic profile', () => {
      const prompt = new SystemPromptBuilder()
        .withRolePersona(genericProfile)
        .withToolOrchestrationRules(genericProfile)
        .build();

      expect(prompt).toContain('Socratic Medical Faculty Mentor');
      expect(prompt).toContain('Integrated Medical Sciences & Clinical Reasoning');
      expect(prompt).not.toContain('simulate_hemodynamic_pv_loop');
      expect(prompt).not.toContain('localize_neuro_lesion');
      expect(prompt).toContain('simulate_peer_cohort_difficulty');
      expect(prompt).toContain('formulate_clinical_memory_anchor');
    });
  });

  describe('AgentToolRegistry Tool Filtering & Policy Enforcement', () => {
    it('supplies hemodynamic tools in declarations for CVS profile', () => {
      const declarations = agentToolRegistry.getToolDeclarations(undefined, cvsProfile);
      const names = declarations.map((d) => d.function.name);

      expect(names).toContain('simulate_hemodynamic_pv_loop');
      expect(names).toContain('calculate_cardiovascular_equation');
      expect(names).toContain('simulate_peer_cohort_difficulty');
      expect(names).toContain('formulate_clinical_memory_anchor');
    });

    it('strictly omits hemodynamic tools in declarations for CNS profile', () => {
      const declarations = agentToolRegistry.getToolDeclarations(undefined, cnsProfile);
      const names = declarations.map((d) => d.function.name);

      expect(names).not.toContain('simulate_hemodynamic_pv_loop');
      expect(names).not.toContain('calculate_cardiovascular_equation');
      expect(names).toContain('simulate_peer_cohort_difficulty');
      expect(names).toContain('formulate_clinical_memory_anchor');
    });

    it('blocks execution of simulate_hemodynamic_pv_loop when CNS profile is active', async () => {
      const mockContext: ToolExecutionContext = {
        activeQuestion: null,
        safeContext: {
          kind: 'tutor',
          mode: 'practice',
          question: {
            id: 'q-test-1',
            subjectId: 'cardiovascular',
            chapterId: 'pathology',
            topicId: 'valves',
            difficulty: 2,
            highYield: true,
            concept: 'Valvular Disease',
            stem: 'Test stem',
            choices: [],
          },
          disclosure: { state: 'sealed' },
          learner: {
            priorAttempts: 0,
            priorMistakes: 0,
            topicAccuracy: 0.8,
            topicBand: 'strong',
            dangerZoneCountOnTopic: 0,
            overdueReviewCount: 0,
            srsIntervalDays: 1,
            existingNote: null,
          },
          isBookmarked: false,
        },
        questionsBank: [],
      };

      const envelope = await agentToolRegistry.executeTool(
        'call-123',
        'simulate_hemodynamic_pv_loop',
        { lesion: 'aortic_stenosis', severity: 'severe' },
        mockContext,
        cnsProfile
      );

      expect(envelope.status).toBe('blocked');
      expect(envelope.error).toContain("blocked for active profile 'cns-faculty-v1'");
    });

    it('allows execution of simulate_hemodynamic_pv_loop when CVS profile is active', async () => {
      const mockContext: ToolExecutionContext = {
        activeQuestion: null,
        safeContext: {
          kind: 'tutor',
          mode: 'practice',
          question: {
            id: 'q-test-2',
            subjectId: 'cardiovascular',
            chapterId: 'pathology',
            topicId: 'valves',
            difficulty: 2,
            highYield: true,
            concept: 'Valvular Disease',
            stem: 'Test stem',
            choices: [],
          },
          disclosure: { state: 'sealed' },
          learner: {
            priorAttempts: 0,
            priorMistakes: 0,
            topicAccuracy: 0.8,
            topicBand: 'strong',
            dangerZoneCountOnTopic: 0,
            overdueReviewCount: 0,
            srsIntervalDays: 1,
            existingNote: null,
          },
          isBookmarked: false,
        },
        questionsBank: [],
      };

      const envelope = await agentToolRegistry.executeTool(
        'call-456',
        'simulate_hemodynamic_pv_loop',
        { lesion: 'aortic_stenosis', severity: 'severe' },
        mockContext,
        cvsProfile
      );

      expect(envelope.status).toBe('ok');
      expect(envelope.artifactPayload).toBeDefined();
    });
  });

  describe('Registry Consistency & Toolset Invariants', () => {
    it('maps all defined canonical profiles correctly', () => {
      expect(CANONICAL_AI_PROFILES['cvs-faculty-v1'].toolsetIds).toContain('hemodynamics');
      expect(CANONICAL_AI_PROFILES['cns-faculty-v1'].toolsetIds).toContain('neuro-localization');
      expect(CANONICAL_AI_PROFILES['cns-faculty-v1'].toolsetIds).not.toContain('hemodynamics');
    });

    it('permits core diagnostic tools across all profiles', () => {
      const coreTools = [
        'analyze_active_question_vignette',
        'inspect_student_cognitive_telemetry',
        'detect_cognitive_bias_trap',
        'simulate_peer_cohort_difficulty',
        'formulate_clinical_memory_anchor',
        'prescribe_targeted_micro_curriculum',
      ];

      for (const tool of coreTools) {
        expect(defaultBlockAiProfileRegistry.isToolAllowed(cvsProfile, tool)).toBe(true);
        expect(defaultBlockAiProfileRegistry.isToolAllowed(cnsProfile, tool)).toBe(true);
        expect(defaultBlockAiProfileRegistry.isToolAllowed(genericProfile, tool)).toBe(true);
      }
    });
  });
});
