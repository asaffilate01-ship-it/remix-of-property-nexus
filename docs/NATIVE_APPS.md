# Native apps (iOS & Android)

Gabley ships a Capacitor native shell alongside the web app and PWA. The shell
loads the deployed site, so native builds always run the latest release without
resubmitting to the stores for content changes.

## Configuration

`capacitor.config.ts`

- `appId`: `app.lovable.gabley` — change to your own reverse-domain bundle ID
  before submitting to the stores.
- `server.url`: defaults to the production URL, overridable with
  `CAPACITOR_SERVER_URL` (use your local IP + port for on-device dev).
- Splash screen and status bar are themed to the app's dark brand colour.

## One-time setup

Run these locally (macOS is required for iOS):

```bash
git clone <your repo> && cd <your repo>
npm install
npx cap add ios
npx cap add android
npm run build
npx cap sync
```

## Running on a device / simulator

```bash
npx cap run ios        # requires Xcode
npx cap run android    # requires Android Studio
```

Live-reload against the sandbox/dev server:

```bash
CAPACITOR_SERVER_URL="http://<your-lan-ip>:8080" npx cap sync && npx cap run ios
```

After every `git pull` that changes dependencies or config: `npm install && npx cap sync`.

## What the shell adds

| Capability | Behaviour |
| --- | --- |
| Status bar | Dark style, brand background on Android |
| Splash screen | Brand-coloured, auto-hides once the app is interactive |
| Android back button | Navigates back in history, exits at the root |
| In-app browser | External links open in a native browser sheet (`openExternal`) |
| Haptics | `tapFeedback()` for confirmation actions |

All helpers live in `src/lib/native.ts` and are no-ops in the browser, so the web
app and PWA are unaffected.

## Store submission checklist

- Replace `appId` / `appName` with your own identifiers.
- Add app icons and splash assets (`npx @capacitor/assets generate`).
- Point `server.url` at your production custom domain.
- Turn the promo password gate off, or the store review team will see the
  unlock screen.
- iOS: sign in Xcode with your Apple Developer team, set the version/build.
- Android: create a signing keystore and set it in `android/app/build.gradle`.
