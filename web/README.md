# Barkadaoke (web)

Shared karaoke queue UI — React + TypeScript + Vite + shadcn/ui.

## Stack

- React 19
- Vite 8
- TypeScript
- Tailwind CSS v4
- shadcn/ui (Radix Nova)
- React Router

Visual language follows `DESIGN-voltagent.md` (dark canvas + electric green). Product behavior follows `DESIGN.md`.

## Develop

```bash
cd web
npm install
npm run dev
```

## Formatting and styling

Use Biome for formatting the web app:

```bash
npm run format
npm run format:check
```

The repository-root `biome.json` is the shared source of formatting settings;
`web/biome.json` inherits it. The configuration supports Tailwind CSS v4 directives.

Workspace settings are included for VS Code/Cursor whether you open the repository
root or `web/`. With the recommended **Biome** extension enabled, files autosave
when you leave the editor, format on save, and apply safe unused-import fixes.
Explicit saves also format and fix the file. Biome uses the version installed by
`npm install` in `web/`, rather than an unrelated global version.

Keep styling in
Tailwind utility classes, reuse shared components and theme tokens, and reserve
custom CSS for rules utilities cannot express cleanly. Oxlint remains the linter.

## Firebase Auth setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com).
2. Enable **Authentication → Sign-in method → Google**.
3. Add a **Web** app and copy the config values.
4. In Firebase Authentication settings, add your local domain (`localhost`) to authorized domains.
5. Copy env file and fill keys:

```bash
cp .env.example .env
```

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

6. Restart `npm run dev`.

Without `.env`, the app uses **demo auth** (mock user) so UI work can continue.

## Firestore setup

1. In Firebase Console → **Build → Firestore Database** → create database (start in test mode, then paste rules).
2. Deploy or paste rules from the repo root `firestore.rules`.
3. The first create/join with a room-code query may ask you to create a composite index (`roomCode` + `status`). Use the link in the browser error — one click creates it.

## Firebase Hosting

```bash
cd web && npm run build && cd ..
firebase deploy --only hosting
```

App URL will be like `https://barkdaoke-dev.web.app`.

After first deploy, add that domain in Firebase Console → Authentication → Settings → Authorized domains.

## Try the realtime flow

1. Sign in with Google.
2. **Create a room** on one device (host / TV).
3. On a phone, **Join** with the room code (or scan the QR).
4. Guest: search (mock results for now) and add a song — it appears on the host in realtime.
5. Host: **Next** / **Skip** advances the shared queue; **End room** closes the session.

## YouTube search (Cloud Function)

1. Create a [YouTube Data API v3](https://console.cloud.google.com/apis/library/youtube.googleapis.com) key in Google Cloud (same project as Firebase).
2. Install Firebase CLI and set the secret:

```bash
npm i -g firebase-tools
firebase login
cp .firebaserc.example .firebaserc   # set your project id
cd functions && npm install && cd ..
firebase functions:secrets:set YOUTUBE_API_KEY
firebase deploy --only functions
```

3. Until the function is deployed, search falls back to demo results.

## YouTube host player

The host room embeds the YouTube IFrame Player API. Playback state syncs to Firestore (`playing` / `paused` / `ended`). When a song ends, press **Next** to advance (avoids autoplay restrictions).

## Host queue settings

Open **Room settings** in the host view to change:

- **Room queue limit:** a positive whole number or Unlimited (default).
- **Songs per user:** a positive whole number or Unlimited (default: 3).
- **Room capacity:** a positive whole number including the host (default: 5).
- **Individual song allowances:** inherit the room default, use a custom number,
  or allow Unlimited. Overrides persist when the same user leaves and rejoins.

Only songs with `queued` status count. A song starting, being removed, or being
skipped releases its waiting slot. Lowering a limit does not remove existing
songs or participants; it blocks new additions/joins until there is space.
Existing members can reconnect to a full room. Old rooms without settings use
the defaults above.

Song additions and settings saves now use trusted Cloud Functions. Deploy the
backend before releasing the updated UI and rules:

```bash
firebase deploy --only functions
npm --prefix web run build
firebase deploy --only firestore:rules,hosting
```

Older open clients must reload after deployment; direct client queue creation is
blocked by the new rules. Do not restore a direct-write fallback, which would
bypass the limits.

## Local limits and permissions tests

Install both the `web` and `functions` dependencies. Run the policy tests with:

```bash
npm --prefix functions test
```

To also run concurrency and Firestore security-rule tests, from the repository
root with Java 21+ and Firebase CLI available:

```bash
firebase emulators:exec --project demo-barkadaoke-limits --config firebase.test.json --only firestore "npm --prefix functions test"
```

The tests use a demo project and refuse a non-local emulator address. Without an
emulator, transaction and rules tests are reported as skipped.

For manual UI testing, start the Firestore, Auth, and Functions emulators using
`firebase.test.json`. Run Vite with `VITE_USE_FIREBASE_EMULATORS=true` and Firebase
configuration for the demo project. Emulator routing is available in development
only; never use production project credentials for local tests.
