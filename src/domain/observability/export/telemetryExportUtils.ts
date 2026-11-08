import type {
  TelemetryExportContext,
  UnifiedEdgeObservabilitySnapshot,
} from '../../../../specs/007-cloudflare-live-observability-and-ai-telemetry-portal/contracts/observability-portal-ports.ts';
import { EdgeObservabilitySnapshotBuilder } from '../edgeObservabilityEngine.ts';

const exportSnapshotBuilder = new EdgeObservabilitySnapshotBuilder();

/**
 * Computes a deterministic 64-bit FNV-1a inspired hex digest for export verification.
 */
export function computeTelemetryChecksumHex(payload: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0xcbf29ce4;
  for (let i = 0; i < payload.length; i++) {
    const ch = payload.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch ^ (i & 0xff);
    h2 = Math.imul(h2, 0x01000193);
  }
  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `fnv1a-${part1}${part2}`;
}

/**
 * Escapes a scalar value according to RFC 4180 CSV rules.
 */
export function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsvRow(cells: readonly (string | number | boolean | null | undefined)[]): string {
  return cells.map(escapeCsvCell).join(',');
}

export function getUtf8ByteSize(content: string): number {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(content).byteLength;
  }
  return content.length;
}

export function formatDateSlug(isoString: string): string {
  return isoString.slice(0, 19).replace(/[:T]/g, '-');
}

export function resolveTargetSnapshotForScope(
  context: TelemetryExportContext
): UnifiedEdgeObservabilitySnapshot {
  if (context.scope === 'longitudinal-7d-full') {
    if (context.longitudinalSnapshot7d) {
      return context.longitudinalSnapshot7d;
    }
    if (context.snapshot.timeframeWindow === '7d') {
      return context.snapshot;
    }
    return exportSnapshotBuilder.buildSnapshot({
      timeframe: '7d',
      targetBatchSize: context.snapshot.cohortEstimate.targetBatchSize,
      dataSourceMode: context.snapshot.dataSourceMode,
    });
  }
  return context.snapshot;
}
