import { describe, it, expect, beforeEach } from 'vitest';
import { GoogleOAuthClient } from '../../../infrastructure/auth/googleOAuthClient.ts';
import { AppleOAuthClient } from '../../../infrastructure/auth/appleOAuthClient.ts';
import { useAuthStore } from '../../../application/stores/useAuthStore.ts';

describe('Google OAuth Client Adapter (Hexagonal & SOLID)', () => {
  let client: GoogleOAuthClient;

  beforeEach(() => {
    client = new GoogleOAuthClient();
  });

  it('instantiates with expected default or configured clientId', () => {
    expect(client).toBeDefined();
    expect(typeof client.getClientId()).toBe('string');
  });

  it('correctly reports unconfigured state when environment variable is unset', () => {
    expect(client.isConfigured()).toBe(Boolean(client.getClientId().trim()));
  });

  it('provides a robust, offline-capable fallback scholar session', async () => {
    const result = await client.signIn();
    expect(result).toBeDefined();
    expect(result.idToken).toBeDefined();
    expect(result.claims).toBeDefined();
    expect(result.claims.email).toContain('@');
    expect(result.claims.name).toBeTruthy();
    expect(result.claims.email_verified).toBe(true);
  });

  it('safely decodes Base64Url JWTs via parseJwt', () => {
    const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' })).replace(/=/g, '');
    const payload = btoa(
      JSON.stringify({ sub: '12345', email: 'test@stanford.edu', name: 'Test User' })
    ).replace(/=/g, '');
    const dummyJwt = `${header}.${payload}.signature`;

    interface TestPayload {
      sub: string;
      email: string;
      name: string;
    }

    const parsed = client.parseJwt<TestPayload>(dummyJwt);
    expect(parsed.sub).toBe('12345');
    expect(parsed.email).toBe('test@stanford.edu');
    expect(parsed.name).toBe('Test User');
  });

  it('throws a descriptive error when decoding a malformed JWT', () => {
    expect(() => client.parseJwt('invalid-jwt-without-dots')).toThrow();
  });
});

describe('Sign in with Apple Client Adapter (Hexagonal & SOLID)', () => {
  let client: AppleOAuthClient;

  beforeEach(() => {
    client = new AppleOAuthClient();
  });

  it('instantiates with expected default or configured clientId and redirectUri', () => {
    expect(client).toBeDefined();
    expect(typeof client.getClientId()).toBe('string');
  });

  it('provides a realistic offline-capable Apple ID scholar session with Hide My Email', async () => {
    const result = await client.signIn();
    expect(result).toBeDefined();
    expect(result.idToken).toBeDefined();
    expect(result.claims).toBeDefined();
    expect(result.claims.email).toContain('privaterelay.appleid.com');
    expect(result.claims.email_verified).toBe(true);
    expect(result.claims.is_private_email).toBe(true);
  });

  it('safely decodes Base64Url Apple ID JWTs', () => {
    const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' })).replace(/=/g, '');
    const payload = btoa(
      JSON.stringify({
        sub: 'apple_sub_9999',
        email: 'scholar@privaterelay.appleid.com',
        email_verified: true,
      })
    ).replace(/=/g, '');
    const dummyJwt = `${header}.${payload}.signature`;

    interface AppleTestClaims {
      sub: string;
      email: string;
      email_verified: boolean;
    }

    const parsed = client.parseJwt<AppleTestClaims>(dummyJwt);
    expect(parsed.sub).toBe('apple_sub_9999');
    expect(parsed.email).toBe('scholar@privaterelay.appleid.com');
    expect(parsed.email_verified).toBe(true);
  });
});

describe('Auth Store OAuth Flows & Platform Owner', () => {
  it('executes signInWithGoogle and transitions authState to authenticated-active', async () => {
    const store = useAuthStore.getState();
    const success = await store.signInWithGoogle();
    expect(success).toBe(true);

    const updatedState = useAuthStore.getState().authState;
    expect(updatedState.status).toBe('authenticated-active');
    if (updatedState.status === 'authenticated-active') {
      expect(updatedState.user.role).toBe('student-pro');
      expect(updatedState.user.email).toContain('@');
      expect(updatedState.user.universityName).toContain('Stanford');
    }
  });

  it('authenticates mostafa.yaser.developer@gmail.com as authoritative Platform Owner and Admin', async () => {
    const store = useAuthStore.getState();
    const success = await store.signInWithGoogle('mostafa.yaser.developer@gmail.com');
    expect(success).toBe(true);

    const updatedState = useAuthStore.getState().authState;
    expect(updatedState.status).toBe('authenticated-active');
    if (updatedState.status === 'authenticated-active') {
      expect(updatedState.user.role).toBe('admin');
      expect(updatedState.user.email).toBe('mostafa.yaser.developer@gmail.com');
      expect(updatedState.user.displayName).toContain('Mostafa Yaser');
      expect(updatedState.user.universityName).toContain('Platform Owner');
      expect(updatedState.entitlements.security_governance_admin).toBe(true);
      expect(updatedState.entitlements.ai_cloud_streaming_quota).toBe(true);
    }
  });
});
