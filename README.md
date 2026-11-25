# Barkadaoke

Shared karaoke queue — host on TV, guests join from phones.

- Product design: [`DESIGN.md`](./DESIGN.md)
- Visual system: [`DESIGN-voltagent.md`](./DESIGN-voltagent.md)
- Web app: [`web/`](./web)
- Cloud Functions: [`functions/`](./functions)
- Firestore rules: [`firestore.rules`](./firestore.rules)

## Quick start (web)

```bash
cd web
cp .env.example .env   # add Firebase web config
npm install
npm run dev
```

## Test functions locally

Callable functions (`searchVideos`, `upsertCatalogSongCallable`, room join/leave) run in the Firebase emulator. Region is `asia-southeast1`.

`searchVideos` is **local-first**: it queries the Firestore `songs` catalog before calling the YouTube Search API. Songs enter the catalog when someone queues or bookmarks them (`upsertCatalogSongCallable`), which also refreshes metadata via YouTube `videos.list`.

Search has three per-user options (available to hosts and guests): **Auto** checks the library first and supplements from YouTube when fewer than five results match; **Barkadaoke Library** never calls YouTube search; **YouTube** searches YouTube explicitly. An empty query browses popular library songs in every mode without using YouTube quota.

YouTube failures return library results, including a valid empty list, with a `fallbackReason`. Quota errors (`quotaExceeded` / `dailyLimitExceeded`) set a shared 15-minute cooldown in the server-only Firestore document `_searchStatus/youtube`; later searches use the library until the cooldown expires. A subsequent search retries YouTube automatically. Library query failures are reported separately rather than being disguised as zero matches. Library matching still uses exact title tokens, so it is not typo-tolerant; existing catalog documents need `searchTokens` to be searchable.

Deploy the updated `searchVideos` function before deploying the updated web app. No Firestore index or rules change is needed; the cooldown document is accessible only through the Admin SDK under the existing rules.

```bash
cd functions
npm install

# Provide secrets for local use (do not commit)
printf 'YOUTUBE_API_KEY=your_youtube_api_key\n' > .secret.local

npm run serve
```

The emulator prints callable URLs like:

`http://127.0.0.1:5001/<project-id>/asia-southeast1/searchVideos`

Call search with a signed-in Firebase ID token (callable handlers require auth):

```bash
curl -X POST \
  "http://127.0.0.1:5001/<project-id>/asia-southeast1/searchVideos" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <FIREBASE_ID_TOKEN>" \
  -d '{"data":{"query":"bohemian rhapsody","maxResults":5}}'
```

Get an ID token from a signed-in browser session (`user.getIdToken()`). Without auth you’ll get `unauthenticated`; without a configured YouTube secret, searches use library results with a `not-configured` fallback reason (the emulator still needs the declared secret supplied for startup).

Note: the web app talks to **deployed** functions by default. Until you point it at the emulator (e.g. `connectFunctionsEmulator`), song search may fall back to mock results if the function isn’t deployed. Mock results are **dev-only** — production YouTube failures fall back to the Firestore catalog (`catalog-fallback`), not mocks.

## Deploy

From the repo root. Requires [Firebase CLI](https://firebase.google.com/docs/cli) and a project in `.firebaserc`.

### First-time setup

```bash
cp .firebaserc.example .firebaserc   # set your Firebase project id
cd functions && npm install && cd ..
firebase functions:secrets:set YOUTUBE_API_KEY
```

### Hosting (web app)

Build the Vite app, then deploy `web/dist`:

```bash
cd web && npm run build && cd ..
firebase deploy --only hosting
```

### Cloud Functions

```bash
firebase deploy --only functions
```

### Firestore rules + indexes

```bash
firebase deploy --only firestore
```

Or separately:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

### Common combinations

```bash
# Web + functions
cd web && npm run build && cd ..
firebase deploy --only hosting,functions

# Functions + rules (e.g. after join/leave room changes)
firebase deploy --only functions,firestore:rules
```

Live site: `https://<your-project-id>.web.app`

See [`web/README.md`](./web/README.md) for auth, Firestore, and YouTube setup details.
