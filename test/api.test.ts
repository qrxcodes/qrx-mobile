import { describe, expect, it, vi } from 'vitest';

import { createApi, fetchAccountWith, type BearerSource } from '@/lib/api';
import { ApiError, describeProblem, isTransient, problemFromResponse, problemSlug, toProblem } from '@/lib/problem';

type Call = { url: string; init: RequestInit };

function fakeFetch(responses: (Response | Error)[]) {
  const calls: Call[] = [];
  const impl = vi.fn(async (url: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(url), init });
    const next = responses.shift();
    if (!next) throw new Error('no more responses');
    if (next instanceof Error) throw next;
    return next;
  });
  return { impl: impl as unknown as typeof fetch, calls };
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

const problem = (slug: string, status: number, detail = '', headers: Record<string, string> = {}) =>
  json({ type: `https://qrx.codes/developers/docs/errors#${slug}`, title: slug, status, detail }, status, headers);

const bearer = (token: string | null, renewed: string | null = null): BearerSource & { renews: number } => {
  const source = {
    renews: 0,
    get: async () => token,
    renew: async () => {
      source.renews += 1;
      return renewed;
    },
  };
  return source;
};

const sampleCode = {
  id: 'abc123',
  object: 'code',
  status: 'processing',
  type: 'url',
  createdAt: '2026-10-10T00:00:00Z',
};

describe('API client', () => {
  it('sends the bearer, Accept and the client tag', async () => {
    const { impl, calls } = fakeFetch([json({ object: 'account' })]);
    const api = createApi({
      baseUrl: 'https://qrx.codes/',
      bearer: bearer('tok'),
      fetch: impl,
      userAgent: 'qrx-ios/1.0.0',
    });
    await api.account();
    expect(calls[0]!.url).toBe('https://qrx.codes/v1/account');
    const headers = new Headers(calls[0]!.init.headers);
    expect(headers.get('Authorization')).toBe('Bearer tok');
    expect(headers.get('Accept')).toBe('application/json');
    expect(headers.get('X-QRX-Client')).toBe('qrx-ios/1.0.0');
  });

  it('creates codes with an Idempotency-Key and no wait', async () => {
    const { impl, calls } = fakeFetch([json(sampleCode, 202)]);
    const api = createApi({ baseUrl: 'https://qrx.codes', bearer: bearer('tok'), fetch: impl });
    const code = await api.createCode({ prompt: 'A fox', destination: 'https://example.com', style: 'ae4c1' }, 'key-1');
    expect(code.id).toBe('abc123');
    expect(calls[0]!.url).toBe('https://qrx.codes/v1/codes?wait=0');
    expect(calls[0]!.init.method).toBe('POST');
    expect(new Headers(calls[0]!.init.headers).get('Idempotency-Key')).toBe('key-1');
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({
      prompt: 'A fox',
      destination: 'https://example.com',
      style: 'ae4c1',
    });
  });

  it('long-polls a code, lists with a cursor, changes a destination and reports an image', async () => {
    const { impl, calls } = fakeFetch([
      json(sampleCode),
      json({ object: 'list', data: [], hasMore: false, nextCursor: null }),
      json(sampleCode),
      json({ object: 'report', code: 'abc123', receivedAt: '2026-10-10T00:00:00Z' }, 202),
      json({ object: 'report', code: 'abc123', receivedAt: '2026-10-10T00:00:00Z' }, 202),
    ]);
    const api = createApi({ baseUrl: 'https://qrx.codes', bearer: bearer('tok'), fetch: impl });
    await api.getCode('abc123', 25);
    await api.listCodes('cur', 24);
    await api.changeDestination('abc123', 'https://example.com/new');
    await api.reportCode('abc123', '  offensive  ');
    await api.reportCode('abc123');
    expect(calls.map((c) => `${c.init.method ?? 'GET'} ${c.url}`)).toEqual([
      'GET https://qrx.codes/v1/codes/abc123?wait=25',
      'GET https://qrx.codes/v1/codes?limit=24&cursor=cur',
      'PATCH https://qrx.codes/v1/codes/abc123',
      'POST https://qrx.codes/v1/codes/abc123/report',
      'POST https://qrx.codes/v1/codes/abc123/report',
    ]);
    expect(JSON.parse(String(calls[2]!.init.body))).toEqual({ destination: 'https://example.com/new' });
    expect(JSON.parse(String(calls[3]!.init.body))).toEqual({ reason: 'offensive' });
    expect(JSON.parse(String(calls[4]!.init.body))).toEqual({});
  });

  it('renews once after a 401 and retries with the new token', async () => {
    const { impl, calls } = fakeFetch([problem('unauthorized', 401), json({ object: 'account' })]);
    const source = bearer('old', 'new');
    const api = createApi({ baseUrl: 'https://qrx.codes', bearer: source, fetch: impl });
    await api.account();
    expect(source.renews).toBe(1);
    expect(new Headers(calls[1]!.init.headers).get('Authorization')).toBe('Bearer new');
  });

  it('gives up with the 401 problem when the session cannot be renewed', async () => {
    const { impl } = fakeFetch([problem('unauthorized', 401, 'Expired')]);
    const api = createApi({ baseUrl: 'https://qrx.codes', bearer: bearer('old', null), fetch: impl });
    await expect(api.account()).rejects.toMatchObject({ status: 401, problem: { type: 'unauthorized' } });
  });

  it('refuses to call without credentials', async () => {
    const { impl, calls } = fakeFetch([]);
    const api = createApi({ baseUrl: 'https://qrx.codes', bearer: bearer(null), fetch: impl });
    await expect(api.account()).rejects.toBeInstanceOf(ApiError);
    expect(calls).toHaveLength(0);
  });

  it('checks a credential before it is saved', async () => {
    const { impl, calls } = fakeFetch([json({ object: 'account', plan: 'free' })]);
    const account = await fetchAccountWith('https://dev.qrx.codes', 'qrx_test_key', impl);
    expect(account.plan).toBe('free');
    expect(new Headers(calls[0]!.init.headers).get('Authorization')).toBe('Bearer qrx_test_key');
  });
});

