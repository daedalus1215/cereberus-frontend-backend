# Spec 1 — Crypto design and `vault-core`

## Goal

A reviewed design and one tested Rust crate that does all the crypto, proven on
a real phone before anything depends on it. This spec ends with the format
frozen, so every risky assumption is tested here.

## What this protects against

| Who | Today | After Spec 4 |
|---|---|---|
| Cloudflare reading traffic | Login password, every revealed password, all names, usernames, URLs and notes | Ciphertext, sizes, timing, who logged in, **and the auth key**, which is static. With it, it can log in as you, overwrite entries, change your master password, replace your recovery key (devices warn, Spec 5), and guess the password offline, as in the leaked database row. It can't read an entry without guessing the password |
| Cloudflare altering what it serves | Can steal everything | **Web app: still can.** Apps carry their own UI and aren't exposed to this |
| A leaked database or backup | Everything but passwords in plaintext; passwords readable with a key on the same server | Ciphertext and a hash; the attacker has to guess the master password through Argon2id |
| A stolen session token (valid for `JWT_EXPIRES_IN`) | Can read the whole vault | Can read ciphertext. Can overwrite the server's copy, but can't forge a delete: devices keep their copy of anything that doesn't decrypt or is older. The web app has no copy of its own, so it sees what the server has |
| Someone running the server | Everything | Can't read or forge entries. Can withhold them, hide them from a new device, or serve it old versions. `seq` below catches old versions on any device holding a newer copy |
| An old backup plus an old password or recovery key | Not applicable | Opens the vault, including entries written since, because changing either doesn't change the vault key. Rotation isn't built (Q7) |
| A lost, locked phone | Nothing stored | Ciphertext; depends on master password strength and the phone's lock |
| Malware or root on an unlocked device | Out of scope | Out of scope |

Still visible to the server after all this: the username, how many entries
exist, when they change, and rough sizes.

## The format

**Keys**

