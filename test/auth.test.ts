import { createHash, randomBytes } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

import {
  authorizeUrl,
  base64UrlFromBytes,
  createPkcePair,
  discoverResource,
  isApiKey,
  needsRefresh,
  parseRedirect,
  randomString,
  registerClient,
  serverMetadata,
  tokenRequest,
  tokensFrom,
  type CryptoDeps,
} from '@/lib/oauth';
import { createSessionManager } from '@/lib/session-manager';
import type { OAuthTokens, Session } from '@/lib/types';

const nodeCrypto: CryptoDeps = {
  randomBytes: (n) => new Uint8Array(randomBytes(n)),
  sha256Base64: async (input) => createHash('sha256').update(input).digest('base64'),
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('PKCE', () => {
  it('encodes base64url like Node does', () => {
    for (const n of [0, 1, 2, 3, 31, 32, 33, 48]) {
      const bytes = new Uint8Array(randomBytes(n));
      expect(base64UrlFromBytes(bytes)).toBe(Buffer.from(bytes).toString('base64url'));
    }
  });

  it('makes an S256 challenge from a 64-character verifier', async () => {
    const { verifier, challenge } = await createPkcePair(nodeCrypto);
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{64}$/);
    expect(challenge).toBe(createHash('sha256').update(verifier).digest('base64url'));
  });

  it('makes url-safe random strings', () => {
    expect(randomString(nodeCrypto, 16)).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(randomString(nodeCrypto)).not.toBe(randomString(nodeCrypto));
  });
});

describe('authorisation request', () => {
  const metadata = {
    authorization_endpoint: 'https://clerk.qrx.codes/oauth/authorize',
    token_endpoint: 'https://clerk.qrx.codes/oauth/token',
  };

  it('asks for the /v1 resource with PKCE and the app scopes', () => {
    const url = new URL(
      authorizeUrl(metadata, {
        clientId: 'client',
        redirectUri: 'codes.qrx.app://oauth',
        state: 's1',
        challenge: 'ch',
        resource: 'https://qrx.codes/v1',
      }),
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      response_type: 'code',
      client_id: 'client',
      redirect_uri: 'codes.qrx.app://oauth',
      scope: 'qrx:read qrx:generate offline_access',
      state: 's1',
      code_challenge: 'ch',
      code_challenge_method: 'S256',
      resource: 'https://qrx.codes/v1',
    });
  });

  it('reads the code from the custom-scheme redirect when the state matches', () => {
    expect(parseRedirect('codes.qrx.app://oauth?code=abc&state=s1', 's1')).toBe('abc');
    expect(parseRedirect('codes.qrx.app.dev://oauth?state=s1&code=x%2By#frag', 's1')).toBe('x+y');
  });

  it('refuses a mismatched state and reports the server’s error', () => {
    expect(() => parseRedirect('codes.qrx.app://oauth?code=abc&state=other', 's1')).toThrow(/did not match/);
    expect(() =>
      parseRedirect('codes.qrx.app://oauth?error=access_denied&error_description=Denied&state=s1', 's1'),
    ).toThrow('Denied');
    expect(() => parseRedirect('codes.qrx.app://oauth?state=s1', 's1')).toThrow(/no authorisation code/);
  });

  it('discovers the resource from protected resource metadata, with a fallback', async () => {
    const ok = vi.fn(async () => json({ resource: 'https://dev.qrx.codes/v1' })) as unknown as typeof fetch;
    expect(await discoverResource(ok, 'https://dev.qrx.codes/')).toBe('https://dev.qrx.codes/v1');
    const down = vi.fn(async () => new Response('nope', { status: 404 })) as unknown as typeof fetch;
    expect(await discoverResource(down, 'https://qrx.codes')).toBe('https://qrx.codes/v1');
  });

  it('reads the authorisation server metadata, falling back to OpenID configuration', async () => {
    const calls: string[] = [];
    const impl = vi.fn(async (url: string) => {
      calls.push(url);
      return url.endsWith('oauth-authorization-server') ? new Response('', { status: 404 }) : json(metadata);
    }) as unknown as typeof fetch;
    expect(await serverMetadata(impl, 'https://clerk.qrx.codes/')).toEqual(metadata);
    expect(calls).toEqual([
      'https://clerk.qrx.codes/.well-known/oauth-authorization-server',
      'https://clerk.qrx.codes/.well-known/openid-configuration',
    ]);
  });

  it('registers a public client for the app redirect when the build has none', async () => {
    let body: Record<string, unknown> = {};
    const impl = vi.fn(async (_url: string, init: RequestInit) => {
      body = JSON.parse(String(init.body));
      return json({ client_id: 'dyn-1' }, 201);
    }) as unknown as typeof fetch;
    const id = await registerClient(
      impl,
      { ...metadata, registration_endpoint: 'https://clerk.qrx.codes/oauth/register' },
      'codes.qrx.app://oauth',
      'QRX for iOS and Android',
    );
    expect(id).toBe('dyn-1');
    expect(body).toMatchObject({ redirect_uris: ['codes.qrx.app://oauth'], token_endpoint_auth_method: 'none' });
  });

  it('surfaces the token endpoint’s error', async () => {
    const impl = vi.fn(async () =>
      json({ error: 'invalid_grant', error_description: 'Code expired' }, 400),
    ) as unknown as typeof fetch;
    await expect(tokenRequest(impl, metadata.token_endpoint, { grant_type: 'authorization_code' })).rejects.toThrow(
      'Code expired',
    );
  });

  it('recognises API keys', () => {
    expect(isApiKey(' qrx_live_abc123 ')).toBe(true);
    expect(isApiKey('sk_live_abc')).toBe(false);
  });
});

