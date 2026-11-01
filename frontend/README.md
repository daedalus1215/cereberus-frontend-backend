# Cerberus Frontend
* Typescript
* React
* Vite
* ShadCN

## Desktop and Android apps

Tauri packages the React build into an Android app and a Linux desktop app,
both from `src-tauri/`. The apps carry their own copy of the UI and talk to a
Cereberus server over the network. On first launch they ask for the server's
address and, if Cloudflare Access protects the server, an Access service
token: Access's sign-in page is meant for browsers, so the apps get through
with the token instead. Logging in to Cereberus then works as on the web.
**Server settings** on the login screen, or **Connection** in Settings,
changes them later. If Access turns the token away, the app opens the
connection settings and says so, rather than signing you out.

```bash
npm run desktop:dev        # desktop app against the Vite dev server
npm run desktop:build      # release build: src-tauri/target/release/cereberus-desktop,
                           # plus .deb, .rpm and AppImage bundles
npm run desktop:install    # release build, installed for this user with a launcher entry
npm run desktop:uninstall  # removes that again (settings stay in ~/.config/com.cereberus.app.desktop)
npm run build:tauri        # the web build the apps ship (no service worker)
npm run generate-app-icons # redraw the desktop and Android icons from public/cerberus.svg
npm test                   # unit tests (vitest)
```

Linux builds need WebKitGTK and friends (`libwebkit2gtk-4.1-dev`,
`librsvg2-dev`; on Arch, `webkit2gtk-4.1 librsvg`) and Rust 1.90 or later.
The app-only code is in `src/tauri/`; on the web it does nothing.

The token is entered on the device, never built into the app: anyone can
download this repo's CI artifacts and releases. To make one, create a service
token in Cloudflare Zero Trust, then add a policy to Cereberus's Access
application with the **Service Auth** action that includes it. Leave both
token fields blank for a server Access doesn't protect, such as one on your
LAN.

### What's different from the siblings

Chronus, Nemesis and Omega are the same shape, but this one holds passwords:

- **No offline mode.** Nothing from the vault is stored on the device, so
  there's nothing to read off a lost phone, and the app needs the server.
- **You log in every launch.** The session token stays in `sessionStorage`
  (`src/auth/tokenStorage.ts`), which goes when the app closes.
- **Copying and opening links go through Rust** (`src/tauri/clipboard.ts`,
  `src/tauri/open-url.ts`). Android's WebView refuses `navigator.clipboard`,
  and `window.open` does nothing in these webviews. Passwords are copied
  marked as sensitive: Android's clipboard preview hides them, and Linux
  clipboard managers are asked to leave them out of their history.
- **Android backups are off** (`android:allowBackup`), so the stored Access
  token stays out of cloud backups.

### Android

The app is `com.cereberus.app` (arm64). CI builds it as a signed release APK
when you push a version tag:

```bash
git tag v0.1.0 && git push origin v0.1.0
```

`.github/workflows/tauri-android-release.yml` then attaches
`cereberus-0.1.0.apk` to a GitHub Release (Actions → Run workflow builds one
without publishing it). Install it by opening the APK on the phone, or with
`gh release download v0.1.0 --repo daedalus1215/cereberus-frontend-backend -p '*.apk'`
and `adb install -r cereberus-0.1.0.apk`. Being a release build, nothing
connected over USB can read what the app stores (`run-as`, the WebView
inspector).

Pull requests build the debug app (`com.cereberus.app.debug`,
`tauri-android-build.yml`; Run workflow builds one from any branch), which
installs beside the release one. Download the `cereberus-android-debug-apk`
artifact and `adb install -r` it.

Each build installs over the last, keeping its data, only because they're all
signed with the same key. The keys live in the repository secrets:

| Secret | What |
|--------|------|
| `ANDROID_RELEASE_KEYSTORE_BASE64` | the release keystore (alias `cereberus-release`), base64-encoded |
| `ANDROID_RELEASE_KEYSTORE_PASSWORD` | its password |
| `ANDROID_DEBUG_KEYSTORE_BASE64` | the debug keystore (alias `androiddebugkey`, password `android`), base64-encoded |

The release workflow refuses to publish an APK whose certificate doesn't match
the fingerprint it pins (`RELEASE_CERT_SHA256`), and the debug one checks the
APK was signed with the secret's key. Keep a backup of both keystores
(`~/.android/cereberus-*` on the machine that made them): an app signed with a
different key won't install over the old one without uninstalling it, which
loses what's stored on the phone. The `ANDROID_SERVER_URL` repository
variable prefills the address on the first-launch screen; it ends up in the
public APK, so leave it unset to keep the address out.

Building the Android app locally needs the Android SDK and NDK 27
(`NDK_HOME`), then `npx tauri android build --debug --apk --target aarch64`.
Google only ships those for x86-64 Linux, so on an arm64 machine use CI.

### package-lock.json

The lock has to list every platform's native packages (rolldown, lightningcss,
rollup, sass-embedded, sharp), or `vite` won't run on the platforms left out.
Regenerating it inside `node:22-alpine` drops them, so update it with npm 11
on the host (`npm install --package-lock-only --ignore-scripts`). The result
passes `npm ci` under npm 10 too, which is what the Dockerfile and CI use.

### Checklist
This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

### Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
