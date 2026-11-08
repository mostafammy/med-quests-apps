import React from 'react';
import {
  RotateCcw,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  Scale,
  Send,
  X,
  ChevronUp,
  ChevronDown,
  Check,
  Info,
} from 'lucide-react';
import type { ParsedQuestionItem } from '../../../../../domain/questionBank/aiQuestionParser/types.ts';
import type { ChoiceId } from '../../../../../domain/model/types.ts';

interface CanvasSbaTabProps {
  readonly item: ParsedQuestionItem;
  readonly isEditing: boolean;
  readonly isDuplicateBannerDismissed: boolean;
  readonly onDismissDuplicateBanner: () => void;
  readonly isRationaleExpanded: boolean;
  readonly onToggleRationaleExpanded: (expand?: boolean) => void;
  readonly onToggleStemFormat: () => void;
  readonly onUpdateStem: (newStem: string) => void;
  readonly onUpdateChoice: (
    choiceId: ChoiceId,
    text: string,
    rationale: string
  ) => void;
  readonly onSetKeyedChoice: (choiceId: ChoiceId) => void;
  readonly onUpdateExplanation: (explanation: string) => void;
  readonly onInspectDuplication?: (item: ParsedQuestionItem) => void;
  readonly onSendToApprovalQueue?: (tempId: string) => void;
}

