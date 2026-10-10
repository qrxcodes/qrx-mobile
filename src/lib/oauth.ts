import type { OAuthTokens } from './types';

/**
 * Sign in with QRX: OAuth 2.1 authorisation code + PKCE against QRX's Clerk instance, as a public client, the same way
 * the browser extension does. The token is issued for the REST API (RFC 8707 `resource=<origin>/v1`), which is the
 * only audience `/v1` accepts. Everything here is plain TypeScript with injected I/O so it can be unit tested.
 */

export const SCOPES = ['qrx:read', 'qrx:generate', 'offline_access'] as const;

/** Renew this long before the access token expires. */
export const REFRESH_MARGIN_MS = 2 * 60 * 1000;

export type ServerMetadata = {
  authorization_endpoint: string;
  token_endpoint: string;
  revocation_endpoint?: string;
  registration_endpoint?: string;
};

export type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
};

export function base64UrlFromBytes(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8) | bytes[i + 2]!;
    out += alphabet[(n >> 18) & 63]! + alphabet[(n >> 12) & 63]! + alphabet[(n >> 6) & 63]! + alphabet[n & 63]!;
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i]! << 16;
    out += alphabet[(n >> 18) & 63]! + alphabet[(n >> 12) & 63]!;
  } else if (rest === 2) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8);
    out += alphabet[(n >> 18) & 63]! + alphabet[(n >> 12) & 63]! + alphabet[(n >> 6) & 63]!;
  }
  return out;
}

/** Converts standard base64 (as expo-crypto returns digests) to base64url without padding. */
export function base64ToBase64Url(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export type CryptoDeps = {
  randomBytes(length: number): Uint8Array;
  /** SHA-256 of a UTF-8 string, as standard base64. */
  sha256Base64(input: string): Promise<string>;
};

export function randomString(crypto: CryptoDeps, byteLength = 32): string {
  return base64UrlFromBytes(crypto.randomBytes(byteLength));
}

export async function createPkcePair(crypto: CryptoDeps): Promise<{ verifier: string; challenge: string }> {
  const verifier = randomString(crypto, 48);
  return { verifier, challenge: base64ToBase64Url(await crypto.sha256Base64(verifier)) };
}

async function getJson<T>(fetchImpl: typeof fetch, url: string): Promise<T | null> {
  try {
    const res = await fetchImpl(url, { headers: { Accept: 'application/json' } });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/** The resource to ask a token for, as the API's protected resource metadata names it (`<origin>/v1`). */
export async function discoverResource(fetchImpl: typeof fetch, apiBase: string): Promise<string> {
  const base = apiBase.replace(/\/$/, '');
  const metadata = await getJson<{ resource?: string }>(fetchImpl, `${base}/.well-known/oauth-protected-resource/v1`);
  return metadata?.resource ?? `${base}/v1`;
}

export async function serverMetadata(fetchImpl: typeof fetch, issuer: string): Promise<ServerMetadata> {
  const base = issuer.replace(/\/$/, '');
  const metadata =
    (await getJson<ServerMetadata>(fetchImpl, `${base}/.well-known/oauth-authorization-server`)) ??
    (await getJson<ServerMetadata>(fetchImpl, `${base}/.well-known/openid-configuration`));
  if (!metadata?.authorization_endpoint || !metadata.token_endpoint) {
    throw new Error("Couldn't reach the QRX sign-in service. Check your connection and try again.");
  }
  return metadata;
}

/** Registers this app with the sign-in service when the build has no pre-registered client (RFC 7591). */
export async function registerClient(
  fetchImpl: typeof fetch,
  metadata: ServerMetadata,
  redirectUri: string,
  clientName: string,
): Promise<string> {
  if (!metadata.registration_endpoint) throw new Error('Sign-in is not set up for this build yet.');
  const res = await fetchImpl(metadata.registration_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_name: clientName,
      redirect_uris: [redirectUri],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      scope: SCOPES.join(' '),
    }),
  });
  if (!res.ok) throw new Error(`Couldn't register with the QRX sign-in service (HTTP ${res.status}).`);
  const registered = (await res.json()) as { client_id?: string };
  if (!registered.client_id) throw new Error('The QRX sign-in service gave no client id.');
  return registered.client_id;
}

export function authorizeUrl(
  metadata: ServerMetadata,
  params: { clientId: string; redirectUri: string; state: string; challenge: string; resource: string },
): string {
  const url = new URL(metadata.authorization_endpoint);
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    scope: SCOPES.join(' '),
    state: params.state,
    code_challenge: params.challenge,
    code_challenge_method: 'S256',
    resource: params.resource,
  }).toString();
  return url.toString();
}

/** Parses the redirect the sign-in browser ended on: the code, after checking state; or the server's error. */
export function parseRedirect(responseUrl: string, expectedState: string): string {
  const query = responseUrl.includes('?') ? responseUrl.slice(responseUrl.indexOf('?') + 1).split('#')[0]! : '';
  const params = new URLSearchParams(query);
  if (params.get('error')) {
    throw new Error(params.get('error_description') || `Sign-in failed: ${params.get('error')}`);
  }
  if (params.get('state') !== expectedState) throw new Error('Sign-in failed: the response did not match the request.');
  const code = params.get('code');
  if (!code) throw new Error('Sign-in failed: no authorisation code came back.');
  return code;
}

export async function tokenRequest(
  fetchImpl: typeof fetch,
  endpoint: string,
  params: Record<string, string>,
): Promise<TokenResponse> {
  const res = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams(params).toString(),
  });
  const body = (await res.json().catch(() => ({}))) as TokenResponse & { error?: string; error_description?: string };
  if (!res.ok || !body.access_token) {
    const err = new Error(body.error_description || body.error || `Sign-in failed (HTTP ${res.status}).`);
    // invalid_grant: the refresh token is spent or revoked, so the session is over
    (err as Error & { oauthError?: string }).oauthError = body.error;
    throw err;
  }
  return body;
}

export function tokensFrom(
  response: TokenResponse,
  base: Omit<OAuthTokens, 'accessToken' | 'refreshToken' | 'expiresAt'>,
  previousRefresh?: string,
  now = Date.now(),
): OAuthTokens {
  return {
    ...base,
    accessToken: response.access_token,
    // refresh tokens rotate; keep the old one only if the server sent none
    refreshToken: response.refresh_token ?? previousRefresh,
    expiresAt: now + (response.expires_in ?? 3600) * 1000,
  };
}

export const needsRefresh = (tokens: OAuthTokens, now = Date.now()) => tokens.expiresAt - REFRESH_MARGIN_MS <= now;

export const isApiKey = (value: string) => /^qrx_[A-Za-z0-9_]+$/.test(value.trim());
