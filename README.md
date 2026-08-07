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

### Firestore rules

```bash
firebase deploy --only firestore:rules
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
