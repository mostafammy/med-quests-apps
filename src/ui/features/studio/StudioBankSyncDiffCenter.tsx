import React, { useState } from 'react';
import {
  Globe,
  RefreshCw,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  GitCompare,
  PlusCircle,
  Edit3,
  Trash2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Layers,
  Database,
  Check,
  X,
} from 'lucide-react';
import { useQuestionStore } from '../../../application/stores/useQuestionStore.ts';
import { useLocaleStore } from '../../../application/stores/useLocaleStore.ts';
import type { QuestionDiffItem } from '../../../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';

export interface StudioBankSyncDiffCenterProps {
  onOpenResetModal: () => void;
}

type DiffInspectorTab = 'added' | 'edited' | 'deleted' | 'preserved';

export const StudioBankSyncDiffCenter: React.FC<StudioBankSyncDiffCenterProps> = ({
  onOpenResetModal,
}) => {
  const {
    questions,
    isSyncing,
    syncPhase,
    syncCursor,
    pendingDiffPreview,
    dismissedRemoteRevision,
    lastMergeReport,
    checkForGlobalUpdates,
    applyPendingGlobalMerge,
    dismissPendingGlobalMerge,
  } = useQuestionStore();
  const { t } = useLocaleStore();

  const [isDiffDrawerExpanded, setIsDiffDrawerExpanded] = useState<boolean>(true);
  const [activeDiffTab, setActiveDiffTab] = useState<DiffInspectorTab>('added');
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  const localRev = syncCursor?.serverRevision ?? 1;
  const remoteRev = pendingDiffPreview?.remoteRevision ?? localRev;
  const hasChanges = Boolean(pendingDiffPreview?.hasChanges);
  const isOutOfDate = Boolean(pendingDiffPreview?.isOutOfDate);
  const isDismissed =
    dismissedRemoteRevision !== null &&
    Number(dismissedRemoteRevision) === Number(pendingDiffPreview?.remoteRevision);
  const hasActionableChanges = (hasChanges || isOutOfDate) && !isDismissed;

  const addedList = pendingDiffPreview?.addedQuestions ?? [];
  const editedList = pendingDiffPreview?.editedQuestions ?? [];
  const deletedList = pendingDiffPreview?.deletedQuestions ?? [];
  const preservedList = pendingDiffPreview?.preservedCustomQuestions ?? [];

  const handleCheckUpdates = async () => {
    const preview = await checkForGlobalUpdates('cvs', { force: true });
    if (preview) {
      setIsDiffDrawerExpanded(true);
      if (preview.addedQuestions.length > 0) setActiveDiffTab('added');
      else if (preview.editedQuestions.length > 0) setActiveDiffTab('edited');
      else if (preview.deletedQuestions.length > 0) setActiveDiffTab('deleted');
      else setActiveDiffTab('preserved');
    }
  };

  const handleApplyMerge = async () => {
    await applyPendingGlobalMerge('cvs');
  };

  const renderPhaseLabel = () => {
    const copy = t.bank.syncCenter;
    switch (syncPhase) {
      case 'probing-edge':
        return copy.fetching;
      case 'computing-diff':
        return copy.computing;
      case 'applying-merge':
        return copy.applying;
      case 'resetting-bank':
        return copy.resetting;
      case 'changes-detected':
        return `${copy.updateAvailableTitle} (${copy.localLabel} v${localRev}.0 → ${copy.globalLabel} v${remoteRev}.0)`;
      case 'up-to-date':
        return `${copy.upToDateTitle} (${copy.localLabel} v${localRev}.0)`;
      case 'local-retained':
        return `${copy.localRetainedTitle} — ${copy.globalLabel} v${remoteRev}.0`;
      case 'error':
        return copy.offlineWarning;
      default:
        return `${copy.synchronizedTitle} (${copy.localLabel} v${localRev}.0)`;
    }
  };

  const getActiveTabItems = (): readonly QuestionDiffItem[] => {
    switch (activeDiffTab) {
      case 'added':
        return addedList;
      case 'edited':
        return editedList;
      case 'deleted':
        return deletedList;
      case 'preserved':
        return preservedList;
    }
  };

  const activeItems = getActiveTabItems();
  const activeTabLabel =
    activeDiffTab === 'added'
      ? t.bank.syncCenter.addedTab
      : activeDiffTab === 'edited'
      ? t.bank.syncCenter.editedTab
      : activeDiffTab === 'deleted'
      ? t.bank.syncCenter.deletedTab
      : t.bank.syncCenter.preservedTab;

  return (
    <div className="glass-surface rounded-3xl p-5 sm:p-6 border border-indigo-500/25 dark:border-indigo-400/20 shadow-xl relative overflow-hidden space-y-5 transition-all duration-300">
      {/* Ambient Fluid Glassmorphism Orbs */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gradient-to-br from-blue-500/20 via-indigo-500/15 to-purple-500/15 blur-3xl animate-float-fluid -z-10" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-gradient-to-tr from-emerald-500/15 via-cyan-500/10 to-indigo-500/15 blur-3xl animate-float-fluid-reverse -z-10" />

      {/* Active Shimmer Sweep Bar during network fetch */}
      {isSyncing && (
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 animate-pulse" />
      )}

      {/* 1. Top Telemetry & Version Comparison Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center space-x-3.5 rtl:space-x-reverse">
          {/* Animated Radar Orb */}
          <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/30 shrink-0">
            {isSyncing && (
              <span className="absolute inset-0 rounded-2xl bg-indigo-400 animate-radar-pulse" />
            )}
            <Globe className={`w-6 h-6 relative z-10 ${isSyncing ? 'animate-spin' : ''}`} />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                {t.bank.syncCenter.title}
              </span>

              {/* Live Status Pill */}
              {isSyncing ? (
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-400/30 animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>{t.bank.syncCenter.fetchingBadge}</span>
                </span>
              ) : hasActionableChanges ? (
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-400/40">
                  <Sparkles className="w-3 h-3" />
                  <span>{t.bank.syncCenter.updateAvailableBadge}</span>
                </span>
              ) : isDismissed ? (
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-500/15 text-slate-700 dark:text-zinc-300 border border-slate-400/30">
                  <Layers className="w-3 h-3" />
                  <span>{t.bank.syncCenter.localRetainedBadge}</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/30">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{t.bank.syncCenter.upToDateBadge}</span>
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-400 font-medium">
              {renderPhaseLabel()}
            </p>
          </div>
        </div>

        {/* Version Comparison Matrix Pill + Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Version Matrix Badge */}
          <div className="flex items-center space-x-2 rtl:space-x-reverse px-3.5 py-2 rounded-2xl bg-slate-100/80 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800 text-xs">
            <div className="flex items-center space-x-1.5">
              <Database className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[11px] text-slate-500 dark:text-zinc-400">{t.bank.syncCenter.localLabel}:</span>
              <span className="font-mono font-extrabold text-slate-900 dark:text-zinc-100">
                v{localRev}.0
              </span>
              <span className="text-[10px] text-slate-400">({questions.length} {t.bank.syncCenter.questionsShort})</span>
            </div>

            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />

            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-[11px] text-slate-500 dark:text-zinc-400">{t.bank.syncCenter.globalLabel}:</span>
              <span
                className={`font-mono font-extrabold ${
                  remoteRev > localRev || hasChanges
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                v{remoteRev}.0
              </span>
              <span className="text-[10px] text-slate-400">
                ({pendingDiffPreview?.remoteCanonicalCount ?? questions.length} {t.bank.syncCenter.canonicalShort})
              </span>
            </div>
          </div>

          {/* Check / Fetch Updates Button */}
          <button
            type="button"
            onClick={handleCheckUpdates}
            disabled={isSyncing}
            className="py-2 px-3.5 rounded-2xl glass-pill-luxury text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center space-x-1.5 cursor-pointer apple-tap disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
            <span>{isSyncing ? t.bank.syncCenter.checkingEdge : t.bank.checkUpdatesBtn}</span>
          </button>

          {/* Reset to Global Canonical Bank Button */}
          <button
            type="button"
            onClick={onOpenResetModal}
            disabled={isSyncing}
            title={t.studio.resetToGlobalBtn}
            className="py-2 px-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-400/30 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center space-x-1.5 transition-all cursor-pointer apple-tap disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>{t.studio.resetToGlobalBtn}</span>
          </button>
        </div>
      </div>

      {/* 2. Diff Summary Counters Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200/60 dark:border-zinc-800/60">
        {/* Added Questions */}
        <button
          type="button"
          onClick={() => {
            setActiveDiffTab('added');
            setIsDiffDrawerExpanded(true);
          }}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
            activeDiffTab === 'added' && isDiffDrawerExpanded
              ? 'bg-emerald-500/15 border-emerald-400/60 ring-2 ring-emerald-500/20'
              : 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10'
          }`}
        >
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
              <PlusCircle className="w-3 h-3" />
              {t.bank.syncCenter.addedTab}
            </span>
            <div className="text-lg font-black text-emerald-900 dark:text-emerald-200 mt-0.5">
              +{addedList.length}
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-200">
            {t.bank.syncCenter.addedBadge}
          </span>
        </button>

        {/* Edited Questions */}
        <button
          type="button"
          onClick={() => {
            setActiveDiffTab('edited');
            setIsDiffDrawerExpanded(true);
          }}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
            activeDiffTab === 'edited' && isDiffDrawerExpanded
              ? 'bg-amber-500/15 border-amber-400/60 ring-2 ring-amber-500/20'
              : 'bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10'
          }`}
        >
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1">
              <Edit3 className="w-3 h-3" />
              {t.bank.syncCenter.editedTab}
            </span>
            <div className="text-lg font-black text-amber-900 dark:text-amber-200 mt-0.5">
              ~{editedList.length}
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200">
            {t.bank.syncCenter.editedBadge}
          </span>
        </button>

        {/* Deleted / Soft-Archived Questions */}
        <button
          type="button"
          onClick={() => {
            setActiveDiffTab('deleted');
            setIsDiffDrawerExpanded(true);
          }}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
            activeDiffTab === 'deleted' && isDiffDrawerExpanded
              ? 'bg-rose-500/15 border-rose-400/60 ring-2 ring-rose-500/20'
              : 'bg-rose-500/5 border-rose-500/20 hover:bg-rose-500/10'
          }`}
        >
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700 dark:text-rose-300 flex items-center gap-1">
              <Trash2 className="w-3 h-3" />
              {t.bank.syncCenter.deletedTab}
            </span>
            <div className="text-lg font-black text-rose-900 dark:text-rose-200 mt-0.5">
              -{deletedList.length}
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-800 dark:text-rose-200">
            {t.bank.syncCenter.deletedBadge}
          </span>
        </button>

        {/* Local Custom Preserved Questions */}
        <button
          type="button"
          onClick={() => {
            setActiveDiffTab('preserved');
            setIsDiffDrawerExpanded(true);
          }}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
            activeDiffTab === 'preserved' && isDiffDrawerExpanded
              ? 'bg-indigo-500/15 border-indigo-400/60 ring-2 ring-indigo-500/20'
              : 'bg-indigo-500/5 border-indigo-500/20 hover:bg-indigo-500/10'
          }`}
        >
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {t.bank.syncCenter.preservedTab}
            </span>
            <div className="text-lg font-black text-indigo-900 dark:text-indigo-200 mt-0.5">
              {preservedList.length}
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-800 dark:text-indigo-200">
            {t.bank.syncCenter.preservedBadge}
          </span>
        </button>
      </div>

      {/* 3. Interactive Merge vs. Keep Local Decision Banner (When Changes Exist) */}
      {hasActionableChanges && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/15 via-blue-500/10 to-purple-500/15 border border-indigo-400/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-spring-modal-in">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs font-extrabold text-indigo-950 dark:text-indigo-100">
              <GitCompare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>
                {t.bank.syncCenter.changesDetected} ({t.bank.syncCenter.localLabel} v{localRev}.0 vs. {t.bank.syncCenter.globalLabel} v{remoteRev}.0)
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-300">
              {t.bank.syncCenter.chooseMerge} ({preservedList.length} {t.bank.syncCenter.preservedTab})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={dismissPendingGlobalMerge}
              disabled={isSyncing}
              className="py-2.5 px-4 rounded-xl bg-white/80 dark:bg-zinc-800/80 hover:bg-white dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center space-x-1.5 cursor-pointer apple-tap"
            >
              <X className="w-3.5 h-3.5" />
              <span>{t.bank.syncCenter.leaveAsIs}</span>
            </button>

            <button
              type="button"
              onClick={handleApplyMerge}
              disabled={isSyncing}
              className="shimmer-active py-2.5 px-5 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-extrabold flex items-center space-x-2 shadow-lg shadow-indigo-500/30 cursor-pointer apple-tap"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{t.bank.syncCenter.merge}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3b. Local-retained confirmation with an explicit path back to review */}
      {isDismissed && (hasChanges || isOutOfDate) && (
        <div className="p-3.5 rounded-2xl bg-slate-500/10 border border-slate-400/30 text-slate-700 dark:text-zinc-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-spring-modal-in">
          <div className="flex items-center space-x-2 font-medium">
            <Layers className="w-4 h-4 text-slate-500 shrink-0" />
            <span>
              {t.bank.syncCenter.localRetainedNotice} ({t.bank.syncCenter.globalLabel} v{remoteRev}.0)
            </span>
          </div>
          <button
            type="button"
            onClick={handleCheckUpdates}
            disabled={isSyncing}
            className="py-1.5 px-3 rounded-xl bg-white/80 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-[11px] font-bold cursor-pointer apple-tap disabled:opacity-50 shrink-0"
          >
            {t.bank.syncCenter.reviewUpdate}
          </button>
        </div>
      )}

      {/* 4. Last Merge Completion Toast */}
      {lastMergeReport && !hasChanges && !isDismissed && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 text-emerald-900 dark:text-emerald-200 text-xs flex flex-wrap items-center justify-between gap-2 animate-apple-entrance">
          <div className="flex items-center space-x-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              <strong>{t.bank.syncCenter.synchronizedTitle} v{lastMergeReport.newRevision}.0:</strong>{' '}
              +{lastMergeReport.insertedCount} {t.bank.syncCenter.addedTab}, ~
              {lastMergeReport.updatedCanonicalCount} {t.bank.syncCenter.editedTab}, -
              {lastMergeReport.archivedTombstoneCount} {t.bank.syncCenter.deletedTab},{' '}
              {lastMergeReport.preservedLocalCustomCount} {t.bank.syncCenter.preservedTab}.
            </span>
          </div>
        </div>
      )}

      {/* 5. Expandable Diff Inspector Drawer */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setIsDiffDrawerExpanded(!isDiffDrawerExpanded)}
          className="w-full flex items-center justify-between text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 py-1.5 cursor-pointer"
        >
          <span className="flex items-center space-x-2">
            <GitCompare className="w-3.5 h-3.5 text-indigo-500" />
            <span>
              {t.bank.syncCenter.inspect} ({addedList.length} • {editedList.length} • {deletedList.length})
            </span>
          </span>
          {isDiffDrawerExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {isDiffDrawerExpanded && (
          <div className="mt-3 p-4 rounded-2xl bg-white/60 dark:bg-zinc-900/60 border border-slate-200/70 dark:border-zinc-800/80 space-y-3">
            {activeItems.length === 0 ? (
              <div className="text-center py-6 space-y-1.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  {t.bank.syncCenter.noItems} ({activeTabLabel})
                </p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  {t.bank.syncCenter.matches} ({t.bank.syncCenter.localLabel} v{localRev}.0)
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {activeItems.map((item) => {
                  const isExpanded = expandedQuestionId === item.id;
                  let badgeColor =
                    'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/30';
                  let badgeLabel = t.bank.syncCenter.addedItemBadge;
                  if (item.diffKind === 'edited') {
                    badgeColor =
                      'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/30';
                    badgeLabel = `${t.bank.syncCenter.editedItemBadge} (v${item.previousBankVersion ?? 1} → v${item.newBankVersion})`;
                  } else if (item.diffKind === 'deleted') {
                    badgeColor =
                      'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-400/30';
                    badgeLabel = t.bank.syncCenter.deletedItemBadge;
                  } else if (item.diffKind === 'preserved_custom') {
                    badgeColor =
                      'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-400/30';
                    badgeLabel = t.bank.syncCenter.preservedItemBadge;
                  }

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-white/80 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700/80 text-xs space-y-2 transition-all"
                    >
                      <div
                        onClick={() => setExpandedQuestionId(isExpanded ? null : item.id)}
                        className="flex items-center justify-between cursor-pointer gap-2"
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className="font-mono text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 shrink-0">
                            {item.id}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-zinc-100 truncate">
                            {item.concept}
                          </span>
                          <span className="text-[10px] text-slate-400 capitalize hidden sm:inline">
                            • {item.subjectId}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          {item.changedFields && item.changedFields.length > 0 && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400">
                              {t.bank.syncCenter.changedFields}: {item.changedFields.join(', ')}
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${badgeColor}`}
                          >
                            {badgeLabel}
                          </span>
                        </div>
                      </div>

                      <p className="text-slate-700 dark:text-zinc-300 font-serif line-clamp-2">
                        {item.stem}
                      </p>

                      {/* Side-by-Side Before vs. After Diff View when expanded */}
                      {isExpanded && item.diffKind === 'edited' && item.previousStem && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-200/60 dark:border-zinc-700/60 text-[11px]">
                          <div className="p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-1">
                            <span className="font-bold text-rose-600 dark:text-rose-400 uppercase text-[10px]">
                              {t.bank.syncCenter.previousVersion} (v{item.previousBankVersion ?? 1})
                            </span>
                            <p className="font-serif text-slate-600 dark:text-zinc-400">
                              {item.previousStem}
                            </p>
                          </div>
                          <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-[10px]">
                              {t.bank.syncCenter.newVersion} (v{item.newBankVersion})
                            </span>
                            <p className="font-serif text-slate-800 dark:text-zinc-200">
                              {item.stem}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
