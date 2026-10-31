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
recovery key  HKDF-SHA256, info "cereberus/v1/recovery-kek"   wraps the vault key a second time,
                                                              aad "cereberus/v1/recovery-vault-key"
recovery key  HKDF-SHA256, info "cereberus/v1/recovery-auth"  proves possession to the server
```

- **The server stores `bcrypt(auth key)`** in the existing `user.password` column, so
  a database leak alone doesn't let anyone log in. Keys and salts travel as base64url
  without padding: the auth key is 43 characters, under bcrypt's 72-byte limit.
- **The client refuses key derivation parameters out of range,** on every derivation.
  They come from the server, which could otherwise ask for almost no work and guess
  the password cheaply from the auth key. The floor is OWASP's minimum
  (`m = 19 MiB, t = 2, p = 1`). The ceiling (`m = 256 MiB, t = 16, p = 4`) stops a server
  crashing a phone. Raising the ceiling later needs a client update first.
- **The recovery key is printed as Crockford base32** in groups of 5: 11 groups, 55
  characters. That's the key plus 2 bytes of `SHA-256("cereberus/v1/recovery-check" ||
  key)`, so a typo is caught on the device rather than using up the server's
  5-a-minute limit. Case, spaces, hyphens and look-alike letters are forgiven.

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
- Every field is required apart from `conflictOf`, so a damaged entry is an error and
  never a blank password. Fields a newer app added are kept and written back.
- `v` above what this app knows is refused as "update the app", on read and on write.
- Item ids must be canonical lowercase UUIDs, since two spellings of one id would be
  two different `aad`s and an entry that can't be opened.
- An entry that pads to more than 191 KiB is refused at encryption, because that's
  what fits the server's 256 KiB limit. Otherwise it would sit in a queue forever.

## For the review to check

Accepted so far, and worth a second opinion:

- **XChaCha20-Poly1305 isn't key-committing.** The classic attack on that is a
  crafted ciphertext that tests many password guesses at once. It's accepted here
  because the only password-derived key is the KEK, and a hostile server already holds
  `bcrypt(auth key)` and can guess offline anyway.
- **A hostile server can claim an account is still legacy.** Spec 4 guards against
  that, since a client fooled by it would send the typed password.
- **Nothing proves the set of entries is complete.** `seq` catches an old copy of an
  entry a device already holds; it can't catch a server hiding an entry from a new
  device.
- **Locking wipes keys, not everything.** Keys are measured gone from WebAssembly memory
  after locking, and checked wiped natively. Decrypted strings already given to the
  webview can't be reached, and only the WebAssembly build wipes parsing leftovers.
- **WebAssembly memory doesn't stop a hostile script.** Anything running in the page can
  read the key from memory while the vault is open. The content security policy is
  the defence, and Cloudflare could still replace the code entirely (Q3).
- **The default Argon2id cost has room to rise.** S3 hit its target with plenty to spare:
  even 128 MiB takes only 1.4 s on the phone's slowest cores. It stays at 64 MiB because
  older phones will be slower and only one phone was measured, and each account stores
  its own parameters so they can rise later. Worth asking whether 64 MiB is too cautious.

## Commits

### Commit 1 — `feat(vault-core): key derivation and entry encryption`

- [x] New crate `frontend/vault-core` with no Tauri dependency. It sits outside
  `src-tauri` because [`frontend/.dockerignore`](../../frontend/.dockerignore)
  excludes that directory and the web image needs this crate.
- [x] Dependencies, RustCrypto apart from the helpers: `argon2` 0.6, `hkdf` 0.13,
  `sha2` 0.11, `chacha20poly1305` 0.11, `zeroize`, `unicode-normalization`,
  `data-encoding` (base64url and base32 from one crate), `serde`, `serde_json`,
  `getrandom` 0.4. `static_assertions` for tests only.
- [x] API: `derive_keys`, `new_salt`, `create_vault`, `unwrap_vault_key`,
  `rewrap_vault_key`, `encrypt_entry`, `decrypt_entry`, `new_item_id`,
  `create_recovery_key`, `unwrap_with_recovery`, `RecoveryKey::{parse, to_display,
  recovery_auth}`.
- [x] Key types zeroize on drop and have no `Debug`, `Clone` or `Serialize`, checked at
  compile time. `Entry`'s `Debug` shows only `v` and `seq`, and errors carry no data.

### Commit 2 — `test(vault-core): fixed test vectors`

- [x] `frontend/vault-core/testdata/vectors.json`, **generated by a second
  implementation** (`generate-vectors.mjs`: libsodium and Node's crypto, written from
  this spec). The crate has to reproduce them byte for byte. Spec 3 runs the same
  vectors against the WebAssembly build.
- [x] Failure cases: wrong key, tampered ciphertext, wrong item UUID in the `aad`,
  unknown version prefix, broken padding, missing field, newer version. Each returns
  the expected error, and 2,000 rounds of hostile input never panic.
- [x] Unicode: precomposed and decomposed forms, and a compatibility ligature, derive
  the same keys as their normalised forms.
- [x] `.github/workflows/vault-core.yml` runs the tests on any change to the crate, since
  vectors only guard the format if something runs them. Not yet run on GitHub.

Verified 2026-10-30: 65 tests pass, clippy is clean, and it compiles for
`aarch64-linux-android`. The vectors matched the second implementation on the first
run. 20 deliberate format breaks (labels, Argon2 variant and version, normalisation,
padding, field names, parameter limits and more) were each caught by the vectors. None
of the 45 locked dependencies has an advisory in OSV. **Not yet run on a phone or as
WebAssembly.**

### Spikes — on a throwaway `spike/android-crypto` branch, not merged

An APK can only be built in CI, so S1 and S2 go in one APK, with a bare debug screen.
`tauri-android-build.yml` builds pull requests, so a draft PR from this branch gets an
APK without waiting for Spec 0's merge. It needs the signing secrets set.

The phone is plugged in with USB debugging on, so Claude installs the artifact and reads
`adb logcat`. S1's service is started with `am` after force-stopping the app, so
`MainActivity` isn't running. S2 still needs you, for the fingerprint prompts and for
enrolling a new fingerprint.

A debug APK compiles Rust unoptimised, because `src-tauri/Cargo.toml` sets no profile.
The spike needs the override Spec 3 adds, and logs one `derive_keys` timing, to confirm
S3 inside the app.

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
  - [x] Below Android 11 (API 30) the plugin doesn't call
    `setAllowedAuthenticators` (`BiometricActivity.kt:173`), and the app's
    `minSdk` is 24. **Decided: fingerprint unlock is offered on API 30+ only.** The test
    phone is API 37, so nothing could confirm the older behaviour.
- [x] **S3: Argon2id cost.** Time `derive_keys` on your phone. Target about 3 seconds at
  worst. Lower `m` or `t` only if that's missed, and not below OWASP's minimum
  (`m = 19 MiB, t = 2, p = 1`). **Well under target, so the parameters stay.**

  Measured 2026-10-31 on a Pixel 9a (Android 17), median of 3 to 7 runs:

  | Parameters | Any core | Slowest cores only | Phone's browser (Brave) |
  |---|---|---|---|
  | 64 MiB, t = 3 (default) | 130 ms (first run 240) | 700 ms | 150 ms |
  | 19 MiB, t = 2 (floor) | 30 ms (first run 90) | 140 ms | 30 ms |
  | 128 MiB, t = 3 | 270 ms (first run 350) | 1.4 s | 320 ms |

  The client's ceiling (256 MiB, t = 16, p = 4) took 2.6 s on any core. On this machine,
  Chromium took 120 ms at the default, 500 ms with the CPU slowed 4x and 1 second slowed
  8x.

  The native numbers come from a static `aarch64-unknown-linux-musl` build run through
  `adb shell`, not from inside the app, at cargo's default release settings, which the app
  also uses. The browser run used the WebAssembly build under the planned CSP. Unoptimised,
  as a debug APK is today, the default takes 2.3 s on any core and 8.7 s on the slowest,
  so don't judge these parameters from one.

  The same run passed all 8 key derivation vectors, 6 entry vectors and 11 failure cases
  in Brave, and the crate's 69 tests on the phone's CPU (with musl, not the app's bionic).
- [ ] **(you)** Push the branch and open a draft PR. Claude installs and runs it.

### Commit 3 — `feat(vault-core): compile to WebAssembly`

- [x] New crate `frontend/vault-core-wasm`, using `wasm-bindgen`, which keeps the vault
  key and KEK inside WASM memory and never returns them to JavaScript. A test lists
  everything JavaScript can call, so adding to that surface has to be deliberate.
- [x] Same vectors pass under WASM. Randomness comes from `crypto.getRandomValues`.
- [x] **Keys are held at one heap address, and the stack is scrubbed after each crypto
  operation.** This came from searching WASM memory, where plain arrays left 5 copies of
  the KEK and one survived freeing. Without scrubbing, 2 copies of the master key stay
  forever. This lives in `vault-core`, so the apps get it too.
- [x] **A wiping allocator in the WASM build.** The glue code frees strings after copying
  them to JavaScript, which left recovery keys and decrypted passwords in freed memory.
- [x] `tests/memory.test.mjs` searches all of WASM memory after each step, and
  `vault-core/tests/wiping.rs` inspects each block as it's freed, since the apps don't
  have that allocator.
- [x] CI builds and tests it (`vault-core.yml`), and `npm run build:wasm` and
  `npm run test:wasm` run it locally. Those need
  `rustup target add wasm32-unknown-unknown` and the `wasm-bindgen-cli` version
  `Cargo.toml` pins.

Verified 2026-10-30: 69 native tests and 25 through the JavaScript interface pass. Every
vector and failure case also passes in real Chromium, under a CSP of `script-src 'self'
'wasm-unsafe-eval'`; without `'wasm-unsafe-eval'` the CSP blocks it. libsodium reads what
the WASM build writes, the opposite direction from the vectors. Breaking each protection
in turn (the allocator, drop wiping, stack scrubbing, the method list, the summary hiding
the password) failed a test each time. `+simd128` was slower (157 ms against 128 ms), so
it's off. Run on a phone's browser on 2026-10-31 (see S3). **Not yet run in Safari, and CI
hasn't run this job yet.**

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
