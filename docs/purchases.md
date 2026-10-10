# Purchases and plans in the app

**The app sells nothing.** There is no in-app purchase, subscription, price, upgrade button or link to pricing or
checkout, on either store. Every QRX account can sign in: free accounts use the daily allowance (shown on the Account
tab); accounts that pay on qrx.codes get what they pay for, such as no daily limit and changing where a code points.

The research and the decision, with sources, are in the main repo:
[`docs/distribution/builds/mobile-apps.md`](https://github.com/MakerXStudio/qrxcodes/blob/main/docs/distribution/builds/mobile-apps.md).
In short:

- **Google Play** allows consumption-only apps that sell nothing and let people use what they paid for elsewhere.
- **App Store**: guideline 3.1.3(f) lets a free app be a stand-alone companion to a paid web-based tool, provided it has
  no purchasing and no calls to action to buy outside the app. A reviewer can still apply 3.1.1; the review notes argue
  3.1.3(f) (`store/review-notes.md`).

## Rules for app copy

- Never show prices, "upgrade", "subscribe", "Starter", "Pro" or a trial, and never link to `/upgrade`, `/billing`,
  pricing, checkout or a code's web page (`/view/…`, which links to upgrade).
- Allowed: "Changing where a code points is available on a paid plan." in place of the Change link button; the daily
  allowance and when it resets; "Create a free account"; links to help, privacy, terms and the account page.
- Never show the API's own `detail` for `daily-limit` or `plan-required` problems: it can name the plan. The app's own
  wording is in `src/lib/problem.ts`.

`test/store.test.ts` checks the app's source and the store copy for these words.

## If Apple insists on in-app purchase

The fallback (a Starter subscription through RevenueCat behind a `QRX_PURCHASES=store` flag, with a server webhook that
merges store and Stripe entitlements into `isPaid`, and Restore purchases) is designed in the main repo document,
section "If Apple insists on in-app purchase". Nothing for it is in this repo yet.
