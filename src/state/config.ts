import Constants from 'expo-constants';
import { Platform } from 'react-native';

type Extra = {
  variant: 'production' | 'development';
  mock: boolean;
  apiBase: string;
  issuer: string;
  oauthClientId: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<Extra>;

/** Settings baked in at build time by app.config.ts. */
export const config = {
  variant: extra.variant ?? 'production',
  mock: extra.mock === true,
  apiBase: extra.apiBase ?? 'https://qrx.codes',
  issuer: extra.issuer ?? 'https://clerk.qrx.codes',
  oauthClientId: extra.oauthClientId ?? '',
  /** The OAuth redirect: the app's own scheme (its bundle id), host `oauth`. */
  redirectUri: `${Constants.expoConfig?.scheme ?? 'codes.qrx.app'}://oauth`,
  version: Constants.expoConfig?.version ?? '1.0.0',
  clientName: 'QRX for iOS and Android',
  clientTag: `qrx-${Platform.OS}/${Constants.expoConfig?.version ?? '1.0.0'}`,
} as const;

/**
 * Pages on the website the app opens. `view=app` shows them without the site's navigation and footer, which link to
 * plans: the stores don't allow an app that sells nothing to open pages that lead to buying. The help pages link to
 * billing, so help is by email.
 */
export const links = {
  privacy: 'https://qrx.codes/privacy?view=app',
  terms: 'https://qrx.codes/terms?view=app',
  /** The account page's Security tab, where "Delete account" lives. */
  deleteAccount: `${config.apiBase}/settings?view=app#/security`,
  supportEmail: 'mailto:support@qrx.codes?subject=QRX%20app',
};
