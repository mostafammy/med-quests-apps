import React from 'react';
import {
  AlertCircle,
  Cpu,
  Clock,
  Zap,
  Copy,
  Check,
} from 'lucide-react';
import type { ChatMessage } from '../../../../domain/ai/conversation.ts';
import type { TranslationDictionary } from '../../../../domain/i18n/types.ts';
import { formatLatency } from '../../../../domain/ai/metrics.ts';
import { CopilotMarkdownView } from '../CopilotMarkdownView.tsx';
import { ThinkingAccordion } from '../ThinkingAccordion.tsx';
import { HemodynamicPvLoopCard } from '../cards/HemodynamicPvLoopCard.tsx';
import { CardiovascularEquationCard } from '../cards/CardiovascularEquationCard.tsx';
import { PeerCohortTrapCard } from '../cards/PeerCohortTrapCard.tsx';
import {
  MnemonicAnchorCard,
  MicroCurriculumCard,
} from '../cards/MemoryRemediationCard.tsx';
import {
  formatMessageEngine,
  formatMessageTime,
} from '../hooks/useAiCopilotDrawerCoordinator.ts';

interface CopilotMessageItemProps {
  msg: ChatMessage;
  activeDiagnosticTool: string | null;
  copiedMessageId: string | null;
  onCopyMessage: (msg: ChatMessage) => void;
  t: TranslationDictionary;
}

export const CopilotMessageItem: React.FC<CopilotMessageItemProps> = ({
  msg,
  activeDiagnosticTool,
  copiedMessageId,
  onCopyMessage,
  t,
}) => {
  return (
    <div
      dir="auto"
      className={`flex flex-col space-y-1 transition-all duration-200 ${
        msg.role === 'user' ? 'items-end' : 'items-start'
      }`}
    >
      {/* Message Bubble */}
      <div
        className={`max-w-[94%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
          msg.role === 'user'
            ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20 rounded-br-sm'
            : 'bg-white/90 dark:bg-zinc-900/90 text-slate-900 dark:text-zinc-100 border border-slate-200/80 dark:border-zinc-800/80 shadow-sm rounded-bl-sm space-y-2.5 backdrop-blur-md'
        }`}
      >
        {/* Model Thinking Accordion (if supported and emitted by model) */}
        {msg.role === 'assistant' && msg.thinking && (
          <ThinkingAccordion
            thinking={msg.thinking}
            isStreaming={msg.status === 'streaming'}
          />
        )}

        {msg.parts.map((part, pIdx) => {
          if (part.kind === 'text') {
            return msg.role === 'user' ? (
              <div key={pIdx} className="whitespace-pre-wrap font-sans font-medium">
                {part.text}
              </div>
            ) : (
              <CopilotMarkdownView key={pIdx} content={part.text} />
            );
          }

          if (part.kind === 'artifact') {
            const artifactPayload = part.envelope?.artifactPayload;
            if (!artifactPayload) return null;

            try {
              if (artifactPayload.kind === 'pv_loop') {
                return <HemodynamicPvLoopCard key={pIdx} result={artifactPayload} />;
              }
              if (artifactPayload.kind === 'cv_equation') {
                return <CardiovascularEquationCard key={pIdx} result={artifactPayload} />;
              }
              if (artifactPayload.kind === 'peer_cohort') {
                return <PeerCohortTrapCard key={pIdx} result={artifactPayload} />;
              }
              if (artifactPayload.kind === 'srs_card') {
                return null;
              }
              if (artifactPayload.kind === 'mnemonic_anchor') {
                return <MnemonicAnchorCard key={pIdx} result={artifactPayload} />;
              }
              if (artifactPayload.kind === 'micro_curriculum') {
                return <MicroCurriculumCard key={pIdx} result={artifactPayload} />;
              }
            } catch (err) {
              console.warn('Failed to render artifact payload:', err);
              return null;
            }
          }

          if (part.kind === 'notice') {
            return (
              <div
                key={pIdx}
                className="my-1.5 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-center space-x-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>{part.text}</span>
              </div>
            );
          }

          return null;
        })}

        {/* Streaming indicator */}
        {msg.status === 'streaming' && !activeDiagnosticTool && (
          <div className="inline-flex items-center space-x-1.5 rtl:space-x-reverse px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
            <span className="text-[10px] font-mono tracking-wider uppercase">{t.copilot.reasoningBadge}</span>
          </div>
        )}

        {/* Assistant Footer: Model Used, Message Time, Latency & Copy Button */}
        {msg.role === 'assistant' && msg.status !== 'streaming' && (
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80 text-[10px] text-slate-400 dark:text-zinc-500">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 font-medium text-slate-600 dark:text-zinc-300">
                <Cpu className="w-2.5 h-2.5 text-indigo-500" />
                <span>{formatMessageEngine(msg.engine, msg.modelId)}</span>
              </span>

              {msg.createdAt && (
                <span className="inline-flex items-center gap-1 font-mono text-[9px] text-slate-400 dark:text-zinc-500">
                  <Clock className="w-2.5 h-2.5" />
                  <span>{formatMessageTime(msg.createdAt)}</span>
                </span>
              )}

              {msg.latencyMs !== null && msg.latencyMs !== undefined && (
                <span
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-mono text-[9px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                  title={`Generation speed: ${formatLatency(msg.latencyMs)} (${msg.latencyMs}ms)`}
                >
                  <Zap className="w-2.5 h-2.5 fill-current text-amber-500" />
                  <span>{formatLatency(msg.latencyMs)}</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => onCopyMessage(msg)}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              title="Copy AI response"
            >
              {copiedMessageId === msg.id ? (
                <>
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span className="text-[10px]">Copy</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* User Message Footer: Timestamp & Copy Button */}
      {msg.role === 'user' && (
        <div className="flex items-center justify-end gap-2 text-[10px] text-slate-400 dark:text-zinc-500 px-1">
          {msg.createdAt && (
            <span className="inline-flex items-center gap-1 font-mono text-[9px]">
              <Clock className="w-2.5 h-2.5" />
              <span>{formatMessageTime(msg.createdAt)}</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => onCopyMessage(msg)}
            className="inline-flex items-center gap-1 px-1 py-0.5 rounded hover:bg-slate-200/60 dark:hover:bg-zinc-800/60 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            title="Copy your message"
          >
            {copiedMessageId === msg.id ? (
              <>
                <Check className="w-2.5 h-2.5 text-emerald-500" />
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-2.5 h-2.5" />
                <span className="text-[9px]">Copy</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
