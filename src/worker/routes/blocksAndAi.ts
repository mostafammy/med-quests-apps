/**
 * Worker Routes: Multi-Block Curriculum Catalog & Edge AI Inference Gateway
 * Endpoints:
 * - GET /api/v1/blocks & GET /api/blocks
 * - POST /api/ai/chat
 */

import type { EdgeBlockD1Row } from '../curriculum/EdgeBlockGuard.ts';
import { jsonError } from '../middleware/workerGuards.ts';
import type { Env } from '../types.ts';

export async function handleBlocksAndAiRoutes(
  request: Request,
  env: Env,
  url: URL
): Promise<Response | null> {
  // Multi-Block Curriculum Catalog Route (/api/v1/blocks and /api/blocks)
  if (
    (url.pathname === '/api/v1/blocks' || url.pathname === '/api/blocks') &&
    request.method === 'GET'
  ) {
    const viewerRole = (request.headers.get('x-user-role') || 'student-pro') as string;
    try {
      let rows: { results: EdgeBlockD1Row[] } = { results: [] };
      if (env.MED_QUESTS_DB) {
        rows = await env.MED_QUESTS_DB
          .prepare(
            'SELECT id, code, short_name, name_en, name_ar, status, catalog_order, manifest_hash, updated_at FROM curriculum_blocks ORDER BY catalog_order ASC'
          )
          .all<EdgeBlockD1Row>();
      }

      let blocks = rows?.results || [];
      if (blocks.length === 0) {
        blocks = [
          {
            id: 'cvs',
            code: 'Block 206',
            short_name: 'CVS',
            name_en: 'Cardiovascular System',
            name_ar: 'الجهاز القلبي الوعائي',
            status: 'published',
            catalog_order: 1,
            manifest_hash: 'initial',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'cns',
            code: 'Block 207',
            short_name: 'CNS',
            name_en: 'Central Nervous System',
            name_ar: 'الجهاز العصبي المركزي',
            status: 'beta',
            catalog_order: 2,
            manifest_hash: 'initial',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ] as EdgeBlockD1Row[];
      }

      const isPrivileged =
        viewerRole === 'admin' || viewerRole === 'faculty-reviewer';
      const filteredBlocks = isPrivileged
        ? blocks
        : blocks.filter((b) => b.status === 'published');

      return new Response(JSON.stringify({ blocks: filteredBlocks }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
        },
      });
    } catch {
      return new Response(
        JSON.stringify({
          blocks: [
            {
              id: 'cvs',
              code: 'Block 206',
              short_name: 'CVS',
              name_en: 'Cardiovascular System',
              name_ar: 'الجهاز القلبي الوعائي',
              status: 'published',
              catalog_order: 1,
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // Edge AI Inference Gateway (/api/ai/chat) via Cloudflare Workers AI
  if (url.pathname === '/api/ai/chat' && request.method === 'POST') {
    if (!env.AI || typeof env.AI.run !== 'function') {
      return jsonError(
        'Workers AI binding is unavailable in this environment.',
        503
      );
    }
    try {
      const body = (await request.json()) as {
        messages?: Array<{ role: string; content: string }>;
        temperature?: number;
        max_tokens?: number;
      };
      if (!Array.isArray(body.messages) || body.messages.length === 0) {
        return jsonError('messages array is required.', 400);
      }

      const aiPayload = {
        messages: body.messages,
        temperature:
          typeof body.temperature === 'number' ? body.temperature : 0.2,
        max_tokens:
          typeof body.max_tokens === 'number' ? body.max_tokens : 4096,
      };

      let result: {
        response?: string;
        choices?: Array<{ message?: { content?: string } }>;
      } | null = null;
      try {
        result = (await env.AI.run(
          '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
          aiPayload
        )) as typeof result;
      } catch {
        result = (await env.AI.run(
          '@cf/meta/llama-3.1-8b-instruct',
          aiPayload
        )) as typeof result;
      }

      const parsed = result as Record<string, any> | null;
      const text =
        typeof parsed?.response === 'string'
          ? parsed.response
          : typeof parsed?.choices?.[0]?.message?.content === 'string'
          ? parsed.choices[0].message.content
          : JSON.stringify(result);

      return new Response(
        JSON.stringify({
          text,
          model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return jsonError(`Edge AI inference failed: ${msg}`, 500);
    }
  }

  return null;
}
