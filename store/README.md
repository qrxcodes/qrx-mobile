# Store pack

Everything needed to publish QRX on the App Store (iPhone and iPad) and Google Play, under MakerX's existing developer
accounts. Nothing here needs an Expo, EAS, RevenueCat or Firebase account: builds run in this repo's GitHub Actions.

| File                                                                         | What                                                                                                       |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [`app-store.md`](app-store.md)                                               | Every App Store Connect field, in the order the console asks                                               |
| [`google-play.md`](google-play.md)                                           | Every Play Console field, including App content                                                            |
| [`privacy.md`](privacy.md)                                                   | App Privacy (nutrition label) and Data safety answers                                                      |
| [`age-rating.md`](age-rating.md)                                             | Apple age rating and IARC answers                                                                          |
| [`review-notes.md`](review-notes.md)                                         | The reviewer account, review notes, answers to likely review questions                                     |
| `metadata/ios/`, `metadata/android/`                                         | Listing text as files (fastlane `deliver` / `supply` layout)                                               |
| `screenshots/ios-6.9/`, `screenshots/ipad-13/`, `screenshots/android-phone/` | Store screenshots from the real app (mock build) in the iOS Simulator and Android emulator, captured by CI |
| `assets/play-icon-512.png`, `assets/feature-graphic-1024x500.png`            | Play icon and feature graphic (`npm run store:assets`)                                                     |

There are **no in-app purchases or subscription products** to set up: the app sells nothing (see
[`docs/purchases.md`](../docs/purchases.md)).

## Accounts and tools the owner needs

| What                                                  | Where                                                       | Notes                                                                             |
| ----------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Apple Developer Program membership                    | MakerX's existing account                                   | Account Holder or Admin to create the app                                         |
| App Store Connect API key, **App Manager** role       | App Store Connect → Users and Access → Integrations         | For CI uploads to TestFlight. Download the `.p8` once                             |
| App Store Connect API key, **Admin** role (temporary) | Same place                                                  | Only to run `tools/apple-signing/create-certs.mjs`; revoke afterwards if you like |
| Apple Services ID + Sign in with Apple key            | Certificates, Identifiers & Profiles                        | For Sign in with Apple in Clerk (step 2)                                          |
| Google Play Console                                   | MakerX's existing organisation account                      | Admin to create the app                                                           |
| Upload keystore                                       | Made locally with `keytool` (step 12)                       | Keep a backup: losing it means asking Google for an upload key reset              |
| Google Cloud service account                          | Google Cloud console + Play Console → Users and permissions | Optional: lets CI upload to Internal testing                                      |
| Clerk prod dashboard                                  | clerk.qrx.codes instance                                    | Apple connection and the OAuth app                                                |
| GitHub admin on `qrxcodes/qrx-mobile`                 |                                                             | To set the secrets and variable below                                             |