export const CanvasSbaTab: React.FC<CanvasSbaTabProps> = ({
  item,
  isEditing,
  isDuplicateBannerDismissed,
  onDismissDuplicateBanner,
  isRationaleExpanded,
  onToggleRationaleExpanded,
  onToggleStemFormat,
  onUpdateStem,
  onUpdateChoice,
  onSetKeyedChoice,
  onUpdateExplanation,
  onInspectDuplication,
  onSendToApprovalQueue,
}) => {
  const rel = item.qddVerdict?.relation;
  const isDuplicateOrConflict =
    rel === 'EXACT' || rel === 'NEAR' || rel === 'CONFLICT';
  const isExact = rel === 'EXACT';
  const isConflict = rel === 'CONFLICT';
  const firstCand = item.qddVerdict?.candidates[0];
  const matchPercent = firstCand?.signals?.lexicalJaccard
    ? Math.round(firstCand.signals.lexicalJaccard * 100)
    : 100;

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* DUPLICATE / CONFLICT ALERT BANNER */}
      {isDuplicateOrConflict && !isDuplicateBannerDismissed && (
        <div
          className={`p-4 rounded-2xl border transition-all ${
            isConflict
              ? 'bg-rose-500/10 dark:bg-rose-950/30 border-rose-500/40 text-rose-900 dark:text-rose-200 shadow-sm'
              : isExact
              ? 'bg-blue-500/10 dark:bg-blue-950/30 border-blue-500/40 text-blue-900 dark:text-blue-200 shadow-sm'
              : 'bg-amber-500/10 dark:bg-amber-950/30 border-amber-500/30 text-amber-900 dark:text-amber-200 shadow-sm'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                  isConflict
                    ? 'bg-rose-600 text-white'
                    : isExact
                    ? 'bg-blue-600 text-white'
                    : 'bg-amber-600 text-white'
                }`}
              >
                {isConflict ? (
                  <AlertOctagon className="w-5 h-5" />
                ) : isExact ? (
                  <ShieldAlert className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider">
                    {isConflict
                      ? 'Answer Contradiction with Existing Question'
                      : isExact
                      ? 'Question Already Exists in Global Bank'
                      : 'Likely Duplicate / High Content Overlap'}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase border ${
                      isConflict
                        ? 'bg-rose-500/20 text-rose-800 dark:text-rose-200 border-rose-500/40'
                        : isExact
                        ? 'bg-blue-500/20 text-blue-800 dark:text-blue-200 border-blue-500/40'
                        : 'bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/40'
                    }`}
                  >
                    Direct Commit Locked • Approval Required
                  </span>
                </div>
                <p className="text-xs mt-1 opacity-90 leading-relaxed">
                  {isConflict
                    ? `Identical question stem exists in the Global Bank, but the correct keyed answer contradicts bank item ${firstCand?.matchedQuestionId || ''}. Cannot be directly committed.`
                    : isExact
                    ? `Matches canonical bank question ${firstCand?.matchedQuestionId || ''} (${matchPercent}% lexical match). Held from bank commit to prevent duplication.`
                    : `High similarity (${matchPercent}%) detected with bank question ${firstCand?.matchedQuestionId || ''}.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
              {onInspectDuplication && (
                <button
                  type="button"
                  onClick={() => onInspectDuplication(item)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/80 dark:bg-zinc-800/80 hover:bg-white dark:hover:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 shadow-2xs transition-all cursor-pointer"
                >
                  <Scale className="w-3.5 h-3.5 text-purple-500" />
                  <span>Compare Diff</span>
                </button>
              )}

              {onSendToApprovalQueue && (
                <button
                  type="button"
                  onClick={() => onSendToApprovalQueue(item.tempId)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-xs transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send for Approval</span>
                </button>
              )}

              <button
                type="button"
                onClick={onDismissDuplicateBanner}
                title="Dismiss warning (stays collapsed)"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stem Header & Mode Switcher */}
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            Question Stem
          </span>
          {item.originalRawStem && item.question.stem !== item.originalRawStem && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              USMLE Vignette Active
            </span>
          )}
          {item.originalRawStem && item.question.stem === item.originalRawStem && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
              Verbatim Raw Stem
            </span>
          )}
        </div>

        {(item.originalRawStem || item.enrichedVignetteStem) && (
          <button
            type="button"
            onClick={onToggleStemFormat}
            title="Switch between author's original verbatim question and USMLE clinical vignette"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>
              {item.originalRawStem && item.question.stem === item.originalRawStem
                ? 'Switch to USMLE Vignette'
                : 'Revert to Original Raw Text'}
            </span>
          </button>
        )}
      </div>

      {/* Stem Text Body */}
      {isEditing ? (
        <textarea
          rows={3}
          value={item.question.stem}
          onChange={(e) => onUpdateStem(e.target.value)}
          className="w-full text-xs sm:text-sm p-3 rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-medium text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500 transition-all shadow-inner leading-relaxed"
        />
      ) : (
        <div className="p-4 rounded-2xl bg-zinc-50/70 dark:bg-zinc-850/60 border border-zinc-200/60 dark:border-zinc-800 text-xs sm:text-sm font-medium text-zinc-850 dark:text-zinc-150 leading-relaxed">
          {item.question.stem}
        </div>
      )}

      {/* Choices A-D Deck */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-400">
          <span>Single-Best-Answer Options</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onToggleRationaleExpanded()}
              className="text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 lowercase font-semibold cursor-pointer"
            >
              {isRationaleExpanded ? (
                <>
                  <ChevronUp className="w-3 h-3" /> hide rationales
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" /> expand rationales
                </>
              )}
            </button>
            <span className="normal-case text-zinc-400 text-[10px]">
              Tap letter to key correct
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {item.question.choices.map((choice) => {
            const isCorrect = choice.isCorrect || choice.id === item.selectedCorrectChoiceId;
            return (
              <div
                key={choice.id}
                className={`p-3 rounded-2xl border transition-all ${
                  isCorrect
                    ? 'border-emerald-500/50 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-2xs'
                    : 'border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-850/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => onSetKeyedChoice(choice.id)}
                    title={isCorrect ? 'Correct keyed answer' : 'Click to key as correct answer'}
                    className={`w-7 h-7 rounded-xl font-mono text-xs font-bold flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer ${
                      isCorrect
                        ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/30'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-purple-100 hover:text-purple-600'
                    }`}
                  >
                    {choice.id.toUpperCase()}
                  </button>

                  <div className="flex-1 space-y-1">
                    {isEditing ? (
                      <input
                        type="text"
                        value={choice.text}
                        onChange={(e) =>
                          onUpdateChoice(choice.id, e.target.value, choice.rationale)
                        }
                        className="w-full text-xs p-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-medium"
                      />
                    ) : (
                      <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <span>{choice.text}</span>
                        {isCorrect && (
                          <span className="text-[10px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <Check className="w-3 h-3" /> Keyed Answer
                          </span>
                        )}
                      </div>
                    )}

                    {isRationaleExpanded && (
                      <div className="pt-1">
                        {isEditing ? (
                          <textarea
                            rows={2}
                            placeholder="Clinical distractor rationale..."
                            value={choice.rationale}
                            onChange={(e) =>
                              onUpdateChoice(choice.id, choice.text, e.target.value)
                            }
                            className="w-full text-[11px] p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-750 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400"
                          />
                        ) : (
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            {choice.rationale || 'No rationale supplied.'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Clinical Explanation & Evidence */}
      <div className="pt-2">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-purple-500" />
            <span>Clinical Explanation & Pathophysiology</span>
          </div>
          {(item.question as { explanationConfidence?: number }).explanationConfidence !== undefined && (
            <span className="text-[10px] font-mono font-semibold text-purple-600 dark:text-purple-400 lowercase">
              {(item.question as { explanationConfidence?: number }).explanationConfidence}% model confidence
            </span>
          )}
        </div>

        {item.question.explanation && (
          <div className="p-3.5 rounded-2xl bg-zinc-50/80 dark:bg-zinc-850/60 border border-zinc-200/60 dark:border-zinc-800 space-y-2">
            {isEditing ? (
              <textarea
                rows={3}
                value={item.question.explanation}
                onChange={(e) => onUpdateExplanation(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-medium"
              />
            ) : (
              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {item.question.explanation}
              </p>
            )}

            {item.question.evidence && item.question.evidence[0] && (
              <div className="text-[10px] text-zinc-400 italic pt-1 border-t border-zinc-200/50 dark:border-zinc-750/50">
                Grounding: {item.question.evidence[0].sourceName} ({item.question.evidence[0].location})
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
