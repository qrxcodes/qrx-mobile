import type { ProblemInfo } from './types';

/** An error the app can explain: an RFC 9457 problem from the API, or one of the app's own. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problem: ProblemInfo,
  ) {
    super(problem.detail || problem.title);
  }
}

/** The problem's slug: the fragment of its type URI (`…/errors#daily-limit` → `daily-limit`). */
export function problemSlug(type: string | undefined): string {
  if (!type) return 'unknown';
  const hash = type.lastIndexOf('#');
  return hash >= 0 ? type.slice(hash + 1) : type;
}

export async function problemFromResponse(res: Response): Promise<ApiError> {
  let body: Record<string, unknown> = {};
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    // not JSON: fall back to the status line
  }
  const retryAfterHeader = res.headers.get('Retry-After');
  const retryAfter = retryAfterHeader && /^\d+$/.test(retryAfterHeader) ? Number(retryAfterHeader) : undefined;
  const fieldErrors = Array.isArray(body.errors)
    ? (body.errors as { field?: string; message?: string }[])
        .map((e) => [e.field, e.message].filter(Boolean).join(': '))
        .join('; ')
    : '';
  const slug = typeof body.type === 'string' ? problemSlug(body.type) : res.status === 401 ? 'unauthorized' : 'http';
  return new ApiError(res.status, {
    type: slug,
    status: res.status,
    title: typeof body.title === 'string' ? body.title : `HTTP ${res.status}`,
    detail: [typeof body.detail === 'string' ? body.detail : '', fieldErrors].filter(Boolean).join(' '),
    retryAfter,
  });
}

export function toProblem(err: unknown): ProblemInfo {
  if (err instanceof ApiError) return err.problem;
  if (err instanceof TypeError) {
    return { type: 'network', title: "Couldn't reach QRX", detail: 'Check your connection and try again.' };
  }
  const message = err instanceof Error ? err.message : String(err);
  return { type: 'unknown', title: 'Something went wrong', detail: message };
}

/** Problems worth retrying with the same Idempotency-Key, rather than giving up on the code. */
export function isTransient(problem: ProblemInfo): boolean {
  return ['network', 'rate-limited', 'unavailable', 'internal', 'idempotency-in-progress'].includes(problem.type);
}

/**
 * Words for people, keyed by problem slug. The API's own wording is shown only for problems about what the person
 * typed: elsewhere it can name plans, and the app never sells or points to a plan (see docs/purchases.md).
 */
export function describeProblem(problem: ProblemInfo): { title: string; detail: string } {
  switch (problem.type) {
    case 'daily-limit':
      return { title: "You've used today's codes", detail: 'Your allowance resets tomorrow.' };
    case 'plan-required':
      return { title: 'Not available for this account', detail: "This account can't change where a code points." };
    case 'rate-limited':
      return { title: 'Slow down a little', detail: 'Too many requests at once. Try again in a moment.' };
    case 'unauthorized':
      return { title: 'Signed out', detail: 'Sign in to QRX again to keep going.' };
    case 'not-found':
      return { title: 'Code not found', detail: 'It may have been deleted on qrx.codes.' };
    case 'network':
      return { title: "Couldn't reach QRX", detail: 'Check your connection and try again.' };
    case 'unavailable':
    case 'internal':
      return { title: 'QRX is having a moment', detail: 'Try again in a minute.' };
    case 'unprocessable':
    case 'invalid-request':
      return { title: "QRX couldn't use that", detail: problem.detail || problem.title };
    case 'generation-failed':
      return {
        title: "This one didn't work out",
        detail: problem.detail || 'QRX could not make a code that scans from that prompt. Try another prompt.',
      };
    default:
      return { title: 'Something went wrong', detail: 'Try again in a moment.' };
  }
}
