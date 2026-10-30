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

## Your steps, in order

- [ ] **(you)** Back up the keystores somewhere off this machine:
  `~/.android/cereberus-release.keystore`, `~/.android/cereberus-release.password`,
  `~/.android/cereberus-debug.keystore`. A lost release key means updates stop
  installing over the old app.
- [ ] **(you)** Set the signing secrets:
  ```bash
  R=daedalus1215/cereberus-frontend-backend
  base64 -w0 ~/.android/cereberus-release.keystore | gh secret set ANDROID_RELEASE_KEYSTORE_BASE64 --repo $R
  gh secret set ANDROID_RELEASE_KEYSTORE_PASSWORD --repo $R < ~/.android/cereberus-release.password
  base64 -w0 ~/.android/cereberus-debug.keystore | gh secret set ANDROID_DEBUG_KEYSTORE_BASE64 --repo $R
  ```
- [ ] **(you)** Commit to a branch and open a PR. `tauri-android-build.yml` builds
  the debug APK; download the `cereberus-android-debug-apk` artifact and install it.
- [ ] **(you)** In Cloudflare Zero Trust, create a service token and add a
  **Service Auth** policy for it on Cereberus's Access application. Without a
  token, the app can only reach the LAN address.

## Checks nobody has been able to run yet

**On the phone (you)**

- [ ] Connect with the public hostname and the service token. This is the first
  test against real Cloudflare Access; only a stub has been used so far.
- [ ] Connect with the LAN address and blank token fields while at home.
- [ ] Log in, reveal an entry, copy a password. It pastes correctly, and
  Android's clipboard preview hides it.
- [ ] Open an entry's link. It opens in the phone's browser.
- [ ] Status and navigation bars don't cover the app. The launcher icon isn't
  clipped.
- [ ] Install a second build over the first; connection settings survive.

**On this machine (you)**

- [ ] In the installed desktop app on Hyprland, copy a password and paste it.
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
- `FLAG_SECURE`; it comes with Spec 5, when the vault is actually on the phone.

## Tests

- Frontend: copying an unrevealed entry fetches and copies the real value;
  copying a revealed entry makes no request; a failed fetch doesn't report
  success.
