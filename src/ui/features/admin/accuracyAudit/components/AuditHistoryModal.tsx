import React from 'react';
import { History, Trash2 } from 'lucide-react';
import type { AccuracyAuditReport } from '../../../../../domain/questionBank/accuracyAudit/types.ts';

interface AuditHistoryModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly historicalReports: readonly AccuracyAuditReport[];
  readonly onSelectReport: (runId: string) => void;
  readonly onDeleteReport: (runId: string) => void;
}

export const AuditHistoryModal: React.FC<AuditHistoryModalProps> = ({
  isOpen,
  onClose,
  historicalReports,
  onSelectReport,
  onDeleteReport,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-500" />
            Historical Accuracy Audits
          </h3>
          <button
            onClick={onClose}
            className="text-xs text-zinc-400 hover:text-zinc-600"
          >
            Close
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto space-y-2">
          {historicalReports.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              No historical audits recorded. Run your first audit above!
            </div>
          ) : (
            historicalReports.map((report) => (
              <div
                key={report.runId}
                onClick={() => {
                  onSelectReport(report.runId);
                  onClose();
                }}
                className="p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer flex items-center justify-between gap-3 transition-all"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {new Date(report.timestamp).toLocaleString()}
                    </span>
                    {report.auditingModel && (
                      <span className="text-[10px] px-2 py-0.2 rounded-full font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        {report.auditingModel.modelName}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    Sample: {report.extractionMetadata.sampledCount} questions •
                    Strategy: {report.configuration.strategyType}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {report.kpis.overallAccuracyIndex}%
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteReport(report.runId);
                    }}
                    className="p-1 text-zinc-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
