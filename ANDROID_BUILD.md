# Ghar Kharcha — Android APK / Play Store Build Guide

This project is fully Capacitor Android-ready. Lovable cannot compile an APK (that needs the
Android SDK + Gradle), so **no APK file has been produced here** — run the steps below on your
machine (or in GitHub Actions) to generate `Ghar-Kharcha.apk`.

- **App name:** Ghar Kharcha
- **Application ID:** `com.gharkharcha.app`
- **Version:** versionName `1.0.0`, versionCode `1`
- **Config file:** `capacitor.config.ts`

The Android app runs entirely inside its own native Capacitor WebView. It loads
`https://ghar-kharcha-guardian.lovable.app` because the app is a server-rendered TanStack Start
app (auth, AI assistant, server functions). `server.allowNavigation` keeps every internal link
inside the native container — Chrome is never launched for normal navigation. Only explicit
user actions (e.g. "Share on WhatsApp") open an external app.

Publishing an update from Lovable updates the installed app instantly — no Play re-submission
needed for web changes.

---

## 1. Prerequisites

- Node 20+ and Bun (or npm)
- [Android Studio](https://developer.android.com/studio) (includes Android SDK + JDK 17)
- A Google Play Console account ($25 one-time) for publishing

## 2. Generate the Android project

```bash
git clone <your-repo-url>
cd <repo>
bun install
bun run build            # produces dist/client
npx cap add android      # creates the ./android folder (run once)
npx cap sync android
```

`cap add android` reads `capacitor.config.ts`, so the generated project already has
`applicationId "com.gharkharcha.app"` and app name **Ghar Kharcha**.

## 3. Set the version and SDK levels

In `android/app/build.gradle`:

```gradle
defaultConfig {
    applicationId "com.gharkharcha.app"
    minSdkVersion 23        // Android 6+; covers Android 10–15
    targetSdkVersion 35     // Android 15 — required by Play
    versionCode 1
    versionName "1.0.0"
}
```

Bump `versionCode` and `versionName` on every Play upload.

## 4. Run on a device / emulator

```bash
npx cap open android     # opens Android Studio
```

Press **Run ▶**. Debug APK from the CLI:

```bash
cd android
./gradlew assembleDebug
# output: android/app/build/outputs/apk/debug/app-debug.apk
```

## 5. Create a signing key (once)

```bash
keytool -genkey -v -keystore ghar-kharcha.keystore \
  -alias gharkharcha -keyalg RSA -keysize 2048 -validity 10000
```

Keep this file and its passwords safe — losing it means you can never update the app on Play.

Create `android/key.properties`:

```properties
storePassword=YOUR_STORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=gharkharcha
storeFile=../../ghar-kharcha.keystore
```

In `android/app/build.gradle`, above `android {`:

```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

and inside `android { ... }`:

```gradle
signingConfigs {
    release {
        keyAlias keystoreProperties['keyAlias']
        keyPassword keystoreProperties['keyPassword']
        storeFile file(keystoreProperties['storeFile'])
        storePassword keystoreProperties['storePassword']
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        shrinkResources true
    }
}
```

## 6. Build the release artifacts

```bash
cd android
./gradlew assembleRelease  # signed APK
./gradlew bundleRelease    # AAB — required by Google Play
```

Outputs:
- `android/app/build/outputs/apk/release/app-release.apk` → rename to `Ghar-Kharcha.apk`
- `android/app/build/outputs/bundle/release/app-release.aab`

## 7. App icons and splash

Place a 1024×1024 PNG at `resources/icon.png` and a 2732×2732 PNG at `resources/splash.png`
(brand green `#0F5132`), then:

```bash
bun add -d @capacitor/assets
npx capacitor-assets generate --android
npx cap sync android
```

The splash screen is configured in `capacitor.config.ts` (`launchAutoHide: false`) and is hidden
by the app itself once React has mounted — see `src/lib/capacitor-native.ts`.

## 8. What the native layer already handles

Implemented in `src/lib/capacitor-native.ts`, wired from `src/routes/__root.tsx`:

- **Hardware back button** — navigates back inside the app; exits only at the app root.
- **Status bar** — dark icons over `#0F5132`, not overlaying the WebView (safe-area padding
  already comes from `viewport-fit=cover`).
- **Splash screen** — hidden programmatically after mount, so no white flash.
- **External links** — only opened on an explicit user tap (`openExternalUrl`).
- **Storage** — the WebView keeps localStorage/IndexedDB and the Lovable Cloud auth session
  persistent across app restarts.
- **Offline** — the existing service worker caches shell assets; server-backed screens need
  connectivity as before.

## 9. Upload to Google Play

1. Play Console → **Create app** → name "Ghar Kharcha", type App, Free.
2. Upload the `.aab` under **Production → Create new release**.
3. Complete: Store listing (icon 512×512, feature graphic 1024×500, screenshots),
   Content rating, Data safety, Privacy policy URL, Target audience.
4. Submit for review (typically 1–7 days).

### Play policy note

Google rejects apps that are *only* a webview with no added value. This build includes native
splash, status-bar and back-button integration. To strengthen the submission, consider adding
push notifications for bill reminders:

```bash
bun add @capacitor/push-notifications @capacitor/haptics @capacitor/preferences
npx cap sync android
```
