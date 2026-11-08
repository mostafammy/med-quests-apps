/**
 * Cloudflare Worker Edge Gateway Entrypoint
 * Implements a clean Chain-of-Responsibility router dispatching requests to
 * focused domain route modules while preserving static SPA asset fallback.
 */

import { handleAuthAndGovernanceRoutes } from './routes/authAndGovernance.ts';
import { handleBlocksAndAiRoutes } from './routes/blocksAndAi.ts';
import { handleObservabilityRoutes } from './routes/observabilityAndTelemetry.ts';
import { handleQddRoutes } from './routes/qdd.ts';
import { handleQuestionBankCuratorRoutes } from './routes/questionBankAdminCurator.ts';
import { handleQuestionBankSyncRoutes } from './routes/questionBankSyncAndSubmissions.ts';
import type { Env, WorkerExecutionContext } from './types.ts';

export type { Env, WorkerExecutionContext };

type RouteHandler = (
  request: Request,
  env: Env,
  url: URL,
  ctx?: WorkerExecutionContext
) => Promise<Response | null>;

const ROUTE_CHAIN: readonly RouteHandler[] = [
  (req, env, url) =>
    url.pathname.startsWith('/api/qdd') ? handleQddRoutes(req, env, url) : Promise.resolve(null),
  (req, env, url) => handleBlocksAndAiRoutes(req, env, url),
  (req, env, url) => handleAuthAndGovernanceRoutes(req, env, url),
  (req, env, url, ctx) => handleObservabilityRoutes(req, env, url, ctx),
  (req, env, url) => handleQuestionBankSyncRoutes(req, env, url),
  (req, env, url) => handleQuestionBankCuratorRoutes(req, env, url),
];

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx?: WorkerExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    for (const handler of ROUTE_CHAIN) {
      const response = await handler(request, env, url, ctx);
      if (response) return response;
    }

    if (env.ASSETS) {
      const assetRes = await env.ASSETS.fetch(request);
      if (
        assetRes.status === 404 &&
        request.method === 'GET' &&
        !url.pathname.startsWith('/api/')
      ) {
        return await env.ASSETS.fetch(
          new Request(new URL('/', request.url), request)
        );
      }
      return assetRes;
    }

    return new Response('Not Found', { status: 404 });
  },
};
