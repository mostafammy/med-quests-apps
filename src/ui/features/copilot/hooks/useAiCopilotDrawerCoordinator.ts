import { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from '../../../../domain/ai/conversation.ts';
import { useCopilotStore } from '../../../../application/stores/useCopilotStore.ts';
import { useAiSettingsStore } from '../../../../application/stores/useAiSettingsStore.ts';
import { useLocaleStore } from '../../../../application/stores/useLocaleStore.ts';
import { getModelDisplayName } from '../../../../domain/ai/modelCatalog.ts';

export function formatMessageTime(timestamp: number): string {
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

export function formatMessageEngine(engine: string | null, modelId?: string | null): string {
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
      const displayName = getModelDisplayName(provider, modelId);
      return `${providerLabel} • ${displayName}`;
    }
    return `${providerLabel} • ${modelId.split('/').pop() || modelId}`;
  }

  return providerLabel;
}

export function getMessageCopyText(msg: ChatMessage): string {
  const texts: string[] = [];
  for (const part of msg.parts) {
    if (part.kind === 'text' || part.kind === 'notice') {
      texts.push(part.text);
    }
  }
  return texts.join('\n\n');
}

export function useAiCopilotDrawerCoordinator() {
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
  const { t } = useLocaleStore();
  const [inputText, setInputText] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
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

  return {
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
    settings,
    updateSettings,
    t,
    inputText,
    setInputText,
    isSettingsOpen,
    setIsSettingsOpen,
    isInsightsOpen,
    setIsInsightsOpen,
    copiedMessageId,
    handleCopyMessage,
    handleSend,
    messagesEndRef,
    inputRef,
  };
}
