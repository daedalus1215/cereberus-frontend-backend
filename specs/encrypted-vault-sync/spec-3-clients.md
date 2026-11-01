# Spec 3 — Clients: encrypt on the device

## Goal

The web app and the desktop and Android apps do all encryption themselves. On a
new account, tested on the dev server, the server only ever receives the auth
key and ciphertext. Still online only: the device stores nothing yet.

This doesn't reach production without Spec 4.

## Decisions

- **One `VaultClient` interface with two implementations.** Tauri calls Rust
  commands; the browser calls `vault-core` compiled to WebAssembly. Screens don't
  know which they have.
- **No function ever returns the vault key to JavaScript.** It stays in Rust or
  WASM memory, along with the auth key, which is used to log in again silently
  when the session token expires.
- **Passwords cross into JavaScript only when revealed or copied.** `list()`
  returns everything else. Strings in the webview can't be wiped, so this limits
  how much is exposed there.
- **Search and tag filtering run on the device,** over decrypted fields. The server
  search ([`password.repository.impl.ts:50`](../../backend/src/password/infra/repositories/password.repository.impl.ts))
  can't work on ciphertext.
- **Tags are typed names.** No code creates tags today: there's no `POST /tags`,
  and nothing calls `tagRepo.save`. So the UI's tag list comes from entries, and
  the editor lets you type a new one.
- **The session token moves to memory.** `sessionStorage` is no use once a reload
  loses the vault key anyway, so a reload means unlocking again.

```ts
interface VaultClient {
  register(username, masterPassword): Promise<{ recoveryKey: string }>;
  login(username, masterPassword): Promise<void>;
  lock(): Promise<void>;
  list(): Promise<EntrySummary[]>;     // no passwords
  reveal(id): Promise<string>;
  save(entry): Promise<Entry>;
  remove(id): Promise<void>;
  changeMasterPassword(current, next): Promise<void>;
  recover(username, recoveryKey, next, confirmNewKey: (key: string) => Promise<void>): Promise<void>;
}
```

## Commits

### Commit 1 — `feat(frontend): VaultClient and the Tauri implementation`

- [ ] `frontend/src/vault/client.ts`, the interface and types.
- [ ] `frontend/src-tauri/src/vault.rs`: commands backed by `vault-core`, holding
  unlocked keys in Tauri-managed state, zeroized on lock.
- [ ] HTTP stays in TypeScript, through `configureApiForTauri` in
  [`axios.interceptor.ts`](../../frontend/src/api/axios.interceptor.ts), so
  Cloudflare headers and access-denied handling keep working. Rust only ever sees
  ciphertext and keys.
- [ ] Add the new commands to [`capabilities/default.json`](../../frontend/src-tauri/capabilities/default.json).
- [ ] Use `vault-core-wasm`'s wiping allocator in the Tauri app too. The review made this
  required, and Spec 7's JNI path gets it from the same library. Without it, what's
  serialized for IPC, such as a shown recovery key or a revealed password, stays in freed
  memory after locking. Native memory can't be searched the way WASM's can, so check the
  cost and cover it with an allocator test like `vault-core/tests/wiping.rs`.
- [ ] Add `cargo audit` to CI, and run the vectors against `src-tauri/Cargo.lock`, since
  that lock decides which crypto versions the apps ship.
- [ ] Optimise the crypto crates in debug builds, through `[profile.dev.package.*]` in
  `src-tauri/Cargo.toml`. A profile in `vault-core`'s own manifest doesn't apply once
  it's a dependency. Without this, every check from a debug APK waits 2.3 to 8.7 seconds
  to derive keys on a Pixel 9a, against 0.13 to 0.7 seconds optimised.

### Commit 2 — `feat(frontend): the browser implementation`

- [ ] `VaultClient` over the WASM build, loaded only on the web. `--mode tauri`
  leaves the WASM out of the bundle.
- [ ] Vectors from Spec 1 pass through the TypeScript wrapper.
- [ ] [`frontend/Dockerfile`](../../frontend/Dockerfile) gets a Rust stage that
  builds the WASM before the Node stage, since `node:22-alpine` has no Rust.
- [ ] Run Argon2id in a Web Worker so the page doesn't freeze.
- [ ] Check a ciphertext's length in the TypeScript wrapper before calling into WASM. The glue
  copies the string into WASM memory before Rust's own check, and that memory never shrinks.
- [ ] Handle `OutOfMemory` from key derivation with a clear message, not a crash.

### Commit 3 — `feat(frontend): log in and register with derived keys`

- [ ] [`useAuth.ts`](../../frontend/src/auth/useAuth.ts) and
  [`Login.tsx`](../../frontend/src/pages/LoginPage/components/Login.tsx): prelogin,
  derive keys, log in, unwrap. The master password is never sent. Show progress,
  since deriving can take up to a second, and longer on older phones.
