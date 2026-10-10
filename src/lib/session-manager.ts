import type { BearerSource } from './api';
import { needsRefresh, tokenRequest, tokensFrom } from './oauth';
import type { Session } from './types';

export type SessionStore = {
  save(session: Session): Promise<void>;
  clear(): Promise<void>;
};

/**
 * Holds the signed-in session and hands out bearers: the API key as is, or the OAuth access token, refreshed shortly
 * before it expires (refresh tokens rotate, so only one refresh runs at a time). When the session can't be renewed it
 * signs out and says why.
 */
export function createSessionManager({
  store,
  fetch: fetchImpl = fetch,
  onSignedOut,
  now = Date.now,
}: {
  store: SessionStore;
  fetch?: typeof fetch;
  onSignedOut: (reason: string) => void;
  now?: () => number;
}) {
  let session: Session | null = null;
  let refreshing: Promise<string | null> | null = null;

  async function set(next: Session | null) {
    session = next;
    if (next) await store.save(next);
    else await store.clear();
  }

  async function end(reason: string) {
    await set(null);
    onSignedOut(reason);
  }

  function refresh(): Promise<string | null> {
    refreshing ??= (async () => {
      const current = session;
      if (current?.method !== 'oauth' || !current.tokens.refreshToken) return null;
      const { tokens } = current;
      try {
        const response = await tokenRequest(fetchImpl, tokens.tokenEndpoint, {
          grant_type: 'refresh_token',
          refresh_token: tokens.refreshToken!,
          client_id: tokens.clientId,
          resource: tokens.resource,
        });
        const next = tokensFrom(response, tokens, tokens.refreshToken, now());
        // a sign-out while the refresh was in flight wins
        if (session !== current) return null;
        await set({ method: 'oauth', tokens: next });
        return next.accessToken;
      } catch (err) {
        // offline: keep the session and let the caller retry later
        if (err instanceof TypeError) throw err;
        return null;
      }
    })().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  const bearer: BearerSource = {
    async get() {
      const current = session;
      if (!current) return null;
      if (current.method === 'apiKey') return current.apiKey;
      if (!needsRefresh(current.tokens, now())) return current.tokens.accessToken;
      const token = await refresh();
      if (!token && session === current) await end('Your QRX session ended. Sign in again.');
      return token;
    },
    async renew() {
      const current = session;
      if (!current) return null;
      const token = current.method === 'oauth' ? await refresh() : null;
      if (!token && session === current) {
        await end(
          current.method === 'apiKey'
            ? 'QRX no longer accepts the saved API key.'
            : 'Your QRX session ended. Sign in again.',
        );
      }
      return token;
    },
  };

  return {
    bearer,
    get session() {
      return session;
    },
    /** Restores a saved session at launch without writing it back. */
    restore(saved: Session | null) {
      session = saved;
    },
    set,
    async signOut() {
      const current = session;
      await set(null);
      return current;
    },
  };
}

export type SessionManager = ReturnType<typeof createSessionManager>;
