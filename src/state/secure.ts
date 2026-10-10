import { File, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';

import type { OAuthTokens, Session } from '@/lib/types';

/**
 * The session lives in the iOS Keychain / Android Keystore-backed storage. The access token (a JWT) and the refresh
 * token are kept under separate keys to stay under per-item size limits. Readable after the first unlock, so a token
 * can be refreshed while the app finishes a code in the background.
 */
const options: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };
const KEYS = { meta: 'qrx.session', access: 'qrx.access', refresh: 'qrx.refresh', apiKey: 'qrx.apikey' } as const;

type Meta = { method: 'oauth'; tokens: Omit<OAuthTokens, 'accessToken' | 'refreshToken'> } | { method: 'apiKey' };

/**
 * iOS keeps Keychain items after the app is deleted. A marker file in the app's documents folder (removed with the app)
 * tells a fresh install from a relaunch, so a reinstall never signs in with an old session.
 */
async function clearIfFreshInstall() {
  try {
    const marker = new File(Paths.document, '.installed');
    if (!marker.exists) {
      await clearSession();
      marker.create();
    }
  } catch {
    // the marker is a nicety; never block sign-in on it
  }
}

export async function loadSession(): Promise<Session | null> {
  await clearIfFreshInstall();
  const raw = await SecureStore.getItemAsync(KEYS.meta, options);
  if (!raw) return null;
  try {
    const meta = JSON.parse(raw) as Meta;
    if (meta.method === 'apiKey') {
      const apiKey = await SecureStore.getItemAsync(KEYS.apiKey, options);
      return apiKey ? { method: 'apiKey', apiKey } : null;
    }
    const accessToken = await SecureStore.getItemAsync(KEYS.access, options);
    const refreshToken = (await SecureStore.getItemAsync(KEYS.refresh, options)) ?? undefined;
    if (!accessToken) return null;
    return { method: 'oauth', tokens: { ...meta.tokens, accessToken, refreshToken } };
  } catch {
    return null;
  }
}

export async function saveSession(session: Session): Promise<void> {
  if (session.method === 'apiKey') {
    await SecureStore.setItemAsync(KEYS.apiKey, session.apiKey, options);
    await SecureStore.setItemAsync(KEYS.meta, JSON.stringify({ method: 'apiKey' } satisfies Meta), options);
    return;
  }
  const { accessToken, refreshToken, ...rest } = session.tokens;
  await SecureStore.setItemAsync(KEYS.access, accessToken, options);
  if (refreshToken) await SecureStore.setItemAsync(KEYS.refresh, refreshToken, options);
  else await SecureStore.deleteItemAsync(KEYS.refresh, options);
  await SecureStore.setItemAsync(KEYS.meta, JSON.stringify({ method: 'oauth', tokens: rest } satisfies Meta), options);
}

export async function clearSession(): Promise<void> {
  await Promise.all(Object.values(KEYS).map((key) => SecureStore.deleteItemAsync(key, options).catch(() => undefined)));
}
