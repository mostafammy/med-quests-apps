/**
 * Infrastructure Service: D1AiBudgetGuard
 * Implements IAiBudgetGuard tracking daily AI consumption in D1 SQLite table `qdd_ai_budget`.
 * Enforces free-tier neuron and token limits. Fails closed to degraded mode.
 * Layer: Infrastructure (Resilience)
 */

import type { IAiBudgetGuard } from '../../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';

export interface BudgetCaps {
  readonly embedding: number;
  readonly rerank: number;
  readonly llm: number;
}

const DEFAULT_CAPS: BudgetCaps = {
  embedding: 4000,
  rerank: 1500,
  llm: 150,
};

export class D1AiBudgetGuard implements IAiBudgetGuard {
  private readonly caps: BudgetCaps;

  constructor(
    private readonly db: any,
    customCaps?: Partial<BudgetCaps>
  ) {
    this.caps = { ...DEFAULT_CAPS, ...customCaps };
  }

  public async tryConsume(
    resource: 'embedding' | 'rerank' | 'llm',
    units = 1
  ): Promise<boolean> {
    if (!this.db) return true; // In-memory/dev without DB allows execution

    const maxUnits = this.caps[resource] ?? 1000;
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    try {
      // 1. Check current daily usage
      const row = await this.db
        .prepare('SELECT units FROM qdd_ai_budget WHERE day = ? AND resource = ?')
        .bind(today, resource)
        .first();

      const currentUnits = row?.units ?? 0;
      if (currentUnits + units > maxUnits) {
        return false; // Budget exhausted
      }

      // 2. Increment units
      await this.db
        .prepare(`
          INSERT INTO qdd_ai_budget (day, resource, units)
          VALUES (?, ?, ?)
          ON CONFLICT(day, resource) DO UPDATE SET units = units + excluded.units
        `)
        .bind(today, resource, units)
        .run();

      return true;
    } catch {
      // If budget check fails, fail closed to degraded mode (0 unexpected bills)
      return false;
    }
  }
}
