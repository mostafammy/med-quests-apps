import type {
  ITelemetryExportStrategy,
  TelemetryExportArtifact,
  TelemetryExportContext,
  TelemetryExportFormatId,
} from '../../../../../specs/007-cloudflare-live-observability-and-ai-telemetry-portal/contracts/observability-portal-ports.ts';
import {
  computeTelemetryChecksumHex,
  formatDateSlug,
  getUtf8ByteSize,
  resolveTargetSnapshotForScope,
} from '../telemetryExportUtils.ts';

export class MarkdownExecutiveReportExportStrategy implements ITelemetryExportStrategy {
  public readonly formatId: TelemetryExportFormatId = 'markdown-executive-report';
  public readonly label = 'Executive Board Markdown Brief (.md)';
  public readonly description =
    'Publication-grade Markdown report with KPI scorecards, hourly time-series progression tables, PoP subsea routing, and AI Co-Pilot briefing.';
  public readonly mimeType = 'text/markdown;charset=utf-8';
  public readonly fileExtension = 'md' as const;

  public generateArtifact(context: TelemetryExportContext): TelemetryExportArtifact {
    const targetSnapshot = resolveTargetSnapshotForScope(context);
    const { cohortEstimate, assetCacheMetrics, d1Summary, coloDistribution } = targetSnapshot;

    const lines: string[] = [];
    lines.push(`# Cloudflare Edge Observability & Cohort Intelligence — Executive Telemetry Report`);
    lines.push('');
    lines.push(
      `> **Generated At:** \`${targetSnapshot.generatedAtIso}\` | **Timeframe Window:** \`${targetSnapshot.timeframeWindow.toUpperCase()}\` | **Scope:** \`${context.scope}\` | **Worker:** \`${targetSnapshot.workerName}\``
    );
    lines.push('');
    lines.push(`## 1. Executive Cohort & Reliability Scorecard`);
    lines.push('');
    lines.push(`| Metric | Value | Benchmark / Context |`);
    lines.push(`| :--- | :--- | :--- |`);
    lines.push(
      `| **Active Medical Scholars** | **${cohortEstimate.estimatedUniqueScholarsActive} / ${cohortEstimate.targetBatchSize}** (\`${cohortEstimate.batchPenetrationPercent}%\`) | 95% CI: \`[${cohortEstimate.estimatedConfidenceInterval[0]} – ${cohortEstimate.estimatedConfidenceInterval[1]}]\` scholars |`
    );
    lines.push(
      `| **Repeat Study Revalidation** | **${cohortEstimate.repeatVisitorRevalidationRatio}%** | \`${assetCacheMetrics.status304NotModifiedCount}\` HTTP 304 vs \`${assetCacheMetrics.status200Count}\` HTTP 200 |`
    );
    lines.push(
      `| **Peak Study Surge Hour** | **${cohortEstimate.peakHourDisplayCairo}** | \`${cohortEstimate.peakHourConcurrency}\` concurrent scholars |`
    );
    lines.push(
      `| **Total Worker Invocations** | **${targetSnapshot.totalWorkerRequests.toLocaleString()}** | \`${targetSnapshot.totalWorkerErrors}\` errors (\`${targetSnapshot.reliabilitySlaPercent}%\` Zero-Error SLA) |`
    );
    lines.push(
      `| **Silicon Isolate CPU Latency** | **P50: ${targetSnapshot.globalCpuTimeP50Ms.toFixed(2)} ms** | P90: \`${targetSnapshot.globalCpuTimeP90Ms.toFixed(2)} ms\` · P99: \`${targetSnapshot.globalCpuTimeP99Ms.toFixed(2)} ms\` |`
    );
    lines.push(
      `| **Edge Static Cache Hit Ratio** | **${assetCacheMetrics.cacheHitRatioPercent}%** | \`${assetCacheMetrics.cacheHits.toLocaleString()} / ${assetCacheMetrics.totalAssetRequests.toLocaleString()}\` hits |`
    );
    lines.push(
      `| **D1 SQLite Throughput** | **${d1Summary.totalRowsRead.toLocaleString()} rows read** | \`${d1Summary.totalReadQueries.toLocaleString()}\` read queries (\`${d1Summary.averageRowsPerReadQuery}\` rows/query) |`
    );
    lines.push('');

    lines.push(`## 2. Subsea Anycast Point-of-Presence (PoP) Routing Distribution`);
    lines.push('');
    lines.push(
      `| PoP Code | City & Country | Submarine Fiber Corridor | Requests | Share | Est. D1 Rows | CPU P50 / P99 |`
    );
    lines.push(`| :--- | :--- | :--- | ---: | ---: | ---: | ---: |`);
    for (const colo of coloDistribution) {
      const estRows = Math.round((colo.trafficSharePercent / 100) * d1Summary.totalRowsRead);
      lines.push(
        `| **${colo.coloCode}** | ${colo.city}, ${colo.country} (\`${colo.countryCode}\`) | ${colo.regionLabel} | ${colo.requests.toLocaleString()} | \`${colo.trafficSharePercent}%\` | ${estRows.toLocaleString()} | \`${colo.cpuTimeP50Ms.toFixed(2)}ms\` / \`${colo.cpuTimeP99Ms.toFixed(2)}ms\` |`
      );
    }
    lines.push('');

    lines.push(`## 3. Hourly Time-Series Progression Over Time (${targetSnapshot.timeframeWindow.toUpperCase()})`);
    lines.push('');
    lines.push(
      `| # | Timestamp (UTC) | Cairo Local | Study Phase | Worker Reqs | D1 Queries | D1 Rows Read | Est. Scholars | CPU P50 | Cumulative Reqs | Cumulative D1 Rows |`
    );
    lines.push(`| ---: | :--- | :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |`);

    let cumReqs = 0;
    let cumRows = 0;
    targetSnapshot.hourlyTimeline.forEach((pt, idx) => {
      cumReqs += pt.workerRequests;
      cumRows += pt.d1RowsRead;
      lines.push(
        `| ${idx + 1} | \`${pt.isoHourUtc}\` | **${pt.displayHourCairo}** | \`${pt.studyPhase}\` | ${pt.workerRequests.toLocaleString()} | ${pt.d1ReadQueries.toLocaleString()} | ${pt.d1RowsRead.toLocaleString()} | ${pt.estimatedConcurrentScholars} | \`${(pt.cpuTimeP50Us / 1000).toFixed(2)}ms\` | **${cumReqs.toLocaleString()}** | **${cumRows.toLocaleString()}** |`
      );
    });
    lines.push('');

    if (context.aiBriefing) {
      lines.push(`## 4. AI Executive Telemetry Co-Pilot Synthesis`);
      lines.push('');
      lines.push(`- **Headline:** ${context.aiBriefing.headline}`);
      lines.push(`- **Model Engine:** \`${context.aiBriefing.modelUsed}\` (Health Score: \`${context.aiBriefing.healthScore}/100\`)`);
      lines.push(`- **Executive Summary:** ${context.aiBriefing.executiveSummary}`);
      lines.push('');
      for (const sec of context.aiBriefing.sections) {
        lines.push(`### ${sec.title} (\`${sec.badge}\`)`);
        lines.push(`${sec.summary}`);
        for (const bullet of sec.keyTakeaways) {
          lines.push(`- ${bullet}`);
        }
        lines.push(`> **Actionable Recommendation:** ${sec.recommendation}`);
        lines.push('');
      }
    }

    if (context.historicalCheckpoints.length > 0) {
      lines.push(`## 5. Longitudinal Sync History Ledger (${context.historicalCheckpoints.length} Checkpoints)`);
      lines.push('');
      lines.push(
        `| Recorded At (ISO) | Window | Active Scholars | Penetration | Worker Reqs | D1 Rows Read | Cache Hit | CPU P50 |`
      );
      lines.push(`| :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: |`);
      for (const chk of context.historicalCheckpoints) {
        lines.push(
          `| \`${chk.recordedAtIso}\` | \`${chk.timeframeWindow}\` | ${chk.estimatedActiveScholars}/${chk.targetBatchSize} | \`${chk.batchPenetrationPercent}%\` | ${chk.totalWorkerRequests.toLocaleString()} | ${chk.totalD1RowsRead.toLocaleString()} | \`${chk.cacheHitRatioPercent}%\` | \`${chk.globalCpuTimeP50Ms.toFixed(2)}ms\` |`
        );
      }
      lines.push('');
    }

    const mdContent = lines.join('\n');
    const checksumHex = computeTelemetryChecksumHex(mdContent);
    const finalMd = `${mdContent}\n---\n*Integrity Checksum: \`${checksumHex}\`*\n`;
    const slug = formatDateSlug(targetSnapshot.generatedAtIso);

    return {
      formatId: this.formatId,
      scope: context.scope,
      label: this.label,
      filename: `med-quests-executive-telemetry-report-${targetSnapshot.timeframeWindow}-${slug}.md`,
      mimeType: this.mimeType,
      fileExtension: this.fileExtension,
      content: finalMd,
      byteSize: getUtf8ByteSize(finalMd),
      rowCount: targetSnapshot.hourlyTimeline.length,
      checksumHex,
      generatedAtIso: targetSnapshot.generatedAtIso,
    };
  }
}
