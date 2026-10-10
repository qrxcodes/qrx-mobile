import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { createApi, fetchAccountWith, type QrxApi } from '@/lib/api';
import {
  authorizeUrl,
  createPkcePair,
  discoverResource,
  isApiKey,
  parseRedirect,
  randomString,
  registerClient,
  serverMetadata,
  tokenRequest,
  tokensFrom,
  type CryptoDeps,
} from '@/lib/oauth';
import { ApiError, toProblem } from '@/lib/problem';
import { createSessionManager } from '@/lib/session-manager';
import type { Session } from '@/lib/types';

import { config } from './config';
import { createMockApi } from './mock-api';
import { clearSession, loadSession, saveSession } from './secure';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

type AuthContextValue = {
  status: AuthStatus;
  method: Session['method'] | null;
  api: QrxApi;
  /** Why the last sign-in failed or the session ended; words for people. */
  message: string | null;
  signingIn: boolean;
  signIn(): Promise<void>;
  signInWithApiKey(key: string): Promise<void>;
  signOut(reason?: string): Promise<void>;
  clearMessage(): void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const cryptoDeps: CryptoDeps = {
  randomBytes: (length) => Crypto.getRandomBytes(length),
  sha256Base64: (input) =>
    Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input, { encoding: Crypto.CryptoEncoding.BASE64 }),
};

/** A pre-registered client from the build, or one this install registered for itself (kept for the session). */
let registeredClientId: string | null = null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(config.mock ? 'signedIn' : 'loading');
  const [method, setMethod] = useState<Session['method'] | null>(config.mock ? 'oauth' : null);
  const [message, setMessage] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const [manager] = useState(() =>
    createSessionManager({
      store: { save: saveSession, clear: clearSession },
      onSignedOut: (reason) => {
        setStatus('signedOut');
        setMethod(null);
        setMessage(reason);
      },
    }),
  );

  const api = useMemo(
    () =>
      config.mock
        ? createMockApi()
        : createApi({ baseUrl: config.apiBase, bearer: manager.bearer, userAgent: config.clientTag }),
    [manager],
  );

  useEffect(() => {
    if (config.mock) return;
    void loadSession().then((saved) => {
      manager.restore(saved);
      setMethod(saved?.method ?? null);
      setStatus(saved ? 'signedIn' : 'signedOut');
    });
  }, [manager]);

  const signIn = useCallback(async () => {
    setMessage(null);
    setSigningIn(true);
    try {
      const [metadata, resource] = await Promise.all([
        serverMetadata(fetch, config.issuer),
        discoverResource(fetch, config.apiBase),
      ]);
      const clientId =
        config.oauthClientId ||
        (registeredClientId ??= await registerClient(fetch, metadata, config.redirectUri, config.clientName));
      const { verifier, challenge } = await createPkcePair(cryptoDeps);
      const state = randomString(cryptoDeps, 16);
      const url = authorizeUrl(metadata, { clientId, redirectUri: config.redirectUri, state, challenge, resource });

      const result = await WebBrowser.openAuthSessionAsync(url, config.redirectUri);
      if (result.type !== 'success') return; // cancelled or dismissed: not an error
      const code = parseRedirect(result.url, state);

      const response = await tokenRequest(fetch, metadata.token_endpoint, {
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.redirectUri,
        client_id: clientId,
        code_verifier: verifier,
        resource,
      });
      const tokens = tokensFrom(response, {
        clientId,
        resource,
        tokenEndpoint: metadata.token_endpoint,
        revocationEndpoint: metadata.revocation_endpoint,
      });
      // proves the token works at the API before the app treats the person as signed in
      await fetchAccountWith(config.apiBase, tokens.accessToken);
      await manager.set({ method: 'oauth', tokens });
      setMethod('oauth');
      setStatus('signedIn');
    } catch (err) {
      setMessage(toProblem(err).detail || 'Sign-in failed. Try again.');
    } finally {
      setSigningIn(false);
    }
  }, [manager]);

  const signInWithApiKey = useCallback(
    async (key: string) => {
      const apiKey = key.trim();
      if (!isApiKey(apiKey)) throw new Error('That doesn’t look like a QRX API key (it starts with qrx_).');
      try {
        await fetchAccountWith(config.apiBase, apiKey);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) throw new Error('QRX did not accept that API key.');
        throw err;
      }
      await manager.set({ method: 'apiKey', apiKey });
      setMessage(null);
      setMethod('apiKey');
      setStatus('signedIn');
    },
    [manager],
  );

  const signOut = useCallback(
    async (reason?: string) => {
      const previous = await manager.signOut();
      setStatus('signedOut');
      setMethod(null);
      setMessage(reason ?? null);
      if (previous?.method === 'oauth' && previous.tokens.revocationEndpoint && previous.tokens.refreshToken) {
        // best effort: the tokens are already gone from this device
        fetch(previous.tokens.revocationEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            token: previous.tokens.refreshToken,
            token_type_hint: 'refresh_token',
            client_id: previous.tokens.clientId,
          }).toString(),
        }).catch(() => undefined);
      }
    },
    [manager],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      method,
      api,
      message,
      signingIn,
      signIn,
      signInWithApiKey,
      signOut,
      clearMessage: () => setMessage(null),
    }),
    [status, method, api, message, signingIn, signIn, signInWithApiKey, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth outside AuthProvider');
  return value;
}

export const useApi = () => useAuth().api;