- [ ] [`RegisterPage.tsx`](../../frontend/src/pages/RegisterPage/RegisterPage.tsx):
  minimum 12 characters and a strength check, enforced here since the server can't. Twelve
  characters alone accepts `password1234`, and every offline attack ends at the password.
  Then show the
  recovery key, and require typing part of it back before continuing.
- [ ] Remove [`tokenStorage.ts`](../../frontend/src/auth/tokenStorage.ts), and its use in
  `TauriConfigGate.tsx`.
- [ ] Keep today's distinctions: wrong password, server unreachable, Cloudflare
  Access refusal.

### Commit 4 — `feat(frontend): vault screens use VaultClient`

- [ ] [`PasswordTable.tsx`](../../frontend/src/pages/HomePage/components/PasswordTable/PasswordTable.tsx),
  [`PasswordCell.tsx`](../../frontend/src/pages/HomePage/components/PasswordTable/PasswordCell.tsx),
  [`PasswordCard.tsx`](../../frontend/src/pages/HomePage/components/PasswordTable/PasswordCard.tsx),
  [`ViewPasswordModal.tsx`](../../frontend/src/pages/HomePage/components/PasswordTable/ViewPasswordModal.tsx),
  [`useFetchPassword.ts`](../../frontend/src/pages/HomePage/hooks/useFetchPassword.ts).
- [ ] [`EditPasswordModal.tsx:139`](../../frontend/src/pages/HomePage/components/PasswordTable/EditPasswordModal.tsx)
  saves through `VaultClient`; tags become free text with suggestions.
- [ ] `remove(id)` uploads a tombstone (`Entry::tombstone`, `encryptTombstone` on the web).
  `list()` leaves tombstones out.
- [ ] [`TagFilter.tsx`](../../frontend/src/pages/HomePage/components/PasswordTable/TagFilter.tsx)
  and search work from `list()`.
- [ ] Decrypted data isn't kept in the TanStack Query cache after lock or sign-out.
- [ ] Remove `src/api/passwords.ts` and `src/api/tags.ts` once nothing uses them
  outside the Spec 4 migration.

### Commit 5 — `feat(frontend): master password and recovery in Settings`

- [ ] [`ChangePasswordForm.tsx`](../../frontend/src/pages/SettingsPage/components/ChangePasswordForm.tsx)
  rewraps the vault key; entries aren't re-encrypted.
- [ ] [`ChangeUsernameForm.tsx`](../../frontend/src/pages/SettingsPage/components/ChangeUsernameForm.tsx)
  sends the auth key as `currentPassword`.
- [ ] A "Forgot master password" flow using the recovery key. Recovering uses that key up, so
  the flow shows the new one and has you type part of it back **before** `recover/complete` is
  sent. Otherwise a lost response leaves you with no working key and no idea.
- [ ] "Replace your recovery key" in Settings (`PUT /users/recovery`).

### Commit 6 — `feat: content security policy for the web app and the apps`

- [ ] [`nginx.conf`](../../frontend/nginx.conf) has no CSP today (Helmet's in
  `main.ts` only covers API responses). Add `script-src 'self' 'wasm-unsafe-eval'`;
  `style-src 'self' 'unsafe-inline'` is needed for MUI. Spec 1 confirmed the WASM build
  loads under this `script-src`, and is blocked without `'wasm-unsafe-eval'`.
- [ ] `tauri.conf.json` has `"csp": null`, as the siblings do. A script injected
  here could read an unlocked vault, so set a real policy. Check the IPC, the HTTP
  plugin and MUI all still work.

## Acceptance criteria

- On a new account, capturing all traffic shows no master password and no entry
  field in plaintext, tested at the Access stub.
- Log in, add, edit, delete, reveal, copy, search and filter by tag all work on web
  and desktop, on the dev server.
- Android: the same, from a CI APK **(you)**.
- An entry created on desktop opens on Android and on the web, and the other way
  round.
- Changing the master password on one client: the new password works everywhere,
  the old one doesn't, and no entry was rewritten.
- A vault can be recovered with the recovery key after forgetting the master password.
- The token expiring mid-session (set `JWT_EXPIRES_IN: 1m` on the test stack)
  doesn't interrupt anything.

## Out of scope

- Legacy accounts beyond sending them to the migration (Spec 4).
- Anything stored on the device (Spec 5).

## Tests

Vitest for the fake-`VaultClient` screen behaviour, the login error cases and the
recovery-key confirmation. A desktop end-to-end run in the Docker rig (see the
README), repeating the earlier checks, plus the traffic capture above.