describe('session manager', () => {
  const base = {
    clientId: 'client',
    resource: 'https://qrx.codes/v1',
    tokenEndpoint: 'https://clerk.qrx.codes/oauth/token',
  };
  const tokens = (overrides: Partial<OAuthTokens> = {}): OAuthTokens => ({
    ...base,
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    expiresAt: 1_000_000,
    ...overrides,
  });

  function setup(responses: (Response | Error)[], now = 0) {
    const saved: (Session | null)[] = [];
    const ended: string[] = [];
    const bodies: URLSearchParams[] = [];
    const impl = vi.fn(async (_url: string, init: RequestInit) => {
      bodies.push(new URLSearchParams(String(init.body)));
      const next = responses.shift()!;
      if (next instanceof Error) throw next;
      return next;
    }) as unknown as typeof fetch;
    const manager = createSessionManager({
      store: { save: async (s) => void saved.push(s), clear: async () => void saved.push(null) },
      fetch: impl,
      onSignedOut: (reason) => ended.push(reason),
      now: () => now,
    });
    return { manager, saved, ended, bodies, impl };
  }

  it('hands out a fresh access token as is', async () => {
    const { manager, impl } = setup([]);
    manager.restore({ method: 'oauth', tokens: tokens() });
    expect(await manager.bearer.get()).toBe('access-1');
    expect(impl).not.toHaveBeenCalled();
  });

  it('refreshes near expiry for the same resource, and keeps the rotated refresh token', async () => {
    const { manager, saved, bodies } = setup(
      [json({ access_token: 'access-2', refresh_token: 'refresh-2', expires_in: 86400 })],
      999_000,
    );
    manager.restore({ method: 'oauth', tokens: tokens() });
    expect(await manager.bearer.get()).toBe('access-2');
    expect(Object.fromEntries(bodies[0]!)).toEqual({
      grant_type: 'refresh_token',
      refresh_token: 'refresh-1',
      client_id: 'client',
      resource: 'https://qrx.codes/v1',
    });
    expect(saved.at(-1)).toMatchObject({
      tokens: { accessToken: 'access-2', refreshToken: 'refresh-2', expiresAt: 999_000 + 86_400_000 },
    });
  });

  it('runs one refresh at a time', async () => {
    const { manager, impl } = setup([json({ access_token: 'access-2', expires_in: 60 })], 999_000);
    manager.restore({ method: 'oauth', tokens: tokens() });
    const [a, b] = await Promise.all([manager.bearer.get(), manager.bearer.get()]);
    expect([a, b]).toEqual(['access-2', 'access-2']);
    expect(impl).toHaveBeenCalledTimes(1);
  });

  it('signs out when the refresh token is refused', async () => {
    const { manager, saved, ended } = setup([json({ error: 'invalid_grant' }, 400)], 999_000);
    manager.restore({ method: 'oauth', tokens: tokens() });
    expect(await manager.bearer.get()).toBeNull();
    expect(saved.at(-1)).toBeNull();
    expect(ended).toEqual(['Your QRX session ended. Sign in again.']);
  });

  it('keeps the session when offline', async () => {
    const { manager, ended } = setup([new TypeError('Network request failed')], 999_000);
    manager.restore({ method: 'oauth', tokens: tokens() });
    await expect(manager.bearer.get()).rejects.toBeInstanceOf(TypeError);
    expect(manager.session).not.toBeNull();
    expect(ended).toEqual([]);
  });

  it('signs out an API key the API no longer accepts', async () => {
    const { manager, ended } = setup([]);
    manager.restore({ method: 'apiKey', apiKey: 'qrx_live_x' });
    expect(await manager.bearer.get()).toBe('qrx_live_x');
    expect(await manager.bearer.renew()).toBeNull();
    expect(ended).toEqual(['QRX no longer accepts the saved API key.']);
  });

  it('works out expiry with a margin', () => {
    expect(needsRefresh(tokens({ expiresAt: 10 * 60_000 }), 0)).toBe(false);
    expect(needsRefresh(tokens({ expiresAt: 60_000 }), 0)).toBe(true);
    expect(tokensFrom({ access_token: 'a' }, base, 'keep', 0)).toMatchObject({
      refreshToken: 'keep',
      expiresAt: 3_600_000,
    });
  });
});
