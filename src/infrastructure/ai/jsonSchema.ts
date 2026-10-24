/**
 * JSON Schema representations for AI Tool Calling across Groq and Gemini.
 * Derived from the Zod schemas in `src/domain/ai/tools.ts`.
 */
import type { ToolName } from '../../domain/ai/tools.ts';

export function zodToJsonSchema(toolName: ToolName): Record<string, unknown> {
  switch (toolName) {
    case 'highlight_stem_clues':
      return {
        type: 'object',
        properties: {
          clues: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                phrase: {
                  type: 'string',
                  description: 'Exact verbatim substring from the question stem',
                },
                color: {
                  type: 'string',
                  enum: ['diagnostic', 'danger', 'physiology', 'anatomy'],
                  description: 'Semantic highlight color badge',
                },
                meaning: {
                  type: 'string',
                  description: 'Clinical relevance of this clue',
                },
              },
              required: ['phrase', 'color', 'meaning'],
            },
            description: 'List of clues to highlight in the stem',
          },
        },
        required: ['clues'],
      };

    case 'eliminate_choices':
      return {
        type: 'object',
        properties: {
          choiceIds: {
            type: 'array',
            items: { type: 'string', enum: ['a', 'b', 'c', 'd'] },
            description: 'List of incorrect choices to visually cross out',
          },
          reason: {
            type: 'string',
            description: 'Clinical rationale for ruling out these distractors',
          },
        },
        required: ['choiceIds', 'reason'],
      };

    case 'focus_choice':
      return {
        type: 'object',
        properties: {
          choiceId: { type: 'string', enum: ['a', 'b', 'c', 'd'] },
          label: { type: 'string', description: 'Short badge label, e.g. "Key" or "Your pick"' },
        },
        required: ['choiceId', 'label'],
      };

    case 'launch_targeted_retest':
      return {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Title of the retest session' },
          strategy: {
            type: 'string',
            enum: ['same-concept', 'same-topic', 'weakest-topics', 'recent-mistakes'],
          },
          questionCount: { type: 'integer', description: 'Number of questions (5-15)' },
        },
        required: ['title', 'strategy', 'questionCount'],
      };

    case 'save_question_note':
      return {
        type: 'object',
        properties: {
          note: { type: 'string', description: 'High-yield note or mnemonic to persist' },
        },
        required: ['note'],
      };

    case 'toggle_bookmark':
      return {
        type: 'object',
        properties: {
          bookmarked: { type: 'boolean' },
        },
        required: ['bookmarked'],
      };

    case 'reschedule_review':
      return {
        type: 'object',
        properties: {
          intervalDays: { type: 'number', description: 'Days until next spaced review' },
          reason: { type: 'string' },
        },
        required: ['intervalDays', 'reason'],
      };

    case 'render_differential_table':
      return {
        type: 'object',
        properties: {
          title: { type: 'string' },
          rows: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                choiceId: { type: 'string', enum: ['a', 'b', 'c', 'd'] },
                entity: { type: 'string', description: 'Name of the pathology or choice' },
                isCorrect: { type: 'boolean' },
                hallmark: { type: 'string', description: 'Key discriminating feature' },
                verdict: { type: 'string', description: 'Why it fits or does not fit' },
              },
              required: ['entity', 'isCorrect', 'hallmark', 'verdict'],
            },
          },
          examTrap: { type: 'string', description: 'High-yield board trap summary' },
        },
        required: ['title', 'rows', 'examTrap'],
      };

    case 'render_concept_pathway':
      return {
        type: 'object',
        properties: {
          title: { type: 'string' },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                detail: { type: 'string' },
              },
              required: ['label', 'detail'],
            },
          },
          citation: { type: 'string' },
        },
        required: ['title', 'steps'],
      };

    case 'render_curriculum_citation':
      return {
        type: 'object',
        properties: {
          sourceName: { type: 'string', description: 'Faculty slide or document title' },
          location: { type: 'string', description: 'Slide number or page' },
          quote: { type: 'string', description: 'Verbatim evidence excerpt' },
          takeaway: { type: 'string' },
        },
        required: ['sourceName', 'location', 'quote', 'takeaway'],
      };

    case 'navigate_exam':
      return {
        type: 'object',
        properties: {
          target: { type: 'string', enum: ['first-unanswered', 'first-flagged', 'index'] },
          questionIndex: { type: 'integer', description: 'Index to jump to if target is index' },
        },
        required: ['target'],
      };

    case 'audit_bank_coverage':
      return {
        type: 'object',
        properties: {
          minQuestionsPerTopic: { type: 'integer', default: 10 },
        },
        required: ['minQuestionsPerTopic'],
      };

    default:
      return { type: 'object' };
  }
}
