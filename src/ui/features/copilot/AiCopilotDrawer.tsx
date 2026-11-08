import React from 'react';
import { Activity, AlertCircle } from 'lucide-react';
import { useAiCopilotDrawerCoordinator } from './hooks/useAiCopilotDrawerCoordinator.ts';
import { CopilotDrawerHeader } from './components/CopilotDrawerHeader.tsx';
import { CopilotEmptyState } from './components/CopilotEmptyState.tsx';
import { CopilotMessageItem } from './components/CopilotMessageItem.tsx';
import { CopilotInputBar } from './components/CopilotInputBar.tsx';
import { QuickPowerActionsBar } from './QuickPowerActionsBar.tsx';
import { CopilotSettingsModal } from './CopilotSettingsModal.tsx';
import { ModelPerformanceInsightsModal } from './ModelPerformanceInsightsModal.tsx';

export const AiCopilotDrawer: React.FC = () => {
  const coordinator = useAiCopilotDrawerCoordinator();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        className={`fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-40 sm:hidden transition-opacity duration-300 ${
          coordinator.isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={coordinator.closeDrawer}
        aria-hidden="true"
      />

      {/* Main Kinetic Docked Drawer Container */}
      <aside
        className={`fixed top-0 right-0 h-full z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl luminous-copilot-border flex flex-col transform transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] select-none ${
          coordinator.isExpanded ? 'w-full sm:w-[640px]' : 'w-full sm:w-[440px]'
        } ${
          coordinator.isOpen
            ? 'translate-x-0 opacity-100 shadow-2xl pointer-events-auto'
            : 'translate-x-full opacity-0 pointer-events-none'
        }`}
        aria-label={coordinator.t.copilot.title}
        aria-hidden={!coordinator.isOpen}
      >
        {/* Animated Laser Edge Seam along the left border */}
        <div className="absolute left-0 top-0 bottom-0 w-[2.5px] bg-gradient-to-b from-indigo-500 via-cyan-400 to-fuchsia-500 animate-laser-glow opacity-80" />

        {/* Top Specular Hairline */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

        {/* Clean Header */}
        <CopilotDrawerHeader
          activeResolvedEngine={coordinator.activeResolvedEngine}
          settings={coordinator.settings}
          onOpenSettings={() => coordinator.setIsSettingsOpen(true)}
          onOpenInsights={() => coordinator.setIsInsightsOpen(true)}
          onUpdateSettings={coordinator.updateSettings}
          isExpanded={coordinator.isExpanded}
          onToggleExpanded={coordinator.toggleExpanded}
          onClose={coordinator.closeDrawer}
          t={coordinator.t}
        />

        {/* Conversation Stream Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 select-text">
          {coordinator.messages.length === 0 ? (
            <CopilotEmptyState
              t={coordinator.t}
              onSelectPrompt={(prompt) => coordinator.sendUserMessage(prompt)}
            />
          ) : (
            coordinator.messages.map((msg) => (
              <CopilotMessageItem
                key={msg.id}
                msg={msg}
                activeDiagnosticTool={coordinator.activeDiagnosticTool}
                copiedMessageId={coordinator.copiedMessageId}
                onCopyMessage={coordinator.handleCopyMessage}
                t={coordinator.t}
              />
            ))
          )}

          {/* Subtle Silent Background Tool Indicator */}
          {coordinator.activeDiagnosticTool && (
            <div className="inline-flex items-center space-x-2 rtl:space-x-reverse px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-700 dark:text-indigo-300 text-xs font-semibold animate-pulse">
              <Activity className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-spin-slow" />
              <span className="text-[11px]">
                {coordinator.activeDiagnosticTool === 'analyze_active_question_vignette'
                  ? coordinator.t.copilot.diagnostics.analyzingVignette
                  : coordinator.activeDiagnosticTool === 'inspect_student_cognitive_telemetry'
                  ? coordinator.t.copilot.diagnostics.readingTelemetry
                  : coordinator.activeDiagnosticTool === 'detect_cognitive_bias_trap'
                  ? coordinator.t.copilot.diagnostics.evaluatingBias
                  : coordinator.t.copilot.diagnostics.runningGeneric}
              </span>
            </div>
          )}

          {coordinator.error && (
            <div className="p-3.5 rounded-2xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 flex items-start space-x-2 rtl:space-x-reverse shadow-sm">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{coordinator.error}</div>
            </div>
          )}

          <div ref={coordinator.messagesEndRef} />
        </div>

        {/* Ready-to-Use High Yield Power Actions Strip */}
        <QuickPowerActionsBar />

        {/* Clean Input Bar */}
        <CopilotInputBar
          inputText={coordinator.inputText}
          onInputChange={coordinator.setInputText}
          onSubmit={coordinator.handleSend}
          isStreaming={coordinator.isStreaming}
          hasMessages={coordinator.messages.length > 0}
          onClearMessages={coordinator.clearMessages}
          onAbortStreaming={coordinator.abortStreaming}
          inputRef={coordinator.inputRef}
          t={coordinator.t}
        />
      </aside>

      {/* Settings Modal */}
      <CopilotSettingsModal
        isOpen={coordinator.isSettingsOpen}
        onClose={() => coordinator.setIsSettingsOpen(false)}
      />

      {/* Model Performance & Speed Insights Modal */}
      <ModelPerformanceInsightsModal
        isOpen={coordinator.isInsightsOpen}
        onClose={() => coordinator.setIsInsightsOpen(false)}
      />
    </>
  );
};
