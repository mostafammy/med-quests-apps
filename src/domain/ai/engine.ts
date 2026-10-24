/**
 * AI engine port (Hexagonal architecture / Strategy pattern).
 *
 * The application depends only on `AiEngine`. Concrete strategies live in
 * `infrastructure/ai/` — the offline tutor, Groq, Gemini — and are
 * interchangeable at runtime without touching UI or application code.
 */
import type { SafeAiContext } from './context.ts';
import type { QuickIntentId } from './intents.ts';
import type { ToolCall, ToolParseError } from './tools.ts';

export type EngineId = 'offline-tutor' | 'groq' | 'gemini';

export interface ConversationTurn {
  readonly role: 'user' | 'assistant';
  readonly text: string;
}

export interface EngineRequest {
  readonly context: SafeAiContext;
  readonly message: string;
  /** Set when the turn was triggered by a quick intent rather than free text. */
  readonly intent: QuickIntentId | null;
  /** Prior turns in this thread, oldest first, text-only. */
  readonly history: readonly ConversationTurn[];
  readonly signal: AbortSignal;
}

export type EngineEvent =
  | { readonly type: 'text'; readonly delta: string }
  | { readonly type: 'tool-call'; readonly call: ToolCall }
  | { readonly type: 'tool-error'; readonly error: ToolParseError };

export type EngineFailureCode = 'missing-key' | 'unauthorized' | 'rate-limited' | 'network' | 'bad-response';

/** Typed failure thrown from an engine's stream. Aborts surface as `DOMException('AbortError')`. */
export class EngineError extends Error {
  constructor(
    readonly code: EngineFailureCode,
    message: string,
  ) {
    super(message);
    this.name = 'EngineError';
  }
}

export interface AiEngine {
  readonly id: EngineId;
  readonly label: string;
  stream(request: EngineRequest): AsyncIterable<EngineEvent>;
}