**Not needed:** Expo / EAS account (builds don't use EAS), RevenueCat, Firebase (no push service), a Paid Apps
Agreement or merchant account (nothing is sold).

## Secrets and variables (qrxcodes/qrx-mobile → Settings → Secrets and variables → Actions)

| Name                                                                                          | Kind              | Value                                                                |
| --------------------------------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------- |
| `QRX_OAUTH_CLIENT_ID_PROD`                                                                    | **Variable**      | Client id of the prod Clerk OAuth app (step 3). Public, not a secret |
| `APP_STORE_CONNECT_KEY_ID`                                                                    | Secret            | The App Manager key's Key ID                                         |
| `APP_STORE_CONNECT_ISSUER_ID`                                                                 | Secret            | Issuer ID shown above the keys list                                  |
| `APP_STORE_CONNECT_PRIVATE_KEY`                                                               | Secret            | The whole `.p8` file's text                                          |
| `APPLE_TEAM_ID`                                                                               | Secret            | MakerX's Team ID (Membership details)                                |
| `APPLE_DEV_CERT_P12`, `APPLE_DIST_CERT_P12`, `APPLE_CERTS_PASSWORD`                           | Secrets           | Set by `tools/apple-signing/create-certs.mjs`                        |
| `ANDROID_UPLOAD_KEYSTORE_BASE64`                                                              | Secret            | `base64 -w0 qrx-upload.jks`                                          |
| `ANDROID_UPLOAD_KEYSTORE_PASSWORD`, `ANDROID_UPLOAD_KEY_ALIAS`, `ANDROID_UPLOAD_KEY_PASSWORD` | Secrets           | From step 12                                                         |
| `PLAY_SERVICE_ACCOUNT_JSON`                                                                   | Secret (optional) | The service account's JSON key                                       |

`gh secret set NAME --repo qrxcodes/qrx-mobile < file` works for each.

## Owner steps, in order

### Both stores, first

1. **Deploy main to prod** in MakerXStudio/qrxcodes, so prod has the per-resource OAuth audiences (#513), the
   `POST /v1/codes/{id}/report` endpoint and the support and privacy page sections. Check:
   - `https://qrx.codes/.well-known/oauth-protected-resource/v1` answers with `"resource": "https://qrx.codes/v1"`;
   - `https://qrx.codes/support#delete-account` shows the deletion answer;
   - `https://qrx.codes/privacy` has the mobile app section.
2. **Sign in with Apple in Clerk** (guideline 4.8: the sign-in page offers Google, so it must offer Apple too):
   1. Apple Developer → Identifiers → **+** → App IDs → App: description "QRX", explicit bundle ID `codes.qrx.app`,
      capability **Sign in with Apple** ticked ("Enable as a primary App ID"). Apple needs this primary App ID behind
      the web sign-in.
   2. Identifiers → **+** → Services IDs: description "QRX sign-in", identifier `codes.qrx.signin`. Enable Sign in
      with Apple and group it with the primary App ID `codes.qrx.app`; domains and return URL: Clerk's domain
      (`clerk.qrx.codes`) and the exact Return URL Clerk shows when you open its Apple connection (step 5).
   3. Keys → **+** → "QRX Sign in with Apple", enable Sign in with Apple, configure with the same App ID. Download the
      key (`.p8`) and note its Key ID. Then Services → Sign in with Apple for Email Communication: register the email
      source Clerk lists for Apple Private Relay and verify it, so mail to Hide My Email addresses arrives.
   4. **First** give the prod API the same values, so deleting an account revokes its Apple sign-in, as Apple asks.
      MakerXStudio/qrxcodes → Settings → Environments → **Prod**: variables `APPLE_SIGNIN_TEAM_ID`,
      `APPLE_SIGNIN_KEY_ID` and `APPLE_SIGNIN_SERVICES_ID`, and secret `APPLE_SIGNIN_PRIVATE_KEY` (the `.p8` text).
      Redeploy prod (it must include #522, the account deletion change).
   5. **Then** Clerk prod dashboard → Configure → SSO connections → **Add → Apple**: Services ID, Team ID, Key ID and
      the key. Save. For the dev instance, do step 4 for the **Dev** environment first.
   6. Open `https://qrx.codes/sign-in` and check "Continue with Apple" appears.
3. **Clerk OAuth app for the app** (prod dashboard → Configure → OAuth applications → **Add**):
   - Name **QRX for iOS and Android**; public client (no secret); PKCE required; consent screen on.
   - Scopes `qrx:read qrx:generate offline_access`.
   - Redirect URI `codes.qrx.app://oauth` (exactly; Clerk refuses the single-slash `codes.qrx.app:/oauth`).
   - Copy the client id into the repo variable `QRX_OAUTH_CLIENT_ID_PROD`.
     (The dev instance already has one: client `FIrdErGl4gyWwipu`, redirects `codes.qrx.app.dev://oauth` and
     `codes.qrx.app://oauth`.)
4. **Reviewer account** with full access (`isPaid` set in Clerk): `review-notes.md`, "Reviewer account".
5. **Slack copies of generations**: each generation is posted to an internal Slack channel with the prompt and image, and account deletion doesn't remove those posts. Set a short message retention on those channels (Slack → channel settings → message retention, e.g. 30 days) and add it to the privacy policy's retention section, or ask for the posts to drop the username and prompt.

### App Store

6. **Agreements**: App Store Connect → Business: the Free Apps agreement is enough. No Paid Apps Agreement.
7. **App ID**: `codes.qrx.app` was registered in step 2.1 with Sign in with Apple; no other capabilities are needed
   (notifications are local). Optionally also `codes.qrx.app.dev` for TestFlight builds of the dev variant.
8. **API keys and certificates**:
   1. Users and Access → Integrations → App Store Connect API → **+**: "QRX CI", role App Manager. Set the three
      `APP_STORE_CONNECT_*` secrets and `APPLE_TEAM_ID`.
   2. Make the signing certificates (once a year): create a temporary Admin key, then from this repo:
      `ASC_KEY_ID=… ASC_ISSUER_ID=… ASC_P8_PATH=… node tools/apple-signing/create-certs.mjs create`. It sets
      `APPLE_DEV_CERT_P12`, `APPLE_DIST_CERT_P12` and `APPLE_CERTS_PASSWORD`. Revoke the Admin key afterwards if you
      like.
9. **New app** in App Store Connect: `app-store.md`, "New app".
10. **First build**: Actions → **Release** → Run workflow → platform `ios`. It archives with cloud signing and uploads
    to TestFlight. Processing takes about 15 minutes. Install it through TestFlight on a phone: sign in, make a code,
    save it to Photos, share it, and delete nothing.
11. **Fill the app record** from `app-store.md`: App Information, Pricing and Availability (Free, no in-app
    purchases), App Privacy (`privacy.md`), Age Rating (`age-rating.md`), the 1.0 version page (screenshots, text,
    URLs, build), App Review Information (`review-notes.md`). Then **Add for Review → Submit**.

### Google Play

Before submitting: Play's AI-generated content policy requires preventing restricted content, and today QRX only filters prompts against a word list. Stronger prompt and image moderation must be live first (main repo, `docs/distribution/builds/mobile-apps.md`, section 6).

12. **Upload key** (once, keep backups):
    `keytool -genkeypair -v -keystore qrx-upload.jks -alias qrx-upload -keyalg RSA -keysize 4096 -validity 10000`.
    Set `ANDROID_UPLOAD_KEYSTORE_BASE64` (`base64 -w0 qrx-upload.jks`), `ANDROID_UPLOAD_KEYSTORE_PASSWORD`,
    `ANDROID_UPLOAD_KEY_ALIAS` (`qrx-upload`) and `ANDROID_UPLOAD_KEY_PASSWORD`.
13. **Create the app**: `google-play.md`, "Create app".
14. **First build**: Actions → **Release** → platform `android`. Download the `qrx-android-aab` artifact and upload it
    in Testing → Internal testing → Create new release (accept Play App Signing). Add yourself as a tester and check
    the app as in step 10.
15. **Optional CI uploads**: Google Cloud → a project → IAM → Service accounts → create "qrx-play-ci", add a JSON key.
    Play Console → Users and permissions → Invite the service account's email with _Release apps to testing tracks_
    and _Release to production_ for QRX. Set `PLAY_SERVICE_ACCOUNT_JSON`. (New permissions can take up to a day to
    work.)
16. **App content** (Policy and programs → App content), from `google-play.md`, `privacy.md` and `age-rating.md`:
    privacy policy, ads, app access, content rating, target audience, data safety (with the deletion URL), advertising
    ID, government, financial, health.
17. **Store listing and settings** from `google-play.md`: text, icon, feature graphic, phone screenshots, category Art
    & Design, contact details.
18. **Production**: first check that the stronger prompt and image moderation is live on prod (an unsafe prompt is refused). Then Production → Create new release → add the tested build from the library → release notes →
    **Send for review**. (If the dashboard asks for a closed test with 12 testers first, it treats the account as
    personal; run that test, then come back.)

## After launch

- Every update: bump `version` in `app.config.ts` for user-visible releases (CI sets the build number), run
  **Release**, attach the build in App Store Connect / promote in Play.
- Re-capture screenshots: Actions → iOS / Android → Run workflow (screenshots on), then copy the artifacts into
  `screenshots/`.
- Apple distribution certificates expire after a year: re-run `create-certs.mjs` (revoke the old ones first with
  `list` and `revoke`).
