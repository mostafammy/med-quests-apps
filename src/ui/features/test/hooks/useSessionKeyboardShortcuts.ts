import { useEffect } from 'react';
import type { VisualSlotIndex, SpatialPresentedChoice } from '../../../../../specs/006-psychometric-choice-entropy-and-spatial-presentation/contracts/choice-entropy-ports.ts';
import type { ChoiceId } from '../../../../domain/model/types.ts';
import type { SessionSeededSpatialPresentationStrategy } from '../../../../domain/questionBank/spatialChoicePresenter.ts';

export interface UseSessionKeyboardShortcutsParams {
  readonly isExamMode: boolean;
  readonly isAnswered: boolean;
  readonly isLastQuestion: boolean;
  readonly presentedChoices: readonly SpatialPresentedChoice[];
  readonly spatialPresenter: SessionSeededSpatialPresentationStrategy;
  readonly showFinishModal: boolean;
  readonly onSelectAnswer: (
    choiceId: ChoiceId,
    slotIdx: VisualSlotIndex,
    modality: 'pointer-click' | 'keyboard-digit-shortcut' | 'touch-tap'
  ) => void;
  readonly onNext: () => void;
  readonly onPrev: () => void;
  readonly onSubmitExam: () => void;
  readonly onToggleFlag: () => void;
  readonly onToggleBookmark: () => void;
  readonly onToggleExplanation: () => void;
  readonly onToggleMatrix: () => void;
  readonly onCloseFinishModal: () => void;
}

export function useSessionKeyboardShortcuts({
  isExamMode,
  isAnswered,
  isLastQuestion,
  presentedChoices,
  spatialPresenter,
  showFinishModal,
  onSelectAnswer,
  onNext,
  onPrev,
  onSubmitExam,
  onToggleFlag,
  onToggleBookmark,
  onToggleExplanation,
  onToggleMatrix,
  onCloseFinishModal,
}: UseSessionKeyboardShortcutsParams): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'Escape' && showFinishModal) {
        onCloseFinishModal();
        return;
      }

      if (['1', '2', '3', '4'].includes(e.key)) {
        const slotIdx = (parseInt(e.key, 10) - 1) as VisualSlotIndex;
        const targetCanonicalId = spatialPresenter.resolveCanonicalChoiceIdBySlot(
          presentedChoices,
          slotIdx
        );
        if (targetCanonicalId) {
          onSelectAnswer(targetCanonicalId, slotIdx, 'keyboard-digit-shortcut');
        }
      } else if (e.key === 'ArrowRight') {
        if (isLastQuestion) {
          if (!isExamMode && isAnswered) {
            onSubmitExam();
          } else if (isExamMode) {
            onSubmitExam();
          }
        } else {
          onNext();
        }
      } else if (e.key === 'ArrowLeft') {
        onPrev();
      } else if (e.key === 'Enter') {
        if ((!isExamMode && isAnswered) || isExamMode) {
          if (isLastQuestion) {
            onSubmitExam();
          } else {
            onNext();
          }
        }
      } else if (e.key.toLowerCase() === 'f') {
        onToggleFlag();
      } else if (e.key.toLowerCase() === 'b') {
        onToggleBookmark();
      } else if (e.key.toLowerCase() === 'e') {
        onToggleExplanation();
      } else if (e.key.toLowerCase() === 'g') {
        onToggleMatrix();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onSelectAnswer,
    onNext,
    onPrev,
    onSubmitExam,
    onToggleFlag,
    onToggleBookmark,
    onToggleExplanation,
    onToggleMatrix,
    onCloseFinishModal,
    isExamMode,
    isAnswered,
    isLastQuestion,
    presentedChoices,
    spatialPresenter,
    showFinishModal,
  ]);
}
