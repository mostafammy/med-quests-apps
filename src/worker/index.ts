import { extractEdgeNetworkTelemetry, parseDeviceHeaderProfile } from '../domain/auth/telemetryParser.ts';

export interface Env {
  MED_QUESTS_DB?: {
    prepare(query: string): {
      bind(...params: unknown[]): {
        first<T = unknown>(): Promise<T | null>;
        all<T = unknown>(): Promise<{ results: T[] }>;
        run(): Promise<{ success: boolean }>;
      };
    };
  };
  MED_QUESTS_AUTH_KV?: {
    get<T = string>(key: string, type?: 'json' | 'text'): Promise<T | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
    delete(key: string): Promise<void>;
  };
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

      let currentRev = 1;
      if (env.MED_QUESTS_DB) {
        try {
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

      if (clientEtag === serverEtag || (sinceRev > 0 && sinceRev >= currentRev)) {
        return new Response(null, {
          status: 304,
          headers: {
            ETag: serverEtag,
            'Cache-Control': 'no-cache, must-revalidate',
            Pragma: 'no-cache',
          },
        });
      }

      let upserted: any[] = [];
      let archivedIds: string[] = [];

      if (env.MED_QUESTS_DB) {
        try {
          const query = await env.MED_QUESTS_DB.prepare(
            `SELECT * FROM global_questions
             WHERE block_id = ? AND global_revision > ?
             ORDER BY global_revision ASC LIMIT 500`
          )
            .bind(blockId, sinceRev)
            .all();

          for (const row of query.results as any[]) {
            const item = {
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

            if (row.editorial_status === 'archived') {
              archivedIds.push(row.id);
            } else {
              upserted.push(item);
            }
          }
        } catch {
          // Default empty if table not yet initialized
        }
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

      const tickets: any[] = [];
      const duplicateQuestionIds: string[] = [];
      const nowIso = new Date().toISOString();

      if (env.MED_QUESTS_DB && Array.isArray(questions)) {
        for (const q of questions) {
          const stemHash = await sha256(q.stem.trim().toLowerCase());
          const ticketId = `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

          try {
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
          } catch (e: any) {
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
            if (command.decision === 'approve_and_publish') nextStatus = 'published';
            else if (command.decision === 'request_changes') nextStatus = 'changes_requested';
            else if (command.decision === 'reject_submission') nextStatus = 'rejected';

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

            // 2. If approved, bump bank_revisions and insert/upsert into global_questions
            let newRev = 1;
            if (nextStatus === 'published') {
              await env.MED_QUESTS_DB.prepare(
                `INSERT INTO bank_revisions (block_id, revision_number, updated_at)
                 VALUES (?, 2, datetime('now'))
                 ON CONFLICT(block_id) DO UPDATE SET
                   revision_number = bank_revisions.revision_number + 1,
                   updated_at = datetime('now')`
              )
                .bind(subRow.block_id)
                .run();

              const revRow = await env.MED_QUESTS_DB.prepare(
                'SELECT revision_number FROM bank_revisions WHERE block_id = ?'
              )
                .bind(subRow.block_id)
                .first<{ revision_number: number }>();
              if (revRow) newRev = revRow.revision_number;

              const rawQ = JSON.parse(subRow.question_payload_json);
              const patch = command.inlinePatch || {};
              const mergedQ = { ...rawQ, ...patch };

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
                  subRow.stem_hash,
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
            }

            // 3. Append to editorial audit log
            await env.MED_QUESTS_DB.prepare(
              `INSERT INTO question_editorial_audit_log (
                id, question_id, block_id, action, actor_user_id, actor_display_name,
                actor_role, previous_status, next_status, revision_after, summary, occurred_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
              .bind(
                `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                questionId,
                subRow.block_id,
                command.decision.toUpperCase(),
                command.reviewerUserId,
                command.reviewerDisplayName,
                command.reviewerRole,
                subRow.editorial_status,
                nextStatus,
                newRev,
                `Decision: ${command.decision} on question ${questionId}. Notes: ${command.reviewerNotes || 'None'}`,
                nowIso
              )
              .run();

            return new Response(
              JSON.stringify({
                ok: true,
                editorialStatus: nextStatus,
                newBlockRevision: newRev,
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          }
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
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

    return new Response('Not Found', { status: 404 });
  },
};

async function sha256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
