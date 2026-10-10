# Review notes and the reviewer account

## Reviewer account (owner, before submitting)

1. On **https://qrx.codes** (prod), sign up a dedicated account, e.g. `appreview@qrx.codes`, with **email and
   password** (not Google), on the Free plan. Keep it out of any paid plan so reviewers see the same app as everyone.
2. Make one code with it on the website, so My codes isn't empty.
3. Create an **API key** for it at https://qrx.codes/developers/keys (the backup sign-in).
4. In a private browser window, sign in again with the email and password. If Clerk asks for an emailed code on a new
   device, either turn that off (Clerk dashboard → Configure → Attack protection / client trust) or rely on the API key
   line in the notes.
5. Never commit the password or key. They go only into the store consoles.

## App Store

- **App Review Information → Sign-in information:** the account's email and password.
- **Notes:** paste `metadata/ios/review_information/notes.txt`, then add `API key (backup sign-in): qrx_…`.

## Google Play

- **App content → App access → Add instructions:** the email and password, and in "Any other information" the backup:
  "On the first screen tap 'Use an API key' and paste: qrx_…".

## Answers ready for likely review questions

**Guideline 3.1.1 ("your app accesses paid content without in-app purchase").** Reply in Resolution Center:

> QRX for iOS is a free stand-alone companion to QRX, a paid web-based tool (guideline 3.1.3(f)). The app has no
> purchasing inside it and no calls to action for purchase outside it, in any storefront: no prices, no upgrade
> buttons, no links to pricing or checkout. Every account, free or paid, can sign in and use the app; free accounts get
> a daily allowance of codes in the app. Accounts that pay for QRX on our website keep what they pay for when they use
> the companion app.

If the rejection stands, the plan is to add a Starter subscription as an in-app purchase
([docs/purchases.md](../docs/purchases.md)).

**Guideline 4.8 (Sign in with Apple).** "Sign in with Apple is offered on the QRX sign-in page alongside Google and
email." (It must be turned on in Clerk before submission: `README.md` step 2.)

**Guideline 1.2 / AI content.** "Pictures come from QRX's own model. Prompts pass an obscenity filter and offensive
prompts are refused; every picture can be reported in the app, and reports go to the QRX team for review. Codes are
private to the account; there is no sharing between users."

**Guideline 5.1.1(v) (account deletion).** "Account tab → Delete account explains what is deleted and opens the QRX
account page, where Delete account removes the account and its codes at once. Help page:
https://qrx.codes/support#delete-account."
