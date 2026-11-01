# Spec 5 — On-device copy, read-only offline

## Goal

The desktop and Android apps keep an encrypted copy of the vault. With no server
they still open, unlock and show everything. The web app doesn't change.

Offline is read-only in this spec, so there's no sync conflict to handle yet.

## Decisions

- **One versioned JSON file** in the app's private data directory, mode 0600,
  replaced atomically (write to a temp file, then rename). Entries are already
  ciphertext, a vault is hundreds of entries rather than millions, and this avoids
  building SQLite for Android through CI. Revisit if it proves slow.
- **Ciphertext stays ciphertext on disk.** Entries are decrypted in memory when
  needed; no plaintext cache or index is ever written.
- **One account per device.** Signing out deletes the local vault, after a warning.
  Logging in as someone else requires signing out first.
- **Sync is driven from TypeScript while the app is open,** using the existing
  HTTP path. There's no background sync: on unlock, when the server comes back, and
  every 30 minutes (the siblings' schedule).
- **Pull only while unlocked.** A locked device can't read `seq`, so it can't judge what the
  server sends. It waits until the next unlock.
- **Tombstones stay in the file,** so a deleted entry keeps its `seq` and can't come back as
  an older copy.
- **Only the Sign out button deletes the local file,** after a warning. A 401, a refused
  session or a changed server address never does: they ask you to log in again. Master
  password changes make 401s normal, and anyone holding the auth key could otherwise use them
  to wipe every device.
- **A device keeps a copy of the recovery wrap** and warns if the server's changes when this
  device didn't change it, since the auth key alone can replace it.
- **A device never weakens its own parameters.** It pins `kdf` from this file and refuses
  any decrease from the server, since it would send the auth key before noticing.
- **Only Argon2id slows offline guessing.** With a copy of the local file, nothing else
  limits guesses at the master password, which is why Spec 3 sets a 12-character minimum.

```json
{
  "format": 1,
  "userId": 1, "username": "", "serverUrl": "",
  "kdf": {}, "salt": "", "wrappedVaultKey": "", "wrappedVaultKeyRecovery": "",
  "cursor": 0,
  "lastSyncedAt": null,
  "items": { "<uuid>": { "revision": 0, "ciphertext": "cv1..." } }
}
```

## Commits

### Commit 1 — `feat(desktop): encrypted local vault file`

- [ ] `frontend/src-tauri/src/vault_store.rs`: load, atomic save, format check. Same
  file-mode handling as [`config.rs`](../../frontend/src-tauri/src/config.rs).
- [ ] A corrupt or unknown-format file doesn't crash the app or get overwritten: it's
  set aside and the app offers a fresh pull from the server.

### Commit 2 — `feat(frontend): pull changes into the local vault`

- [ ] Fetch `GET /vault/items?since=<cursor>`; apply in one atomic save; advance the
  cursor only after that save.
- [ ] One tested function in `vault-core` decides whether to accept a pulled copy, used by
  every client: it must decrypt, and its `seq` must be higher than the stored one. Identical
  ciphertext changes nothing. Anything else is refused with a warning, and **the local copy
  stays.** Junk from a stolen token must never destroy a good copy, a delete is only ever a
  tombstone that passes this test, and requiring a higher `seq` stops a server flipping a
  device between two real versions.
- [ ] Sync schedule above, without blocking the UI.

### Commit 3 — `feat(frontend): unlock and read with no server`

- [ ] Tauri's `VaultClient` works from the local file once one exists: the master
  password unlocks locally, and the server login happens in the background when
  reachable.
- [ ] If the server rejects the auth key, the master password changed elsewhere. Ask
  for the new one, fetch the new wrapped key; entries stay valid. A server can trigger this
  prompt at will, so the pinned `kdf` applies here too, and the wrap, salt and `kdf` are only
  replaced once the new wrap opens and its key opens a stored entry. Saving them unchecked
  would lose the only local way in.
- [ ] Banner: "Offline: showing your copy from <time>", in the style of Nemesis's
  `frontend/src/components/OfflineBanner/OfflineBanner.tsx`.
- [ ] Writes while offline are refused with a clear message, until Spec 6.
- [ ] A connection problem never signs you out or deletes the local copy, whether
  it's no network, a 5xx or a Cloudflare Access refusal.

### Commit 4 — `feat(frontend): lock and sign-out`

- [ ] Auto-lock after the Q6 timeout in the background. Locking zeroizes keys in Rust
  and clears decrypted data from the screen and from TanStack Query. Spec 0's
  [`background-lock.ts`](../../frontend/src/tauri/background-lock.ts) already decides when;
  today it signs out, so point it at locking instead.
- [ ] A manual **Lock** button, separate from **Sign out**.
- [ ] Sign-out deletes the local file, with a warning.

### Commit 5 — `feat(android): a setting to allow screenshots`

- [ ] `FLAG_SECURE` in [`MainActivity.kt`](../../frontend/src-tauri/gen/android/app/src/main/java/com/cereberus/app/MainActivity.kt)
  has been on since Spec 0. Add the Settings toggle (Q5), defaulting to blocked.

### Commit 6 — `docs(frontend): describe the on-device vault`

- [ ] Replace "No offline mode" and "You log in every launch" in
  [`frontend/README.md`](../../frontend/README.md). Add a short `src/vault` README
  saying why this differs from the siblings' offline layer.

## Acceptance criteria

**Desktop, in the Docker rig**

- [ ] Log in online, stop the server, restart the app: it unlocks and shows every
  entry; reveal and copy work.
- [ ] Searching the local file's bytes for entry names and passwords finds nothing.
- [ ] A wrong master password fails offline, without any lockout risk to the data.
- [ ] The server comes back: changes from another device appear without a restart.
- [ ] Auto-lock clears the screen.
- [ ] Serving an old copy of an entry produces the warning, not a downgrade.
- [ ] So does junk, or a delete of an entry from a stolen token: the local copy stays.
- [ ] A 401 from the server asks you to log in, and the file is still there.
- [ ] A junk wrap in answer to a changed password leaves the old one in place.
- [ ] A deleted entry stays deleted after the server serves an older copy of it.
- [ ] A lower `kdf` from the server is refused.
- [ ] Sign-out removes the file.

**Android (you)**

- [ ] Airplane mode: opens, unlocks with the master password, shows entries.
- [ ] Force-stop and reopen: locked, and unlocks offline.
- [ ] Recent-apps thumbnail is blank.
- [ ] Updating the app keeps the local vault.

## Out of scope

- Offline writes (Spec 6). Autofill (Spec 7). Fingerprint unlock, which you don't want
  (2026-11-01). OS keyring unlock on Linux. Clipboard auto-clear. Offline in the browser.

## Tests

`vault_store.rs`: atomic save survives a failure midway, a corrupt file is set aside,
format check. Vitest for cursor handling, the `seq` refusal, and offline behaviour
with a fake `VaultClient`.
