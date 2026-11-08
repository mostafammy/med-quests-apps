/**
 * Worker Routes: Canonical Question Bank Curator & Faculty Review Queue
 * Follows the Single Responsibility Principle: Clean Route Table mapping
 * each endpoint to its dedicated single-responsibility handler.
 *
 * Endpoints:
 * - GET /api/admin/questions/review-queue
 * - POST /api/admin/questions/:id/review
 * - GET /api/admin/questions/catalog
 * - POST /api/admin/questions/canonical
 * - PUT /api/admin/questions/canonical/:id
 * - PATCH /api/admin/questions/canonical/:id/archive
 * - DELETE /api/admin/questions/canonical/:id
 */

import type { Env } from '../types.ts';
import { handleGetReviewQueue } from './curator/handlers/handleGetReviewQueue.ts';
import { handleReviewDecision } from './curator/handlers/handleReviewDecision.ts';
import { handleListCatalog } from './curator/handlers/handleListCatalog.ts';
import { handleCreateCanonical } from './curator/handlers/handleCreateCanonical.ts';
import { handleUpdateCanonical } from './curator/handlers/handleUpdateCanonical.ts';
import { handleArchiveCanonical } from './curator/handlers/handleArchiveCanonical.ts';
import { handleDeleteCanonical } from './curator/handlers/handleDeleteCanonical.ts';

export async function handleQuestionBankCuratorRoutes(
  request: Request,
  env: Env,
  url: URL
): Promise<Response | null> {
  // 1. Editorial Review: List Review Queue
  if (
    url.pathname === '/api/admin/questions/review-queue' &&
    request.method === 'GET'
  ) {
    return handleGetReviewQueue(request, env, url);
  }

  // 2. Editorial Review: Submit Decision (Approve / Request Changes / Reject)
  const reviewMatch = url.pathname.match(
    /^\/api\/admin\/questions\/([^/]+)\/review$/
  );
  if (reviewMatch && request.method === 'POST') {
    return handleReviewDecision(request, env, url, decodeURIComponent(reviewMatch[1]));
  }

  // 3. Canonical Curator: List Global Bank Catalog, Audit Logs & KPIs
  if (
    url.pathname === '/api/admin/questions/catalog' &&
    request.method === 'GET'
  ) {
    return handleListCatalog(env, url);
  }

  // 4. Canonical Curator: Directly Create & Publish Canonical Questions
  if (
    url.pathname === '/api/admin/questions/canonical' &&
    request.method === 'POST'
  ) {
    return handleCreateCanonical(request, env, url);
  }

  // 5. Canonical Curator: Update Canonical Question In-Place (PUT)
  const canonicalUpdateMatch = url.pathname.match(
    /^\/api\/admin\/questions\/canonical\/([^/]+)$/
  );
  if (canonicalUpdateMatch && request.method === 'PUT') {
    return handleUpdateCanonical(request, env, url, decodeURIComponent(canonicalUpdateMatch[1]));
  }

  // 6. Canonical Curator: Archive / Restore Canonical Question (PATCH)
  const canonicalArchiveMatch = url.pathname.match(
    /^\/api\/admin\/questions\/canonical\/([^/]+)\/archive$/
  );
  if (canonicalArchiveMatch && request.method === 'PATCH') {
    return handleArchiveCanonical(request, env, url, decodeURIComponent(canonicalArchiveMatch[1]));
  }

  // 7. Canonical Curator: Delete Canonical Question (DELETE)
  const canonicalDeleteMatch = url.pathname.match(
    /^\/api\/admin\/questions\/canonical\/([^/]+)$/
  );
  if (canonicalDeleteMatch && request.method === 'DELETE') {
    return handleDeleteCanonical(request, env, url, decodeURIComponent(canonicalDeleteMatch[1]));
  }

  return null;
}
