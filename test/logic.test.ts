import { describe, expect, it, vi } from 'vitest';

import type { QrxApi } from '@/lib/api';
import {
  ago,
  allowanceLine,
  displayLink,
  isLinkCode,
  normaliseLink,
  orderStyles,
  progressStage,
  reminderDelaySeconds,
  resetsIn,
} from '@/lib/format';
import { mockAccount, mockCodes, mockStyles } from '@/lib/mock-data';
import { createWithRetry, pollUntilFinished } from '@/lib/poll';
import { ApiError } from '@/lib/problem';
import type { Code } from '@/lib/types';

const code = (status: string): Code => ({
  id: 'abc123',
  object: 'code',
  status,
  type: 'url',
  prompt: 'A fox',
  style: null,
  destination: 'https://example.com',
  shortUrl: 'https://qrx.to/abc123',
  imageUrl: status === 'succeeded' ? 'https://qrx.codes/media/premium/abc123.png' : null,
  pageUrl: 'https://qrx.codes/view/abc123',
  error: null,
  createdAt: '2026-10-10T00:00:00Z',
});

const noSleep = async () => undefined;
const networkError = () => new TypeError('Network request failed');

describe('links', () => {
  it('adds https:// and keeps what was typed', () => {
    expect(normaliseLink(' example.com/menu ')).toBe('https://example.com/menu');
    expect(normaliseLink('http://example.com')).toBe('http://example.com');
    expect(normaliseLink('HTTPS://Example.com/A?b=1#c')).toBe('HTTPS://Example.com/A?b=1#c');
  });

  it('refuses things that are not web addresses', () => {
    for (const bad of [
      '',
      '   ',
      'hello',
      'mailto:me@example.com',
      'ftp://example.com',
      'javascript:alert(1)',
      'a b.com',
      'example.com\\x',
    ]) {
      expect(normaliseLink(bad)).toBeNull();
    }
    expect(normaliseLink(`example.com/${'a'.repeat(2048)}`)).toBeNull();
  });

  it('shows links without the scheme', () => {
    expect(displayLink('https://qrx.to/abc123')).toBe('qrx.to/abc123');
    expect(displayLink('https://example.com/')).toBe('example.com');
    expect(displayLink(null)).toBe('');
  });
});

describe('allowance and time', () => {
  it('describes what is left today', () => {
    const at = (remainingToday: number | null) => ({ codes: { dailyLimit: 42, remainingToday, resetsAt: null } });
    expect(allowanceLine(at(37))).toBe('37 codes left today');
    expect(allowanceLine(at(1))).toBe('1 code left today');
    expect(allowanceLine(at(0))).toBe('No codes left today');
    expect(allowanceLine(at(null))).toBeNull();
    expect(allowanceLine(undefined)).toBeNull();
  });

  it('says when the allowance resets', () => {
    const now = Date.parse('2026-10-10T19:00:00Z');
    expect(resetsIn('2026-10-11T00:00:00Z', now)).toBe('in 5 hours');
    expect(resetsIn('2026-10-10T20:00:00Z', now)).toBe('in 1 hour');
    expect(resetsIn('2026-10-10T19:20:00Z', now)).toBe('in 20 minutes');
    expect(resetsIn('2026-10-10T19:00:30Z', now)).toBe('soon');
    expect(resetsIn(null, now)).toBeNull();
  });

  it('says how long ago a code was made', () => {
    const now = Date.parse('2026-10-10T19:00:00Z');
    expect(ago('2026-10-10T18:59:40Z', now)).toBe('Just now');
    expect(ago('2026-10-10T18:55:00Z', now)).toBe('5 min ago');
    expect(ago('2026-10-10T16:00:00Z', now)).toBe('3 h ago');
    expect(ago('2026-10-09T12:00:00Z', now)).toBe('Yesterday');
  });

  it('moves the progress bar forward but never to the end', () => {
    let last = -1;
    for (let s = 0; s <= 600; s += 5) {
      const { fraction } = progressStage(s);
      expect(fraction).toBeGreaterThanOrEqual(last);
      expect(fraction).toBeLessThanOrEqual(0.95);
      last = fraction;
    }
    expect(progressStage(5).label).toBe('Painting your picture');
    expect(progressStage(50).label).toBe('Checking it scans');
    expect(progressStage(200).label).toBe('Taking a little longer than usual');
  });

  it('schedules the reminder about when a code should be done', () => {
    const created = '2026-10-10T19:00:00Z';
    expect(reminderDelaySeconds(created, Date.parse('2026-10-10T19:00:05Z'))).toBe(70);
    expect(reminderDelaySeconds(created, Date.parse('2026-10-10T19:05:00Z'))).toBe(10);
  });
});

