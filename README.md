# QRX for iPhone, iPad and Android

Make art QR codes that scan, from your phone. Describe a picture, add your link, pick a style, and QRX paints the
picture, builds your code into it and checks that it scans before you get it. Every code gets a hosted `qrx.to` link.

The app is a thin client of the public [QRX REST API](https://qrx.codes/developers) (`/v1`), signed in with your QRX
account (OAuth 2.1 with PKCE). It sells nothing: plans are managed on [qrx.codes](https://qrx.codes).

|               |                                                                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Stack         | Expo SDK 57 (React Native 0.86, New Architecture), Expo Router with native tabs, TypeScript                                      |
| Sign-in       | OAuth 2.1 + PKCE against QRX's Clerk instance as a public client; token for the `/v1` resource (RFC 8707); API key as a fallback |
| Storage       | iOS Keychain / Android Keystore via `expo-secure-store`; nothing else is stored                                                  |
| Notifications | Local only (no push token leaves the device)                                                                                     |
| Builds        | GitHub Actions, no EAS: `expo prebuild` + Gradle / `xcodebuild`                                                                  |

## Screens

Sign in · Create (prompt, link, style grid) · Progress (about a minute, with a notification when it's ready) · Result
(image, `qrx.to` link, share, save to Photos, copy link) · My codes · Code detail (change link, on a paid plan; report
an image) · Account (today's allowance, notifications, help, privacy, terms, sign out, delete account).

## Develop

Needs Node 22 and a development build (Expo Go can't load the native modules).

```sh
npm ci
npm run typecheck && npm run lint && npm test
APP_VARIANT=development npx expo run:android   # or run:ios on a Mac; talks to dev.qrx.codes
QRX_MOCK=1 npx expo run:ios                     # bundled sample data, no account needed
```

| Variable                   | Effect                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------- |
| `APP_VARIANT=development`  | Bundle id `codes.qrx.app.dev`, name "QRX Dev", API `https://dev.qrx.codes`, dev Clerk                   |
| (unset)                    | Bundle id `codes.qrx.app`, API `https://qrx.codes`, Clerk `https://clerk.qrx.codes`                     |
| `QRX_OAUTH_CLIENT_ID_PROD` | The prod Clerk OAuth app's client id. Empty: the app registers itself (dynamic client registration)     |
| `QRX_MOCK=1`               | Signed in as a sample account with sample codes; used for store screenshots and UI tests. Never shipped |
| `BUILD_NUMBER`             | iOS build number / Android version code (CI sets the run number)                                        |

Deep links (`codes.qrx.app://…`): `code/<id>`, `codes`, `account`, and `?prompt=&destination=&style=` to prefill
Create.

## CI

| Workflow      | What                                                                                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml`      | Type-check, lint, unit tests, Prettier, `expo install --check`, `expo-doctor`, `expo export` for both platforms and builds, `expo prebuild`          |
| `android.yml` | Development APK (artifact `qrx-dev-apk`); on main or on demand, store screenshots in an emulator plus Maestro flows                                  |
| `ios.yml`     | Simulator builds (artifact); on main or on demand, iPhone 6.9" and iPad 13" screenshots plus Maestro flows                                           |
| `release.yml` | Manual: production builds signed for the stores, uploaded to TestFlight and Play internal testing once the signing secrets exist (`store/README.md`) |

## Store

Everything for App Store Connect and Google Play is in [`store/`](store/README.md): listing copy, screenshots, review
notes, privacy answers, age ratings and the owner's steps. Why the app has no in-app purchase is explained in
[`docs/purchases.md`](docs/purchases.md).

## Licence

MIT
