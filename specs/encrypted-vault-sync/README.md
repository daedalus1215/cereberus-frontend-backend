# Encrypted vault and sync

**Problem.** The apps can't work without the server, because nothing is stored
on the device. We want the vault on the device, synced securely between
devices. That can't be built on how the vault works today:

- The server does all the encryption, with one key shared by every account
  ([`encryption.adapter.ts:9`](../../backend/src/password/infra/encryption/encryption.adapter.ts)).
- Only the password field is encrypted. Name, username, URL, notes and tags are
  plaintext in the database
  ([`add-password.transaction.script.ts:21`](../../backend/src/password/domain/transaction-scripts/add-password.transaction.script.ts)).
- Login sends the real password, and revealing an entry sends the real password
  back. Through the public hostname both are readable at Cloudflare's edge,
  which is the opposite of what home-lab's decision D28 assumes.

**Goal.** The server, and anything between it and a device, only handles data
it can't read. Each device keeps its own encrypted copy, works without the
server, and syncs when it can. Android can fill passwords into other apps.

## Status

| # | Spec | Depends on | Status |
|---|------|-----------|--------|
| 0 | [Ship the online-only build](./spec-0-ship-online-build.md) | — | Code done, including the copy fix. Waiting on you: commit, secrets, PR, phone checks |
| 1 | [Crypto design and `vault-core`](./spec-1-crypto-core.md) | Spec 0 (for the Android spikes) | Not started |
| 2 | [Backend: encrypted vault API](./spec-2-backend-vault-api.md) | Spec 1 | Not started |
| 3 | [Clients: encrypt on the device](./spec-3-clients.md) | Specs 1, 2 | Not started |
| 4 | [Migrating the real vault](./spec-4-migration.md) | Spec 3 | Not started |
| 5 | [On-device copy, read-only offline, fingerprint unlock](./spec-5-on-device-vault.md) | Spec 4 | Not started |
| 6 | [Offline edits and sync](./spec-6-offline-sync.md) | Spec 5 | Not started |
| 7 | [Android autofill](./spec-7-autofill.md) | Spec 5 | Not started |

The plan's four steps map on like this: client-side encryption is Specs 1–4,
the on-device copy is Spec 5, offline edits are Spec 6, autofill is Spec 7.

**Last stopped:** 2026-10-30. Spec 0's copy fix is finished and verified, and the
installed desktop app includes it. Everything is still uncommitted on `main`. Next
are Spec 0's **(you)** steps; Spec 1's commits 1 and 2 don't depend on them, but its
Android spikes do.

## How to pick this up

1. Read **Last stopped** above and the Status table.
2. Run `git status` and `git log --oneline -10`; the working tree may hold
   finished work waiting to be committed.
3. Open the first spec that isn't done and carry on from its first unticked
   box. Everything needed should be in that spec and this README. If something
   isn't, add it here rather than leaving it in a chat.

When stopping, tick what's finished and verified, update the Status table and
**Last stopped**, and note how anything unusual was verified.

**Who does what.** Claude leaves work uncommitted and stops at each commit
boundary. The user commits, pushes, tags, runs `gh secret set`, deploys, and
runs anything against the production vault. Boxes marked **(you)** are the
user's; Claude can't do them.

## Decisions (locked)

- **Stay on Tauri.** No separate native Android app. Kotlin is only added where
  Android requires it (autofill). *(user, 2026-10-30)*
- **Stay on Cereberus,** rather than moving to Vaultwarden and the Bitwarden
  apps. *(user, 2026-10-30, by accepting the plan)*
- **Order:** encryption first, then on-device copy, then offline edits, then
  autofill. Nothing goes on a device until it's encrypted under a key the server
  never sees. *(user, 2026-10-30)*
- **Don't copy the siblings' offline layer.** Chronus, Nemesis and Omega store
  API responses in IndexedDB with no encryption of their own. Their outbox and
  sync-scheduling ideas are fine to borrow; the storage isn't.
- **All crypto lives in one Rust crate,** `frontend/vault-core`, used natively
  by the apps and as WebAssembly by the browser. It isn't written twice.
- **The web app stays, online only.** It stores nothing between sessions.
- **No master password and no recovery key means the vault is gone.** The server
  can't help, by design. Setup makes you save a recovery key.
- **Sync never silently drops a version.** See Spec 6.

The crypto details in Spec 1 are Claude's proposal until its review gate is
passed. After that they're frozen, because changing them means re-encrypting.

## Open questions

Each has a default that applies unless you change it.

| # | Question | Default | Needed by |
|---|----------|---------|-----------|
| Q1 | Does production have accounts other than yours? Each one has to migrate itself with its own password. Check with `SELECT id, username FROM "user";` (home-lab's `runbooks/database.md` has the `psql` line) | Yours is the only one | Spec 4 |
| Q2 | Who reviews the crypto design? | A fresh-context Claude review plus the `/security-review` skill. That isn't a professional audit, and a person who knows this area would be better | Spec 1 gate |
| Q3 | After Spec 4, should the web app come off the public hostname? Cloudflare can't read app traffic any more, but it could alter the JavaScript it serves to a browser. Only the apps, which carry their own UI, are safe from that. The API stays public for them | Yes: web app on the LAN address only | End of Spec 4 |
| Q4 | Which passwords get rotated after the migration? Everything revealed through the tunnel so far has been readable by Cloudflare, and old backups keep readable copies for up to 12 months (Spec 4) | Rotate the high-value ones: email, banking, anything that resets other accounts | End of Spec 4 |
| Q5 | Block screenshots and recent-apps thumbnails on Android (`FLAG_SECURE`)? | On, with a Settings toggle to allow screenshots | Spec 5 |
| Q6 | How long before the app locks itself? | 5 minutes in the background | Spec 5 |

## Shared notes

- **This repo is public; home-lab is private.** Keep hostnames, addresses and
  infrastructure details out of these files. Refer to "the public hostname", "the
  LAN address" and "the dev server", and look the specifics up in home-lab. The
  same goes for `frontend/README.md` and anything else committed here.
- **Deploying.** Spec 2 only adds to the API and can deploy on its own. Specs 3
  and 4 reach production together: Spec 3's clients can't use a legacy account
  except to migrate it. Test them on the dev server with new accounts.
- **Android checks are slow.** This machine is arm64 and Google's NDK is x86-64
  only, so every APK comes from CI, and a check means push, wait for the build,
  install on the phone. Group Android checks together rather than running them
  one change at a time. `workflow_dispatch` builds any branch once the workflows
  are on `main`, which is why Spec 0 comes first.
- **Desktop checks are local.** The earlier end-to-end rig was an Ubuntu 24.04
  container with Xvfb and xdotool, a throwaway Postgres, the real backend image
  and a stub imitating Cloudflare Access. It lived in a session scratchpad, so
  expect to rebuild it.
- **Claude never touches production data.** Rehearsals use dev or throwaway
  databases.
- **Commit discipline.** Each numbered commit in a spec is one git commit.

## Tech stack

- Backend: NestJS, TypeORM, Postgres (action, transaction script, repository).
  New API code goes in a new `backend/src/vault/` module.
- Frontend: React, Vite, MUI, TanStack Query, Axios. App-only code is in
  `frontend/src/tauri/`.
- Apps: Tauri v2, Rust 1.90+, edition 2024.
- Tests: Jest (`__specs__/*.spec.ts`) on the backend, Vitest on the frontend,
  `cargo test` for Rust.