describe('styles and codes', () => {
  it('puts "No style" first', () => {
    const ordered = orderStyles([
      { id: 'a64c5', object: 'style', name: 'Anime', previewUrl: null },
      { id: 'Noop', object: 'style', name: 'No Style', previewUrl: null },
    ]);
    expect(ordered.map((s) => s.name)).toEqual(['No style', 'Anime']);
  });

  it('shows link codes only', () => {
    expect(isLinkCode({ type: 'url' })).toBe(true);
    expect(isLinkCode({ type: 'wifi' })).toBe(false);
  });

  it('has sample data for every screen of the mock build', () => {
    const codes = mockCodes(Date.parse('2026-10-10T19:00:00Z'));
    expect(codes.some((c) => c.status === 'processing')).toBe(true);
    expect(codes.filter((c) => c.status === 'succeeded').length).toBeGreaterThanOrEqual(8);
    for (const c of codes) expect(c.shortUrl).toMatch(/^https:\/\/qrx\.to\/[a-z0-9]{6}$/);
    expect(new Set(codes.map((c) => c.id)).size).toBe(codes.length);
    expect(mockStyles[0]!.id).toBe('Noop');
    expect(mockAccount().codes.remainingToday).toBeLessThan(mockAccount().codes.dailyLimit!);
  });
});

describe('following a code', () => {
  it('long-polls until the code finishes', async () => {
    const getCode = vi.fn().mockResolvedValueOnce(code('processing')).mockResolvedValueOnce(code('succeeded'));
    const updates: string[] = [];
    const done = await pollUntilFinished({ getCode } as unknown as QrxApi, 'abc123', {
      sleep: noSleep,
      onUpdate: (c) => updates.push(c.status),
    });
    expect(done?.status).toBe('succeeded');
    expect(updates).toEqual(['processing', 'succeeded']);
    expect(getCode).toHaveBeenCalledWith('abc123', 25, undefined);
  });

  it('waits between polls when a long poll comes back at once', async () => {
    const getCode = vi
      .fn()
      .mockResolvedValueOnce(code('processing'))
      .mockResolvedValueOnce(code('processing'))
      .mockResolvedValueOnce(code('succeeded'));
    const sleeps: number[] = [];
    await pollUntilFinished({ getCode } as unknown as QrxApi, 'abc123', {
      sleep: async (ms) => void sleeps.push(ms),
      now: () => 0,
    });
    expect(sleeps).toEqual([2000, 2000]);
  });

  it('rides out network blips', async () => {
    const getCode = vi.fn().mockRejectedValueOnce(networkError()).mockResolvedValueOnce(code('failed'));
    const done = await pollUntilFinished({ getCode } as unknown as QrxApi, 'abc123', { sleep: noSleep });
    expect(done?.status).toBe('failed');
  });

  it('stops on problems that will not go away', async () => {
    const notFound = new ApiError(404, { type: 'not-found', title: 'Not found', detail: '' });
    const getCode = vi.fn().mockRejectedValue(notFound);
    await expect(pollUntilFinished({ getCode } as unknown as QrxApi, 'abc123', { sleep: noSleep })).rejects.toBe(
      notFound,
    );
  });

  it('stops quietly when aborted', async () => {
    const abort = new AbortController();
    abort.abort();
    const getCode = vi.fn();
    expect(await pollUntilFinished({ getCode } as unknown as QrxApi, 'abc123', { signal: abort.signal })).toBeNull();
    expect(getCode).not.toHaveBeenCalled();
  });

  it('retries a create with the same Idempotency-Key', async () => {
    const createCode = vi.fn().mockRejectedValueOnce(networkError()).mockResolvedValueOnce(code('processing'));
    const made = await createWithRetry(
      { createCode } as unknown as QrxApi,
      { prompt: 'p', destination: 'https://e.com' },
      'key-1',
      noSleep,
    );
    expect(made.id).toBe('abc123');
    expect(createCode.mock.calls.map((c) => c[1])).toEqual(['key-1', 'key-1']);
  });

  it('does not retry a create the API refused', async () => {
    const limit = new ApiError(429, { type: 'daily-limit', title: '', detail: '' });
    const createCode = vi.fn().mockRejectedValue(limit);
    await expect(
      createWithRetry({ createCode } as unknown as QrxApi, { prompt: 'p', destination: 'https://e.com' }, 'k', noSleep),
    ).rejects.toBe(limit);
    expect(createCode).toHaveBeenCalledTimes(1);
  });
});
