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
} from 'lucide-react';
import { useCopilotStore } from '../../../application/stores/useCopilotStore.ts';
import { useAiSettingsStore } from '../../../application/stores/useAiSettingsStore.ts';
import { CopilotSettingsModal } from './CopilotSettingsModal.tsx';
import { CopilotMarkdownView } from './CopilotMarkdownView.tsx';
import { HemodynamicPvLoopCard } from './cards/HemodynamicPvLoopCard.tsx';
import { CardiovascularEquationCard } from './cards/CardiovascularEquationCard.tsx';
import { PeerCohortTrapCard } from './cards/PeerCohortTrapCard.tsx';
import {
  SrsFlashcardCard,
  MnemonicAnchorCard,
  MicroCurriculumCard,
} from './cards/MemoryRemediationCard.tsx';
import { getModelDisplayName } from '../../../domain/ai/modelCatalog.ts';

export const AiCopilotDrawer: React.FC = () => {
  const {
    isOpen,
    isExpanded,
    closeDrawer,
    toggleExpanded,
    messages,
    isStreaming,
    activeDiagnosticTool,
    error,
    sendUserMessage,
    abortStreaming,
    clearMessages,
  } = useCopilotStore();

  const { settings, loadSettings } = useAiSettingsStore();
  const [inputText, setInputText] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const starterSuggestions = [
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
                  const activeModelId =
                    settings.engine === 'groq'
                      ? settings.groqModel
                      : settings.engine === 'gemini'
                      ? settings.geminiModel
                      : settings.openRouterModel;
                  const friendlyModelName = getModelDisplayName(settings.engine, activeModelId);

                  return (
                    <button
                      onClick={() => setIsSettingsOpen(true)}
                      className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 dark:bg-indigo-400/15 text-indigo-700 dark:text-indigo-300 font-extrabold border border-indigo-500/20 flex items-center space-x-1 cursor-pointer hover:bg-indigo-500/20 transition-colors"
                      title="Change engine or model in settings"
                    >
                      {settings.engine === 'openrouter' ? (
                        <>
                          <Globe className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                          <span>OPENROUTER • {friendlyModelName}</span>
                        </>
                      ) : settings.engine === 'groq' ? (
                        <>
                          <Cpu className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                          <span>GROQ • {friendlyModelName}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-2.5 h-2.5 text-purple-500 shrink-0" />
                          <span>GEMINI • {friendlyModelName}</span>
                        </>
                      )}
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
                    className="w-full text-left p-3 rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 hover:border-indigo-400 text-xs text-slate-700 dark:text-zinc-300 transition-all duration-200 flex items-center justify-between group shadow-2xs hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  >
                    <span className="font-medium pr-2">{prompt}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col space-y-1.5 transition-all duration-200 ${
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
                        return <SrsFlashcardCard key={pIdx} result={artifactPayload} />;
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
                </div>

                {/* Latency footnote */}
                {msg.latencyMs !== null && (
                  <span className="text-[9px] font-mono text-slate-400 dark:text-zinc-500 px-2">
                    {msg.latencyMs}ms
                  </span>
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

        {/* Clean Input Bar */}
        <div className="p-3.5 border-t border-slate-200/60 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl">
          <form onSubmit={handleSend} className="relative flex items-center">
            <div className="relative flex-1 group">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isStreaming ? 'Synthesizing clinical guidance...' : 'Ask question or discuss diagnostic reasoning...'}
                disabled={isStreaming}
                className="w-full text-xs sm:text-sm pl-4 pr-12 py-3 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50/80 dark:bg-zinc-900/80 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:focus:border-indigo-400 shadow-inner transition-all duration-300"
              />
              {messages.length > 0 && !isStreaming && (
                <button
                  type="button"
                  onClick={clearMessages}
                  className="absolute right-3 top-3 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors p-0.5 cursor-pointer"
                  title="Clear conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="ml-2">
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