describe('problems', () => {
  it('reads the slug from the problem type URI', () => {
    expect(problemSlug('https://qrx.codes/developers/docs/errors#daily-limit')).toBe('daily-limit');
    expect(problemSlug(undefined)).toBe('unknown');
  });

  it('parses an RFC 9457 response with Retry-After and field errors', async () => {
    const res = json(
      {
        type: 'https://qrx.codes/developers/docs/errors#invalid-request',
        title: 'Invalid request',
        status: 400,
        detail: 'The request is not valid.',
        errors: [{ field: 'destination', message: 'must be a URL' }],
      },
      400,
      { 'Retry-After': '7' },
    );
    const err = await problemFromResponse(res);
    expect(err.status).toBe(400);
    expect(err.problem).toMatchObject({ type: 'invalid-request', retryAfter: 7 });
    expect(err.problem.detail).toBe('The request is not valid. destination: must be a URL');
  });

  it('treats network errors and rate limits as worth retrying', () => {
    expect(toProblem(new TypeError('Network request failed')).type).toBe('network');
    expect(isTransient({ type: 'network', title: '', detail: '' })).toBe(true);
    expect(isTransient({ type: 'rate-limited', title: '', detail: '' })).toBe(true);
    expect(isTransient({ type: 'daily-limit', title: '', detail: '' })).toBe(false);
    expect(isTransient({ type: 'unauthorized', title: '', detail: '' })).toBe(false);
  });

  it('never repeats the API’s plan wording for allowance and plan problems', () => {
    const fromApi = 'Upgrade to the Starter plan for unlimited codes.';
    for (const type of ['daily-limit', 'plan-required', 'forbidden', 'http', 'unknown']) {
      const shown = describeProblem({ type, title: 'Needs the Starter plan', detail: fromApi });
      expect(`${shown.title} ${shown.detail}`).not.toMatch(/starter|upgrade|price|subscri/i);
    }
  });
});
