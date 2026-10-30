# Spec 1 — Crypto design and `vault-core`

## Goal

A reviewed design and one tested Rust crate that does all the crypto, proven on
a real phone before anything depends on it. This spec ends with the format
frozen, so every risky assumption is tested here.

## What this protects against

| Who | Today | After Spec 4 |
|---|---|---|
| Cloudflare reading traffic | Login password, every revealed password, all names, usernames, URLs and notes | Ciphertext, sizes, timing, who logged in |
| Cloudflare altering what it serves | Can steal everything | **Web app: still can.** Apps carry their own UI and aren't exposed to this |
| A leaked database or backup | Everything but passwords in plaintext; passwords readable with a key on the same server | Ciphertext and a hash; the attacker has to guess the master password through Argon2id |
| A stolen session token (valid for `JWT_EXPIRES_IN`) | Can read the whole vault | Can read ciphertext. Can still overwrite or delete entries |
| Someone running the server | Everything | Can't read entries. Can delete, withhold, or serve old versions; `seq` below catches old versions on any device holding a newer copy |
| A lost, locked phone | Nothing stored | Ciphertext and a Keystore-protected key; depends on master password strength and the phone's lock |
| Malware or root on an unlocked device | Out of scope | Out of scope |

Still visible to the server after all this: the username, how many entries
exist, when they change, and rough sizes.

## The format

**Keys**

```
master password
  normalised to NFKC (a phone and a laptop can type different bytes for the same text)
  + salt: 16 random bytes per account, stored on the server
  Argon2id(m = 64 MiB, t = 3, p = 1), parameters stored per account so they can rise later
  = master key (32 bytes, never stored, never sent)

master key  HKDF-SHA256, info "cereberus/v1/auth"  = auth key   (sent at login)
master key  HKDF-SHA256, info "cereberus/v1/kek"   = KEK        (never sent)

vault key = 32 random bytes, made once at setup; survives master password changes
wrapped vault key = XChaCha20-Poly1305(KEK, vault key, aad "cereberus/v1/vault-key")

recovery key = 32 random bytes, shown once, printed by the user
recovery key  HKDF-SHA256, info "cereberus/v1/recovery-kek"   wraps the vault key a second time
recovery key  HKDF-SHA256, info "cereberus/v1/recovery-auth"  proves possession to the server
```

The server stores `bcrypt(auth key)` in the existing `user.password` column, so
a database leak alone doesn't let anyone log in. Base64 of 32 bytes is 44
characters, under bcrypt's 72-byte limit.

**An entry**

Plaintext, as JSON, padded with `0x80` then zeros to the next multiple of 256
bytes, so the length gives away little:

```json
{
  "v": 1, "seq": 3,
  "name": "", "username": "", "password": "", "url": "", "notes": "",
  "tags": ["work"],
  "createdAt": "", "updatedAt": "",
  "conflictOf": null
}
```

- Encrypted with XChaCha20-Poly1305 under the vault key, with a random 24-byte
  nonce and `aad = "cereberus/v1/item|<item uuid>"`, so the server can't swap one
  entry's ciphertext into another's slot.
- Stored as text: `cv1.<base64url(nonce || ciphertext)>`.
- `seq` goes up by one on every edit. It's inside the encryption, so the server
  can't forge it. A device refuses an incoming copy with a lower `seq` than the
  one it holds.
- Tags are names inside the entry. There's no separate tag table any more.

## Commits

### Commit 1 — `feat(vault-core): key derivation and entry encryption`

- [ ] New crate `frontend/vault-core` with no Tauri dependency. It sits outside
  `src-tauri` because [`frontend/.dockerignore`](../../frontend/.dockerignore)
  excludes that directory and the web image needs this crate.
- [ ] Dependencies, all RustCrypto apart from the helpers: `argon2`, `hkdf`,
  `sha2`, `chacha20poly1305`, `zeroize`, `unicode-normalization`, `base64`,
  `serde`, `serde_json`, `getrandom`.
- [ ] API: `derive_keys`, `create_vault`, `unwrap_vault_key`, `rewrap_vault_key`,
  `encrypt_entry`, `decrypt_entry`, `create_recovery_key`, `unwrap_with_recovery`.
- [ ] Key types zeroize on drop and have no `Debug` or `Serialize`. Nothing ever
  logs a key or a decrypted field.

### Commit 2 — `test(vault-core): fixed test vectors`

- [ ] `frontend/vault-core/testdata/vectors.json`: fixed inputs and expected
  outputs for each step, so an accidental format change fails a test. Spec 3
  runs the same vectors against the WebAssembly build.
- [ ] Failure cases: wrong password, tampered ciphertext, wrong item UUID in the
  `aad`, unknown version prefix, broken padding. All return errors, none panic.
- [ ] Unicode: precomposed and decomposed forms of the same password derive the
  same keys.

### Spikes — on a throwaway `spike/android-crypto` branch, not merged

Android can only be tested through CI, so these go in one APK, with a bare debug
screen.

- [ ] **S1: Rust from a Kotlin service.** A small Android `Service` calls a JNI
  function in `app_lib` that uses `vault-core`, with `MainActivity` not running.
  Tauri has no direct Kotlin-to-Rust call, so this is the assumption autofill
  rests on. If it fails, stop and rethink before freezing the format: Android has
  no built-in XChaCha20, so a Kotlin decrypt would need a library or AES-256-GCM.
- [ ] **S2: Fingerprint-protected key.** `tauri-plugin-biometric` 2.5.0 calling
  `biometric_cipher` from Rust ([its source](https://github.com/tauri-apps/plugins-workspace/tree/v2/plugins/biometric)),
  so the key doesn't pass through the webview. Needs the
  `biometric:allow-biometric-cipher` permission, which isn't in its defaults.
  - [ ] Round trip works with `allowDeviceCredential: false`.
  - [ ] Adding a new fingerprint makes decryption fail, not succeed.
  - [ ] Below Android 11 (API 30) the plugin doesn't call
    `setAllowedAuthenticators` (`BiometricActivity.kt:173`), and the app's
    `minSdk` is 24. Decide: either confirm it's still strong-biometric-only there,
    or offer fingerprint unlock on API 30+ only.
- [ ] **S3: Argon2id cost.** Time `derive_keys` on your phone and in a browser's
  WebAssembly. Target about 3 seconds at worst. Lower `m` or `t` only if that's
  missed, and not below OWASP's minimum (`m = 19 MiB, t = 2, p = 1`).
- [ ] **(you)** Push the branch, run the Android workflow, install, report.

### Commit 3 — `feat(vault-core): compile to WebAssembly`

- [ ] `wasm-bindgen` wrapper that keeps the vault key inside WASM memory and never
  returns it to JavaScript.
- [ ] Same vectors pass under WASM. Randomness comes from `crypto.getRandomValues`.

## Review gate

- [ ] Fresh-context review of this spec and the crate, given the code and not
  these conclusions (Q2).
- [ ] Every finding fixed or written down here with a reason.
- [ ] **(you)** Read the table at the top and accept what it leaves exposed.
- [ ] Mark **Format frozen** in the README. Later changes need a new `cv2` format
  and a re-encrypting upgrade path.

## Acceptance criteria

- `cargo test` passes natively, and the same vectors pass under WebAssembly.
- S1, S2 and S3 each have a recorded result from a real phone.
- The review gate is complete.

## Out of scope

- Anything calling this crate from the app (Spec 3).
- Sharing entries between accounts; one vault key per account is enough.