```
master password
  normalised to NFKC (a phone and a laptop can type different bytes for the same text)
  + salt: 16 random bytes per account, stored on the server
  Argon2id(m = 128 MiB, t = 3, p = 1), parameters stored per account so they can rise later
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
  the password cheaply from the auth key. The client can't tell it's been asked for less
  until the key has been sent, so the floor (`m = 64 MiB, t = 3, p = 1`) is well above
  OWASP's minimum: at most a server makes guesses about 4 times cheaper than the default.
  The ceiling (`m = 256 MiB, t = 16, p = 1`) stops a server crashing a phone. Raising the
  ceiling later needs a client update first.
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

A deleted entry adds `"deleted": true`, a higher `seq`, and has every other field blank.

- Encrypted with XChaCha20-Poly1305 under the vault key, with a random 24-byte
  nonce and `aad = "cereberus/v1/item|<item uuid>"`, so the server can't swap one
  entry's ciphertext into another's slot.
- Stored as text: `cv1.<base64url(nonce || ciphertext)>`.
- `seq` goes up by one on every edit. It's inside the encryption, so the server
  can't forge it. A device only takes an incoming copy with a higher `seq` than the
  one it holds (Spec 5 has the rule).
- Tags are names inside the entry. There's no separate tag table any more.
- **A delete is an encrypted version of the entry,** not a signal from the server. It
  can't be forged, and because it keeps `seq`, it can't be used to get a device to accept
  an older copy afterwards. The server can't read it, though an entry shrinking to one block
  with no later changes is a strong hint. Writing one with anything left in it is refused.
- Every field is required apart from `conflictOf` and `deleted`, so a damaged entry is an
  error and never a blank password. Fields a newer app added are kept and written back.
- `v` above what this app knows is refused as "update the app", on read and on write.
- Item ids must be canonical lowercase UUIDs, since two spellings of one id would be
  two different `aad`s and an entry that can't be opened.
- An entry that pads to more than 191 KiB is refused at encryption, because that's
  what fits the server's 256 KiB limit. Otherwise it would sit in a queue forever. Anything
  longer is refused before decoding, so a hostile server can't make a device allocate at will.

## Review, 2026-11-01

A fresh-context review of the crates and specs, and `/security-review` of what PR #31 merged.
**No critical findings, and the construction held everywhere it was attacked.** The problems
were in the protocol built on it. This isn't a professional audit (Q2).

| # | Finding | Severity | Outcome |
|---|---------|----------|---------|
| 1 | Deletes were unauthenticated, so a stolen token could wipe every device, and a delete marker erased the `seq` that catches old copies | High | **Fixed, in the format.** A delete is an encrypted tombstone. Specs 2, 5 and 6 follow |
| 2 | A hostile server can ask for the floor and get a cheap password check | Medium | **Fixed.** Default raised to 128 MiB, floor to 64 MiB and `t = 3`, one lane only. Devices pin their parameters (Spec 5), and registration checks strength (Spec 3). A new device or web login can still be asked for the floor, which is accepted: that's what a floor is for |
| 3 | The auth key is a static credential crossing Cloudflare | Medium | **Accepted, and now in the table above.** Removing it needs challenge-response, which can be added later without touching the vault |
| 4 | Changing the password or recovery key revokes nothing against an old backup | Medium | **Accepted, and now in the table above.** Rotation is Q7. Re-encrypting uses the same format, so it doesn't block the freeze |
| 5 | Recovery proof never rotates, recovery key can't be replaced, sessions survive a password change, and `PUT /users/password` stays open | Medium | **Fixed in Specs 2 and 4,** before they're built |
| 6 | The `seq` rule only covered pulls, and each client would write its own | Medium | **Fixed in Specs 5 and 6:** one tested function in `vault-core`, and failing to decrypt means keep the local copy |
| 7 | Argon2 frees its memory unwiped, and the master key can be rebuilt from it. Encrypting left the password in freed blocks | Low | **Fixed in `vault-core`.** Spec 3 makes the wiping allocator required |
| 8 | `decryptSummary` only removed `password`, so a secret field from a newer app reached JavaScript | Low | **Fixed:** an allow list |
| 9 | No size limit before decoding a ciphertext | Low | **Fixed** |
| 10 | The backend's log serializer named `req.body`. Harmless only because pino passes a wrapper | Low | **Fixed:** removed |
| 11 | The connection form re-sent the saved Access secret to a new address, even while signed out, and the next login's password followed | Medium | **Fixed.** The saved secret never goes to a new address, a change of server signs out, and the login screen shows the server |
| 12 | Setting the clock back stopped the background lock firing | Low | **Fixed** |

The reviewer then checked those fixes, and **nothing further changes the format.** It re-ran the
vector generator and got a byte-identical file. It also found problems in the fixes, and one it
had missed, which are fixed as well:

| # | Finding | Severity | Outcome |
|---|---------|----------|---------|
| 13 | Checking conflict replies against the pending edit refused real ones, with a false rollback warning | Medium | **Fixed in Spec 6:** they're compared with the last synced copy |
| 14 | Rotating recovery on use let anyone reading traffic race the proof and destroy recovery, and the new key was thrown away | Medium | **Fixed in Specs 2, 3 and 5:** `recover/start` takes no proof, devices keep a copy of the wrap, and the user confirms the new key first |
| 15 | A 401 could reach sign-out and delete the local copy, and an unverified wrap could replace the only local way in | Medium | **Fixed in Spec 5** |
| 16 | The migration endpoints had no guard, so a stolen token could overwrite a migrated account's keys | Medium | **Fixed in Spec 4** |
| 17 | At equal `seq`, a server could flip a device between two real versions | Low | **Fixed in Spec 5:** pulls need a higher `seq` |
| 18 | A tombstone could hold a real password, and revealing one returned a blank | Low | **Fixed in `vault-core`** |
| 19 | Running out of memory aborted, and a server can ask for 256 MiB | Low | **Fixed in `vault-core`:** `OutOfMemory` |
| 20 | The WebAssembly glue copies a ciphertext before Rust's length check | Low | **Fixed in Spec 3:** check the length in the wrapper |
| 21 | Junk on the server never healed, and "doesn't decrypt" could let an old device overwrite a newer entry | Low | **Fixed in Spec 6** |
| 22 | A login in the same second as a master password change looked older than it | Low | **Fixed in Spec 2** |

**Accepted risks, with the review's verdict:**

- **XChaCha20-Poly1305 isn't key-committing. Accepted.** The attack it allows is testing many
  password guesses at once, and a hostile server already receives the auth key, which does
  that directly. Every other key is random. Revisit only if login moves to a PAKE.
- **A hostile server can claim an account is still legacy. Accepted, with conditions** now in
  Spec 4: the check tests the real address rather than a name, and the screen isn't in the web
  build. Over plain HTTP, a LAN attacker can still spoof this on a fresh install.
- **Nothing proves the set of entries is complete. Accepted.** `seq` catches an old copy of an
  entry a device already holds. It can't catch a server hiding an entry from a new device, or
  two versions of an entry with equal `seq`. A manifest can be added after the freeze.
- **Locking wipes keys, not everything. Accepted.** Keys are measured gone from WebAssembly
  memory and checked wiped natively. Decrypted strings already given to the webview can't be
  reached. Parsing still leaves copies natively until Spec 3's allocator.
- **WebAssembly memory doesn't stop a hostile script. Accepted.** Anything running in the page
  can read the key while the vault is open. The content security policy is the defence, and
  Cloudflare could still replace the web app's code. One web login on the public hostname can
  expose the master password, which is why Q3's default matters. `tauri.conf.json` still has
  `"csp": null` until Spec 3's Commit 6, so the table's "apps aren't exposed" depends on that.

**Dependencies:** every locked crate is a stable release, with RustSec's recent advisories
patched at the locked versions. Only the AEAD code has ever had an audit (NCC, 2020, of an
earlier version). The vectors from a second implementation are the mitigation, and Spec 3 adds
`cargo audit` to CI.

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

An APK can only be built in CI, so these go in one APK, with a bare debug screen.
`tauri-android-build.yml` builds pull requests, so a draft PR from this branch gets an
APK without waiting for Spec 0's merge. It needs the signing secrets set.

The screen shows every result itself, including why the last run crashed, because a phone
isn't always plugged in. S1's service starts from a notification button, so it can run with
the app closed.

A debug APK compiles Rust unoptimised, because `src-tauri/Cargo.toml` sets no profile.
The spike needs the override Spec 3 adds, and shows one `derive_keys` timing, to confirm
S3 inside the app.

- [x] **S1: Rust from a Kotlin service.** A small Android `Service` calls a JNI
  function in `app_lib` that uses `vault-core`, with `MainActivity` not running.
  Tauri has no direct Kotlin-to-Rust call, so this is the assumption autofill
  rests on. If it fails, stop and rethink before freezing the format: Android has
  no built-in XChaCha20, so a Kotlin decrypt would need a library or AES-256-GCM.
  **Passed 2026-11-01** on a Pixel 9a (Android 17). A service in its own process, started
  from a notification with the app's main process confirmed not running, loaded `app_lib`,
  opened the vault and an entry from the test vectors, then re-encrypted the entry and read
  it back. In that background process `derive_keys` took 1.1 to 1.3 s at 64 MiB, against
  120 ms in the foreground, so autofill should derive keys in a foreground activity instead.
- **S2: Fingerprint-protected key. Dropped 2026-11-01:** you don't want fingerprint unlock.
  If it ever comes back, note what the source of `tauri-plugin-biometric` 2.5.0 showed. It
  handles the plaintext as JVM strings that can't be wiped, including a static field that
  keeps it after encrypting. Its `status` checks `BIOMETRIC_WEAK` while its cipher needs
  `BIOMETRIC_STRONG`. Below Android 11 it doesn't restrict which authenticators count.
- [x] **S3: Argon2id cost.** Time `derive_keys` on your phone. Target about 3 seconds at
  worst. Lower `m` or `t` only if that's missed, and not below OWASP's minimum
  (`m = 19 MiB, t = 2, p = 1`). **Well under target.** The review then raised the default
  to 128 MiB and the floor to 64 MiB, which still meets it.

  Measured 2026-10-31 on a Pixel 9a (Android 17), median of 3 to 7 runs:

  | Parameters | Any core | Slowest cores only | Phone's browser (Brave) |
  |---|---|---|---|
  | 128 MiB, t = 3 (now the default) | 270 ms (first run 350) | 1.4 s | 320 ms |
  | 64 MiB, t = 3 (now the floor) | 130 ms (first run 240) | 700 ms | 150 ms |
  | 19 MiB, t = 2 (the old floor) | 30 ms (first run 90) | 140 ms | 30 ms |

  256 MiB, t = 16, p = 4 took 2.6 s on any core, and four lanes are no longer allowed. On
  this machine, Chromium took 120 ms at 64 MiB, 500 ms with the CPU slowed 4x and 1 second
  slowed 8x.

  The native numbers come from a static `aarch64-unknown-linux-musl` build run through
  `adb shell`, not from inside the app, at cargo's default release settings, which the app
  also uses. The browser run used the WebAssembly build under the planned CSP. Unoptimised,
  as a debug APK is today, 64 MiB takes 2.3 s on any core and 8.7 s on the slowest, so
  don't judge these parameters from one.

  The same run passed all 8 key derivation vectors, 6 entry vectors and 11 failure cases
  in Brave, and the crate's 69 tests on the phone's CPU (with musl, not the app's bionic).

  Confirmed inside the app the same day, at 64 MiB, in the foreground of a debug APK with
  `argon2` and `blake2` optimised: 120 ms, and 160 ms on the first run.
- [x] **(you)** Push the branch and install the APK from its run. The branch is
  `spike/android-crypto`, built with Run workflow, so there's no PR to merge by accident
  (run 41311994877). You then plugged the phone in, so Claude ran S1 and S3 over `adb`.

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
it's off. Run on a phone's browser on 2026-10-31 (see S3), and both CI jobs passed the same
day. **Not yet run in Safari.**

## Review gate

- [x] Fresh-context review of this spec and the crate, given the code and not
  these conclusions (Q2).
- [x] Every finding fixed or written down here with a reason. See "Review" above.
- [x] **(you)** Read the table at the top and accept what it leaves exposed. Accepted
  2026-11-01.
- [x] Mark **Format frozen** in the README. Later changes need a new `cv2` format
  and a re-encrypting upgrade path.

## Acceptance criteria

- `cargo test` passes natively, and the same vectors pass under WebAssembly.
- S1 and S3 each have a recorded result from a real phone.
- The review gate is complete.

## Out of scope

- Anything calling this crate from the app (Spec 3).
- Sharing entries between accounts; one vault key per account is enough.
