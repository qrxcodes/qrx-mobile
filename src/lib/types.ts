/** Shapes from the QRX REST API (https://qrx.codes/v1/openapi.json). */

export type CodeStatus = 'queued' | 'processing' | 'succeeded' | 'failed' | (string & {});

export type Code = {
  id: string;
  object: 'code';
  status: CodeStatus;
  type: string;
  prompt: string;
  style: string | null;
  destination: string | null;
  shortUrl: string | null;
  imageUrl: string | null;
  pageUrl: string;
  error: { message: string } | null;
  createdAt: string;
};

export type List<T> = { object: 'list'; data: T[]; hasMore: boolean; nextCursor: string | null };

export type Style = { id: string; object: 'style'; name: string; previewUrl: string | null };

export type Account = {
  object: 'account';
  plan: string;
  /** The daily allowance; all null when the account has no daily limit. */
  codes: { dailyLimit: number | null; remainingToday: number | null; resetsAt: string | null };
  features: { changeDestination: boolean };
  credentials: { type: string; prefix: string | null; environment: string };
};

export type CreateCodeRequest = { prompt: string; destination: string; style?: string };

/** A failure the app can explain: a stable slug from the API (or the app's own) and words for people. */
export type ProblemInfo = { type: string; title: string; detail: string; retryAfter?: number; status?: number };

export type OAuthTokens = {
  accessToken: string;
  refreshToken?: string;
  /** Epoch ms. */
  expiresAt: number;
  clientId: string;
  resource: string;
  tokenEndpoint: string;
  revocationEndpoint?: string;
};

export type Session = { method: 'oauth'; tokens: OAuthTokens } | { method: 'apiKey'; apiKey: string };
