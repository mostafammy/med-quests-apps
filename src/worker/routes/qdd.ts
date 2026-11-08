/**
 * Worker Routes: Question Duplication Detection Engine (QDD)
 * Pure Router Table delegating to Single-Responsibility Handlers.
 */

import type { Env } from '../types.ts';
import { handleCheckSingle } from './qdd/handlers/handleCheckSingle.ts';
import { handleCheckBatch } from './qdd/handlers/handleCheckBatch.ts';
import {
  handleStartAuditJob,
  handleAdvanceAuditJob,
  handleGetAuditJobStatus,
  handleGetAuditClusters,
} from './qdd/handlers/handleAuditJobs.ts';
import { handleResolveCluster } from './qdd/handlers/handleResolveCluster.ts';
import { handleBackfillBank } from './qdd/handlers/handleBackfillBank.ts';

export { logVerdict } from './qdd/handlers/logVerdict.ts';

export async function handleQddRoutes(
  request: Request,
  env: Env,
  url: URL
): Promise<Response | null> {
  // Emergency Kill Switch & Dynamic Mode Resolution (T056 / FR-030)
  const qddModeHeader = request.headers.get('x-qdd-mode');
  const effectiveMode: 'off' | 'shadow' | 'enforce' =
    qddModeHeader === 'off' || qddModeHeader === 'shadow' || qddModeHeader === 'enforce'
      ? qddModeHeader
      : (env?.QDD_MODE === 'off' || env?.QDD_MODE === 'shadow' || env?.QDD_MODE === 'enforce'
          ? env.QDD_MODE
          : 'shadow');

  // 1. Single Question Check: POST /api/qdd/check or /api/v1/qdd/check
  if (
    (url.pathname === '/api/qdd/check' || url.pathname === '/api/v1/qdd/check') &&
    request.method === 'POST'
  ) {
    return handleCheckSingle(request, env, url, effectiveMode);
  }

  // 2. Batch Question Check: POST /api/qdd/check-batch or /api/v1/qdd/check-batch
  if (
    (url.pathname === '/api/qdd/check-batch' || url.pathname === '/api/v1/qdd/check-batch') &&
    request.method === 'POST'
  ) {
    return handleCheckBatch(request, env, url);
  }

  // 3. Start Audit Job: POST /api/admin/qdd/audits
  if (url.pathname === '/api/admin/qdd/audits' && request.method === 'POST') {
    return handleStartAuditJob(request, env);
  }

  // 4. Advance Audit Chunk: POST /api/admin/qdd/audits/:id/advance
  const advanceMatch = url.pathname.match(/^\/api\/admin\/qdd\/audits\/([^/]+)\/advance$/);
  if (advanceMatch && request.method === 'POST') {
    return handleAdvanceAuditJob(advanceMatch[1], env);
  }

  // 5. Get Audit Job Status: GET /api/admin/qdd/audits/:id
  const getJobMatch = url.pathname.match(/^\/api\/admin\/qdd\/audits\/([^/]+)$/);
  if (getJobMatch && request.method === 'GET') {
    return handleGetAuditJobStatus(getJobMatch[1], env);
  }

  // 6. Get Audit Duplicate Clusters: GET /api/admin/qdd/audits/:id/clusters
  const getClustersMatch = url.pathname.match(/^\/api\/admin\/qdd\/audits\/([^/]+)\/clusters$/);
  if (getClustersMatch && request.method === 'GET') {
    return handleGetAuditClusters(getClustersMatch[1], env);
  }

  // 7. Reviewer Cluster Resolution: POST /api/admin/qdd/resolutions
  if (url.pathname === '/api/admin/qdd/resolutions' && request.method === 'POST') {
    return handleResolveCluster(request, env);
  }

  // 8. Admin Bank Backfill: POST /api/admin/qdd/backfill
  if (url.pathname === '/api/admin/qdd/backfill' && request.method === 'POST') {
    return handleBackfillBank(env, effectiveMode);
  }

  return null;
}
