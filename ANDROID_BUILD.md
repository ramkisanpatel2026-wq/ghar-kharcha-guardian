# Ghar Kharcha AI — Android APK / Play Store Build Guide

Lovable hosts the web app; it cannot compile an APK/AAB (that needs the Android SDK + Gradle).
This repo is now Capacitor-ready, so you can produce a signed release build on your own machine
(or in GitHub Actions) in a few minutes.

- **Package name:** `com.gharkharcha.ai`
- **App name:** Ghar Kharcha AI
- **Config file:** `capacitor.config.ts`

The Android shell loads `https://ghar-kharcha-guardian.lovable.app` because the app is a
server-rendered TanStack Start app (auth, AI assistant, server functions). Publishing an update
from Lovable updates the installed app instantly — no Play Store re-submission needed for
web changes.

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

## 3. Run on a device / emulator

```bash
npx cap open android     # opens Android Studio
```

Press **Run ▶**. To build a debug APK from the CLI instead:

```bash
cd android
./gradlew assembleDebug
# output: android/app/build/outputs/apk/debug/app-debug.apk
```

## 4. Create a signing key (once)

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

## 5. Build the release artifacts

```bash
cd android
./gradlew bundleRelease   # AAB — required by Google Play
./gradlew assembleRelease # APK — for direct sideloading
```

Outputs:
- `android/app/build/outputs/bundle/release/app-release.aab`
- `android/app/build/outputs/apk/release/app-release.apk`

## 6. Upload to Google Play

1. Play Console → **Create app** → name "Ghar Kharcha AI", type App, Free.
2. Upload the `.aab` under **Production → Create new release**.
3. Complete: Store listing (icon 512×512, feature graphic 1024×500, screenshots),
   Content rating, Data safety, Privacy policy URL, Target audience.
4. Submit for review (typically 1–7 days).

### Play policy note

Google rejects apps that are *only* a webview with no added value. This build already includes
native splash screen and status-bar integration. To strengthen the submission, consider adding:

```bash
bun add @capacitor/push-notifications @capacitor/haptics @capacitor/share @capacitor/preferences
npx cap sync android
```

and wiring push notifications for bill reminders — that is a genuinely native capability and
makes the listing clearly compliant.

## 7. Versioning for each update

In `android/app/build.gradle` bump both on every Play upload:

```gradle
versionCode 2
versionName "1.1.0"
```

## 8. App icons and splash

Place a 1024×1024 PNG at `resources/icon.png` and a 2732×2732 PNG at `resources/splash.png`, then:

```bash
bun add -d @capacitor/assets
npx capacitor-assets generate --android
```

---

## Alternative: Trusted Web Activity (fastest path)

If you want the APK without maintaining an Android project, use Bubblewrap — it wraps the
PWA in a TWA and passes Play review as a web app:

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://ghar-kharcha-guardian.lovable.app/manifest.webmanifest
bubblewrap build
```

This requires a `/.well-known/assetlinks.json` on your domain (Bubblewrap prints the exact file).
