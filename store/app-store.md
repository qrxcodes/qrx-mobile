# App Store Connect: every field

The text fields are files in `metadata/ios/` (fastlane `deliver` layout), so they can be pasted by hand or synced with
`fastlane deliver --metadata_path store/metadata/ios --skip_binary_upload --skip_screenshots` (optional; not needed).
Copy rules (checked by `test/store.test.ts`): no prices or plan names, no upgrade wording, link codes only, no
comparisons with assistants. The App Store copy doesn't mention changing a code's link, so a reviewer has nothing to
read as a call to action under guideline 3.1.3(f); the Google Play copy does, with "on a paid plan".

## New app (Apps → +)

| Field            | Value                                                                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Platforms        | iOS                                                                                                                                 |
| Name             | `QRX: Art QR Codes` (`metadata/ios/en-US/name.txt`, 17 of 30). Fallback if taken: `QRX – QR Codes as Art`                           |
| Primary language | English (U.S.)                                                                                                                      |
| Bundle ID        | `codes.qrx.app` (register it first: Certificates, Identifiers & Profiles → Identifiers → App IDs → explicit, no extra capabilities) |
| SKU              | `qrx-ios`                                                                                                                           |
| User access      | Full access                                                                                                                         |

## App Information

| Field              | Value                                                                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Subtitle           | `QR codes that are also art` (`subtitle.txt`, 26 of 30)                                                                                                                               |
| Category           | Primary **Graphics & Design**, secondary **Productivity**                                                                                                                             |
| Content rights     | "Does your app contain, show, or access third-party content?" **No.** The pictures are made by QRX's own model for the person who asks; the style previews and samples are QRX's own. |
| Age rating         | See `age-rating.md` (expected **13+**)                                                                                                                                                |
| Privacy policy URL | `https://qrx.codes/privacy`                                                                                                                                                           |
| License agreement  | Apple's standard EULA                                                                                                                                                                 |

## Pricing and Availability

| Field                    | Value                            |
| ------------------------ | -------------------------------- |
| Price                    | Free (USD 0)                     |
| Availability             | All countries and regions        |
| In-app purchases         | None. Don't create any products. |
| App distribution methods | Public                           |

## App Privacy

Answers in `privacy.md` (section "App Store"). Privacy policy URL as above; no user privacy choices URL needed.

## Version 1.0 page

| Field                    | Value                                                                                                                                                                         |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Screenshots, iPhone 6.9" | `screenshots/ios-6.9/` (1320×2868, JPEG): 1 sign-in, 2 create, 3 progress, 4 result, 5 my codes, 6 account (light). Dark versions in `dark/` if you want to mix in one or two |
| Screenshots, iPad 13"    | `screenshots/ipad-13/` (2064×2752, JPEG; dark versions in `dark/`)                                                                                                            |
| Promotional text         | `promotional_text.txt` (143 of 170)                                                                                                                                           |
| Description              | `description.txt` (1,358 of 4,000)                                                                                                                                            |
| Keywords                 | `keywords.txt` (95 of 100)                                                                                                                                                    |
| Support URL              | `https://qrx.codes/support`                                                                                                                                                   |
| Marketing URL            | `https://qrx.codes`                                                                                                                                                           |
| Version                  | 1.0.0                                                                                                                                                                         |
| Copyright                | `2026 MakerX`                                                                                                                                                                 |
| Build                    | The TestFlight build from the Release workflow (about 15 minutes after upload)                                                                                                |
| Routing app coverage     | None                                                                                                                                                                          |
| Game Center              | Off                                                                                                                                                                           |
| What's New               | (first version: not shown) `release_notes.txt` for later versions                                                                                                             |

## App Review Information

| Field                | Value                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Sign-in required     | Yes                                                                                                                            |
| User name / password | The reviewer account on qrx.codes (owner creates it; see `README.md` step 4). Not stored in this repo                          |
| Contact              | First/last name, email (`support@qrx.codes`) and phone, from `metadata/ios/review_information/` (phone: fill in)               |
| Notes                | `metadata/ios/review_information/notes.txt`, then add a last line: `API key (backup sign-in): qrx_…` with the reviewer API key |
| Attachment           | None needed                                                                                                                    |

## Version release

Manually release this version (so the owner chooses the launch moment).

## Export compliance

Answered in the build (`ITSAppUsesNonExemptEncryption = false`): the app uses only the system's HTTPS.
