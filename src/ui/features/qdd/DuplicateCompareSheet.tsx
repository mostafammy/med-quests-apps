/**
 * Presentation Component: DuplicateCompareSheet
 * Apple-grade Side-by-Side Token Diff & Clinical Discriminator Inspection Modal
 * Layer: UI / Features / QDD
 *
 * Shows:
 * - Side-by-side comparison of Subject Question vs. Candidate Question
 * - Token-level diff highlights in stems
 * - Answer key comparison & conflict indicator
 * - Clinical discriminator chips (e.g. NOT ↔ —, left ↔ right)
 * - Calibrated similarity scores (Lexical Jaccard, Semantic Cosine)
 */

import React, { useEffect, useMemo } from 'react';
import {
  X,
  AlertCircle,
  Copy,
  GitBranch,
  Scale,
  Sparkles,
  Check,
} from 'lucide-react';
import type { Question } from '../../../domain/model/types.ts';
import type {
  DuplicateCandidate,
  DuplicationVerdict,
} from '../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';
import { isAnswerKeySemanticallyEqual } from '../../../domain/questionBank/duplication/answerKeySemantics.ts';

export interface DuplicateCompareSheetProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly subjectQuestion: Question;
  readonly verdict?: DuplicationVerdict;
  readonly candidate?: DuplicateCandidate;
  readonly matchedQuestion?: Question;
  readonly onMarkDistinct?: (candidateId: string) => void;
  readonly onLinkAsVariant?: (candidateId: string) => void;
}

/**
 * Computes simple word-level diff tokens for visual comparison
 */
function computeWordDiff(
  textA: string,
  textB: string
): {
  tokensA: Array<{ word: string; isDifferent: boolean }>;
  tokensB: Array<{ word: string; isDifferent: boolean }>;
} {
  const wordsA = textA.split(/\s+/).filter(Boolean);
  const wordsB = textB.split(/\s+/).filter(Boolean);

  const clean = (w: string) => w.toLowerCase().replace(/[^\w]/g, '');

  const setA = new Set(wordsA.map(clean));
  const setB = new Set(wordsB.map(clean));

  const tokensA = wordsA.map((word) => ({
    word,
    isDifferent: !setB.has(clean(word)),
  }));

  const tokensB = wordsB.map((word) => ({
    word,
    isDifferent: !setA.has(clean(word)),
  }));

  return { tokensA, tokensB };
}

