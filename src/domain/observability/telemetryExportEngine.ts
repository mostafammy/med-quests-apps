/**
 * @file telemetryExportEngine.ts
 * @description Apple-Standard Multi-Format Telemetry Time-Series Export & Longitudinal Ledger Engine.
 *
 * Implements:
 * - Strategy Pattern (`ITelemetryExportStrategy`) for RFC-4180 UTF-8 BOM CSV, Schema-Validated JSON Archive,
 *   Executive Board Markdown Report, and Subsea PoP Latency Matrix CSV.
 * - Longitudinal History Ledger (`TelemetryLongitudinalLedger`) for tracking metrics evolution over time.
 * - FNV-1a Integrity Checksum computation for verifiable audit trails.
 */

import type {
  ITelemetryExportStrategy,
  TelemetryExportArtifact,
  TelemetryExportContext,
  TelemetryExportFormatId,
} from '../../../specs/007-cloudflare-live-observability-and-ai-telemetry-portal/contracts/observability-portal-ports.ts';

import {
  computeTelemetryChecksumHex,
  escapeCsvCell,
  buildCsvRow,
} from './export/telemetryExportUtils.ts';
import {
  TelemetryLongitudinalLedger,
  SEED_HISTORICAL_CHECKPOINTS,
} from './export/TelemetryLongitudinalLedger.ts';
import { CsvTimeSeriesExportStrategy } from './export/strategies/CsvTimeSeriesExportStrategy.ts';
import { JsonArchiveBundleExportStrategy } from './export/strategies/JsonArchiveBundleExportStrategy.ts';
import { MarkdownExecutiveReportExportStrategy } from './export/strategies/MarkdownExecutiveReportExportStrategy.ts';
import { CsvPopTopologyExportStrategy } from './export/strategies/CsvPopTopologyExportStrategy.ts';

export {
  computeTelemetryChecksumHex,
  escapeCsvCell,
  buildCsvRow,
  TelemetryLongitudinalLedger,
  SEED_HISTORICAL_CHECKPOINTS,
  CsvTimeSeriesExportStrategy,
  JsonArchiveBundleExportStrategy,
  MarkdownExecutiveReportExportStrategy,
  CsvPopTopologyExportStrategy,
};

/**
 * Telemetry Export Orchestrator Facade
 */
export class TelemetryExportOrchestrator {
  private readonly strategies: ReadonlyMap<TelemetryExportFormatId, ITelemetryExportStrategy>;
  public readonly ledger: TelemetryLongitudinalLedger;

  constructor(
    customStrategies?: readonly ITelemetryExportStrategy[],
    ledger = new TelemetryLongitudinalLedger()
  ) {
    const list: readonly ITelemetryExportStrategy[] = customStrategies ?? [
      new CsvTimeSeriesExportStrategy(),
      new JsonArchiveBundleExportStrategy(),
      new MarkdownExecutiveReportExportStrategy(),
      new CsvPopTopologyExportStrategy(),
    ];
    this.strategies = new Map(list.map((s) => [s.formatId, s]));
    this.ledger = ledger;
  }

  public getAvailableStrategies(): readonly ITelemetryExportStrategy[] {
    return Array.from(this.strategies.values());
  }

  public generateArtifact(
    formatId: TelemetryExportFormatId,
    context: TelemetryExportContext
  ): TelemetryExportArtifact {
    const strategy = this.strategies.get(formatId) ?? this.strategies.get('csv-timeseries')!;
    return strategy.generateArtifact(context);
  }

  /**
   * Triggers a zero-dependency native browser file download using Blob & ObjectURL.
   */
  public triggerBrowserDownload(artifact: TelemetryExportArtifact): boolean {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return false;
    }
    try {
      const blob = new Blob([artifact.content], { type: artifact.mimeType });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = artifact.filename;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Copies the generated artifact content directly to the system clipboard.
   */
  public async copyArtifactToClipboard(artifact: TelemetryExportArtifact): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(artifact.content);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

export const telemetryExportOrchestrator = new TelemetryExportOrchestrator();
