/**
 * Cloudflare Worker Environment Bindings & Execution Context Types
 */

export interface D1PreparedStatement {
  first<T = unknown>(colName?: string): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean; meta?: { changes?: number } }>;
  bind(...params: unknown[]): D1PreparedStatement;
}

export interface D1DatabaseBinding {
  prepare(query: string): D1PreparedStatement;
  batch?(
    statements: unknown[]
  ): Promise<Array<{ success: boolean; meta?: { changes?: number } }>>;
}

export interface KvNamespaceBinding {
  get<T = string>(key: string, type?: 'json' | 'text'): Promise<T | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface WorkersAiBinding {
  run(model: string, payload: Record<string, unknown>): Promise<unknown>;
}

export interface Env {
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  POSTHOG_HOST?: string;
  POSTHOG_PROJECT_API_KEY?: string;
  ASSETS?: { fetch(request: Request): Promise<Response> };
  QDD_MODE?: string;
  QDD_VECTORS?: unknown;
  AI?: WorkersAiBinding;
  MED_QUESTS_DB?: D1DatabaseBinding;
  MED_QUESTS_AUTH_KV?: KvNamespaceBinding;
}

export interface WorkerExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}
