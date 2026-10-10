# Privacy answers

What the app actually does, which both forms below follow:

| Data                                                                                                                 | How it is used                                                                                                                                                                        | Leaves the device?                             |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| QRX account (email address, user id; name, username and profile photo when the person signs in with Google or Apple) | Sign-in happens on QRX's sign-in page (Clerk) in the system browser; the app keeps the access and refresh tokens in the Keychain / Keystore and sends the token with each API request | Yes, to QRX (the token identifies the account) |
| Picture prompt, link, style, optional report reason                                                                  | Sent to the QRX API to make a code, change its link, or report an image                                                                                                               | Yes, to QRX                                    |
| Generated images                                                                                                     | Downloaded from QRX to show, share or save. Saved to the photo library only when the person taps Save (add-only access)                                                               | No (they come from QRX)                        |
| Notifications                                                                                                        | Scheduled on the device. No push token                                                                                                                                                | No                                             |
| Analytics, crash reports, advertising ids, location, contacts                                                        | None. The app has no analytics, crash or ads SDK                                                                                                                                      | —                                              |

QRX's own servers keep request logs for security and abuse prevention, as the privacy policy describes.

## App Store (App Privacy)

**Data collection: Yes.** For each type: **Linked to the user: Yes. Used for tracking: No.**

| Category → type                                                                                                                                                                                         | Collected | Purposes          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ----------------- |
| Contact Info → Email Address                                                                                                                                                                            | Yes       | App Functionality |
| Contact Info → Name (from Google or Apple sign-in, and the username)                                                                                                                                    | Yes       | App Functionality |
| User Content → Photos or Videos (the profile photo from Google sign-in, if any)                                                                                                                         | Yes       | App Functionality |
| Identifiers → User ID                                                                                                                                                                                   | Yes       | App Functionality |
| User Content → Other User Content (prompts, links, report reasons)                                                                                                                                      | Yes       | App Functionality |
| Everything else (Health, Financial, Location, Sensitive Info, Contacts, Audio, Gameplay, Customer Support, Browsing History, Search History, Purchases, Usage Data, Diagnostics, Device ID, Other Data) | No        | —                 |

**Tracking: No.** The app does not track people across apps or websites.

## Google Play (Data safety)

**Data collection and security**

| Question                                                                                  | Answer                                                                                                                                           |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Does your app collect or share any of the required user data types?                       | Yes                                                                                                                                              |
| Is all of the user data collected by your app encrypted in transit?                       | Yes                                                                                                                                              |
| Which of the following methods of account creation does your app support?                 | Username and password; OAuth (Sign in with Google, Sign in with Apple); Other: email sign-in link. (Accounts are created on QRX's sign-in page.) |
| Do you provide a way for users to request that their data is deleted?                     | Yes                                                                                                                                              |
| Delete account URL                                                                        | `https://qrx.codes/support#delete-account`                                                                                                       |
| Can users request that some or all of their data be deleted without deleting the account? | Yes (codes can be deleted on request through support)                                                                                            |

**Data types** (all: Collected **Yes**, Shared **No**, Processed ephemerally **No**; **Required** unless marked optional)

| Category → type                                                                       | Purposes                              |
| ------------------------------------------------------------------------------------- | ------------------------------------- |
| Personal info → Email address                                                         | App functionality, Account management |
| Personal info → User IDs                                                              | App functionality, Account management |
| Personal info → Name (**Optional**: only with Google or Apple sign-in, or a username) | App functionality, Account management |
| Photos and videos → Photos (**Optional**: the profile photo from Google sign-in)      | App functionality, Account management |
| App activity → Other user-generated content (prompts, links, report reasons)          | App functionality                     |

Not collected: Address, Phone, Race, Political, Sexual orientation, Other info; Financial info; Health and
fitness; Messages; Videos; Audio; Files and docs;
Calendar; Contacts; App interactions; In-app search history; Installed apps; Other actions; Web browsing; App info and
performance (crash logs, diagnostics); Device or other IDs; Location.

Transfers to QRX's service providers (hosting, GPU servers that run QRX's own image model, Clerk for sign-in) are not
"sharing" under Google's definitions.

**Preview should read:** "No data shared with third parties", "Data collected: Personal info, Photos and videos, App activity",
"Data is encrypted in transit", "You can request that data be deleted".
