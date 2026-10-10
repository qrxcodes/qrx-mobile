# Google Play Console: every field

Text fields are files in `metadata/android/en-US/` (fastlane `supply` layout). Same copy rules as the App Store (checked
by `test/store.test.ts`); changing a code's link is mentioned once, with "on a paid plan".

## Create app

| Field            | Value                                                    |
| ---------------- | -------------------------------------------------------- |
| App name         | `QRX: Art QR Codes` (`title.txt`, 17 of 30)              |
| Default language | English (United States) – en-US                          |
| App or game      | App                                                      |
| Free or paid     | Free                                                     |
| Declarations     | Accept the Developer Program Policies and US export laws |

The package name `codes.qrx.app` is fixed by the first AAB uploaded.

## Main store listing (Grow users → Store presence → Main store listing)

| Field              | Value                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| App name           | `QRX: Art QR Codes`                                                                                                                        |
| Short description  | `short_description.txt` (66 of 80)                                                                                                         |
| Full description   | `full_description.txt` (1,441 of 4,000)                                                                                                    |
| App icon           | `assets/play-icon-512.png` (512×512)                                                                                                       |
| Feature graphic    | `assets/feature-graphic-1024x500.png`                                                                                                      |
| Phone screenshots  | `screenshots/android-phone/` (1080×2400, JPEG; dark versions in `dark/`): 1 sign-in, 2 create, 3 progress, 4 result, 5 my codes, 6 account |
| Tablet screenshots | Optional; leave empty                                                                                                                      |
| Video              | None                                                                                                                                       |

## Store settings

| Field              | Value                        |
| ------------------ | ---------------------------- |
| App category       | **Art & Design**             |
| Tags               | QR code, Graphic design, Art |
| Email              | `support@qrx.codes`          |
| Website            | `https://qrx.codes`          |
| Phone              | Optional                     |
| External marketing | On                           |

## App content (Policy and programs → App content)

| Section                     | Answer                                                                                                                                                                                                                                                                                                                                  |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Privacy policy              | `https://qrx.codes/privacy`                                                                                                                                                                                                                                                                                                             |
| Ads                         | No, my app does not contain ads                                                                                                                                                                                                                                                                                                         |
| App access                  | All or some functionality is restricted → add instructions: name "QRX reviewer account", username and password of the reviewer account, and in "Any other information": "Tap Sign in with QRX and use these credentials. Backup: tap 'Use an API key' on the first screen and paste: qrx_…" (reviewer API key). Not stored in this repo |
| Content rating              | IARC questionnaire: `age-rating.md` (section "Google Play")                                                                                                                                                                                                                                                                             |
| Target audience             | **18 and over** only: the app is made for adults (businesses and creators). Selecting younger groups would declare it designed for them, with child-data obligations. The app doesn’t appeal to children (answer No to "could unintentionally appeal to children")                                                                      |
| News app                    | No                                                                                                                                                                                                                                                                                                                                      |
| Data safety                 | `privacy.md` (section "Google Play")                                                                                                                                                                                                                                                                                                    |
| Advertising ID              | No, my app does not use an advertising ID                                                                                                                                                                                                                                                                                               |
| Government app              | No                                                                                                                                                                                                                                                                                                                                      |
| Financial features          | My app doesn't provide any financial features                                                                                                                                                                                                                                                                                           |
| Health                      | My app does not have any health features                                                                                                                                                                                                                                                                                                |
| Account deletion            | Covered in Data safety: web link `https://qrx.codes/support#delete-account`; in the app: Account → Delete account                                                                                                                                                                                                                       |
| Photo and video permissions | Not applicable: the app declares no `READ_MEDIA_*` permission (it only adds its own images)                                                                                                                                                                                                                                             |
| Generative AI               | If asked: yes, the app makes images from text prompts; prompts are filtered; users report images in the app ("Report a problem with this image"), and reports reach the QRX team                                                                                                                                                        |

## Monetisation

No in-app products, no subscriptions. Don't create a merchant account for this app. No billing programmes
(external offers, user choice billing) are needed: the app sells nothing.

## Releases

1. **Testing → Internal testing → Create new release.** Upload the first AAB by hand from the Release workflow's
   `qrx-android-aab` artifact (Play's API can't make an app's first release). Play App Signing: accept Google-managed
   signing; the key you upload with is the _upload_ key.
2. Add testers (an email list), roll out, install from the opt-in link and check sign-in, create, save and share.
3. Later builds: the Release workflow uploads to Internal testing as a draft if `PLAY_SERVICE_ACCOUNT_JSON` is set.
4. **Production → Create new release → Add from library** (the tested build), release notes from
   `metadata/ios/en-US/release_notes.txt`, countries: all, then **Send for review**.

Organisation accounts don't need the 12-tester, 14-day closed test; if the dashboard shows "Apply for production
access", run that test first.
