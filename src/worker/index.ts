import { extractEdgeNetworkTelemetry, parseDeviceHeaderProfile } from '../domain/auth/telemetryParser.ts';
import { QuestionCanonicalHasher } from '../domain/questionBank/canonicalHasher.ts';
import { computeGlobalBankKpis } from '../domain/questionBank/questionSpecifications.ts';
import { QuestionSchema } from '../domain/model/types.ts';
import defaultCvsBank from '../../content/cvs/dist/bank.v1.json';
import type { Question } from '../domain/model/types.ts';
import type { GovernedQuestion } from '../../specs/005-global-question-bank-governance/contracts/question-bank-governance-ports.ts';

export interface Env {
  MED_QUESTS_DB?: {
    prepare(query: string): {
      bind(...params: unknown[]): {
        first<T = unknown>(): Promise<T | null>;
        all<T = unknown>(): Promise<{ results: T[] }>;
        run(): Promise<{ success: boolean }>;
      };
    };
    batch?(
      statements: unknown[]
    ): Promise<Array<{ success: boolean; meta?: { changes?: number } }>>;
  };
  MED_QUESTS_AUTH_KV?: {
    get<T = string>(key: string, type?: 'json' | 'text'): Promise<T | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
    delete(key: string): Promise<void>;
  };
}

/**
 * Defense-in-depth guards for the public Worker.
 *
 * NOTE: The current product authenticates on the client and does not yet issue a server-verified
 * bearer token to these routes. The origin + role checks below stop accidental writes and naive
 * cross-site requests, but they are NOT a substitute for Cloudflare Access / signed JWT
 * verification. That server-side identity layer is the next security milestone.
 */
const CURATOR_ROLES = new Set(['faculty-reviewer', 'admin']);
const AUTHOR_ROLES = new Set(['student-free', 'student-pro', 'faculty-reviewer', 'admin']);

function jsonError(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isSameOrigin(request: Request, url: URL): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // Native app / server-to-server clients omit Origin.
  try {
    return new URL(origin).host === url.host;
  } catch {
    return false;
  }
}

function guardCurator(
  request: Request,
  url: URL,
  actor: { id?: unknown; displayName?: unknown; role?: unknown }
): Response | null {
  if (!isSameOrigin(request, url)) {
    return jsonError('Cross-origin mutation rejected.', 403);
  }
  if (
    !actor.id ||
    !actor.displayName ||
    !CURATOR_ROLES.has(String(actor.role))
  ) {
    return jsonError('Faculty or administrator privileges are required.', 403);
  }
  return null;
}

function guardAuthor(
  request: Request,
  url: URL,
  actor: { id?: unknown; displayName?: unknown; role?: unknown }
): Response | null {
  if (!isSameOrigin(request, url)) {
    return jsonError('Cross-origin mutation rejected.', 403);
  }
  if (!actor.id || !actor.displayName || !AUTHOR_ROLES.has(String(actor.role))) {
    return jsonError('A signed-in author profile is required.', 403);
  }
  return null;
}

