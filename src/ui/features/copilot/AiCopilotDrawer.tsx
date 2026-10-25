import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Maximize2,
  Minimize2,
  Settings,
  Send,
  Square,
  Globe,
  Cpu,
  Trash2,
  AlertCircle,
  Activity,
  ArrowRight,
  Languages,
  Copy,
  Check,
  Clock,
} from 'lucide-react';
import type { ChatMessage } from '../../../domain/ai/conversation.ts';
import { useCopilotStore } from '../../../application/stores/useCopilotStore.ts';
import { useAiSettingsStore } from '../../../application/stores/useAiSettingsStore.ts';
import { CopilotSettingsModal } from './CopilotSettingsModal.tsx';
import { CopilotMarkdownView } from './CopilotMarkdownView.tsx';
import { QuickPowerActionsBar } from './QuickPowerActionsBar.tsx';
import { HemodynamicPvLoopCard } from './cards/HemodynamicPvLoopCard.tsx';
import { CardiovascularEquationCard } from './cards/CardiovascularEquationCard.tsx';
import { PeerCohortTrapCard } from './cards/PeerCohortTrapCard.tsx';
import {
  MnemonicAnchorCard,
  MicroCurriculumCard,
} from './cards/MemoryRemediationCard.tsx';
import { ThinkingAccordion } from './ThinkingAccordion.tsx';
import { getModelDisplayName } from '../../../domain/ai/modelCatalog.ts';

