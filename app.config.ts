import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Two builds of the same app:
 * - `production` (default): bundle/package `codes.qrx.app`, talks to https://qrx.codes.
 * - `development`: `codes.qrx.app.dev`, talks to https://dev.qrx.codes, installs next to the store app.
 *
 * `QRX_MOCK=1` builds the app against bundled sample data instead of the API (store screenshots and UI tests); it
 * never ships to a store.
 */
const variant = process.env.APP_VARIANT === 'development' ? 'development' : 'production';
const isDev = variant === 'development';
const mock = process.env.QRX_MOCK === '1';

const environments = {
  production: {
    apiBase: 'https://qrx.codes',
    issuer: 'https://clerk.qrx.codes',
    // the prod Clerk OAuth app "QRX for iOS and Android" (public, PKCE); empty means the app registers itself
    oauthClientId: process.env.QRX_OAUTH_CLIENT_ID_PROD ?? '',
  },
  development: {
    apiBase: 'https://dev.qrx.codes',
    issuer: 'https://summary-bobcat-19.clerk.accounts.dev',
    oauthClientId: process.env.QRX_OAUTH_CLIENT_ID_DEV ?? 'FIrdErGl4gyWwipu',
  },
} as const;

const bundleId = isDev ? 'codes.qrx.app.dev' : 'codes.qrx.app';
const buildNumber = process.env.BUILD_NUMBER ?? '1';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: isDev ? 'QRX Dev' : 'QRX',
  slug: 'qrx',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  // the OAuth redirect is <scheme>://oauth; a reverse-DNS scheme no other app claims
  scheme: bundleId,
  userInterfaceStyle: 'automatic',
  backgroundColor: '#f6f5f2',
  ios: {
    bundleIdentifier: bundleId,
    buildNumber,
    supportsTablet: true,
    icon: {
      light: './assets/images/icon.png',
      dark: './assets/images/icon-dark.png',
      tinted: './assets/images/icon-tinted.png',
    },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyTrackingDomains: [],
      NSPrivacyCollectedDataTypes: [],
      NSPrivacyAccessedAPITypes: [
        // file timestamps (expo-file-system) and UserDefaults (React Native), for the app's own files and settings
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
          NSPrivacyAccessedAPITypeReasons: ['C617.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
          NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
          NSPrivacyAccessedAPITypeReasons: ['35F9.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
          NSPrivacyAccessedAPITypeReasons: ['E174.1'],
        },
      ],
    },
  },
  android: {
    package: bundleId,
    versionCode: Number(buildNumber),
    adaptiveIcon: {
      backgroundColor: '#f6f5f2',
      foregroundImage: './assets/images/android-icon-foreground.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    // the app only adds its own images to the gallery, which needs no read access on Android 10+
    blockedPermissions: [
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_AUDIO',
      'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
      'android.permission.ACCESS_MEDIA_LOCATION',
      'android.permission.RECORD_AUDIO',
    ],
    predictiveBackGestureEnabled: true,
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-mark.png',
        imageWidth: 96,
        backgroundColor: '#f6f5f2',
        dark: { image: './assets/images/splash-mark-dark.png', backgroundColor: '#0d0e10' },
      },
    ],
    'expo-secure-store',
    [
      'expo-media-library',
      {
        photosPermission: false,
        savePhotosPermission: 'QRX saves the codes you make to your photo library when you tap Save.',
        isAccessMediaLocationEnabled: false,
        granularPermissions: [],
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/images/notification-icon.png',
        color: '#2453d6',
      },
    ],
    'expo-sharing',
    'expo-web-browser',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    variant,
    mock,
    ...environments[variant],
  },
});
