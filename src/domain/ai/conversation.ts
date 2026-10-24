/**
 * Conversation model rendered by the Co-Pilot drawer (v2.0).
 * Supports streaming text, silent status notices, and clinical artifacts.
 */
import type { AgentToolExecutionEnvelope } from './tools/toolRegistry.ts';

export type MessagePart =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'artifact'; readonly envelope: AgentToolExecutionEnvelope }
  | { readonly kind: 'notice'; readonly tone: 'info' | 'warning'; readonly text: string }
  | { readonly kind: 'status'; readonly text: string };

export type MessageStatus = 'streaming' | 'complete' | 'aborted' | 'error';

export interface CoverageRow {
  readonly topicId: string;
  readonly topicName: string;
  readonly questionCount: number;
  readonly highYieldCount: number;
  readonly deficit: number;
}

export interface ChatMessage {
  readonly id: string;
  readonly role: 'user' | 'assistant';
  readonly parts: readonly MessagePart[];
  readonly status: MessageStatus;
  readonly engine: string | null;
  readonly createdAt: number;
  readonly latencyMs: number | null;
}
