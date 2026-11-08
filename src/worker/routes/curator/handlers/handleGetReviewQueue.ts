/**
 * Handler: GET /api/admin/questions/review-queue
 * Lists editorial submissions waiting for faculty review in a curriculum block.
 */

import {
  D1CuratorRepository,
  type ReviewQueueItemDto,
} from '../../../repositories/d1CuratorRepository.ts';
import type { Env } from '../../../types.ts';

export async function handleGetReviewQueue(
  _request: Request,
  env: Env,
  url: URL
): Promise<Response> {
  const blockId = url.searchParams.get('block') || 'cvs';
  const results: ReviewQueueItemDto[] = env.MED_QUESTS_DB
    ? await D1CuratorRepository.fetchReviewQueue(env.MED_QUESTS_DB, blockId)
    : [];

  return new Response(JSON.stringify(results), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
