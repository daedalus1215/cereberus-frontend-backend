# Spec 5 — On-device copy, read-only offline, fingerprint unlock

## Goal

The desktop and Android apps keep an encrypted copy of the vault. With no server
they still open, unlock and show everything. Android can unlock with a fingerprint.
The web app doesn't change.

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
- **Only Argon2id slows offline guessing.** With a copy of the local file, nothing else
  limits guesses at the master password, which is why Spec 3 sets a 12-character minimum.

```json
{
  "format": 1,
  "userId": 1, "username": "", "serverUrl": "",
  "kdf": {}, "salt": "", "wrappedVaultKey": "",
  "biometricBlob": null,
  "cursor": 0,
  "lastSyncedAt": null,
  "items": { "<uuid>": { "revision": 0, "ciphertext": "cv1...", "deleted": false } }
}
```

`biometricBlob` is the vault key and auth key encrypted by the Keystore key, from
`biometric_cipher`. The auth key is included so a fingerprint unlock can still log
in to sync.

## Commits

### Commit 1 — `feat(desktop): encrypted local vault file`

- [ ] `frontend/src-tauri/src/vault_store.rs`: load, atomic save, format check. Same
  file-mode handling as [`config.rs`](../../frontend/src-tauri/src/config.rs).
- [ ] A corrupt or unknown-format file doesn't crash the app or get overwritten: it's
  set aside and the app offers a fresh pull from the server.

### Commit 2 — `feat(frontend): pull changes into the local vault`

- [ ] Fetch `GET /vault/items?since=<cursor>`; apply in one atomic save; advance the
  cursor only after that save.
- [ ] Apply the `seq` rule from Spec 1: refuse an incoming copy with a lower `seq`
  than the stored one, and show a warning instead of replacing it.
- [ ] Sync schedule above, without blocking the UI.

### Commit 3 — `feat(frontend): unlock and read with no server`

- [ ] Tauri's `VaultClient` works from the local file once one exists: the master
  password unlocks locally, and the server login happens in the background when
  reachable.
- [ ] If the server rejects the auth key, the master password changed elsewhere. Ask
  for the new one, fetch the new wrapped key; entries stay valid.
- [ ] Banner: "Offline: showing your copy from <time>", in the style of Nemesis's
  `frontend/src/components/OfflineBanner/OfflineBanner.tsx`.
- [ ] Writes while offline are refused with a clear message, until Spec 6.
- [ ] A connection problem never signs you out or deletes the local copy, whether
  it's no network, a 5xx or a Cloudflare Access refusal.

### Commit 4 — `feat(frontend): lock and sign-out`

- [ ] Auto-lock after the Q6 timeout in the background. Locking zeroizes keys in Rust
  and clears decrypted data from the screen and from TanStack Query.
- [ ] A manual **Lock** button, separate from **Sign out**.
- [ ] Sign-out deletes the local file and any `biometricBlob`, with a warning.

### Commit 5 — `feat(android): fingerprint unlock`

- [ ] Add `tauri-plugin-biometric` 2.5.0 on mobile targets only, with
  `biometric:allow-biometric-cipher`. Called from Rust, using what spike S2 showed.
- [ ] Opt-in, enabled in Settings after a master-password unlock. Device PIN isn't
  accepted (`allowDeviceCredential: false`).
- [ ] Offered on Android 11 (API 30) and up only. Below that the plugin doesn't restrict
  which authenticators count (Spec 1, S2), so those phones stay on the master password.
- [ ] After a new fingerprint is added, decryption fails. Fall back to the master
  password, and offer to re-enable it.
- [ ] Linux desktop stays on the master password; the plugin's cipher is Android-only.

### Commit 6 — `feat(android): block screenshots and recent-apps thumbnails`

- [ ] `FLAG_SECURE` in [`MainActivity.kt`](../../frontend/src-tauri/gen/android/app/src/main/java/com/cereberus/app/MainActivity.kt),
  on by default, with a Settings toggle (Q5).

### Commit 7 — `docs(frontend): describe the on-device vault`

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
- [ ] Sign-out removes the file.

**Android (you)**

- [ ] Airplane mode: opens, unlocks with password and with fingerprint, shows entries.
- [ ] A new fingerprint added in system settings stops fingerprint unlock until
  re-enabled.
- [ ] Force-stop and reopen: locked, and unlocks offline.
- [ ] Recent-apps thumbnail is blank.
- [ ] Updating the app keeps the local vault.

## Out of scope

- Offline writes (Spec 6). Autofill (Spec 7). OS keyring unlock on Linux. Clipboard
  auto-clear. Offline in the browser.

## Tests

`vault_store.rs`: atomic save survives a failure midway, a corrupt file is set aside,
format check. Vitest for cursor handling, the `seq` refusal, and offline behaviour
with a fake `VaultClient`.