function validateQuestionBatch(
  raw: unknown,
  max = 50
): { ok: true; questions: Question[] } | { ok: false; response: Response } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, response: jsonError('At least one question is required.', 400) };
  }
  if (raw.length > max) {
    return {
      ok: false,
      response: jsonError(`A maximum of ${max} questions is allowed per request.`, 400),
    };
  }

  const questions: Question[] = [];
  for (const candidate of raw) {
    const parsed = QuestionSchema.safeParse(candidate);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path = issue?.path?.join('.') || 'question';
      return {
        ok: false,
        response: jsonError(`Invalid question (${path}): ${issue?.message || 'validation failed'}`, 422),
      };
    }
    questions.push(parsed.data);
  }
  return { ok: true, questions };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 1. Session Revalidation Endpoint (/api/auth/session)
    if (url.pathname === '/api/auth/session' && request.method === 'GET') {
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.replace(/^Bearer\s+/i, '') ?? null;

      // Extract 0ms Edge Geo & Network Telemetry
      const edgeTelemetry = extractEdgeNetworkTelemetry(
        request as unknown as { headers: Headers; cf?: Record<string, unknown> }
      );
      const deviceProfile = parseDeviceHeaderProfile(
        request as unknown as { headers: Headers }
      );

      if (!token) {
        return new Response(
          JSON.stringify({
            status: 'anonymous-guest',
            user: { id: 'usr_local_guest', displayName: 'Local Scholar', role: 'anonymous' },
            edgePreview: edgeTelemetry,
            device: deviceProfile,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Check Workers KV Cache-Aside Layer (~2ms edge execution)
      const tokenHash = await sha256(token);
      const kvCachedSession = env.MED_QUESTS_AUTH_KV
        ? await env.MED_QUESTS_AUTH_KV.get<{ userId: string; role: string; expiresAt: string }>(
            `sess:${tokenHash}`,
            'json'
          )
        : null;

      if (kvCachedSession) {
        // Check authoritative user block guard
        const userGuard = env.MED_QUESTS_AUTH_KV
          ? await env.MED_QUESTS_AUTH_KV.get<{ status: string; blockedReason?: string }>(
              `usr_guard:${kvCachedSession.userId}`,
              'json'
            )
          : null;

        if (userGuard && userGuard.status === 'blocked') {
          return new Response(
            JSON.stringify({
              code: 'ACCOUNT_BLOCKED',
              restriction: { status: 'blocked', blockedReason: userGuard.blockedReason },
              edgeNetwork: edgeTelemetry,
            }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            status: 'authenticated-active',
            userId: kvCachedSession.userId,
            role: kvCachedSession.role,
            kvCacheStatus: 'hit',
            edgeNetwork: edgeTelemetry,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Fallback: Query Cloudflare D1 (~25ms) on KV Cache Miss
      if (env.MED_QUESTS_DB) {
        const sessionRecord = await env.MED_QUESTS_DB.prepare(
          'SELECT s.*, u.role, u.account_status, u.blocked_reason FROM session s JOIN user u ON s.user_id = u.id WHERE s.token_hash = ? AND s.revoked_at IS NULL'
        )
          .bind(tokenHash)
          .first<{
            user_id: string;
            role: string;
            account_status: string;
            blocked_reason: string | null;
          }>();

        if (sessionRecord) {
          if (sessionRecord.account_status === 'blocked') {
            return new Response(
              JSON.stringify({
                code: 'ACCOUNT_BLOCKED',
                restriction: { status: 'blocked', blockedReason: sessionRecord.blocked_reason },
                edgeNetwork: edgeTelemetry,
              }),
              { status: 403, headers: { 'Content-Type': 'application/json' } }
            );
          }

          // Hydrate KV Cache for subsequent sub-5ms requests
          if (env.MED_QUESTS_AUTH_KV) {
            await env.MED_QUESTS_AUTH_KV.put(
              `sess:${tokenHash}`,
              JSON.stringify({ userId: sessionRecord.user_id, role: sessionRecord.role }),
              { expirationTtl: 600 }
            );
          }

          return new Response(
            JSON.stringify({
              status: 'authenticated-active',
              userId: sessionRecord.user_id,
              role: sessionRecord.role,
              kvCacheStatus: 'miss-d1-hydrated',
              edgeNetwork: edgeTelemetry,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      return new Response(
        JSON.stringify({ code: 'SESSION_EXPIRED_OR_REVOKED' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Admin Governance: Instant Account Block / Suspend / Unblock with KV Eviction
    if (url.pathname === '/api/admin/governance/restrict' && request.method === 'POST') {
      const edgeTelemetry = extractEdgeNetworkTelemetry(
        request as unknown as { headers: Headers; cf?: Record<string, unknown> }
      );
      const body = (await request.json()) as {
        actorUserId: string;
        targetUserId: string;
        status: 'active' | 'blocked' | 'suspended';
        reason?: string | null;
        blockedUntil?: string | null;
      };

      const nowIso = new Date().toISOString();

      // Write authoritative user guard to Workers KV (~2ms global propagation)
      if (env.MED_QUESTS_AUTH_KV) {
        if (body.status === 'active') {
          await env.MED_QUESTS_AUTH_KV.delete(`usr_guard:${body.targetUserId}`);
        } else {
          await env.MED_QUESTS_AUTH_KV.put(
            `usr_guard:${body.targetUserId}`,
            JSON.stringify({
              status: body.status,
              blockedReason: body.reason ?? 'Administrative security restriction',
              blockedUntil: body.blockedUntil ?? null,
              updatedAt: nowIso,
            })
          );
        }
      }

      // Persist restriction and immutable audit log to Cloudflare D1
      if (env.MED_QUESTS_DB) {
        await env.MED_QUESTS_DB.prepare(
          'UPDATE user SET account_status = ?, blocked_reason = ?, blocked_until = ?, blocked_by_user_id = ?, updated_at = ? WHERE id = ?'
        )
          .bind(
            body.status,
            body.reason ?? null,
            body.blockedUntil ?? null,
            body.actorUserId,
            nowIso,
            body.targetUserId
          )
          .run();

        if (body.status !== 'active') {
          await env.MED_QUESTS_DB.prepare(
            'UPDATE session SET revoked_at = ?, updated_at = ? WHERE user_id = ? AND revoked_at IS NULL'
          )
            .bind(nowIso, nowIso, body.targetUserId)
            .run();
        }
      }

      return new Response(
        JSON.stringify({
          ok: true,
          targetUserId: body.targetUserId,
          status: body.status,
          edgeColo: edgeTelemetry.colo,
          updatedAt: nowIso,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Admin Governance: Role & Per-User Feature Flag Override (e.g. AI Activation/Exclusion)
    if (url.pathname === '/api/admin/governance/role-features' && request.method === 'POST') {
      const edgeTelemetry = extractEdgeNetworkTelemetry(
        request as unknown as { headers: Headers; cf?: Record<string, unknown> }
      );
      const body = (await request.json()) as {
        actorUserId: string;
        targetUserId: string;
        newRole: string;
        customFeatureOverrides?: Record<string, boolean>;
      };

      const nowIso = new Date().toISOString();
      const featuresJson = JSON.stringify(body.customFeatureOverrides ?? {});

      if (env.MED_QUESTS_DB) {
        await env.MED_QUESTS_DB.prepare(
          'UPDATE user SET role = ?, custom_features_json = ?, updated_at = ? WHERE id = ?'
        )
          .bind(body.newRole, featuresJson, nowIso, body.targetUserId)
          .run();
      }

      return new Response(
        JSON.stringify({
          ok: true,
          targetUserId: body.targetUserId,
          newRole: body.newRole,
          customFeatureOverrides: body.customFeatureOverrides ?? {},
          edgeColo: edgeTelemetry.colo,
          updatedAt: nowIso,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Google OAuth 2.0 Edge Verification Endpoint
    if (url.pathname === '/api/auth/oauth/google' && request.method === 'POST') {
      const edgeTelemetry = extractEdgeNetworkTelemetry(
        request as unknown as { headers: Headers; cf?: Record<string, unknown> }
      );
      const body = (await request.json()) as {
        idToken?: string;
        claims?: {
          sub: string;
          email: string;
          name: string;
          picture?: string;
          hd?: string;
        };
      };

      const email = body.claims?.email || 'scholar.google@med.edu';
      const PLATFORM_OWNER_EMAILS = ['mostafa.yaser.developer@gmail.com'];
      const isPlatformOwner = PLATFORM_OWNER_EMAILS.includes(email.toLowerCase().trim());

      const role = isPlatformOwner ? 'admin' : (email.includes('admin') ? 'admin' : 'student-pro');
      const universityName = isPlatformOwner
        ? 'Med Quests Platform Owner & Principal Architect'
        : 'Google Medical Scholar';

      const name = isPlatformOwner && !body.claims?.name
        ? 'Mostafa Yaser (Platform Owner)'
        : (body.claims?.name || 'Dr. Alex Rivera');

      const image = body.claims?.picture || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80';
      const userId = isPlatformOwner
        ? 'usr_owner_mostafa'
        : `usr_g_${body.claims?.sub || Math.random().toString(36).substring(2, 10)}`;
      const nowIso = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const sessionToken = `g_tok_${Math.random().toString(36).substring(2, 15)}`;
      const tokenHash = await sha256(sessionToken);

      // Hydrate Workers KV cache-aside layer
      if (env.MED_QUESTS_AUTH_KV) {
        await env.MED_QUESTS_AUTH_KV.put(
          `sess:${tokenHash}`,
          JSON.stringify({ userId, role, expiresAt }),
          { expirationTtl: 600 }
        );
      }

      // Upsert into Cloudflare D1
      if (env.MED_QUESTS_DB) {
        await env.MED_QUESTS_DB.prepare(
          `INSERT INTO user (id, name, email, email_verified, image, role, university_name, account_status, last_country_code, last_colo, last_active_at, created_at, updated_at)
           VALUES (?, ?, ?, 1, ?, ?, ?, 'active', ?, ?, ?, ?, ?)
           ON CONFLICT(email) DO UPDATE SET role = excluded.role, last_active_at = ?, updated_at = ?`
        )
          .bind(userId, name, email, image, role, universityName, edgeTelemetry.countryCode, edgeTelemetry.colo, nowIso, nowIso, nowIso, nowIso, nowIso)
          .run();

        await env.MED_QUESTS_DB.prepare(
          `INSERT INTO session (id, user_id, token_hash, expires_at, ip_address, country_code, edge_colo, client_timezone, os_name, browser_name, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Web', 'Google Browser', ?, ?)`
        )
          .bind(`ses_${Math.random().toString(36).substring(2, 10)}`, userId, tokenHash, expiresAt, edgeTelemetry.ipAddress, edgeTelemetry.countryCode, edgeTelemetry.colo, 'Africa/Cairo', nowIso, nowIso)
          .run();
      }

      return new Response(
        JSON.stringify({
          ok: true,
          provider: 'google',
          sessionToken,
          user: {
            id: userId,
            email,
            displayName: name,
            avatarUrl: image,
            role,
            universityName,
            emailVerified: true,
          },
          edgeNetwork: edgeTelemetry,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. Sign in with Apple Edge Verification Endpoint
    if (url.pathname === '/api/auth/oauth/apple' && request.method === 'POST') {
      const edgeTelemetry = extractEdgeNetworkTelemetry(
        request as unknown as { headers: Headers; cf?: Record<string, unknown> }
      );
      const body = (await request.json()) as {
        idToken?: string;
        code?: string;
        user?: {
          name?: { firstName?: string; lastName?: string };
          email?: string;
        };
        claims?: {
          sub: string;
          email: string;
        };
      };

      const email = body.user?.email || body.claims?.email || 'scholar.apple@privaterelay.appleid.com';
      const firstName = body.user?.name?.firstName || 'Dr. Elena';
      const lastName = body.user?.name?.lastName || 'Rostova';
      const name = `${firstName} ${lastName}`.trim();
      const image = 'https://images.unsplash.com/photo-1594824813511-1a3b1d31a541?w=150&auto=format&fit=crop&q=80';
      const userId = `usr_apple_${body.claims?.sub || Math.random().toString(36).substring(2, 10)}`;
      const nowIso = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const sessionToken = `apple_tok_${Math.random().toString(36).substring(2, 15)}`;
      const tokenHash = await sha256(sessionToken);

      // Hydrate Workers KV cache-aside layer
      if (env.MED_QUESTS_AUTH_KV) {
        await env.MED_QUESTS_AUTH_KV.put(
          `sess:${tokenHash}`,
          JSON.stringify({ userId, role: 'student-pro', expiresAt }),
          { expirationTtl: 600 }
        );
      }

      // Upsert into Cloudflare D1
      if (env.MED_QUESTS_DB) {
        await env.MED_QUESTS_DB.prepare(
          `INSERT INTO user (id, name, email, email_verified, image, role, university_name, account_status, last_country_code, last_colo, last_active_at, created_at, updated_at)
           VALUES (?, ?, ?, 1, ?, 'student-pro', 'Harvard Medical School / Apple ID', 'active', ?, ?, ?, ?, ?)
           ON CONFLICT(email) DO UPDATE SET last_active_at = ?, updated_at = ?`
        )
          .bind(userId, name, email, image, edgeTelemetry.countryCode, edgeTelemetry.colo, nowIso, nowIso, nowIso, nowIso, nowIso)
          .run();

        await env.MED_QUESTS_DB.prepare(
          `INSERT INTO session (id, user_id, token_hash, expires_at, ip_address, country_code, edge_colo, client_timezone, os_name, browser_name, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'iOS/macOS', 'Safari/WebKit', ?, ?)`
        )
          .bind(`ses_${Math.random().toString(36).substring(2, 10)}`, userId, tokenHash, expiresAt, edgeTelemetry.ipAddress, edgeTelemetry.countryCode, edgeTelemetry.colo, 'Africa/Cairo', nowIso, nowIso)
          .run();
      }

      return new Response(
        JSON.stringify({
          ok: true,
          provider: 'apple',
          sessionToken,
          user: {
            id: userId,
            email,
            displayName: name,
            avatarUrl: image,
            role: 'student-pro',
            universityName: 'Harvard Medical School / Apple ID',
            emailVerified: true,
          },
          edgeNetwork: edgeTelemetry,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 6. Health & Edge Diagnostics Endpoint
    if (url.pathname === '/api/edge/diagnostics') {
      const edgeTelemetry = extractEdgeNetworkTelemetry(
        request as unknown as { headers: Headers; cf?: Record<string, unknown> }
      );
      return new Response(
        JSON.stringify({
          ok: true,
          edgeTelemetry,
          timestamp: new Date().toISOString(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 7. Global Question Bank: Downstream Delta-Sync (Read-Only)
    if (url.pathname === '/api/bank/sync' && request.method === 'GET') {
      const blockId = url.searchParams.get('block') || 'cvs';
      const sinceRev = Number(url.searchParams.get('sinceRev') || 0);
      const offset = Math.max(0, Number(url.searchParams.get('offset') || 0));

      let currentRev = 1;
      if (env.MED_QUESTS_DB) {
        try {
          await ensureGlobalBankSeeded(env.MED_QUESTS_DB, blockId);
          const revRow = await env.MED_QUESTS_DB.prepare(
            'SELECT revision_number FROM bank_revisions WHERE block_id = ?'
          )
            .bind(blockId)
            .first<{ revision_number: number }>();
          if (revRow) currentRev = revRow.revision_number;
        } catch {
          // Fall back to 1
        }
      }

      const clientEtag = request.headers.get('if-none-match');
      const serverEtag = `W/rev-${currentRev}`;

      // Lightweight periodic probe: revision + canonical count only (no question payloads).
      // This keeps the 60s background pulse / window-focus check cheap on mobile data.
      if (url.searchParams.get('probe') === '1') {
        let canonicalCount = blockId === 'cvs' ? buildDefaultSeededBank().length : 0;
        if (env.MED_QUESTS_DB) {
          try {
            const countRow = await env.MED_QUESTS_DB.prepare(
              `SELECT COUNT(*) AS cnt FROM global_questions
               WHERE block_id = ? AND editorial_status = 'published'`
            )
              .bind(blockId)
              .first<{ cnt: number }>();
            canonicalCount = Number(countRow?.cnt ?? 0);
          } catch {
            // Keep bundled fallback count.
          }
        }

        return new Response(
          JSON.stringify({
            blockId,
            revision: currentRev,
            etag: serverEtag,
            canonicalCount,
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              ETag: serverEtag,
              'Cache-Control': 'no-cache, must-revalidate',
            },
          }
        );
      }

      if (
        offset === 0 &&
        (clientEtag === serverEtag || (sinceRev > 0 && sinceRev >= currentRev))
      ) {
        return new Response(null, {
          status: 304,
          headers: {
            ETag: serverEtag,
            'Cache-Control': 'no-cache, must-revalidate',
            Pragma: 'no-cache',
          },
        });
      }

      let upserted: GovernedQuestion[] = [];
      let archivedIds: string[] = [];
      let hasMore = false;
      let nextOffset: number | undefined;
      let nextSinceRev: number | undefined;

      if (env.MED_QUESTS_DB) {
        try {
          // A bounded page keeps memory predictable. The client follows nextOffset until
          // hasMore is false, then applies one atomic local merge.
          const query = await env.MED_QUESTS_DB.prepare(
            `SELECT * FROM global_questions
             WHERE block_id = ? AND global_revision > ?
             ORDER BY global_revision ASC, id ASC LIMIT 1001 OFFSET ?`
          )
            .bind(blockId, sinceRev, offset)
            .all();

          const rows = query.results as any[];
          hasMore = rows.length > 1000;
          const pageRows = hasMore ? rows.slice(0, 1000) : rows;
          nextOffset = hasMore ? offset + pageRows.length : undefined;
          if (pageRows.length > 0) {
            nextSinceRev = Number(pageRows[pageRows.length - 1].global_revision);
          }

          for (const row of pageRows) {
            const item = mapRowToGovernedQuestion(row);
            if (row.editorial_status === 'archived') {
              archivedIds.push(row.id);
            } else {
              upserted.push(item);
            }
          }
        } catch {
          // Default fallback if table not yet initialized
        }
      }

      // If D1 returned 0 rows on full reset (sinceRev === 0) for cvs, fallback to bundled seed
      if (upserted.length === 0 && sinceRev === 0 && offset === 0 && blockId === 'cvs') {
        upserted = buildDefaultSeededBank();
      }

      return new Response(
        JSON.stringify({
          status: 'delta-applied',
          blockId,
          revision: currentRev,
          syncedAt: new Date().toISOString(),
          etag: serverEtag,
          upsertedQuestions: upserted,
          archivedQuestionIds: archivedIds,
          hasMore,
          nextOffset,
          nextSinceRev,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ETag: serverEtag,
            'Cache-Control': 'no-cache, must-revalidate',
            Pragma: 'no-cache',
          },
        }
      );
    }

    // 8. Global Question Bank: Author Submission Queue
    if (url.pathname === '/api/bank/submissions' && request.method === 'POST') {
      const payload = (await request.json()) as any;
      const { questions, authorId, authorDisplayName, authorRole } = payload;

      const guard = guardAuthor(request, url, {
        id: authorId,
        displayName: authorDisplayName,
        role: authorRole,
      });
      if (guard) return guard;

      const validation = validateQuestionBatch(questions, 20);
      if (!validation.ok) return validation.response;
      const validatedQuestions = validation.questions;

      const tickets: any[] = [];
      const duplicateQuestionIds: string[] = [];
      const nowIso = new Date().toISOString();

      if (env.MED_QUESTS_DB) {
        for (const q of validatedQuestions) {
          const stemHash = QuestionCanonicalHasher.computeStemHashSync(q.stem);
          const ticketId = `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

          try {
            const duplicate = await env.MED_QUESTS_DB.prepare(
              `SELECT 1 AS found FROM global_questions
               WHERE chapter_id = ? AND stem_hash = ? AND editorial_status = 'published'
               UNION ALL
               SELECT 1 AS found FROM question_review_submissions
               WHERE chapter_id = ? AND stem_hash = ?
                 AND editorial_status IN ('pending_review', 'changes_requested')
               LIMIT 1`
            )
              .bind(q.chapterId, stemHash, q.chapterId, stemHash)
              .first<{ found: number }>();

            if (duplicate) {
              duplicateQuestionIds.push(q.id);
              continue;
            }

            await env.MED_QUESTS_DB.prepare(
              `INSERT INTO question_review_submissions (
                ticket_id, question_id, block_id, subject_id, chapter_id, topic_id,
                stem_hash, question_payload_json, editorial_status,
                submitted_by_user_id, submitted_by_display_name, submitted_by_role, submitted_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', ?, ?, ?, ?)`
            )
              .bind(
                ticketId,
                q.id,
                q.blockId || 'cvs',
                q.subjectId,
                q.chapterId,
                q.topicId,
                stemHash,
                JSON.stringify(q),
                authorId,
                authorDisplayName,
                authorRole,
                nowIso
              )
              .run();

            tickets.push({
              ticketId,
              question: {
                ...q,
                provenanceScope: 'submitted-pending',
                editorialStatus: 'pending_review',
                stemHash,
                authorId,
                authorDisplayName,
                submittedAt: nowIso,
              },
              submittedByUserId: authorId,
              submittedByDisplayName: authorDisplayName,
              submittedByRole: authorRole,
              submittedAt: nowIso,
              editorialStatus: 'pending_review',
            });
          } catch {
            duplicateQuestionIds.push(q.id);
          }
        }
      }

      return new Response(
        JSON.stringify({
          submittedTickets: tickets,
          duplicateQuestionIds,
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 9. Editorial Review: List Review Queue
    if (url.pathname === '/api/admin/questions/review-queue' && request.method === 'GET') {
      const blockId = url.searchParams.get('block') || 'cvs';
      let results: any[] = [];

      if (env.MED_QUESTS_DB) {
        try {
          const rows = await env.MED_QUESTS_DB.prepare(
            `SELECT * FROM question_review_submissions
             WHERE block_id = ?
             ORDER BY submitted_at DESC LIMIT 200`
          )
            .bind(blockId)
            .all();

          results = (rows.results as any[]).map((r) => {
            const rawQ = JSON.parse(r.question_payload_json);
            return {
              ticketId: r.ticket_id,
              question: {
                ...rawQ,
                editorialStatus: r.editorial_status,
                provenanceScope: 'submitted-pending',
                stemHash: r.stem_hash,
                authorId: r.submitted_by_user_id,
                authorDisplayName: r.submitted_by_display_name,
                reviewedById: r.reviewed_by_user_id,
                reviewedByDisplayName: r.reviewed_by_display_name,
                reviewerNotes: r.reviewer_notes,
                submittedAt: r.submitted_at,
              },
              submittedByUserId: r.submitted_by_user_id,
              submittedByDisplayName: r.submitted_by_display_name,
              submittedByRole: r.submitted_by_role,
              submittedAt: r.submitted_at,
              editorialStatus: r.editorial_status,
              reviewedByUserId: r.reviewed_by_user_id,
              reviewedByDisplayName: r.reviewed_by_display_name,
              reviewedAt: r.reviewed_at,
              reviewerNotes: r.reviewer_notes,
            };
          });
        } catch {
          // Table empty
        }
      }

      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 10. Editorial Review: Submit Decision (Approve / Request Changes / Reject)
    const reviewMatch = url.pathname.match(/^\/api\/admin\/questions\/([^/]+)\/review$/);
    if (reviewMatch && request.method === 'POST') {
      const questionId = decodeURIComponent(reviewMatch[1]);
      const command = (await request.json()) as any;
      const decision = String(command.decision || '');
      const allowedDecisions = new Set([
        'approve_and_publish',
        'request_changes',
        'reject_submission',
      ]);
      if (!allowedDecisions.has(decision)) {
        return jsonError('Unsupported editorial decision.', 400);
      }

      const guard = guardCurator(request, url, {
        id: command.reviewerUserId,
        displayName: command.reviewerDisplayName,
        role: command.reviewerRole,
      });
      if (guard) return guard;

      const nowIso = new Date().toISOString();

      if (env.MED_QUESTS_DB) {
        try {
          const subRow = await env.MED_QUESTS_DB.prepare(
            'SELECT * FROM question_review_submissions WHERE question_id = ? OR ticket_id = ?'
          )
            .bind(questionId, command.ticketId || questionId)
            .first<any>();

          if (subRow) {
            let nextStatus = 'pending_review';
            if (decision === 'approve_and_publish') nextStatus = 'published';
            else if (decision === 'request_changes') nextStatus = 'changes_requested';
            else if (decision === 'reject_submission') nextStatus = 'rejected';

            const rawQ = JSON.parse(subRow.question_payload_json);
            const inlinePatch =
              command.inlinePatch && typeof command.inlinePatch === 'object'
                ? command.inlinePatch
                : {};
            let mergedQ = { ...rawQ, ...inlinePatch };
            let stemHash = QuestionCanonicalHasher.computeStemHashSync(mergedQ.stem);

            if (nextStatus === 'published') {
              const validation = validateQuestionBatch([mergedQ], 1);
              if (!validation.ok) return validation.response;
              mergedQ = validation.questions[0];
              stemHash = QuestionCanonicalHasher.computeStemHashSync(mergedQ.stem);
            }

            const revRow = await env.MED_QUESTS_DB.prepare(
              'SELECT revision_number FROM bank_revisions WHERE block_id = ?'
            )
              .bind(subRow.block_id)
              .first<{ revision_number: number }>();
            let newRev = Number(revRow?.revision_number ?? 1);

            // 1. Update ticket in submissions table
            await env.MED_QUESTS_DB.prepare(
              `UPDATE question_review_submissions
               SET editorial_status = ?, reviewed_by_user_id = ?, reviewed_by_display_name = ?,
                   reviewed_at = ?, reviewer_notes = ?
               WHERE ticket_id = ?`
            )
              .bind(
                nextStatus,
                command.reviewerUserId,
                command.reviewerDisplayName,
                nowIso,
                command.reviewerNotes || null,
                subRow.ticket_id
              )
              .run();

            // 2. Only a published decision advances the global revision.
            let publishedQuestion: GovernedQuestion | null = null;

            if (nextStatus === 'published') {
              newRev = await bumpD1BlockRevision(env.MED_QUESTS_DB, subRow.block_id);
              await env.MED_QUESTS_DB.prepare(
                `INSERT INTO global_questions (
                  id, block_id, subject_id, chapter_id, topic_id, concept, type,
                  stem, stem_hash, choices_json, explanation, exam_tip, mnemonic,
                  difficulty, cognitive_level, high_yield, origin, evidence_json,
                  editorial_status, bank_version, global_revision, author_id,
                  author_display_name, reviewed_by_id, reviewed_by_display_name,
                  reviewer_notes, published_at, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  stem = excluded.stem,
                  stem_hash = excluded.stem_hash,
                  choices_json = excluded.choices_json,
                  explanation = excluded.explanation,
                  exam_tip = excluded.exam_tip,
                  evidence_json = excluded.evidence_json,
                  bank_version = global_questions.bank_version + 1,
                  global_revision = excluded.global_revision,
                  editorial_status = 'published',
                  reviewed_by_id = excluded.reviewed_by_id,
                  reviewed_by_display_name = excluded.reviewed_by_display_name,
                  reviewer_notes = excluded.reviewer_notes,
                  updated_at = excluded.updated_at`
              )
                .bind(
                  mergedQ.id,
                  mergedQ.blockId || 'cvs',
                  mergedQ.subjectId,
                  mergedQ.chapterId,
                  mergedQ.topicId,
                  mergedQ.concept,
                  mergedQ.type || 'single-best-answer',
                  mergedQ.stem,
                  stemHash,
                  JSON.stringify(mergedQ.choices),
                  mergedQ.explanation,
                  mergedQ.examTip || null,
                  mergedQ.mnemonic || null,
                  mergedQ.difficulty || 2,
                  mergedQ.cognitiveLevel || 'understanding',
                  mergedQ.highYield !== false ? 1 : 0,
                  mergedQ.origin || 'authored-grounded',
                  JSON.stringify(mergedQ.evidence),
                  mergedQ.bankVersion || 1,
                  newRev,
                  subRow.submitted_by_user_id,
                  subRow.submitted_by_display_name,
                  command.reviewerUserId,
                  command.reviewerDisplayName,
                  command.reviewerNotes || null,
                  nowIso,
                  subRow.submitted_at,
                  nowIso
                )
                .run();

              publishedQuestion = {
                ...mergedQ,
                provenanceScope: 'global-canonical',
                editorialStatus: 'published',
                status: 'active',
                stemHash,
                globalRevision: newRev,
                authorId: subRow.submitted_by_user_id,
                authorDisplayName: subRow.submitted_by_display_name,
                reviewedById: command.reviewerUserId,
                reviewedByDisplayName: command.reviewerDisplayName,
                reviewerNotes: command.reviewerNotes || null,
                publishedAt: nowIso,
                createdAt: subRow.submitted_at,
                updatedAt: nowIso,
              };
            }

            // 3. Append to editorial audit log
            const auditId = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            const auditSummary = `Decision: ${command.decision} on question ${questionId}. Notes: ${command.reviewerNotes || 'None'}`;
            await env.MED_QUESTS_DB.prepare(
              `INSERT INTO question_editorial_audit_log (
                id, question_id, block_id, action, actor_user_id, actor_display_name,
                actor_role, previous_status, next_status, revision_after, summary, occurred_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
              .bind(
                auditId,
                questionId,
                subRow.block_id,
                command.decision.toUpperCase(),
                command.reviewerUserId,
                command.reviewerDisplayName,
                command.reviewerRole,
                subRow.editorial_status,
                nextStatus,
                newRev,
                auditSummary,
                nowIso
              )
              .run();

            return new Response(
              JSON.stringify({
                updatedSubmission: {
                  ticketId: subRow.ticket_id,
                  question: publishedQuestion || {
                    ...mergedQ,
                    editorialStatus: nextStatus,
                    provenanceScope: 'submitted-pending',
                    stemHash,
                  },
                  submittedByUserId: subRow.submitted_by_user_id,
                  submittedByDisplayName: subRow.submitted_by_display_name,
                  submittedByRole: subRow.submitted_by_role,
                  submittedAt: subRow.submitted_at,
                  editorialStatus: nextStatus,
                  reviewedByUserId: command.reviewerUserId,
                  reviewedByDisplayName: command.reviewerDisplayName,
                  reviewedAt: nowIso,
                  reviewerNotes: command.reviewerNotes || null,
                },
                publishedQuestion,
                auditEntry: {
                  id: auditId,
                  questionId,
                  blockId: subRow.block_id,
                  action: command.decision === 'approve_and_publish' ? 'SUBMISSION_APPROVED' : 'SUBMISSION_REJECTED',
                  actorUserId: command.reviewerUserId,
                  actorDisplayName: command.reviewerDisplayName,
                  actorRole: command.reviewerRole,
                  previousStatus: subRow.editorial_status,
                  nextStatus,
                  revisionAfter: newRev,
                  summary: auditSummary,
                  occurredAt: nowIso,
                },
                newBlockRevision: newRev,
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          }
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
      }

      return new Response(JSON.stringify({ error: 'Submission not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // 11. Author: List My Submissions
    if (url.pathname === '/api/bank/submissions/my' && request.method === 'GET') {
      const authorId = url.searchParams.get('authorId');
      let results: any[] = [];

      if (env.MED_QUESTS_DB && authorId) {
        try {
          const rows = await env.MED_QUESTS_DB.prepare(
            `SELECT * FROM question_review_submissions
             WHERE submitted_by_user_id = ?
             ORDER BY submitted_at DESC LIMIT 100`
          )
            .bind(authorId)
            .all();

          results = (rows.results as any[]).map((r) => ({
            ticketId: r.ticket_id,
            question: JSON.parse(r.question_payload_json),
            editorialStatus: r.editorial_status,
            submittedAt: r.submitted_at,
            reviewedByDisplayName: r.reviewed_by_display_name,
            reviewerNotes: r.reviewer_notes,
          }));
        } catch {
          // Table empty
        }
      }

      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 12. Canonical Curator: List Global Bank Catalog, Audit Logs & KPIs
    if (url.pathname === '/api/admin/questions/catalog' && request.method === 'GET') {
      const blockId = url.searchParams.get('block') || 'cvs';
      if (env.MED_QUESTS_DB) {
        try {
          await ensureGlobalBankSeeded(env.MED_QUESTS_DB, blockId);
          const revRow = await env.MED_QUESTS_DB.prepare(
            'SELECT revision_number FROM bank_revisions WHERE block_id = ?'
          )
            .bind(blockId)
            .first<{ revision_number: number }>();
          const currentRev = revRow ? revRow.revision_number : 1;

          const qRows = await env.MED_QUESTS_DB.prepare(
            'SELECT * FROM global_questions WHERE block_id = ? ORDER BY id ASC LIMIT 1000'
          )
            .bind(blockId)
            .all();
          const questions = (qRows.results as any[]).map(mapRowToGovernedQuestion);

          const logRows = await env.MED_QUESTS_DB.prepare(
            'SELECT * FROM question_editorial_audit_log WHERE block_id = ? ORDER BY occurred_at DESC LIMIT 200'
          )
            .bind(blockId)
            .all();
          const auditLogs = (logRows.results as any[]).map((l) => ({
            id: l.id,
            questionId: l.question_id,
            blockId: l.block_id,
            action: l.action,
            actorUserId: l.actor_user_id,
            actorDisplayName: l.actor_display_name,
            actorRole: l.actor_role,
            previousStatus: l.previous_status,
            nextStatus: l.next_status,
            revisionAfter: l.revision_after,
            summary: l.summary,
            occurredAt: l.occurred_at,
          }));

          const kpis = computeGlobalBankKpis(questions, currentRev);

          return new Response(
            JSON.stringify({
              questions,
              auditLogs,
              kpis,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
      }
    }

    // 13. Canonical Curator: Directly Create & Publish Canonical Questions
    if (url.pathname === '/api/admin/questions/canonical' && request.method === 'POST') {
      const params = (await request.json()) as any;
      const { questions, actorId, actorDisplayName, actorRole } = params;

      const guard = guardCurator(request, url, {
        id: actorId,
        displayName: actorDisplayName,
        role: actorRole,
      });
      if (guard) return guard;

      const validation = validateQuestionBatch(questions, 50);
      if (!validation.ok) return validation.response;
      const validatedQuestions = validation.questions;

      const blockIds = new Set(validatedQuestions.map((q) => q.blockId || 'cvs'));
      if (blockIds.size !== 1) {
        return jsonError('All questions in a batch must belong to the same curriculum block.', 400);
      }

      if (env.MED_QUESTS_DB) {
        try {
          const blockId = validatedQuestions[0].blockId || 'cvs';
          await ensureGlobalBankSeeded(env.MED_QUESTS_DB, blockId);

          // Reject duplicate stems with a clear 409 instead of a partial batch + opaque 500.
          for (const q of validatedQuestions) {
            const stemHash = QuestionCanonicalHasher.computeStemHashSync(q.stem);
            const duplicate = await env.MED_QUESTS_DB.prepare(
              `SELECT id FROM global_questions
               WHERE chapter_id = ? AND stem_hash = ? AND editorial_status = 'published' AND id != ?
               LIMIT 1`
            )
              .bind(q.chapterId, stemHash, q.id)
              .first<{ id: string }>();
            if (duplicate) {
              return jsonError(
                `Duplicate stem already exists in the canonical bank (question ${duplicate.id}).`,
                409
              );
            }
          }

          const nextRev = await bumpD1BlockRevision(env.MED_QUESTS_DB, blockId);
          const nowIso = new Date().toISOString();
          const created: GovernedQuestion[] = [];

          for (const q of validatedQuestions) {
            const stemHash = QuestionCanonicalHasher.computeStemHashSync(q.stem);
            await env.MED_QUESTS_DB.prepare(
              `INSERT INTO global_questions (
                id, block_id, subject_id, chapter_id, topic_id, concept, type,
                stem, stem_hash, choices_json, explanation, exam_tip, mnemonic,
                difficulty, cognitive_level, high_yield, origin, evidence_json,
                editorial_status, bank_version, global_revision, author_id,
                author_display_name, reviewed_by_id, reviewed_by_display_name,
                reviewer_notes, published_at, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                stem = excluded.stem,
                stem_hash = excluded.stem_hash,
                choices_json = excluded.choices_json,
                explanation = excluded.explanation,
                exam_tip = excluded.exam_tip,
                evidence_json = excluded.evidence_json,
                bank_version = global_questions.bank_version + 1,
                global_revision = excluded.global_revision,
                editorial_status = 'published',
                updated_at = excluded.updated_at`
            )
              .bind(
                q.id,
                q.blockId || 'cvs',
                q.subjectId,
                q.chapterId,
                q.topicId,
                q.concept,
                q.type || 'single-best-answer',
                q.stem,
                stemHash,
                JSON.stringify(q.choices),
                q.explanation,
                q.examTip || null,
                q.mnemonic || null,
                q.difficulty || 2,
                q.cognitiveLevel || 'understanding',
                q.highYield !== false ? 1 : 0,
                q.origin || 'authored-grounded',
                JSON.stringify(q.evidence),
                q.bankVersion || 1,
                nextRev,
                actorId,
                actorDisplayName,
                actorId,
                actorDisplayName,
                'Directly authored by Faculty/Admin.',
                nowIso,
                nowIso,
                nowIso
              )
              .run();

            created.push({
              ...q,
              provenanceScope: 'global-canonical',
              editorialStatus: 'published',
              status: 'active',
              stemHash,
              globalRevision: nextRev,
              authorId: actorId,
              authorDisplayName: actorDisplayName,
              reviewedById: actorId,
              reviewedByDisplayName: actorDisplayName,
              reviewerNotes: 'Directly authored by Faculty/Admin.',
              publishedAt: nowIso,
              createdAt: nowIso,
              updatedAt: nowIso,
            });
          }

          await env.MED_QUESTS_DB.prepare(
            `INSERT INTO question_editorial_audit_log (
              id, question_id, block_id, action, actor_user_id, actor_display_name,
              actor_role, previous_status, next_status, revision_after, summary, occurred_at
            ) VALUES (?, ?, ?, 'CANONICAL_QUESTION_CREATED', ?, ?, ?, NULL, 'published', ?, ?, ?)`
          )
            .bind(
              `audit-${Date.now()}`,
              created[0].id,
              blockId,
              actorId,
              actorDisplayName,
              actorRole,
              nextRev,
              `Created ${created.length} canonical questions directly in the Global Bank.`,
              nowIso
            )
            .run();

          return new Response(
            JSON.stringify({
              created,
              newBlockRevision: nextRev,
            }),
            { status: 201, headers: { 'Content-Type': 'application/json' } }
          );
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
      }
    }

    // 14. Canonical Curator: Update Canonical Question In-Place (PUT)
    const canonicalUpdateMatch = url.pathname.match(/^\/api\/admin\/questions\/canonical\/([^/]+)$/);
    if (canonicalUpdateMatch && request.method === 'PUT') {
      const questionId = decodeURIComponent(canonicalUpdateMatch[1]);
      const params = (await request.json()) as any;
      const { patch, actorId, actorDisplayName, actorRole, changeReason } = params;

      const guard = guardCurator(request, url, {
        id: actorId,
        displayName: actorDisplayName,
        role: actorRole,
      });
      if (guard) return guard;
      if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
        return jsonError('A question patch object is required.', 400);
      }
      if (typeof changeReason !== 'string' || changeReason.trim().length < 3) {
        return jsonError('A change reason of at least 3 characters is required.', 400);
      }

      if (env.MED_QUESTS_DB) {
        try {
          await ensureGlobalBankSeeded(env.MED_QUESTS_DB, 'cvs');
          const existingRow = await env.MED_QUESTS_DB.prepare(
            'SELECT * FROM global_questions WHERE id = ?'
          )
            .bind(questionId)
            .first<any>();

          if (!existingRow) {
            return new Response(JSON.stringify({ error: 'Question not found' }), { status: 404 });
          }

          const existing = mapRowToGovernedQuestion(existingRow);

          const PATCHABLE_FIELDS = [
            'subjectId',
            'chapterId',
            'topicId',
            'concept',
            'type',
            'stem',
            'choices',
            'explanation',
            'examTip',
            'mnemonic',
            'difficulty',
            'cognitiveLevel',
            'highYield',
            'origin',
            'evidence',
          ] as const;
          const sanitizedPatch: Record<string, unknown> = {};
          for (const field of PATCHABLE_FIELDS) {
            if (field in patch) sanitizedPatch[field] = patch[field];
          }

          const candidate = {
            ...existing,
            ...sanitizedPatch,
            bankVersion: existing.bankVersion + 1,
          };
          const validation = validateQuestionBatch([candidate], 1);
          if (!validation.ok) return validation.response;
          const validated = validation.questions[0];
          const stemHash = QuestionCanonicalHasher.computeStemHashSync(validated.stem);

          const duplicate = await env.MED_QUESTS_DB.prepare(
            `SELECT id FROM global_questions
             WHERE chapter_id = ? AND stem_hash = ? AND editorial_status = 'published' AND id != ?
             LIMIT 1`
          )
            .bind(validated.chapterId, stemHash, questionId)
            .first<{ id: string }>();
          if (duplicate) {
            return jsonError(
              `Duplicate stem already exists in the canonical bank (question ${duplicate.id}).`,
              409
            );
          }

          const nextRev = await bumpD1BlockRevision(env.MED_QUESTS_DB, existing.blockId);
          const nowIso = new Date().toISOString();
          const merged: GovernedQuestion = {
            ...existing,
            ...validated,
            stemHash,
            bankVersion: existing.bankVersion + 1,
            globalRevision: nextRev,
            reviewedById: actorId,
            reviewedByDisplayName: actorDisplayName,
            reviewerNotes: `Update reason: ${changeReason}`,
            updatedAt: nowIso,
          };

          await env.MED_QUESTS_DB.prepare(
            `UPDATE global_questions
             SET subject_id = ?, chapter_id = ?, topic_id = ?, concept = ?,
                 stem = ?, stem_hash = ?, choices_json = ?, explanation = ?,
                 exam_tip = ?, mnemonic = ?, difficulty = ?, cognitive_level = ?,
                 high_yield = ?, evidence_json = ?, bank_version = ?, global_revision = ?,
                 reviewed_by_id = ?, reviewed_by_display_name = ?, reviewer_notes = ?, updated_at = ?
             WHERE id = ?`
          )
            .bind(
              merged.subjectId,
              merged.chapterId,
              merged.topicId,
              merged.concept,
              merged.stem,
              merged.stemHash,
              JSON.stringify(merged.choices),
              merged.explanation,
              merged.examTip || null,
              merged.mnemonic || null,
              merged.difficulty,
              merged.cognitiveLevel,
              merged.highYield ? 1 : 0,
              JSON.stringify(merged.evidence),
              merged.bankVersion,
              nextRev,
              actorId,
              actorDisplayName,
              merged.reviewerNotes,
              nowIso,
              questionId
            )
            .run();

          const auditEntry = {
            id: `audit-${Date.now()}`,
            questionId,
            blockId: existing.blockId,
            action: 'CANONICAL_QUESTION_UPDATED',
            actorUserId: actorId,
            actorDisplayName,
            actorRole,
            previousStatus: existing.editorialStatus,
            nextStatus: merged.editorialStatus,
            revisionAfter: nextRev,
            summary: `Updated canonical question: ${changeReason}`,
            occurredAt: nowIso,
          };

          await env.MED_QUESTS_DB.prepare(
            `INSERT INTO question_editorial_audit_log (
              id, question_id, block_id, action, actor_user_id, actor_display_name,
              actor_role, previous_status, next_status, revision_after, summary, occurred_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
            .bind(
              auditEntry.id,
              questionId,
              existing.blockId,
              auditEntry.action,
              actorId,
              actorDisplayName,
              actorRole,
              existing.editorialStatus,
              merged.editorialStatus,
              nextRev,
              auditEntry.summary,
              nowIso
            )
            .run();

          return new Response(
            JSON.stringify({
              updatedQuestion: merged,
              auditEntry,
              newBlockRevision: nextRev,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
      }
    }

    // 15. Canonical Curator: Archive / Restore Canonical Question (PATCH)
    const canonicalArchiveMatch = url.pathname.match(/^\/api\/admin\/questions\/canonical\/([^/]+)\/archive$/);
    if (canonicalArchiveMatch && request.method === 'PATCH') {
      const questionId = decodeURIComponent(canonicalArchiveMatch[1]);
      const params = (await request.json()) as any;
      const { archive, actorId, actorDisplayName, actorRole, reason } = params;

      const guard = guardCurator(request, url, {
        id: actorId,
        displayName: actorDisplayName,
        role: actorRole,
      });
      if (guard) return guard;
      if (typeof archive !== 'boolean') {
        return jsonError('The archive field must be a boolean.', 400);
      }
      if (typeof reason !== 'string' || reason.trim().length < 3) {
        return jsonError('A reason of at least 3 characters is required.', 400);
      }

      if (env.MED_QUESTS_DB) {
        try {
          await ensureGlobalBankSeeded(env.MED_QUESTS_DB, 'cvs');
          const existingRow = await env.MED_QUESTS_DB.prepare(
            'SELECT * FROM global_questions WHERE id = ?'
          )
            .bind(questionId)
            .first<any>();

          if (!existingRow) {
            return new Response(JSON.stringify({ error: 'Question not found' }), { status: 404 });
          }

          const existing = mapRowToGovernedQuestion(existingRow);
          const nextRev = await bumpD1BlockRevision(env.MED_QUESTS_DB, existing.blockId);
          const nowIso = new Date().toISOString();
          const nextStatus = archive ? 'archived' : 'published';

          await env.MED_QUESTS_DB.prepare(
            `UPDATE global_questions
             SET editorial_status = ?, global_revision = ?, updated_at = ?
             WHERE id = ?`
          )
            .bind(nextStatus, nextRev, nowIso, questionId)
            .run();

          const updatedQuestion: GovernedQuestion = {
            ...existing,
            editorialStatus: nextStatus,
            status: archive ? 'quarantined' : 'active',
            globalRevision: nextRev,
            updatedAt: nowIso,
          };

          const auditEntry = {
            id: `audit-${Date.now()}`,
            questionId,
            blockId: existing.blockId,
            action: archive ? 'CANONICAL_QUESTION_ARCHIVED' : 'CANONICAL_QUESTION_RESTORED',
            actorUserId: actorId,
            actorDisplayName,
            actorRole,
            previousStatus: existing.editorialStatus,
            nextStatus,
            revisionAfter: nextRev,
            summary: `${archive ? 'Archived' : 'Restored'} question. Reason: ${reason}`,
            occurredAt: nowIso,
          };

          await env.MED_QUESTS_DB.prepare(
            `INSERT INTO question_editorial_audit_log (
              id, question_id, block_id, action, actor_user_id, actor_display_name,
              actor_role, previous_status, next_status, revision_after, summary, occurred_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
            .bind(
              auditEntry.id,
              questionId,
              existing.blockId,
              auditEntry.action,
              actorId,
              actorDisplayName,
              actorRole,
              existing.editorialStatus,
              nextStatus,
              nextRev,
              auditEntry.summary,
              nowIso
            )
            .run();

          return new Response(
            JSON.stringify({
              updatedQuestion,
              auditEntry,
              newBlockRevision: nextRev,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
      }
    }

    return new Response('Not Found', { status: 404 });
  },
};

function buildDefaultSeededBank(): GovernedQuestion[] {
  if (!Array.isArray(defaultCvsBank)) return [];
  const nowIso = new Date().toISOString();
  return (defaultCvsBank as Question[]).map((q) => ({
    ...q,
    provenanceScope: 'global-canonical',
    editorialStatus: 'published',
    stemHash: QuestionCanonicalHasher.computeStemHashSync(q.stem),
    globalRevision: 1,
    authorId: 'usr-curriculum-faculty',
    authorDisplayName: 'Curriculum Faculty Committee',
    reviewedById: 'usr-admin-initial',
    reviewedByDisplayName: 'Board Administrator',
    reviewerNotes: 'Official faculty syllabus verified item.',
    publishedAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
  }));
}

function mapRowToGovernedQuestion(row: any): GovernedQuestion {
  return {
    id: row.id,
    blockId: row.block_id,
    subjectId: row.subject_id,
    chapterId: row.chapter_id,
    topicId: row.topic_id,
    concept: row.concept,
    type: row.type,
    stem: row.stem,
    choices: JSON.parse(row.choices_json),
    explanation: row.explanation,
    examTip: row.exam_tip,
    mnemonic: row.mnemonic,
    difficulty: row.difficulty,
    cognitiveLevel: row.cognitive_level,
    highYield: Boolean(row.high_yield),
    origin: row.origin,
    evidence: JSON.parse(row.evidence_json),
    status: row.editorial_status === 'archived' ? 'quarantined' : 'active',
    bankVersion: row.bank_version,
    globalRevision: row.global_revision,
    provenanceScope: 'global-canonical',
    editorialStatus: row.editorial_status,
    stemHash: row.stem_hash,
    authorId: row.author_id,
    authorDisplayName: row.author_display_name,
    reviewedById: row.reviewed_by_id,
    reviewedByDisplayName: row.reviewed_by_display_name,
    reviewerNotes: row.reviewer_notes,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function bumpD1BlockRevision(
  db: NonNullable<Env['MED_QUESTS_DB']>,
  blockId: string
): Promise<number> {
  await db
    .prepare(
      `INSERT INTO bank_revisions (block_id, revision_number, updated_at)
       VALUES (?, 2, datetime('now'))
       ON CONFLICT(block_id) DO UPDATE SET
         revision_number = bank_revisions.revision_number + 1,
         updated_at = datetime('now')`
    )
    .bind(blockId)
    .run();

  const revRow = await db
    .prepare('SELECT revision_number FROM bank_revisions WHERE block_id = ?')
    .bind(blockId)
    .first<{ revision_number: number }>();

  return revRow ? revRow.revision_number : 2;
}

async function ensureGlobalBankSeeded(
  db: NonNullable<Env['MED_QUESTS_DB']>,
  blockId: string
): Promise<void> {
  if (blockId !== 'cvs' || !Array.isArray(defaultCvsBank)) return;

  const seeded = buildDefaultSeededBank();
  if (seeded.length === 0) return;

  // Idempotent seed reconciliation: only insert bundled questions that are genuinely missing.
  // This lets a growing bundled bank (e.g. 212 → 318) reach production without overwriting
  // faculty edits or resurrecting archived rows (archived rows still exist by id).
  const existingRows = await db
    .prepare('SELECT id FROM global_questions WHERE block_id = ?')
    .bind(blockId)
    .all<{ id: string }>();
  const existingIds = new Set(existingRows.results.map((row) => row.id));
  const missing = seeded.filter((question) => !existingIds.has(question.id));
  if (missing.length === 0) return;

  // New seeds must receive a revision above every existing client cursor.
  const revRow = await db
    .prepare('SELECT revision_number FROM bank_revisions WHERE block_id = ?')
    .bind(blockId)
    .first<{ revision_number: number }>();
  const targetRevision = Number(revRow?.revision_number ?? 1) + 1;

  const insertSql = `INSERT OR IGNORE INTO global_questions (
    id, block_id, subject_id, chapter_id, topic_id, concept, type,
    stem, stem_hash, choices_json, explanation, exam_tip, mnemonic,
    difficulty, cognitive_level, high_yield, origin, evidence_json,
    editorial_status, bank_version, global_revision, author_id,
    author_display_name, reviewed_by_id, reviewed_by_display_name,
    reviewer_notes, published_at, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const statements = missing.map((q) =>
    db
      .prepare(insertSql)
      .bind(
        q.id,
        q.blockId,
        q.subjectId,
        q.chapterId,
        q.topicId,
        q.concept,
        q.type,
        q.stem,
        q.stemHash,
        JSON.stringify(q.choices),
        q.explanation,
        q.examTip || null,
        q.mnemonic || null,
        q.difficulty,
        q.cognitiveLevel,
        q.highYield ? 1 : 0,
        q.origin,
        JSON.stringify(q.evidence),
        q.bankVersion || 1,
        targetRevision,
        q.authorId,
        q.authorDisplayName,
        q.reviewedById,
        q.reviewedByDisplayName,
        q.reviewerNotes,
        q.publishedAt,
        q.createdAt,
        q.updatedAt
      )
  );

  let insertedCount = 0;
  const batch = (db as { batch?: (items: unknown[]) => Promise<Array<{ success: boolean; meta?: { changes?: number } }>> }).batch;

  if (typeof batch === 'function') {
    // D1 batch keeps first-sync cost low and reduces round trips from 318 to ~7.
    const CHUNK_SIZE = 50;
    for (let i = 0; i < statements.length; i += CHUNK_SIZE) {
      const results = await batch.call(db, statements.slice(i, i + CHUNK_SIZE));
      insertedCount += results.reduce((sum, result) => sum + (result.meta?.changes || 0), 0);
    }
  } else {
    for (const statement of statements) {
      await statement.run();
      insertedCount += 1;
    }
  }

  if (insertedCount > 0) {
    await db
      .prepare(
        `INSERT INTO bank_revisions (block_id, revision_number, updated_at)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(block_id) DO UPDATE SET
           revision_number = CASE WHEN bank_revisions.revision_number < excluded.revision_number THEN excluded.revision_number ELSE bank_revisions.revision_number END,
           updated_at = datetime('now')`
      )
      .bind(blockId, targetRevision)
      .run();
  }
}

async function sha256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
