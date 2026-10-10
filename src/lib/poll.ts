import type { QrxApi } from './api';
import { isFinished } from './format';
import { isTransient, toProblem } from './problem';
import type { Code } from './types';

/** Long-poll length per request; the API holds a GET for up to 50 s, shorter keeps mobile networks happy. */
export const POLL_WAIT_SECONDS = 25;
const MAX_TRANSIENT_FAILURES = 6;

export type PollOptions = {
  signal?: AbortSignal;
  onUpdate?: (code: Code) => void;
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Follows a code until it succeeds or fails. Network blips and rate limits are retried with backoff; anything else
 * (signed out, not found) is thrown. Returns null when aborted.
 */
export async function pollUntilFinished(api: QrxApi, id: string, options: PollOptions = {}): Promise<Code | null> {
  const { signal, onUpdate, sleep = defaultSleep } = options;
  let failures = 0;
  while (!signal?.aborted) {
    let code: Code;
    try {
      code = await api.getCode(id, POLL_WAIT_SECONDS, signal);
    } catch (err) {
      if (signal?.aborted) return null;
      const problem = toProblem(err);
      if (!isTransient(problem) || ++failures > MAX_TRANSIENT_FAILURES) throw err;
      await sleep(Math.min((problem.retryAfter ?? 2 ** failures) * 1000, 30_000));
      continue;
    }
    failures = 0;
    onUpdate?.(code);
    if (isFinished(code)) return code;
  }
  return null;
}

/**
 * Sends the create request, retrying transient failures with the same Idempotency-Key: the API answers a retry with
 * the code the first attempt made, so a lost response never makes (or charges for) a second code.
 */
export async function createWithRetry(
  api: QrxApi,
  body: Parameters<QrxApi['createCode']>[0],
  idempotencyKey: string,
  sleep: (ms: number) => Promise<void> = defaultSleep,
): Promise<Code> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await api.createCode(body, idempotencyKey);
    } catch (err) {
      const problem = toProblem(err);
      if (!isTransient(problem) || attempt >= 4) throw err;
      await sleep(Math.min((problem.retryAfter ?? attempt * 2) * 1000, 15_000));
    }
  }
}