export const DuplicateCompareSheet: React.FC<DuplicateCompareSheetProps> = ({
  isOpen,
  onClose,
  subjectQuestion,
  verdict,
  candidate,
  matchedQuestion,
  onMarkDistinct,
  onLinkAsVariant,
}) => {
  // Select active candidate (either passed in or the first one from verdict)
  const activeCandidate = candidate || verdict?.candidates[0];

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const matchedStem = matchedQuestion?.stem || activeCandidate?.matchedStemPreview || 'No stem text available.';

  const { tokensA, tokensB } = useMemo(() => {
    return computeWordDiff(subjectQuestion.stem, matchedStem);
  }, [subjectQuestion.stem, matchedStem]);

  if (!isOpen) return null;

  const subjectCorrectChoice = subjectQuestion.choices.find((c) => c.isCorrect);
  const matchedCorrectChoice = matchedQuestion?.choices?.find((c) => c.isCorrect);

  const isClinicallySameAnswer = useMemo(() => {
    if (!subjectCorrectChoice || !matchedCorrectChoice) return null;
    return isAnswerKeySemanticallyEqual(subjectCorrectChoice.text, matchedCorrectChoice.text);
  }, [subjectCorrectChoice, matchedCorrectChoice]);

  const relation = activeCandidate?.relation || verdict?.relation || 'NEAR';
  const jaccardPercent = activeCandidate?.signals.lexicalJaccard
    ? Math.round(activeCandidate.signals.lexicalJaccard * 100)
    : null;
  const isConflict =
    isClinicallySameAnswer === true
      ? false
      : isClinicallySameAnswer === false
      ? true
      : relation === 'CONFLICT' || activeCandidate?.signals.sameAnswerKey === false;
  const discriminatorDeltas = activeCandidate?.signals.discriminatorDelta || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-sheet-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 id="compare-sheet-title" className="text-base font-semibold text-white">
                Duplicate Question Inspection
              </h2>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                <span>Matched candidate: <code className="text-blue-300 font-mono">{activeCandidate?.matchedQuestionId || 'Unknown'}</code></span>
                {jaccardPercent !== null && (
                  <>
                    <span>•</span>
                    <span className="text-amber-300 font-medium">{jaccardPercent}% Lexical Overlap</span>
                  </>
                )}
                <span>•</span>
                <span className="font-medium text-slate-300">Decided by: {activeCandidate?.decidedBy || 'QDD Engine'}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clinical Discriminator Delta Alert Banner (if any) */}
        {discriminatorDeltas.length > 0 && (
          <div className="px-6 py-3 bg-purple-500/10 border-b border-purple-500/20 flex items-center gap-2 text-xs text-purple-200">
            <GitBranch className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="font-semibold">Clinical Discriminators detected:</span>
            <div className="flex flex-wrap gap-1.5">
              {discriminatorDeltas.map((d, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono text-[11px]"
                >
                  {d.kind}: {d.token}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Answer Conflict Warning Banner (if conflicting) */}
        {isConflict && (
          <div className="px-6 py-3 bg-rose-500/10 border-b border-rose-500/20 flex items-center gap-2 text-xs text-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold">Answer Contradiction:</span>
            <span>
              The stems are near-identical, but the keyed correct answers differ. Ensure clinical accuracy before proceeding.
            </span>
          </div>
        )}

        {/* Body: Side-by-Side Panels */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Panel: Subject / Current Question */}
          <div className="flex flex-col gap-4 p-4 rounded-xl border border-white/10 bg-slate-800/30">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Parsed Question (Subject)
              </span>
              <span className="text-[11px] text-slate-400 font-mono">{subjectQuestion.id}</span>
            </div>

            {/* Stem with token highlights */}
            <div>
              <label className="text-[11px] font-medium uppercase text-slate-400 mb-1.5 block">
                Clinical Vignette / Stem
              </label>
              <div className="p-3 rounded-lg bg-slate-900/80 border border-white/5 text-sm leading-relaxed text-slate-200 font-serif">
                {tokensA.map((t, i) => (
                  <span
                    key={i}
                    className={
                      t.isDifferent
                        ? 'bg-emerald-500/20 text-emerald-300 font-medium px-0.5 rounded border border-emerald-500/30'
                        : undefined
                    }
                  >
                    {t.word}{' '}
                  </span>
                ))}
              </div>
            </div>

            {/* Choices */}
            <div>
              <label className="text-[11px] font-medium uppercase text-slate-400 mb-1.5 block">
                Choices & Answer Key
              </label>
              <div className="space-y-1.5">
                {subjectQuestion.choices.map((c) => {
                  const isCorrect = c.isCorrect;
                  return (
                    <div
                      key={c.id}
                      className={`flex items-start gap-2 p-2 rounded-lg text-xs border ${
                        isCorrect
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200 font-medium'
                          : 'bg-slate-900/50 border-white/5 text-slate-300'
                      }`}
                    >
                      <span className="uppercase font-bold w-4">{c.id}.</span>
                      <span className="flex-1">{c.text}</span>
                      {isCorrect && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold uppercase">
                          Correct
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Explanation if available */}
            {subjectQuestion.explanation && (
              <div>
                <label className="text-[11px] font-medium uppercase text-slate-400 mb-1 block">
                  Rationale
                </label>
                <p className="text-xs text-slate-400 leading-relaxed italic bg-slate-900/40 p-2.5 rounded-lg border border-white/5">
                  {subjectQuestion.explanation}
                </p>
              </div>
            )}
          </div>

          {/* Right Panel: Matched Candidate Question */}
          <div className="flex flex-col gap-4 p-4 rounded-xl border border-white/10 bg-slate-800/30">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <Copy className="w-3.5 h-3.5" />
                Matched Question in Bank
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {activeCandidate?.matchedQuestionId || 'bank-item'}
              </span>
            </div>

            {/* Stem with token highlights */}
            <div>
              <label className="text-[11px] font-medium uppercase text-slate-400 mb-1.5 block">
                Clinical Vignette / Stem
              </label>
              <div className="p-3 rounded-lg bg-slate-900/80 border border-white/5 text-sm leading-relaxed text-slate-200 font-serif">
                {tokensB.map((t, i) => (
                  <span
                    key={i}
                    className={
                      t.isDifferent
                        ? 'bg-amber-500/20 text-amber-300 font-medium px-0.5 rounded border border-amber-500/30'
                        : undefined
                    }
                  >
                    {t.word}{' '}
                  </span>
                ))}
              </div>
            </div>

            {/* Choices if matchedQuestion is provided */}
            {matchedQuestion ? (
              <div>
                <label className="text-[11px] font-medium uppercase text-slate-400 mb-1.5 block">
                  Choices & Answer Key
                </label>
                <div className="space-y-1.5">
                  {matchedQuestion.choices.map((c) => {
                    const isCorrect = c.isCorrect;
                    return (
                      <div
                        key={c.id}
                        className={`flex items-start gap-2 p-2 rounded-lg text-xs border ${
                          isCorrect
                            ? isConflict
                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-200 font-medium'
                              : 'bg-blue-500/10 border-blue-500/30 text-blue-200 font-medium'
                            : 'bg-slate-900/50 border-white/5 text-slate-300'
                        }`}
                      >
                        <span className="uppercase font-bold w-4">{c.id}.</span>
                        <span className="flex-1">{c.text}</span>
                        {isCorrect && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold uppercase ${
                              isConflict
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                            }`}
                          >
                            Correct
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-slate-900/40 border border-white/5 text-xs text-slate-400 italic">
                Full choice set stored in canonical datastore. Preview available in authoring studio.
              </div>
            )}

            {/* Explanation if available */}
            {matchedQuestion?.explanation && (
              <div>
                <label className="text-[11px] font-medium uppercase text-slate-400 mb-1 block">
                  Rationale
                </label>
                <p className="text-xs text-slate-400 leading-relaxed italic bg-slate-900/40 p-2.5 rounded-lg border border-white/5">
                  {matchedQuestion.explanation}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-slate-800/40">
          <div className="text-xs text-slate-400">
            Diff highlights: <span className="text-emerald-400 font-medium">New in subject</span> /{' '}
            <span className="text-amber-400 font-medium">Original in bank</span>
          </div>
          <div className="flex items-center gap-2">
            {onLinkAsVariant && activeCandidate && (
              <button
                type="button"
                onClick={() => {
                  onLinkAsVariant(activeCandidate.matchedQuestionId);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-500/10 text-purple-300 border border-purple-500/30 hover:bg-purple-500/20 transition-all flex items-center gap-1.5"
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Link as Variant</span>
              </button>
            )}
            {onMarkDistinct && activeCandidate && (
              <button
                type="button"
                onClick={() => {
                  onMarkDistinct(activeCandidate.matchedQuestionId);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-200 border border-white/10 hover:bg-slate-700 transition-all flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Keep both (Distinct)</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-900 hover:bg-slate-200 transition-all shadow-sm"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