function formatMessageTime(timestamp: number): string {
  if (!timestamp) return '';
  try {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function formatMessageEngine(engine: string | null, modelId?: string | null): string {
  if (!engine && !modelId) return 'AI Assistant';
  if (engine === 'cached' || modelId === 'Instant Cache') return 'Instant Cache';

  const provider = engine ? engine.toLowerCase() : '';
  const providerLabel =
    provider === 'groq'
      ? 'Groq'
      : provider === 'gemini'
        ? 'Gemini'
        : provider === 'openrouter'
          ? 'OpenRouter'
          : provider || 'AI';

  if (modelId) {
    if (provider === 'groq' || provider === 'gemini' || provider === 'openrouter') {
      const displayName = getModelDisplayName(provider as any, modelId);
      return `${providerLabel} • ${displayName}`;
    }
    return `${providerLabel} • ${modelId.split('/').pop() || modelId}`;
  }

  return providerLabel;
}

function getMessageCopyText(msg: ChatMessage): string {
  const texts: string[] = [];
  for (const part of msg.parts) {
    if (part.kind === 'text' || part.kind === 'notice') {
      texts.push(part.text);
    }
  }
  return texts.join('\n\n');
}

export const AiCopilotDrawer: React.FC = () => {
  const {
    isOpen,
    isExpanded,
    closeDrawer,
    toggleExpanded,
    messages,
    isStreaming,
    activeDiagnosticTool,
    activeResolvedEngine,
    error,
    sendUserMessage,
    abortStreaming,
    clearMessages,
  } = useCopilotStore();

  const { settings, loadSettings, updateSettings } = useAiSettingsStore();
  const [inputText, setInputText] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCopyMessage = async (msg: ChatMessage) => {
    const text = getMessageCopyText(msg);
    if (!text) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedMessageId(msg.id);
      setTimeout(() => {
        setCopiedMessageId((prev) => (prev === msg.id ? null : prev));
      }, 2000);
    } catch {
      // Graceful fallback
    }
  };

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming, activeDiagnosticTool]);

  // Global Keyboard Shortcuts (? or Cmd+K / Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement).tagName;
      if (['INPUT', 'TEXTAREA'].includes(targetTag)) {
        if (e.key === 'Escape' && isOpen) {
          closeDrawer();
        }
        return;
      }

      if (e.key === '?' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        useCopilotStore.getState().toggleDrawer();
        return;
      }

      if (e.key === 'Escape' && isOpen) {
        closeDrawer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeDrawer]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || isStreaming) return;
    const txt = inputText.trim();
    setInputText('');
    sendUserMessage(txt);
  };

  const isArabicChat = settings.chatLanguage === 'ar';
  const starterSuggestions = isArabicChat
    ? [
        'ما هو التغير الديناميكي الدموي الأساسي في هذه الحالة؟',
        'أنا محتار بين الخيارين B و C — ما الذي يفرق بينهما؟',
        'قم بمحاكاة منحنى الضغط والحجم (P-V Loop) لهذه الآفة.',
      ]
    : [
        'What is the primary hemodynamic shift in this vignette?',
        'I am torn between choices B and C—what distinguishes them?',
        'Simulate the Pressure-Volume loop for this patient lesion.',
      ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        className={`fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-40 sm:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Main Kinetic Docked Drawer Container */}
      <aside
        className={`fixed top-0 right-0 h-full z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl luminous-copilot-border flex flex-col transform transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] select-none ${
          isExpanded ? 'w-full sm:w-[640px]' : 'w-full sm:w-[440px]'
        } ${
          isOpen
            ? 'translate-x-0 opacity-100 shadow-2xl pointer-events-auto'
            : 'translate-x-full opacity-0 pointer-events-none'
        }`}
        aria-label="AI Cognitive Co-Pilot"
        aria-hidden={!isOpen}
      >
        {/* Animated Laser Edge Seam along the left border */}
        <div className="absolute left-0 top-0 bottom-0 w-[2.5px] bg-gradient-to-b from-indigo-500 via-cyan-400 to-fuchsia-500 animate-laser-glow opacity-80" />

        {/* Top Specular Hairline */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

        {/* Clean Header */}
        <div className="px-4 py-3 border-b border-slate-200/60 dark:border-zinc-800/60 flex items-center justify-between bg-slate-50/70 dark:bg-zinc-900/60 relative z-10">
          <div className="flex items-center space-x-3">
            {/* Holographic AI Core Orb */}
            <div className="relative flex items-center justify-center w-8 h-8">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-indigo-500 via-cyan-400 to-fuchsia-500 p-[1.5px] animate-spin-slow">
                <div className="w-full h-full bg-white dark:bg-zinc-950 rounded-[10px]" />
              </div>
              <div className="relative w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black tracking-wide uppercase bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-white dark:to-indigo-200 bg-clip-text text-transparent">
                  AI Co-Pilot
                </span>

                {/* Model Engine Pill */}
                {(() => {
                  const effectiveEngine = (activeResolvedEngine || settings.engine) as 'groq' | 'gemini' | 'openrouter';
                  const isFallback = Boolean(activeResolvedEngine && activeResolvedEngine !== settings.engine);
                  const activeModelId =
                    effectiveEngine === 'groq'
                      ? settings.groqModel
                      : effectiveEngine === 'gemini'
                      ? settings.geminiModel
                      : settings.openRouterModel;
                  const friendlyModelName = getModelDisplayName(effectiveEngine, activeModelId);

                  return (
                    <button
                      onClick={() => setIsSettingsOpen(true)}
                      className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 dark:bg-indigo-400/15 text-indigo-700 dark:text-indigo-300 font-extrabold border border-indigo-500/20 flex items-center space-x-1 cursor-pointer hover:bg-indigo-500/20 transition-colors"
                      title="Change engine or model in settings"
                    >
                      {effectiveEngine === 'openrouter' ? (
                        <>
                          <Globe className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                          <span>OPENROUTER{isFallback ? ' (Backup)' : ''} • {friendlyModelName}</span>
                        </>
                      ) : effectiveEngine === 'groq' ? (
                        <>
                          <Cpu className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                          <span>GROQ{isFallback ? ' (Backup)' : ''} • {friendlyModelName}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-2.5 h-2.5 text-purple-500 shrink-0" />
                          <span>GEMINI{isFallback ? ' (Backup)' : ''} • {friendlyModelName}</span>
                        </>
                      )}
                    </button>
                  );
                })()}

                {/* Chat Response Language Quick-Toggle Pill */}
                {(() => {
                  const currentLangPref = settings.chatLanguage || 'auto';
                  const nextLang =
                    currentLangPref === 'auto' ? 'en' : currentLangPref === 'en' ? 'ar' : 'auto';
                  const label =
                    currentLangPref === 'auto' ? 'AUTO' : currentLangPref === 'en' ? 'EN' : 'عربي';

                  return (
                    <button
                      type="button"
                      onClick={() => updateSettings({ chatLanguage: nextLang })}
                      className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 font-extrabold border border-slate-300/60 dark:border-zinc-700/60 flex items-center space-x-1 cursor-pointer hover:bg-indigo-500/10 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                      title={`AI Chat Language: ${currentLangPref.toUpperCase()} (Click to toggle to ${nextLang.toUpperCase()})`}
                    >
                      <Languages className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                      <span>{label}</span>
                    </button>
                  );
                })()}
              </div>
              <p className="text-[10px] font-medium text-slate-400 dark:text-zinc-500">
                Autonomous Socratic Clinical Mentor
              </p>
            </div>
          </div>

          {/* Action Icons */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              title="Provider Settings (BYO Key)"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={toggleExpanded}
              className="hidden sm:inline-flex p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              title={isExpanded ? 'Collapse width' : 'Expand width'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={closeDrawer}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              title="Close Co-Pilot (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Conversation Stream Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 select-text">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 select-none">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-dashed border-indigo-400/40 animate-spin-slow" />
                <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
              </div>

              <div className="space-y-1 max-w-xs">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight">
                  Clinical Socratic Co-Pilot
                </h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Real-time cognitive guidance synchronized with your active question and performance telemetry.
                </p>
              </div>

              {/* Starter Inquiry Prompts */}
              <div className="pt-2 w-full space-y-2">
                {starterSuggestions.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendUserMessage(prompt)}
                    className="w-full text-start p-3 rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 hover:border-indigo-400 text-xs text-slate-700 dark:text-zinc-300 transition-all duration-200 flex items-center justify-between group shadow-2xs hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  >
                    <span className="font-medium pe-2">{prompt}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 rtl:-scale-x-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-all shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
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
                      const { artifactPayload } = part.envelope;
                      if (!artifactPayload) return null;

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
                    <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                      <span className="text-[10px] font-mono tracking-wider uppercase">Reasoning</span>
                    </div>
                  )}

                  {/* Assistant Footer: Model Used, Message Time, Latency & Copy Button */}
                  {msg.role === 'assistant' && msg.status !== 'streaming' && (
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80 text-[10px] text-slate-400 dark:text-zinc-500">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Model Name & Provider Badge */}
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 font-medium text-slate-600 dark:text-zinc-300">
                          <Cpu className="w-2.5 h-2.5 text-indigo-500" />
                          <span>{formatMessageEngine(msg.engine, msg.modelId)}</span>
                        </span>

                        {/* Timestamp */}
                        {msg.createdAt && (
                          <span className="inline-flex items-center gap-1 font-mono text-[9px] text-slate-400 dark:text-zinc-500">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{formatMessageTime(msg.createdAt)}</span>
                          </span>
                        )}

                        {/* Latency */}
                        {msg.latencyMs !== null && (
                          <span className="font-mono text-[9px] text-slate-400 dark:text-zinc-500">
                            {msg.latencyMs}ms
                          </span>
                        )}
                      </div>

                      {/* Copy AI Message */}
                      <button
                        type="button"
                        onClick={() => void handleCopyMessage(msg)}
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
                      onClick={() => void handleCopyMessage(msg)}
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
            ))
          )}

          {/* Subtle Silent Background Tool Indicator */}
          {activeDiagnosticTool && (
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-700 dark:text-indigo-300 text-xs font-semibold animate-pulse">
              <Activity className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-spin-slow" />
              <span className="text-[11px]">
                {activeDiagnosticTool === 'analyze_active_question_vignette'
                  ? 'Analyzing vignette presentation & trap map...'
                  : activeDiagnosticTool === 'inspect_student_cognitive_telemetry'
                  ? 'Reading live hesitation telemetry...'
                  : activeDiagnosticTool === 'detect_cognitive_bias_trap'
                  ? 'Evaluating cognitive bias & anchoring patterns...'
                  : 'Running clinical background diagnostic...'}
              </span>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 flex items-start space-x-2 shadow-sm">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{error}</div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Ready-to-Use High Yield Power Actions Strip */}
        <QuickPowerActionsBar />

        {/* Clean Input Bar */}
        <div className="p-3.5 border-t border-slate-200/60 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl">
          <form onSubmit={handleSend} className="relative flex items-center">
            <div className="relative flex-1 group">
              <input
                ref={inputRef}
                type="text"
                dir="auto"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  isStreaming
                    ? isArabicChat
                      ? 'جارٍ توليد التوجيه السريري...'
                      : 'Synthesizing clinical guidance...'
                    : isArabicChat
                    ? 'اطرح سؤالاً أو ناقش التعليل التشخيصي...'
                    : 'Ask question or discuss diagnostic reasoning...'
                }
                disabled={isStreaming}
                className="w-full text-xs sm:text-sm ps-4 pe-12 py-3 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50/80 dark:bg-zinc-900/80 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:focus:border-indigo-400 shadow-inner transition-all duration-300"
              />
              {messages.length > 0 && !isStreaming && (
                <button
                  type="button"
                  onClick={clearMessages}
                  className="absolute end-3 top-3 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors p-0.5 cursor-pointer"
                  title="Clear conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="ms-2">
              {isStreaming ? (
                <button
                  type="button"
                  onClick={abortStreaming}
                  className="p-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-md shadow-rose-600/30 hover:scale-105 active:scale-95 cursor-pointer"
                  title="Stop generation"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:hover:scale-100 text-white transition-all shadow-md shadow-indigo-600/25 hover:shadow-indigo-600/40 hover:scale-105 active:scale-95 cursor-pointer"
                  title="Send message (Enter)"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
        </div>
      </aside>

      {/* Settings Modal */}
      <CopilotSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
};
