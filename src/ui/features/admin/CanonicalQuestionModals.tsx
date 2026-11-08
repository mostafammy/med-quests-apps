import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, X, Check, Star, Plus } from 'lucide-react';
import {
  QuestionBuilder,
  type CanonicalQuestionEditDraft,
} from '../../../domain/questionBank/QuestionBuilder.ts';
import type {
  GovernedQuestion,
  QuestionMutationPatch,
} from '../../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';

export interface CanonicalQuestionEditModalProps {
  readonly question: GovernedQuestion | null;
  readonly subjects: ReadonlyArray<{ id: string; name: { en: string; ar?: string } }>;
  readonly isActionInProgress: boolean;
  readonly onClose: () => void;
  readonly onRequestDelete: (question: GovernedQuestion) => void;
  readonly onSave: (
    questionId: string,
    patch: QuestionMutationPatch,
    changeReason: string
  ) => Promise<void>;
}

export const CanonicalQuestionEditModal: React.FC<CanonicalQuestionEditModalProps> = ({
  question,
  subjects,
  isActionInProgress,
  onClose,
  onRequestDelete,
  onSave,
}) => {
  const [draft, setDraft] = useState<CanonicalQuestionEditDraft | null>(() =>
    question ? QuestionBuilder.createEditDraft(question) : null
  );

  useEffect(() => {
    setDraft(question ? QuestionBuilder.createEditDraft(question) : null);
  }, [question]);

  if (!question || !draft) return null;

  const updateDraft = (patch: Partial<CanonicalQuestionEditDraft>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const handleSetCorrectChoice = (choiceId: string) => {
    updateDraft({
      choices: draft.choices.map((c) => ({
        ...c,
        isCorrect: c.id === choiceId,
      })),
    });
  };

  const handleUpdateChoiceText = (choiceId: string, text: string) => {
    updateDraft({
      choices: draft.choices.map((c) => (c.id === choiceId ? { ...c, text } : c)),
    });
  };

  const handleUpdateChoiceRationale = (choiceId: string, rationale: string) => {
    updateDraft({
      choices: draft.choices.map((c) => (c.id === choiceId ? { ...c, rationale } : c)),
    });
  };

  const handleAddChoice = () => {
    const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const nextId =
      letters.find((l) => !draft.choices.some((c) => c.id.toLowerCase() === l)) ||
      `opt_${draft.choices.length + 1}`;
    updateDraft({
      choices: [
        ...draft.choices,
        { id: nextId, text: '', isCorrect: false, rationale: '' },
      ],
    });
  };

  const handleRemoveChoice = (choiceId: string) => {
    if (draft.choices.length <= 2) return;
    const filtered = draft.choices.filter((c) => c.id !== choiceId);
    if (!filtered.some((c) => c.isCorrect) && filtered.length > 0) {
      filtered[0] = { ...filtered[0], isCorrect: true };
    }
    updateDraft({ choices: filtered });
  };

  const correctCount = draft.choices.filter((c) => c.isCorrect).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-apple-entrance">
      <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Editing Canonical Item • {question.id} (v{question.bankVersion})
            </span>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Update Global Canonical Question
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Concept Title */}
          <div>
            <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
              Concept Title
            </label>
            <input
              type="text"
              value={draft.concept}
              onChange={(e) => updateDraft({ concept: e.target.value })}
              placeholder="e.g. Superior Mediastinum Plane (Angle of Louis)"
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 p-2.5 bg-zinc-50/50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Taxonomy & Metadata Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                Subject
              </label>
              <select
                value={draft.subjectId}
                onChange={(e) => updateDraft({ subjectId: e.target.value })}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 p-2.5 bg-zinc-50/50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden capitalize"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name.en}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                Difficulty Level
              </label>
              <select
                value={draft.difficulty}
                onChange={(e) =>
                  updateDraft({ difficulty: Number(e.target.value) as 1 | 2 | 3 })
                }
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 p-2.5 bg-zinc-50/50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value={1}>Level 1 (Foundational)</option>
                <option value={2}>Level 2 (Intermediate)</option>
                <option value={3}>Level 3 (Hard / Complex)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                Cognitive Level
              </label>
              <select
                value={draft.cognitiveLevel}
                onChange={(e) =>
                  updateDraft({
                    cognitiveLevel: e.target.value as
                      | 'recall'
                      | 'understanding'
                      | 'application',
                  })
                }
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 p-2.5 bg-zinc-50/50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden capitalize"
              >
                <option value="recall">Recall</option>
                <option value="understanding">Understanding</option>
                <option value="application">Application</option>
              </select>
            </div>
          </div>

          {/* High-Yield Switch */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-400/20">
            <div className="flex items-center space-x-2">
              <Star className="w-4 h-4 text-amber-600 dark:text-amber-400 fill-current" />
              <span className="font-bold text-amber-950 dark:text-amber-200">
                High-Yield Board Question
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={draft.highYield}
                onChange={(e) => updateDraft({ highYield: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-300 peer-focus:outline-hidden rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {/* Clinical Vignette Stem */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-zinc-700 dark:text-zinc-300">
                Clinical Vignette Stem
              </label>
              <span className="text-[11px] text-zinc-400">
                {draft.stem.length} chars •{' '}
                {draft.stem.trim().split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
            <textarea
              rows={4}
              value={draft.stem}
              onChange={(e) => updateDraft({ stem: e.target.value })}
              placeholder="Clinical scenario or question stem..."
              className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 p-3 bg-zinc-50/50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-serif leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Choices & Correct Answer Editor */}
          <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-bold text-zinc-800 dark:text-zinc-200 text-xs flex items-center space-x-1.5">
                  <span>Choices & Correct Answer</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                    {draft.choices.length} Options
                  </span>
                </label>
                <p className="text-[11px] text-zinc-500">
                  Designate the single correct answer and provide distinct distractor rationales.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddChoice}
                disabled={draft.choices.length >= 6}
                className="py-1 px-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold flex items-center space-x-1 hover:bg-indigo-100/80 cursor-pointer disabled:opacity-40"
              >
                <Plus className="w-3 h-3" />
                <span>Add Option</span>
              </button>
            </div>

            {correctCount !== 1 && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-amber-900 dark:text-amber-200 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Please designate exactly <strong>one</strong> correct answer. Currently
                  selected: {correctCount}.
                </span>
              </div>
            )}

            <div className="space-y-2.5">
              {draft.choices.map((choice) => (
                <div
                  key={choice.id}
                  className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
                    choice.isCorrect
                      ? 'bg-emerald-500/10 border-emerald-400/60 dark:border-emerald-600 shadow-xs'
                      : 'bg-zinc-50/60 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs uppercase ${
                          choice.isCorrect
                            ? 'bg-emerald-600 text-white'
                            : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        {choice.id}
                      </span>
                      <span className="font-bold text-zinc-700 dark:text-zinc-300">
                        Option {choice.id.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {choice.isCorrect ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-600 text-white flex items-center space-x-1 shadow-xs">
                          <Check className="w-3 h-3" />
                          <span>Correct Answer</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetCorrectChoice(choice.id)}
                          className="px-2.5 py-1 rounded-full text-[11px] font-semibold border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                        >
                          Mark as Correct
                        </button>
                      )}

                      {draft.choices.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveChoice(choice.id)}
                          className="text-zinc-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete this option"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <input
                    type="text"
                    placeholder="Option text..."
                    value={choice.text}
                    onChange={(e) => handleUpdateChoiceText(choice.id, e.target.value)}
                    className="w-full text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 p-2 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />

                  <input
                    type="text"
                    placeholder="Clinical rationale (why this choice is correct or incorrect)..."
                    value={choice.rationale}
                    onChange={(e) => handleUpdateChoiceRationale(choice.id, e.target.value)}
                    className="w-full text-[11px] rounded-xl border border-zinc-200/70 dark:border-zinc-700/70 p-2 bg-white/70 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Clinical Explanation */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
              Clinical Explanation
            </label>
            <textarea
              rows={3}
              value={draft.explanation}
              onChange={(e) => updateDraft({ explanation: e.target.value })}
              placeholder="Authoritative anatomical & clinical reasoning..."
              className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 p-3 bg-zinc-50/50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Exam Tip & Mnemonic */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                Exam Tip <span className="text-zinc-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={draft.examTip}
                onChange={(e) => updateDraft({ examTip: e.target.value })}
                placeholder="e.g. Count ribs starting from the 2nd costal cartilage"
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 p-2.5 bg-zinc-50/50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                Mnemonic <span className="text-zinc-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={draft.mnemonic}
                onChange={(e) => updateDraft({ mnemonic: e.target.value })}
                placeholder="e.g. RAT PLAC"
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 p-2.5 bg-zinc-50/50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Audit Change Reason */}
          <div>
            <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
              Audit Change Reason <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={draft.changeReason}
              onChange={(e) => updateDraft({ changeReason: e.target.value })}
              placeholder="Required for institutional accreditation audit log..."
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 p-2.5 bg-zinc-50/50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Modal Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => onRequestDelete(question)}
            className="py-2.5 px-3.5 rounded-xl border border-rose-300 dark:border-rose-800 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center space-x-1.5 transition-all cursor-pointer apple-tap"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Question...</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                if (correctCount !== 1) {
                  alert('Please designate exactly one correct answer before publishing.');
                  return;
                }
                if (draft.choices.some((c) => !c.text.trim())) {
                  alert('All choices must have valid option text.');
                  return;
                }
                const patch = QuestionBuilder.draftToMutationPatch(draft);
                await onSave(
                  question.id,
                  patch,
                  draft.changeReason || 'Faculty errata update'
                );
              }}
              disabled={
                isActionInProgress ||
                correctCount !== 1 ||
                !draft.stem.trim() ||
                !draft.concept.trim()
              }
              className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all cursor-pointer apple-tap"
            >
              {isActionInProgress ? 'Publishing Revision...' : 'Publish Global Revision'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export interface CanonicalQuestionDeleteModalProps {
  readonly question: GovernedQuestion | null;
  readonly isActionInProgress: boolean;
  readonly onClose: () => void;
  readonly onConfirmDelete: (
    question: GovernedQuestion,
    mode: 'permanent' | 'archive',
    reason: string
  ) => Promise<void>;
}

export const CanonicalQuestionDeleteModal: React.FC<
  CanonicalQuestionDeleteModalProps
> = ({ question, isActionInProgress, onClose, onConfirmDelete }) => {
  const [deleteMode, setDeleteMode] = useState<'permanent' | 'archive'>('permanent');
  const [deleteReason, setDeleteReason] = useState(
    'Faculty curriculum cleanup & item pruning'
  );

  useEffect(() => {
    if (question) {
      setDeleteMode('permanent');
      setDeleteReason('Faculty curriculum cleanup & item pruning');
    }
  }, [question]);

  if (!question) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-apple-entrance">
      <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 max-w-lg w-full space-y-5 shadow-2xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-400/20 flex items-center justify-center text-rose-600 shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-600">
              Curriculum Governance
            </span>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Delete Canonical Question
            </h3>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-700/70 space-y-1">
          <span className="font-mono text-[10px] font-bold text-zinc-500">
            {question.id}
          </span>
          <p className="text-xs font-serif text-zinc-800 dark:text-zinc-200 line-clamp-2">
            "{question.stem}"
          </p>
        </div>

        <div className="space-y-2 text-xs">
          <label className="font-bold text-zinc-700 dark:text-zinc-300 block">
            Deletion Strategy
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div
              onClick={() => setDeleteMode('permanent')}
              className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                deleteMode === 'permanent'
                  ? 'border-rose-500 bg-rose-500/10 dark:bg-rose-950/30 text-rose-950 dark:text-rose-200'
                  : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
              }`}
            >
              <span className="font-bold block text-xs">Permanent Purge</span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                Completely removes question from the master bank & tests.
              </span>
            </div>

            <div
              onClick={() => setDeleteMode('archive')}
              className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                deleteMode === 'archive'
                  ? 'border-indigo-500 bg-indigo-500/10 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200'
                  : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
              }`}
            >
              <span className="font-bold block text-xs">Archive / Soft-Retire</span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                Quarantines from tests while keeping historical audit trail.
              </span>
            </div>
          </div>
        </div>

        <div>
          <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1 text-xs">
            Audit Reason <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            placeholder="Reason for deletion (recorded in curriculum audit log)..."
            className="w-full text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 p-2.5 bg-zinc-50/50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
          />
        </div>

        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/20 text-amber-900 dark:text-amber-200 text-[11px]">
          <strong>Note:</strong> Deleting will automatically increment the canonical block
          revision and propagate to all connected student sessions.
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirmDelete(question, deleteMode, deleteReason)}
            disabled={isActionInProgress || !deleteReason.trim()}
            className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-rose-600/20 disabled:opacity-50 transition-all cursor-pointer apple-tap"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isActionInProgress ? 'Processing...' : 'Confirm Deletion'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
