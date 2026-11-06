# Cerberus

A self-hosted password manager: a web app (installable PWA) plus Linux
desktop and Android apps built with Tauri, all sharing one NestJS API.

- **Web app** — online-only; it stores nothing between sessions.
- **Desktop and Android apps** — the same React build packaged by Tauri.
  They carry their own copy of the UI, talk to a Cereberus server over the
  network, and on first launch ask for the server's address and, if Cloudflare
  Access protects the server, an Access service token. Details:
  [frontend/README.md](frontend/README.md#desktop-and-android-apps).
- **API** — NestJS, PostgreSQL, JWT auth.

> **Roadmap.** Client-side encryption, an on-device vault copy, offline sync
> and Android autofill are specified in
> [specs/encrypted-vault-sync/](specs/encrypted-vault-sync/README.md) (status
> table inside). Until that work lands, the server does the encryption — see
> [Security notes](#security-notes).

## Repository layout

| Path | Contents |
|---|---|
| `backend/` | NestJS API (TypeORM, PostgreSQL) |
| `frontend/` | React web app, Tauri shell (`src-tauri/`), `vault-core` crypto crate and its WebAssembly build |
| `specs/` | Design specs for the encrypted-vault work |

## Tech stack

| Layer | Tech |
|---|---|
| Web UI | React 19, TypeScript, Vite, MUI, Tailwind CSS, TanStack Query |
| Desktop / Android | Tauri v2, Rust 1.90+ |
| Client-side crypto | `vault-core` (Rust: Argon2id, HKDF-SHA256, ChaCha20-Poly1305), shipped to the browser as WebAssembly |
| API | NestJS 11, TypeORM, PostgreSQL, JWT |
| Tests | Jest (backend), Vitest (frontend), `cargo test` (Rust) |

## Getting started

Requirements: Node 22, npm, a running PostgreSQL server. For the desktop app
additionally Rust 1.90+ and WebKitGTK (`libwebkit2gtk-4.1-dev`, `librsvg2-dev`).
Local Android builds need the Android SDK and NDK 27 on x86-64 Linux; on
arm64 machines the APKs come from CI instead.

### API

```bash
cd backend
cp .env.sample .env   # then fill in the values
npm install
npm run dev
```

The API listens on port 3000 under the `/api` prefix. Migrations in
`src/typeorm/migrations/` run automatically on boot; `synchronize` is off, so
the schema only changes through migrations.

Environment variables (see `backend/.env.sample`):

| Variable | Default | Purpose |
|---|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | port `5432` | PostgreSQL connection |
| `JWT_SECRET` | — | JWT signing secret |
| `JWT_EXPIRES_IN` | `1min` | Access-token lifetime |
| `ENCRYPTION_KEY`, `ENCRYPTION_SALT` | — | Key material for the server-side password-field encryption |
| `ALLOW_REGISTRATION` | on outside production | Set to `false` to close registration |
| `PORT` | `3000` | Listen port |
| `SSL_KEY_PATH`, `SSL_CERT_PATH` | unset | Serve HTTPS directly; leave unset when a reverse proxy terminates TLS |
| `FRONTEND_ORIGIN` / `FRONTEND_URL` | allow all | CORS origins; `FRONTEND_ORIGIN` is a comma-separated list |

Endpoints, all under `/api`:

- `POST auth/login`, `POST users/register` (both throttled to 5/min),
  `GET users/profile`, `PUT users/username`, `PUT users/password`
- `GET|POST passwords`, `GET passwords/search?query=`, `GET|PATCH|DELETE passwords/:id`
- `GET tags`
- `GET healthz`

### Web app

```bash
cd frontend
npm install
npm run dev
```

Vite serves on port 5173 and proxies `/api` to `VITE_API_URL`
(default `http://localhost:3000`). Other dev-server settings — `VITE_PORT`,
`VITE_HOST`, `VITE_ALLOWED_HOSTS` — resolve in `vite.env.config.ts` and never
reach the production bundle. The production build is a PWA; the service
worker is deliberately not built into the Tauri bundles
(`npm run build:tauri`).

### Desktop and Android apps

```bash
npm run desktop:dev      # run the app against the Vite dev server
npm run desktop:build    # release binary plus .deb, .rpm and AppImage bundles
```

First-launch connection settings, app signing, and the Android release
process (version tag → signed APK on a GitHub Release) are documented in
[frontend/README.md](frontend/README.md#desktop-and-android-apps).

## Testing

```bash
cd backend  && npm test                        # unit tests (Jest)
cd frontend && npm test                        # unit tests (Vitest)
cd frontend && npm run test:wasm               # build vault-core-wasm, then node --test
cd frontend/vault-core && cargo test           # includes vectors from a second implementation of the format
```

## Docker

`backend/Dockerfile` builds the API image (Node 22, runs as `node`, plain
HTTP — TLS belongs to the reverse proxy in front). `frontend/Dockerfile`
builds the web app and serves it with nginx; the reverse proxy routes `/api`
to the backend.

## Continuous integration

| Workflow | Trigger | Produces |
|---|---|---|
| `vault-core.yml` | PRs and pushes touching `frontend/vault-core*` | clippy + tests for the native and WebAssembly builds |
| `tauri-android-build.yml` | manual run on any branch | signed debug APK artifact for trying a branch on a phone |
| `tauri-android-release.yml` | manual run; on a version tag (e.g. `v0.1.0`) it also publishes | signed release APK, attached to the GitHub Release when run on a tag |
| `desktop-build.yml` | manual run | AppImage / .deb / .rpm for x64 and arm64 |

## Security notes

- **This repository is public.** Keep hostnames, addresses, and
  infrastructure details out of committed files; refer to "the public
  hostname", "the LAN address", "the dev server", and look the specifics up
  elsewhere.
- **Current state.** The server encrypts only the password field, with one
  key shared by every account, and login sends the real password in the
  request body. The
  [encrypted-vault work](specs/encrypted-vault-sync/README.md) replaces this
  with client-side encryption — the crypto core (`vault-core`) is done and
  its format frozen (2026-11-01) — plus an encrypted on-device copy that
  works offline.
- App-side behavior (session-only tokens, sensitive clipboard copies,
  screenshots blocked on Android, no Android backups) is documented in
  [frontend/SECURITY.md](frontend/SECURITY.md).

## Developer notes

- **Backend layering.** Each feature module is `apps/` (actions, controllers,
  DTOs) → `domain/` (services, transaction scripts, entities) →
  `infra/` (repositories). All domain logic lives in transaction scripts;
  actions never call them directly, and nothing above the domain layer
  touches a repository.
- **App-only frontend code** lives in `src/tauri/` and is a no-op in the
  browser.
- **Frontend lockfile.** `package-lock.json` must list the native packages of
  every platform or Vite won't run on the platforms left out; regenerate it
  on the host with `npm install --package-lock-only --ignore-scripts`
  (npm 11). Background in
  [frontend/README.md](frontend/README.md#packagelockjson).
