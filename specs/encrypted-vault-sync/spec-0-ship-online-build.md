# Spec 0 — Ship the online-only build

## Goal

The Tauri work now uncommitted on `main` becomes a merged, released app, checked
on a real phone. Later specs need the CI pipeline working from `main`, and this
app is what's used until Spec 4 ships.

Nothing from the vault is stored on the device in this build.

## Commits

### Commit 1 — `fix(frontend): copy the real password when it isn't revealed`

- [x] [`PasswordCell.tsx`](../../frontend/src/pages/HomePage/components/PasswordTable/PasswordCell.tsx)
  and [`PasswordCard.tsx`](../../frontend/src/pages/HomePage/components/PasswordTable/PasswordCard.tsx)
  passed `row.password` to the copy handler. Until an entry is revealed that's the
  `********` mask set by
  [`fetch-passwords.transaction.script.ts:14`](../../backend/src/password/domain/transaction-scripts/fetch-passwords.transaction.script.ts),
  so the mask landed on the clipboard and the app reported success.
- [x] They now pass the entry id. New
  [`copyEntryPassword.ts`](../../frontend/src/pages/HomePage/components/PasswordTable/copyEntryPassword.ts)
  fetches the real password unless it's already revealed.
- [x] If the fetch fails, an error shows rather than the copied message.
- [x] [`ViewPasswordModal.tsx`](../../frontend/src/pages/HomePage/components/PasswordTable/ViewPasswordModal.tsx)
  uses the same helper. Its copy button was greyed out until you revealed the
  password, and reopening the dialog after an earlier reveal left it enabled but
  copying nothing on the first click.

Verified 2026-10-30: 5 new unit tests, and the real UI driven in headless Chromium
against a stub API that masks the list as the real one does. Table, view dialog and
phone-width cards all copied the right value. Revealed entries made no new request.
A failed fetch left the clipboard alone and showed an error. A dialog reopened on
another entry copied that entry. Not yet run on Android or under Wayland; those are
the checks below.

Spec 3 replaces this code, but it was a broken path in a password manager until
then.

### Commit 2 — `fix(android): align the native library for 16 KB pages`

- [x] The first CI APK's `libapp_lib.so` has its segments aligned for 4 KB (`0x1000`),
  NDK 27's default. Android 17 warns about it each time the debug app opens. It runs
  normally on a 4 KB phone, but phones with 16 KB pages need the library aligned for them.
- [x] [`frontend/.cargo/config.toml`](../../frontend/.cargo/config.toml) passes the linker
  flag on Android only.
- [x] The next APK's library shows `0x4000` in `readelf -lW`, and sits on a 16 KB boundary
  inside the APK (run 41305275855).
- [x] On the phone, the warning no longer appears.

Verified 2026-11-01, without an APK: in a test crate, the flag reached a stand-in linker
alongside flags set the way Tauri sets them, and on this machine it moved a real library
from `0x10000` to `0x4000`.

### Commit 3 — `feat(frontend): a smaller logo in the app icons`

- [x] The logo filled its icon, which looked too large beside Chronus, Nemesis and Omega.
  [`generate-app-icons.mjs`](../../frontend/scripts/generate-app-icons.mjs) now draws it at
  their size, with its lines thickened a little so they stay clear on a home screen.
  `npm run generate-app-icons` cut the rest.

### Commit 4 — `feat(android): block screenshots, and lock after 5 minutes in the background`

These were planned for Spec 5. You asked for them now (2026-11-01).

- [x] `FLAG_SECURE` in [`MainActivity.kt`](../../frontend/src-tauri/gen/android/app/src/main/java/com/cereberus/app/MainActivity.kt),
  always on for now. The Settings toggle stays in Spec 5.
- [x] [`background-lock.ts`](../../frontend/src/tauri/background-lock.ts): the Tauri app
  signs out on coming back after 5 minutes or more in the background. Today that means
  signing out, because there's no vault key to wipe yet.
- [x] `logout` empties the TanStack Query cache, which held revealed passwords. They were
  staying in memory after every sign-out.

Verified 2026-11-01: 5 new unit tests, which fail if the timer logic is broken. In headless
Chromium against a stub API, logging out left no token or entries behind and logging back in
showed nothing until the server answered; without the fix, the old list came straight from
the cache. **Only a phone can show that Android's WebView reports going to the background,**
and the Kotlin line has only been compiled by CI. Those are the checks below.

## Your steps, in order

- [ ] **(you)** Back up the keystores somewhere off this machine:
  `~/.android/cereberus-release.keystore`, `~/.android/cereberus-release.password`,
  `~/.android/cereberus-debug.keystore`. A lost release key means updates stop
  installing over the old app.
- [x] **(you)** Set the signing secrets:
  ```bash
  R=daedalus1215/cereberus-frontend-backend
  base64 -w0 ~/.android/cereberus-release.keystore | gh secret set ANDROID_RELEASE_KEYSTORE_BASE64 --repo $R
  gh secret set ANDROID_RELEASE_KEYSTORE_PASSWORD --repo $R < ~/.android/cereberus-release.password
  base64 -w0 ~/.android/cereberus-debug.keystore | gh secret set ANDROID_DEBUG_KEYSTORE_BASE64 --repo $R
  ```
- [x] **(you)** Commit to a branch and open a PR. `tauri-android-build.yml` builds
  the debug APK; download the `cereberus-android-debug-apk` artifact and install it.
  PR #31. The first APK installed and opened on 2026-11-01, with no crash in the logs.
- [ ] **(you)** In Cloudflare Zero Trust, create a service token and add a
  **Service Auth** policy for it on Cereberus's Access application. Without a
  token, the app can only reach the LAN address.

## Checks nobody has been able to run yet

**On the phone (you)**

- [ ] Connect with the public hostname and the service token. This is the first
  test against real Cloudflare Access; only a stub has been used so far.
- [x] Connect with the LAN address and blank token fields while at home.
- [x] Log in, reveal an entry, copy a password. It pastes correctly, and
  Android's clipboard preview hides it.
- [x] Open an entry's link. It opens in the phone's browser.
- [x] Status and navigation bars don't cover the app. The launcher icon isn't
  clipped.
- [x] Install a second build over the first; connection settings survive.
- [x] The launcher icon is the right size beside the other apps.
- [ ] A screenshot is refused, and the app is blank in recent apps.
- [ ] Coming back after 5 minutes or more in the background goes to the sign-in page.
  Coming back sooner doesn't.

**On this machine (you)**

- [x] In the installed desktop app on Hyprland, copy a password and paste it.
  Copying has only been tested under X11.

## Finish

- [ ] **(you)** Merge the PR.
- [ ] **(you)** `git tag v0.1.0 && git push origin v0.1.0`, then install the signed
  release APK from the GitHub Release.

## Acceptance criteria

- `main` holds the Tauri work, and all three workflows have run green.
- The release APK is installed and has been used against the real server.
- Copying gives the real password whether or not the entry is revealed.

## Out of scope

- Any change to how the vault is encrypted (Specs 1–4).

## Tests

- Frontend: copying an unrevealed entry fetches and copies the real value;
  copying a revealed entry makes no request; a failed fetch doesn't report
  success.
