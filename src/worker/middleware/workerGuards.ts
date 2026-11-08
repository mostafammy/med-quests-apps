/**
 * Worker Security Guards, Request Validators & Cryptographic Utilities
 * Implements Chain-of-Responsibility guard helpers for Edge API routes.
 */

import { QuestionSchema, type Question } from '../../domain/model/types.ts';

const CURATOR_ROLES = new Set(['faculty-reviewer', 'admin']);
const AUTHOR_ROLES = new Set([
  'student-free',
  'student-pro',
  'faculty-reviewer',
  'admin',
]);

export function jsonError(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function isSameOrigin(request: Request, url: URL): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // Native app / server-to-server clients omit Origin.
  try {
    const originHost = new URL(origin).host;
    if (originHost === url.host) return true;
    if (
      originHost.startsWith('localhost:') ||
      originHost === 'localhost' ||
      originHost.startsWith('127.0.0.1:') ||
      originHost === '127.0.0.1'
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function guardCurator(
  request: Request,
  url: URL,
  actor: { id?: unknown; displayName?: unknown; role?: unknown }
): Response | null {
  if (!isSameOrigin(request, url)) {
    return jsonError('Cross-origin mutation rejected.', 403);
  }
  if (
    !actor.id ||
    !actor.displayName ||
    !CURATOR_ROLES.has(String(actor.role))
  ) {
    return jsonError('Faculty or administrator privileges are required.', 403);
  }
  return null;
}

export function guardAuthor(
  request: Request,
  url: URL,
  actor: { id?: unknown; displayName?: unknown; role?: unknown }
): Response | null {
  if (!isSameOrigin(request, url)) {
    return jsonError('Cross-origin mutation rejected.', 403);
  }
  if (!actor.id || !actor.displayName || !AUTHOR_ROLES.has(String(actor.role))) {
    return jsonError('A signed-in author profile is required.', 403);
  }
  return null;
}

export function validateQuestionBatch(
  raw: unknown,
  max = 50
): { ok: true; questions: Question[] } | { ok: false; response: Response } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return {
      ok: false,
      response: jsonError('At least one question is required.', 400),
    };
  }
  if (raw.length > max) {
    return {
      ok: false,
      response: jsonError(
        `A maximum of ${max} questions is allowed per request.`,
        400
      ),
    };
  }

  const questions: Question[] = [];
  for (const candidate of raw) {
    const parsed = QuestionSchema.safeParse(candidate);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path = issue?.path?.join('.') || 'question';
      return {
        ok: false,
        response: jsonError(
          `Invalid question (${path}): ${issue?.message || 'validation failed'}`,
          422
        ),
      };
    }
    questions.push(parsed.data);
  }
  return { ok: true, questions };
}

export async function sha256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
