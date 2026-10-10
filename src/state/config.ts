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

/** Pages on the website the app links to. None of them sells anything. */
export const links = {
  home: config.apiBase,
  support: 'https://qrx.codes/support',
  privacy: 'https://qrx.codes/privacy',
  terms: 'https://qrx.codes/terms',
  /** Clerk's account screen, Security tab, where "Delete account" lives. */
  deleteAccount: `${config.apiBase}/settings#/security`,
  deletionHelp: 'https://qrx.codes/support#delete-account',
  apiKeys: `${config.apiBase}/developers/keys`,
  supportEmail: 'mailto:support@qrx.codes',
};
