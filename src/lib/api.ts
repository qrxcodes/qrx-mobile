import { ApiError, problemFromResponse } from './problem';
import type { Account, Code, CreateCodeRequest, List, Style } from './types';

/** Where the client gets its bearer: an OAuth access token (refreshed as needed) or an API key. */
export type BearerSource = {
  /** A token or API key for the next request; null when signed out. */
  get(): Promise<string | null>;
  /** After a 401: a fresh token, or null when the session can't be renewed (the caller then signs out). */
  renew(): Promise<string | null>;
};

export type QrxApi = {
  account(): Promise<Account>;
  listStyles(): Promise<List<Style>>;
  listCodes(cursor?: string | null, limit?: number): Promise<List<Code>>;
  getCode(id: string, wait?: number, signal?: AbortSignal): Promise<Code>;
  createCode(body: CreateCodeRequest, idempotencyKey: string): Promise<Code>;
  changeDestination(id: string, destination: string): Promise<Code>;
  /** Reports a code's image to QRX for review (offensive or harmful content). */
  reportCode(id: string, reason?: string): Promise<{ object: 'report'; code: string; receivedAt: string }>;
};

export type ApiOptions = {
  baseUrl: string;
  bearer: BearerSource;
  fetch?: typeof fetch;
  /** Sent as `X-QRX-Client`, so support can tell app requests apart (e.g. `qrx-ios/1.0.0`). */
  userAgent?: string;
};

const notSignedIn = () =>
  new ApiError(401, { type: 'unauthorized', title: 'Not signed in', detail: 'Sign in to QRX first.', status: 401 });

/** The QRX REST API (`/v1`), with one retry after a 401 using a renewed token. */
export function createApi({ baseUrl, bearer, fetch: fetchImpl = fetch, userAgent }: ApiOptions): QrxApi {
  const base = baseUrl.replace(/\/$/, '');

  async function send(token: string, path: string, init: RequestInit): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Accept', 'application/json');
    if (userAgent) headers.set('X-QRX-Client', userAgent);
    return fetchImpl(`${base}${path}`, { ...init, headers });
  }

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await bearer.get();
    if (!token) throw notSignedIn();
    let res = await send(token, path, init);
    if (res.status === 401) {
      const renewed = await bearer.renew();
      if (!renewed) throw await problemFromResponse(res);
      res = await send(renewed, path, init);
    }
    if (!res.ok) throw await problemFromResponse(res);
    return (await res.json()) as T;
  }

  const json = (method: string, body: unknown, headers: Record<string, string> = {}): RequestInit => ({
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

  return {
    account: () => request<Account>('/v1/account'),
    listStyles: () => request<List<Style>>('/v1/styles'),
    listCodes(cursor, limit = 24) {
      const query = new URLSearchParams({ limit: String(limit) });
      if (cursor) query.set('cursor', cursor);
      return request<List<Code>>(`/v1/codes?${query}`);
    },
    /** Waits up to `wait` seconds (at most 50) for the code to finish. */
    getCode: (id, wait = 0, signal) => request<Code>(`/v1/codes/${encodeURIComponent(id)}?wait=${wait}`, { signal }),
    createCode: (body, idempotencyKey) =>
      request<Code>('/v1/codes?wait=0', json('POST', body, { 'Idempotency-Key': idempotencyKey })),
    changeDestination: (id, destination) =>
      request<Code>(`/v1/codes/${encodeURIComponent(id)}`, json('PATCH', { destination })),
    reportCode: (id, reason) =>
      request(
        `/v1/codes/${encodeURIComponent(id)}/report`,
        json('POST', reason?.trim() ? { reason: reason.trim() } : {}),
      ),
  };
}

/** Checks a credential before it is saved: the account it belongs to, or the API's refusal. */
export async function fetchAccountWith(
  baseUrl: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Account> {
  const api = createApi({
    baseUrl,
    fetch: fetchImpl,
    bearer: { get: async () => token, renew: async () => null },
  });
  return api.account();
}
