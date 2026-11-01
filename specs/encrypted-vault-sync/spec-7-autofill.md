# Spec 7 — Android autofill

## Goal

Cereberus can be chosen as Android's autofill service and offer a saved login in
other apps and browsers, without opening the main app.

Android's autofill is a native service, so this is the one part written in Kotlin. It
lives inside the existing Tauri Android project, and uses `vault-core` through the JNI
path proven by spike S1 in Spec 1. If S1 failed, redo this spec's crypto section first.

## Decisions

- **The service works from the local vault file.** It needs no server or webview, which
  isn't available in a service anyway, so its UI is native Android views.
- **The service holds no keys while idle.** Every fill offers "Unlock Cereberus" first;
  a fingerprint or master password prompt in a native activity decrypts just enough to
  answer that one request.
- **A wrong match is a phishing hole,** so matching is strict:
  - In a browser: the page's domain must match the entry's URL (same registrable
    domain).
  - In an app: no guessing from the package name. The first time, you choose the entry
    and confirm; the pairing is stored in the entry.
  - No match means nothing is offered unprompted. A search screen is still available,
    and using it for a mismatched site shows a warning.
- **Fill only, not save,** in the first version.

## Commits

### Commit 1 — `feat(android): JNI bridge to vault-core`

- [ ] JNI functions in `app_lib` for reading the vault file, unlocking and decrypting
  entries. The spike's version, made real.
- [ ] Decrypted data is returned for one request and not retained. Keys are zeroized
  after use.

### Commit 2 — `feat(android): autofill service`

- [ ] `CereberusAutofillService.kt` beside
  [`MainActivity.kt`](../../frontend/src-tauri/gen/android/app/src/main/java/com/cereberus/app/MainActivity.kt),
  with a manifest entry using `android.permission.BIND_AUTOFILL_SERVICE`, the
  `android.service.autofill.AutofillService` intent filter, and its XML config.
- [ ] Autofill needs API 26, and the app's `minSdk` is 24. Keep the service off below 26.
- [ ] `onFillRequest` finds username and password fields from `AssistStructure`, plus
  the package name and web domain.
- [ ] Answers with an authenticated `FillResponse`, so nothing is decrypted until you've
  unlocked.
- [ ] `gen/android` is hand-maintained: keep these additions, and don't regenerate over them.

### Commit 3 — `feat(android): unlock and pick screen`

- [ ] Native activity: fingerprint or master password, then the matching entries, or a
  search.
- [ ] Returns a `Dataset` for the chosen entry.
- [ ] Uses `FLAG_SECURE`.

### Commit 4 — `feat(android): strict matching`

- [ ] Registrable-domain comparison, using a public suffix list so `example.co.uk` and
  `evil.co.uk` don't match. Check how a list should be kept up to date.
- [ ] Add `androidPackages: []` to the encrypted entry payload for confirmed app pairings
  (`"v": 1` allows optional fields, so no format change).
- [ ] Decide which browsers' reported web domains are trusted, since any app can claim
  one. Start from a short list of known browsers.

### Commit 5 — `feat(frontend): autofill setup in Settings`

- [ ] Android-only Settings card: shows whether Cereberus is the current service, and opens
  the system picker (`ACTION_REQUEST_SET_AUTOFILL_SERVICE`).
- [ ] Update [`frontend/README.md`](../../frontend/README.md).

## Acceptance criteria (all on a real phone, you)

- [ ] Choose Cereberus as autofill in system settings.
- [ ] Fill a login in Chrome, on the right site, with the main app not running and the
  phone offline.
- [ ] Fill a login in another app, after confirming the pairing once.
- [ ] A lookalike domain gets no suggestion.
- [ ] Cancelling the unlock fills nothing, and no decrypted data remains.
- [ ] After an edit in the main app, autofill offers the new password.
- [ ] Autofill prompts don't appear within Cereberus itself.

## Out of scope

- Saving new logins from autofill. Passkeys and Android's Credential Manager; worth
  considering after this works. Autofill on Linux, where no such system service exists.

## Tests

Kotlin unit tests for field detection and the domain matcher, since that's where a
mistake becomes a security bug. Rust tests for the JNI-facing functions. Field detection
varies widely between apps, so expect to add cases from real use.
