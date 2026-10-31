/**
 * Domain Service: Spatial Choice Presentation Engine & Keyboard Decoupler
 * Feature: 006-psychometric-choice-entropy-and-spatial-presentation
 * Layer: Domain (Pure OOP, Zero I/O, Apple HIG Spatial Consistency)
 */

import type { Choice, ChoiceId, Question } from '../model/types.ts';
import type {
  ISpatialChoicePresentationStrategy,
  SpatialPresentedChoice,
  VisualBadgeLetter,
  VisualSlotIndex,
} from '../../../specs/006-psychometric-choice-entropy-and-spatial-presentation/contracts/choice-entropy-ports.ts';
import {
  Mulberry32DeterministicPrng,
  type IDeterministicPrngPort,
} from './choiceEntropyEngine.ts';

const VISUAL_LETTERS: readonly VisualBadgeLetter[] = ['A', 'B', 'C', 'D'] as const;
const KEYBOARD_DIGITS: readonly ('1' | '2' | '3' | '4')[] = ['1', '2', '3', '4'] as const;

/**
 * 1. Session-Seeded Spatial Presentation Strategy:
 * Deterministically shuffles choices using a seed derived from (sessionId, questionId).
 * Guaranteed to produce the exact same visual order across back/forward navigation
 * in the same test session (zero layout shift), while providing fresh spatial permutations
 * on repeat sessions.
 */
export class SessionSeededSpatialPresentationStrategy
  implements ISpatialChoicePresentationStrategy
{
  public readonly mode = 'session-seeded-shuffle' as const;

  public constructor(
    private readonly prng: IDeterministicPrngPort = new Mulberry32DeterministicPrng()
  ) {}

  public projectChoices(
    question: Pick<Question, 'id' | 'choices'>,
    sessionId: string
  ): readonly SpatialPresentedChoice[] {
    const rawChoices = question.choices || [];
    if (rawChoices.length === 0) return [];

    // Deterministic shuffle keyed to (sessionId, questionId)
    const seedInput = `spatial:${sessionId || 'default-session'}:${question.id}`;
    const shuffled = this.prng.shuffle(rawChoices, seedInput);

    return shuffled.map((choice: Choice, idx: number) => {
      const visualSlotIndex = (idx < 4 ? idx : 3) as VisualSlotIndex;
      const visualBadgeLetter = VISUAL_LETTERS[visualSlotIndex] || 'A';
      const keyboardShortcutDigit = KEYBOARD_DIGITS[visualSlotIndex] || '1';

      return {
        canonicalChoiceId: choice.id as ChoiceId,
        visualSlotIndex,
        visualBadgeLetter,
        keyboardShortcutDigit,
        text: choice.text,
        rationale: choice.rationale || '',
        isCorrect: !!choice.isCorrect,
      };
    });
  }

  public resolveCanonicalChoiceIdBySlot(
    presentedChoices: readonly SpatialPresentedChoice[],
    slotIndex: VisualSlotIndex
  ): ChoiceId | null {
    const target = presentedChoices.find((c) => c.visualSlotIndex === slotIndex);
    return target ? target.canonicalChoiceId : null;
  }
}

/**
 * 2. Canonical Order Presentation Strategy:
 * Displays choices in their literal canonical order ('a', 'b', 'c', 'd')
 * while still adapting them into SpatialPresentedChoice view-models.
 */
export class CanonicalOrderPresentationStrategy
  implements ISpatialChoicePresentationStrategy
{
  public readonly mode = 'canonical-order' as const;

  public projectChoices(
    question: Pick<Question, 'id' | 'choices'>,
    _sessionId?: string
  ): readonly SpatialPresentedChoice[] {
    const rawChoices = question.choices || [];
    return rawChoices.map((choice, idx) => {
      const visualSlotIndex = (idx < 4 ? idx : 3) as VisualSlotIndex;
      const visualBadgeLetter = VISUAL_LETTERS[visualSlotIndex] || 'A';
      const keyboardShortcutDigit = KEYBOARD_DIGITS[visualSlotIndex] || '1';

      return {
        canonicalChoiceId: choice.id as ChoiceId,
        visualSlotIndex,
        visualBadgeLetter,
        keyboardShortcutDigit,
        text: choice.text,
        rationale: choice.rationale || '',
        isCorrect: !!choice.isCorrect,
      };
    });
  }

  public resolveCanonicalChoiceIdBySlot(
    presentedChoices: readonly SpatialPresentedChoice[],
    slotIndex: VisualSlotIndex
  ): ChoiceId | null {
    const target = presentedChoices.find((c) => c.visualSlotIndex === slotIndex);
    return target ? target.canonicalChoiceId : null;
  }
}
