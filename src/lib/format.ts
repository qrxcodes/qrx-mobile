import type { Account, Code, Style } from './types';

/**
 * Turns what someone typed into the link a code points at: trims it and adds `https://` when the scheme is missing.
 * Returns null when it can't be a web address (the API accepts only absolute http and https URLs).
 */
export function normaliseLink(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || /\s/.test(trimmed) || trimmed.includes('\\')) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  // a host needs a dot (example.com) unless it is an IP literal; "hello" alone is almost always a typo
  if (!url.hostname.includes('.') && !url.hostname.startsWith('[')) return null;
  if (withScheme.length > 2048) return null;
  return withScheme;
}

/** `https://qrx.to/abc123` → `qrx.to/abc123`, for display. */
export const displayLink = (url: string | null | undefined) =>
  url ? url.replace(/^https?:\/\//i, '').replace(/\/$/, '') : '';

export const isFinished = (code: Pick<Code, 'status'>) => code.status === 'succeeded' || code.status === 'failed';

export const MAX_PROMPT_LENGTH = 1000;

/** "37 codes left today", "1 code left today", "No codes left today", or null when there is no daily limit. */
export function allowanceLine(account: Pick<Account, 'codes'> | undefined): string | null {
  const remaining = account?.codes.remainingToday;
  if (remaining === null || remaining === undefined) return null;
  if (remaining <= 0) return 'No codes left today';
  return `${remaining} ${remaining === 1 ? 'code' : 'codes'} left today`;
}

/** "in 5 hours", "in 1 hour", "in 20 minutes", "soon". */
export function resetsIn(resetsAt: string | null | undefined, now = Date.now()): string | null {
  if (!resetsAt) return null;
  const ms = Date.parse(resetsAt) - now;
  if (Number.isNaN(ms)) return null;
  if (ms <= 60_000) return 'soon';
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  const hours = Math.round(minutes / 60);
  return `in ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
}

/** "Just now", "5 min ago", "3 h ago", "Yesterday", or a short date. */
export function ago(iso: string, now = Date.now()): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return '';
  const minutes = Math.floor((now - then) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  if (hours < 48) return 'Yesterday';
  return new Date(then).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export const styleName = (styles: Style[] | undefined, id: string | null) =>
  id ? (styles?.find((s) => s.id === id)?.name ?? null) : null;

/** The app shows link codes only. */
export const isLinkCode = (code: Pick<Code, 'type'>) => code.type === 'url';

/**
 * What the progress screen says while a code is being made, by seconds elapsed. A code takes about a minute: the
 * picture is painted, the code is built into it, then the result is decoded to check it scans.
 */
export function progressStage(elapsedSeconds: number): { label: string; fraction: number } {
  const expected = 60;
  // eases towards 95% so a slow code never looks finished
  const fraction = Math.min(0.95, 1 - Math.exp((-2.2 * Math.max(0, elapsedSeconds)) / expected));
  const label =
    elapsedSeconds < 20
      ? 'Painting your picture'
      : elapsedSeconds < 45
        ? 'Building the code into it'
        : elapsedSeconds < 90
          ? 'Checking it scans'
          : 'Taking a little longer than usual';
  return { label, fraction };
}

/** "No style" first (the API lists it last, as "No Style"), the rest as the API orders them. */
export function orderStyles(styles: Style[]): Style[] {
  const none = styles.filter((s) => s.id === 'Noop').map((s) => ({ ...s, name: 'No style' }));
  return [...none, ...styles.filter((s) => s.id !== 'Noop')];
}

/** When to send the "should be ready" reminder: about 75 s after the code started, never sooner than 10 s from now. */
export function reminderDelaySeconds(createdAt: string, now = Date.now()): number {
  const due = Date.parse(createdAt) + 75_000;
  return Math.max(10, Math.round((due - now) / 1000));
}
