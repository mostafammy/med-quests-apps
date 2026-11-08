/**
 * Worker Routes: Authentication, OAuth 2.0 Verification & Admin User Governance
 * Follows the Single Responsibility Principle: Clean Route Table mapping
 * each endpoint to its dedicated single-responsibility handler.
 *
 * Endpoints:
 * - GET|POST /api/auth/session
 * - POST /api/auth/session/revoke
 * - GET /api/admin/users
 * - POST /api/admin/governance/restrict
 * - POST /api/admin/governance/role-features
 * - POST /api/auth/oauth/google
 * - POST /api/auth/profile/phone
 * - POST /api/auth/oauth/apple
 */

import type { Env } from '../types.ts';
import { handleSessionEndpoint } from './auth/handlers/handleSessionEndpoint.ts';
import { handleRevokeSession } from './auth/handlers/handleRevokeSession.ts';
import { handleGetAdminUsers } from './auth/handlers/handleGetAdminUsers.ts';
import { handleRestrictUser } from './auth/handlers/handleRestrictUser.ts';
import { handleRoleFeatures } from './auth/handlers/handleRoleFeatures.ts';
import { handleGoogleAuth } from './auth/handlers/handleGoogleAuth.ts';
import { handleUpdatePhone } from './auth/handlers/handleUpdatePhone.ts';
import { handleAppleAuth } from './auth/handlers/handleAppleAuth.ts';

export async function handleAuthAndGovernanceRoutes(
  request: Request,
  env: Env,
  url: URL
): Promise<Response | null> {
  // 1. Session Revalidation & Live Device Telemetry Sync Endpoint (/api/auth/session)
  if (
    url.pathname === '/api/auth/session' &&
    (request.method === 'GET' || request.method === 'POST')
  ) {
    return handleSessionEndpoint(request, env);
  }

  // 2. Revoke Specific Device Session Endpoint (/api/auth/session/revoke)
  if (url.pathname === '/api/auth/session/revoke' && request.method === 'POST') {
    return handleRevokeSession(request, env);
  }

  // 3. Admin User & Linked Devices Directory Endpoint (/api/admin/users)
  if (url.pathname === '/api/admin/users' && request.method === 'GET') {
    return handleGetAdminUsers(env);
  }

  // 4. Admin Governance: Instant Account Block / Suspend / Unblock with KV Eviction
  if (
    url.pathname === '/api/admin/governance/restrict' &&
    request.method === 'POST'
  ) {
    return handleRestrictUser(request, env);
  }

  // 5. Admin Governance: Role & Per-User Feature Flag Override
  if (
    url.pathname === '/api/admin/governance/role-features' &&
    request.method === 'POST'
  ) {
    return handleRoleFeatures(request, env);
  }

  // 6. Google OAuth 2.0 Edge Verification Endpoint
  if (url.pathname === '/api/auth/oauth/google' && request.method === 'POST') {
    return handleGoogleAuth(request, env);
  }

  // 7. Scholar Phone Number Communication Channel Update Endpoint
  if (url.pathname === '/api/auth/profile/phone' && request.method === 'POST') {
    return handleUpdatePhone(request, env);
  }

  // 8. Sign in with Apple Edge Verification Endpoint
  if (url.pathname === '/api/auth/oauth/apple' && request.method === 'POST') {
    return handleAppleAuth(request, env);
  }

  return null;
}
