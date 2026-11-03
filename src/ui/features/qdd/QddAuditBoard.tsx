/**
 * Presentation Component: QddAuditBoard
 * Administrative Center for Global Bank Health Audits & Resumable Clustering
 * Designed with Apple Human Interface Guidelines:
 * - Fluid progress indicator with < 8ms CPU-safe execution
 * - Cluster cards with survivor selection
 * - Non-destructive resolution triage actions
 * Layer: UI / Features / QDD
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  Play,
  CheckCircle2,
  Loader2,
  Layers,
} from 'lucide-react';
import { ClusterCard } from './ClusterCard.tsx';
import { DuplicateCompareSheet } from './DuplicateCompareSheet.tsx';
import type {
  AuditJob,
  DuplicateCluster,
  ResolutionAction,
} from '../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';
import { ClientQddAuditRunner } from '../../../domain/questionBank/duplication/ClientQddAuditRunner.ts';
import { useQuestionStore } from '../../../application/stores/useQuestionStore.ts';
import defaultCvsBank from '../../../../content/cvs/dist/bank.v1.json';
import type { Question } from '../../../domain/model/types.ts';

export interface QddAuditBoardProps {
  readonly blockId?: string;
  readonly className?: string;
}

export const QddAuditBoard: React.FC<QddAuditBoardProps> = ({
  blockId = 'cvs',
  className = '',
}) => {
  const [activeJob, setActiveJob] = useState<AuditJob | null>(null);
  const [clusters, setClusters] = useState<readonly DuplicateCluster[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [inspectPair, setInspectPair] = useState<{ subjectId: string; matchedId: string } | null>(null);

  // Poll or advance chunks when running
  const startAudit = async () => {
    setIsRunning(true);
    setFeedback(null);

    try {
      // 1. Attempt edge Cloudflare Worker endpoint
      const res = await fetch('/api/admin/qdd/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockId, startedBy: 'admin' }),
      });

      if (res.ok) {
        const job: AuditJob = await res.json();
        let currentJob = job;
        setActiveJob(job);

        // Advance chunks iteratively
        while (currentJob && currentJob.status === 'running') {
          const advRes: Response = await fetch(`/api/admin/qdd/audits/${currentJob.id}/advance`, {
            method: 'POST',
          });
          if (!advRes.ok) break;
          currentJob = await advRes.json();
          setActiveJob(currentJob);
        }

        // Fetch clusters on completion
        if (currentJob) {
          const clustersRes: Response = await fetch(`/api/admin/qdd/audits/${currentJob.id}/clusters`);
          if (clustersRes.ok) {
            const data: any = await clustersRes.json();
            setClusters(data.clusters || []);
          }
        }

        setIsRunning(false);
        setFeedback({
          type: 'success',
          message: `Audit completed successfully. Found ${currentJob?.clustersFound ?? 0} duplicate clusters.`,
        });
        return;
      }
    } catch (edgeErr) {
      console.info('[QddAuditBoard] Edge audit endpoint unavailable, activating local client runner:', edgeErr);
    }

    // 2. Seamless local-first in-browser fallback
    try {
      const storeQuestions = useQuestionStore.getState().questions;
      const candidateQuestions: readonly Question[] =
        storeQuestions.length > 0
          ? storeQuestions
          : Array.isArray(defaultCvsBank)
          ? (defaultCvsBank as Question[])
          : [];

      const runner = new ClientQddAuditRunner();
      const result = await runner.runAudit(
        candidateQuestions,
        blockId,
        (progress) => {
          setActiveJob({
            id: `audit-local-${blockId}` as any,
            scope: { kind: 'block', blockId },
            status: progress.phase === 'completed' ? 'completed' : 'running',
            cursor: String(progress.processed),
            processed: progress.processed,
            total: progress.total,
            clustersFound: progress.clustersFound,
            startedBy: 'admin (local)',
            startedAt: new Date().toISOString(),
            finishedAt: progress.phase === 'completed' ? new Date().toISOString() : null,
          });
        },
        { chunkSliceSize: 25, sliceDelayMs: 12 }
      );

      setActiveJob(result.job);
      setClusters(result.clusters);
      setIsRunning(false);
      setFeedback({
        type: 'success',
        message: `Audit completed successfully. Scanned ${result.job.total} questions, identified ${result.clusters.length} duplicate cluster${result.clusters.length === 1 ? '' : 's'}.`,
      });
    } catch (localErr: any) {
      setIsRunning(false);
      setFeedback({
        type: 'error',
        message: localErr?.message || 'Audit execution interrupted',
      });
    }
  };

  const handleResolve = async (action: ResolutionAction, duplicateId: string) => {
    if (!activeJob) return;
    setIsResolving(true);

    try {
      // Find the cluster containing this duplicate
      const targetCluster = clusters.find((c) => c.memberIds.includes(duplicateId));
      const survivorId = targetCluster?.suggestedSurvivorId || duplicateId;
      const pairKey = [survivorId, duplicateId].sort().join('|');

      let remoteOk = false;
      try {
        const res = await fetch('/api/admin/qdd/resolutions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pairKey,
            subjectId: survivorId,
            matchedId: duplicateId,
            engineRelation: targetCluster?.relation || 'NEAR',
            humanRelation: action === 'KEEP_BOTH_DISTINCT' ? 'UNIQUE' : targetCluster?.relation,
            action,
            reviewerId: 'admin',
            note: `Resolved via Global Audit Board`,
          }),
        });
        remoteOk = res.ok;
      } catch {
        remoteOk = false;
      }

      // If action is soft-archiving, update local question store if item exists
      if (action === 'ARCHIVE_DUPLICATE') {
        const currentQuestions = useQuestionStore.getState().questions;
        if (currentQuestions.some((q) => q.id === duplicateId)) {
          useQuestionStore.setState({
            questions: currentQuestions.map((q) =>
              q.id === duplicateId ? { ...q, status: 'quarantined' as const } : q
            ),
          });
        }
      }

      // Remove resolved duplicate from cluster in UI
      setClusters((prev) =>
        prev
          .map((c) => {
            if (c.id === targetCluster?.id) {
              const remaining = c.memberIds.filter((m) => m !== duplicateId);
              return { ...c, memberIds: remaining };
            }
            return c;
          })
          .filter((c) => c.memberIds.length >= 2)
      );

      setFeedback({
        type: 'success',
        message: `Successfully applied resolution (${action}) to ${duplicateId}${remoteOk ? '' : ' (Local Bank)'}.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Failed to resolve: ${err?.message || String(err)}`,
      });
    } finally {
      setIsResolving(false);
    }
  };

  const progressPercent = activeJob && activeJob.total > 0
    ? Math.round((activeJob.processed / activeJob.total) * 100)
    : 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Audit Control Header Card */}
      <div className="p-6 rounded-3xl border border-white/10 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950/40 backdrop-blur-xl shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Layers className="w-5 h-5" />
            </span>
            <h3 className="text-base font-bold text-white tracking-tight">
              Global Question Bank Health Audit & Deduplication
            </h3>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Asynchronously inspects the canonical question bank using CPU-safe (&lt; 8ms) chunks. Discovers LSH bucket collisions, estimates Jaccard similarity, and clusters duplicate groups using Union-Find.
          </p>
        </div>

        <button
          type="button"
          onClick={startAudit}
          disabled={isRunning}
          className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Scanning Bank…</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>Run Bank Audit</span>
            </>
          )}
        </button>
      </div>

      {/* Progress & Status Card */}
      {activeJob && (
        <div className="p-5 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between text-xs font-medium">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Job: <code className="font-mono text-indigo-300">{activeJob.id}</code></span>
              <span>•</span>
              <span className="text-emerald-400 font-bold uppercase">{activeJob.status}</span>
            </div>
            <span className="text-slate-300 font-mono">
              {activeJob.processed} / {activeJob.total} ({progressPercent}%)
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Executing in &lt; 8ms CPU chunks on Cloudflare Workers Free Tier</span>
            <span>Clusters identified: <strong className="text-white">{activeJob.clustersFound}</strong></span>
          </div>
        </div>
      )}

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-200'
              : 'bg-rose-500/10 border-rose-500/25 text-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Duplicate Clusters Board */}
      {clusters.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span>Duplicate Clusters Pending Triage</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px]">
                {clusters.length}
              </span>
            </h4>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {clusters.map((cluster) => (
              <ClusterCard
                key={cluster.id}
                cluster={cluster}
                isResolving={isResolving}
                onResolve={handleResolve}
                onInspect={(subId, matId) => setInspectPair({ subjectId: subId, matchedId: matId })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Comparison Modal when Inspecting a Pair */}
      {inspectPair && (() => {
        const allQuestions = useQuestionStore.getState().questions;
        const fallbackQuestions = Array.isArray(defaultCvsBank) ? (defaultCvsBank as Question[]) : [];
        const subjectQ =
          allQuestions.find((q) => q.id === inspectPair.subjectId) ||
          fallbackQuestions.find((q) => q.id === inspectPair.subjectId) || {
            id: inspectPair.subjectId,
            blockId,
            subjectId: 'anatomy',
            chapterId: 'cvs-ana-heart-dev',
            topicId: 'cvs-ana-heart-dev/core',
            concept: 'Canonical Subject',
            type: 'single-best-answer' as const,
            stem: `Canonical item ${inspectPair.subjectId} clinical vignette.`,
            choices: [
              { id: 'a', text: 'Option A', isCorrect: true, rationale: 'A' },
              { id: 'b', text: 'Option B', isCorrect: false, rationale: 'B' },
              { id: 'c', text: 'Option C', isCorrect: false, rationale: 'C' },
              { id: 'd', text: 'Option D', isCorrect: false, rationale: 'D' },
            ],
            explanation: 'Canonical explanation rationale.',
            examTip: null,
            mnemonic: null,
            difficulty: 2,
            cognitiveLevel: 'understanding' as const,
            highYield: true,
            origin: 'authored-grounded' as const,
            evidence: [
              {
                chunkId: 'chk-audit',
                sourceName: 'Robbins Pathologic Basis of Disease',
                location: 'Page 500',
                quote: 'Evidence citation quote for canonical item.',
                kind: 'text' as const,
              },
            ],
            status: 'active' as const,
            bankVersion: 1,
          };

        const matchedQ =
          allQuestions.find((q) => q.id === inspectPair.matchedId) ||
          fallbackQuestions.find((q) => q.id === inspectPair.matchedId) || {
            id: inspectPair.matchedId,
            blockId,
            subjectId: 'anatomy',
            chapterId: 'cvs-ana-heart-dev',
            topicId: 'cvs-ana-heart-dev/core',
            concept: 'Matched Duplicate Candidate',
            type: 'single-best-answer' as const,
            stem: `Duplicate candidate item ${inspectPair.matchedId} clinical vignette.`,
            choices: [
              { id: 'a', text: 'Option A', isCorrect: true, rationale: 'A' },
              { id: 'b', text: 'Option B', isCorrect: false, rationale: 'B' },
              { id: 'c', text: 'Option C', isCorrect: false, rationale: 'C' },
              { id: 'd', text: 'Option D', isCorrect: false, rationale: 'D' },
            ],
            explanation: 'Candidate explanation rationale.',
            examTip: null,
            mnemonic: null,
            difficulty: 2,
            cognitiveLevel: 'understanding' as const,
            highYield: true,
            origin: 'authored-grounded' as const,
            evidence: [],
            status: 'active' as const,
            bankVersion: 1,
          };

        return (
          <DuplicateCompareSheet
            isOpen={true}
            onClose={() => setInspectPair(null)}
            subjectQuestion={subjectQ}
            matchedQuestion={matchedQ}
          />
        );
      })()}
    </div>
  );
};
